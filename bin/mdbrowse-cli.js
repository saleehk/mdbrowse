#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../src/server.js';

// Environment variable defaults (CLI args always override)
const env = {
  port: process.env.MDBROWSE_PORT || '3000',
  host: process.env.MDBROWSE_HOST || '0.0.0.0',
  tunnel: process.env.MDBROWSE_TUNNEL === '1',
  auth: process.env.MDBROWSE_AUTH || null,
  readOnly: process.env.MDBROWSE_READ_ONLY === '1',
  noIgnore: process.env.MDBROWSE_NO_IGNORE === '1',
};

const program = new Command();

program
  .name('mdbrowse-cli')
  .description('Browse and preview markdown files in any directory')
  .version('0.2.0')
  .argument('[directory]', 'Directory to serve', '.')
  .option('-p, --port <number>', 'Port to listen on', env.port)
  .option('--host <address>', 'Host to bind to', env.host)
  .option('--no-ignore', 'Show all files (ignore .gitignore)')
  .option('--auth <credentials>', 'Require basic auth (user:pass)')
  .option('--read-only', 'Disable file editing')
  .option('--tunnel', 'Expose via Cloudflare Tunnel (requires cloudflared)')
  .action(async (directory, options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const respectIgnore = env.noIgnore ? false : options.ignore !== false;
    const readOnly = options.readOnly || env.readOnly;

    // Auth: CLI arg > env var > none
    const authStr = options.auth || env.auth;
    let auth;
    if (authStr) {
      if (!authStr.includes(':')) {
        console.error('Error: --auth (or MDBROWSE_AUTH) must be in user:pass format');
        process.exit(1);
      }
      const [user, ...rest] = authStr.split(':');
      auth = { username: user, password: rest.join(':') };
    }

    const { port: actualPort } = await startServer({
      directory,
      port,
      host,
      respectIgnore,
      auth,
      readOnly,
    });

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
    console.log();

    if (options.tunnel || env.tunnel) {
      const { startTunnel, registerCleanup } = await import('../src/tunnel.js');
      try {
        console.log('  Starting Cloudflare Tunnel...');
        const { url: tunnelUrl, child } = await startTunnel(actualPort);
        registerCleanup(child);
        console.log(`  → ${tunnelUrl}\n`);
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
      const { exec } = await import('child_process');
      const cmd =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';
      exec(`${cmd} ${localUrl}`);
    }
  });

program.parse();
