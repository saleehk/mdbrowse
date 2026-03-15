#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../src/server.js';

const program = new Command();

program
  .name('mdbrowse')
  .description('Browse and preview markdown files in any directory')
  .version('0.1.0')
  .argument('[directory]', 'Directory to serve', '.')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('--host <address>', 'Host to bind to', 'localhost')
  .option('--no-ignore', 'Show all files (ignore .gitignore)')
  .action(async (directory, options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const respectIgnore = options.ignore !== false;

    await startServer({
      directory,
      port,
      host,
      respectIgnore,
    });

    const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    console.log(`\n  mdbrowse serving ${directory}`);
    console.log(`  → ${url}\n`);

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
