import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import { scanDirectory } from './scanner.js';
import { renderMarkdown, renderCode } from './renderer.js';
import { startWatcher } from './watcher.js';
import { search } from './search.js';

function safeTokenCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

/**
 * Check if a port is available.
 */
function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

/**
 * Find the next available port starting from the given port.
 * Tries up to maxAttempts ports.
 */
async function findAvailablePort(startPort, host, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }
  return null;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff', '.tif',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.wav', '.ogg',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.exe', '.dll', '.so', '.dylib', '.o', '.a',
  '.class', '.pyc', '.pyo',
  '.sqlite', '.db',
]);

const MIME_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp', '.tiff': 'image/tiff',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.zip': 'application/zip', '.gz': 'application/gzip',
  '.json': 'application/json', '.xml': 'application/xml',
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.txt': 'text/plain', '.md': 'text/markdown',
  '.yaml': 'text/yaml', '.yml': 'text/yaml',
};

/**
 * Validate that a requested path stays within the root directory.
 * Resolves symlinks to prevent traversal via symbolic links.
 * Returns the resolved absolute path or null if invalid.
 */
function safePath(rootDir, requestedPath) {
  const resolved = path.resolve(rootDir, requestedPath);
  if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) {
    return null;
  }
  try {
    const real = fs.realpathSync(resolved);
    const realRoot = fs.realpathSync(rootDir);
    if (!real.startsWith(realRoot + path.sep) && real !== realRoot) {
      return null;
    }
    return real;
  } catch {
    return resolved; // file may not exist yet
  }
}

/**
 * CSRF check: validate Origin/Referer header on state-changing requests.
 */
function csrfCheck(c) {
  const origin = c.req.header('origin');
  const referer = c.req.header('referer');
  const source = origin || referer;
  if (source) {
    try {
      const url = new URL(source);
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && !url.hostname.endsWith('.trycloudflare.com')) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

const MAX_WS_CLIENTS = 100;

function loginPageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login — mdbrowse</title>
  <style>
    :root {
      --bg: #ffffff; --bg-secondary: #f6f8fa; --text: #1f2328;
      --text-secondary: #656d76; --text-muted: #8b949e; --border: #d0d7de;
      --accent: #0969da; --accent-hover: #0550ae;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117; --bg-secondary: #161b22; --text: #e6edf3;
        --text-secondary: #8b949e; --text-muted: #6e7681; --border: #30363d;
        --accent: #58a6ff; --accent-hover: #79c0ff;
      }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg); color: var(--text);
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .login-card {
      width: 100%; max-width: 360px; padding: 40px 32px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 12px; text-align: center;
    }
    .login-card h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    .login-card p { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
    .login-card input {
      width: 100%; padding: 10px 14px; font-size: 14px; font-family: inherit;
      color: var(--text); background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; outline: none; margin-bottom: 16px;
    }
    .login-card input:focus { border-color: var(--accent); }
    .login-card input::placeholder { color: var(--text-muted); }
    .login-card button {
      width: 100%; padding: 10px; font-size: 14px; font-weight: 600;
      font-family: inherit; color: #fff; background: var(--accent);
      border: none; border-radius: 8px; cursor: pointer;
    }
    .login-card button:hover { background: var(--accent-hover); }
    .login-card button:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { color: #f85149; font-size: 13px; margin-bottom: 12px; display: none; }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>mdbrowse</h1>
    <p>Enter access token to continue</p>
    <div class="error" id="error">Invalid token</div>
    <form id="login-form">
      <input type="password" id="token-input" placeholder="Enter access token" autocomplete="off" autofocus>
      <button type="submit">Sign in</button>
    </form>
  </div>
  <script>
    const form = document.getElementById('login-form');
    const input = document.getElementById('token-input');
    const error = document.getElementById('error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.style.display = 'none';
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: input.value }),
        });
        if (res.ok) {
          localStorage.setItem('mdbrowse-token', input.value);
          window.location.href = '/';
        } else {
          error.style.display = 'block';
        }
      } catch {
        error.textContent = 'Connection error';
        error.style.display = 'block';
      }
      btn.disabled = false;
    });
  </script>
