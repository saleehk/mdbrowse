#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { startServer } from '../src/server.js';

/**
 * Load .mdbrowse.json from the target directory.
 * Returns an empty object if not found or invalid.
 */
function loadConfigFile(directory) {
  const configPath = path.resolve(directory, '.mdbrowse.json');
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);
      return config;
    }
  } catch (err) {
    console.warn(`  Warning: Could not parse .mdbrowse.json — ${err.message}`);
  }
  return {};
}

// Parse directory arg early so we can load config file before commander defaults
const dirArg = process.argv.find((a, i) => i >= 2 && !a.startsWith('-')) || '.';
const fileConfig = loadConfigFile(dirArg);

// Priority: CLI args > env vars > .mdbrowse.json > built-in defaults
const defaults = {
  port: process.env.MDBROWSE_PORT || fileConfig.port?.toString() || '3000',
  host: process.env.MDBROWSE_HOST || fileConfig.host || '0.0.0.0',
  tunnel: process.env.MDBROWSE_TUNNEL === '1' || fileConfig.tunnel === true,
  token: process.env.MDBROWSE_TOKEN || fileConfig.token || null,
  auth: process.env.MDBROWSE_AUTH || fileConfig.auth || null,
  readOnly: process.env.MDBROWSE_READ_ONLY === '1' || fileConfig.readOnly === true,
  noIgnore: process.env.MDBROWSE_NO_IGNORE === '1' || fileConfig.noIgnore === true,
};

const program = new Command();

program
  .name('mdbrowse-cli')
  .description('Browse and preview markdown files in any directory')
  .version('0.3.0')
  .argument('[directory]', 'Directory to serve', '.')
  .option('-p, --port <number>', 'Port to listen on', defaults.port)
  .option('--host <address>', 'Host to bind to', defaults.host)
  .option('--no-ignore', 'Show all files (ignore .gitignore)')
  .option('--token <secret>', 'Require token authentication')
  .option('--auth <credentials>', 'Require auth (user:pass — password used as token)')
  .option('--read-only', 'Disable file editing')
  .option('--tunnel', 'Expose via Cloudflare Tunnel (requires cloudflared)')
  .action(async (directory, options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const respectIgnore = defaults.noIgnore ? false : options.ignore !== false;
    const readOnly = options.readOnly || defaults.readOnly;

    // Token: --token > --auth (extract password) > env/config
    let token = options.token || defaults.token;
    if (!token && (options.auth || defaults.auth)) {
      const authStr = options.auth || defaults.auth;
      if (authStr.includes(':')) {
        // Extract password part as the token
        const [, ...rest] = authStr.split(':');
        token = rest.join(':');
      } else {
        token = authStr;
      }
    }

    const { port: actualPort } = await startServer({
      directory,
      port,
      host,
      respectIgnore,
      token,
      readOnly,
    });

    // Security warnings
    if ((options.tunnel || defaults.tunnel) && !token) {
      console.warn('\n  ⚠ WARNING: Tunnel is public with no authentication.');
    }
    if (token && host === '0.0.0.0') {
      console.warn('\n  ⚠ Warning: Token transmitted in cleartext over HTTP.');
    }
    if (fileConfig.token) {
      console.warn('\n  ⚠ Warning: Token in .mdbrowse.json — use MDBROWSE_TOKEN env var instead.');
    }

    const localUrl = `http://localhost:${actualPort}`;
    console.log(`\n  mdbrowse-cli serving ${directory}`);
    console.log(`  → Local:   ${localUrl}`);

    if (host === '0.0.0.0') {
      const { networkInterfaces } = await import('os');
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            console.log(`  → Network: http://${net.address}:${actualPort}`);
          }
        }
      }
    }

    if (token) {
      console.log(`  → Token:   ${localUrl}?token=${token}`);
    }

    console.log();

    if (options.tunnel || defaults.tunnel) {
      const { startTunnel, registerCleanup } = await import('../src/tunnel.js');
      try {
        console.log('  Starting Cloudflare Tunnel...');
        const { url: tunnelUrl, child } = await startTunnel(actualPort);
        registerCleanup(child);
        if (token) {
          console.log(`  → ${tunnelUrl}?token=${token}\n`);
        } else {
          console.log(`  → ${tunnelUrl}\n`);
        }
      } catch (err) {
        console.error(`\n  ${err.message}\n`);
        process.exit(1);
      }
    }

    // Open browser if not in a headless/SSH environment
    const isHeadless = !!(
      process.env.SSH_CLIENT ||
      process.env.SSH_TTY ||
      process.env.SSH_CONNECTION
    );

    if (!isHeadless) {
      const { execFile } = await import('child_process');
      const cmd =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';
      execFile(cmd, [localUrl], () => {});
    }
  });

program.parse();
