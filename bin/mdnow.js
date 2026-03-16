#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../src/server.js';

const program = new Command();

program
  .name('mdnow')
  .description('Browse and preview markdown files in any directory')
  .version('0.1.0')
  .argument('[directory]', 'Directory to serve', '.')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('--host <address>', 'Host to bind to', 'localhost')
  .option('--no-ignore', 'Show all files (ignore .gitignore)')
  .option('--auth <credentials>', 'Require basic auth (user:pass)')
  .option('--read-only', 'Disable file editing')
  .option('--tunnel', 'Expose via Cloudflare Tunnel (requires cloudflared)')
  .action(async (directory, options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const respectIgnore = options.ignore !== false;
    const readOnly = !!options.readOnly;

    let auth;
    if (options.auth) {
      if (!options.auth.includes(':')) {
        console.error('Error: --auth must be in user:pass format');
        process.exit(1);
      }
      const [user, ...rest] = options.auth.split(':');
      auth = { username: user, password: rest.join(':') };
    }

    await startServer({
      directory,
      port,
      host,
      respectIgnore,
      auth,
      readOnly,
    });

    const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    console.log(`\n  mdnow serving ${directory}`);
    console.log(`  → ${url}\n`);

    if (options.tunnel) {
      const { startTunnel, registerCleanup } = await import('../src/tunnel.js');
      try {
        console.log('  Starting Cloudflare Tunnel...');
        const { url: tunnelUrl, child } = await startTunnel(port);
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
      exec(`${cmd} ${url}`);
    }
  });

program.parse();