</body>
</html>`;
}

export async function startServer({ directory, port, host, respectIgnore, token, readOnly }) {
  const rootDir = path.resolve(directory);

  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    console.error(`Error: "${directory}" is not a valid directory`);
    process.exit(1);
  }

  const app = new Hono();

  // Security headers middleware
  const CSP = [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: https:",
    "connect-src 'self' ws: wss:",
    "frame-src 'none'",
    "object-src 'none'",
  ].join('; ');

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('Content-Security-Policy', CSP);
  });

  // Token auth middleware
  if (token) {
    app.use('*', async (c, next) => {
      const reqPath = c.req.path;

      // Allow login page and login API without token
      if (reqPath === '/login' || reqPath === '/api/login') {
        return next();
      }

      // Allow static assets for login page styling
      if (reqPath.startsWith('/assets/')) {
        return next();
      }

      // Check Authorization: Bearer <token>
      const authHeader = c.req.header('authorization');
      if (authHeader?.startsWith('Bearer ') && safeTokenCompare(authHeader.slice(7), token)) {
        return next();
      }

      // Check ?token= query param (for deep links and WebSocket)
      const queryToken = c.req.query('token');
      if (safeTokenCompare(queryToken, token)) {
        return next();
      }

      // Redirect to login page for browser requests, 401 for API
      if (reqPath.startsWith('/api/') || reqPath.startsWith('/ws')) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      return c.redirect('/login');
    });
  }

  // Login page
  app.get('/login', (c) => {
    return c.html(loginPageHtml());
  });

  // Login API
  app.post('/api/login', async (c) => {
    if (!token) {
      return c.json({ ok: true });
    }
    const body = await c.req.json();
    if (safeTokenCompare(body.token, token)) {
      return c.json({ ok: true });
    }
    return c.json({ error: 'Invalid token' }, 401);
  });

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

    let stats;
    try {
      stats = fs.statSync(absPath);
    } catch {
      return c.json({ error: 'File not found' }, 404);
    }

    if (!stats.isFile()) {
      return c.json({ error: 'File not found' }, 404);
    }

    if (stats.size > MAX_FILE_SIZE) {
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      return c.json({ type: 'notice', message: `File too large to preview (${sizeMB} MB, limit: 1 MB)` });
    }

    const ext = path.extname(absPath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      return c.json({ type: 'notice', message: 'Binary file — cannot display' });
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

  // API: save file
  app.post('/api/file', async (c) => {
    if (readOnly) {
      return c.json({ error: 'Read-only mode' }, 403);
    }

    // CSRF protection: validate Origin header
    if (!csrfCheck(c)) {
      return c.json({ error: 'Forbidden: invalid origin' }, 403);
    }

    const filePath = c.req.query('path');
    if (!filePath) {
      return c.json({ error: 'Missing path parameter' }, 400);
    }

    const absPath = safePath(rootDir, filePath);
    if (!absPath) {
      return c.json({ error: 'Invalid path' }, 403);
    }

    try {
      const stats = fs.statSync(absPath);
      if (!stats.isFile()) {
        return c.json({ error: 'File not found' }, 404);
      }
    } catch {
      return c.json({ error: 'File not found' }, 404);
    }

    const body = await c.req.text();
    if (body.length > MAX_FILE_SIZE) {
      return c.json({ error: 'Request too large' }, 413);
    }
    await fs.promises.writeFile(absPath, body, 'utf-8');
    return c.json({ ok: true });
  });

  // API: raw file content (for edit mode)
  app.get('/api/raw-content', (c) => {
    const filePath = c.req.query('path');
    if (!filePath) {
      return c.text('Missing path parameter', 400);
    }

    const absPath = safePath(rootDir, filePath);
    if (!absPath) {
      return c.text('Invalid path', 403);
    }

    let stats;
    try {
      stats = fs.statSync(absPath);
    } catch {
      return c.text('File not found', 404);
    }

    if (!stats.isFile()) {
      return c.text('File not found', 404);
    }

    if (stats.size > MAX_FILE_SIZE) {
      return c.text('File too large', 413);
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    return c.text(content);
  });

  // API: config
  app.get('/api/config', (c) => {
    return c.json({ readOnly: !!readOnly, auth: !!token });
  });

  // API: search
  app.get('/api/search', async (c) => {
    const q = c.req.query('q');
    if (!q) {
      return c.json({ results: [], query: '', totalFiles: 0 });
    }
    const results = await search(rootDir, q, respectIgnore);
    return c.json(results);
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

  // Raw file serving (images and other assets)
  app.get('/raw/*', (c) => {
    let reqPath;
    try {
      reqPath = decodeURIComponent(c.req.path.slice(5));
    } catch {
      return c.text('Bad request', 400);
    }

    const absPath = safePath(rootDir, reqPath);
    if (!absPath) {
      return c.text('Forbidden', 403);
    }

    let stats;
    try {
      stats = fs.statSync(absPath);
    } catch {
      return c.text('Not found', 404);
    }

    if (!stats.isFile()) {
      return c.text('Not found', 404);
    }

    if (stats.size > MAX_FILE_SIZE) {
      return c.text('File too large', 413);
    }

    const content = fs.readFileSync(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return c.body(content, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    });
  });

  // SPA catch-all: serve index.html
  app.get('*', (c) => {
    const indexPath = path.join(publicDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    return c.html(html);
  });

  // Find an available port
  const availablePort = await findAvailablePort(port, host);
  if (!availablePort) {
    console.error(`\n  Error: No available port found (tried ${port}-${port + 9}).`);
    console.error(`  Try: mdbrowse-cli --port <number>\n`);
    process.exit(1);
  }
  if (availablePort !== port) {
    console.log(`  Port ${port} in use, using ${availablePort} instead.`);
  }

  // Start HTTP server
  const server = serve({
    fetch: app.fetch,
    port: availablePort,
    hostname: host,
  });

  // WebSocket server with origin + token validation
  const wss = new WebSocketServer({
    server,
    verifyClient: (info) => {
      const origin = info.origin || info.req.headers.origin;
      if (origin) {
        try {
          const url = new URL(origin);
          if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && !url.hostname.endsWith('.trycloudflare.com')) {
            return false;
          }
        } catch {
          return false;
        }
      }

      // Token check
      if (token) {
        const url = new URL(info.req.url, 'http://localhost');
        const queryToken = url.searchParams.get('token');
        return safeTokenCompare(queryToken, token);
      }
      return true;
    }
  });

  const clients = new Set();
  wss.on('connection', (ws) => {
    // Connection limit
    if (clients.size >= MAX_WS_CLIENTS) {
      ws.close(1013, 'Too many connections');
      return;
    }

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

  return { server, port: availablePort };
}
