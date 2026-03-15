import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import { scanDirectory } from './scanner.js';
import { renderMarkdown, renderCode } from './renderer.js';
import { startWatcher } from './watcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

/**
 * Validate that a requested path stays within the root directory.
 * Returns the resolved absolute path or null if invalid.
 */
function safePath(rootDir, requestedPath) {
  const resolved = path.resolve(rootDir, requestedPath);
  if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) {
    return null;
  }
  return resolved;
}

export async function startServer({ directory, port, host, respectIgnore }) {
  const rootDir = path.resolve(directory);

  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    console.error(`Error: "${directory}" is not a valid directory`);
    process.exit(1);
  }

  const app = new Hono();

  // API: file tree
  app.get('/api/tree', (c) => {
    const tree = scanDirectory(rootDir, respectIgnore);
    return c.json(tree);
  });

  // API: render file
  app.get('/api/file', async (c) => {
    const filePath = c.req.query('path');
    if (!filePath) {
      return c.json({ error: 'Missing path parameter' }, 400);
    }

    const absPath = safePath(rootDir, filePath);
    if (!absPath) {
      return c.json({ error: 'Invalid path' }, 403);
    }

    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return c.json({ error: 'File not found' }, 404);
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    const isMarkdown = /\.mdx?$/.test(filePath);

    if (isMarkdown) {
      const result = await renderMarkdown(content, filePath);
      return c.json({ type: 'markdown', ...result });
    } else {
      const result = await renderCode(content, filePath);
      return c.json({ type: 'code', ...result });
    }
  });

  // Static assets from public/
  app.get('/assets/*', (c) => {
    const assetPath = c.req.path.replace('/assets/', '');
    const absPath = path.join(publicDir, assetPath);

    // Prevent traversal
    if (!absPath.startsWith(publicDir)) {
      return c.text('Forbidden', 403);
    }

    if (!fs.existsSync(absPath)) {
      return c.text('Not found', 404);
    }

    const content = fs.readFileSync(absPath);
    const ext = path.extname(absPath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };

    return c.body(content, 200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
    });
  });

  // SPA catch-all: serve index.html
  app.get('*', (c) => {
    const indexPath = path.join(publicDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    return c.html(html);
  });

  // Start HTTP server
  const server = serve({
    fetch: app.fetch,
    port,
    hostname: host,
  });

  // WebSocket server
  const wss = new WebSocketServer({ server });

  const clients = new Set();
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  function broadcast(message) {
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  }

  // Start file watcher
  startWatcher(rootDir, broadcast, respectIgnore);

  return server;
}
