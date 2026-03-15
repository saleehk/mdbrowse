import { spawn } from 'child_process';

/**
 * Start a Cloudflare Tunnel pointing at the given local port.
 * Returns a promise that resolves to the public tunnel URL.
 */
export function startTunnel(port) {
  return new Promise((resolve, reject) => {
    const child = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(
          'cloudflared is not installed.\n' +
          '  Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'
        ));
      } else {
        reject(err);
      }
    });

    const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

    function onData(data) {
      if (resolved) return;
      const match = data.toString().match(urlPattern);
      if (match) {
        resolved = true;
        resolve({ url: match[0], child });
      }
    }

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('close', (code) => {
      if (!resolved) {
        reject(new Error(`cloudflared exited with code ${code} before producing a tunnel URL`));
      }
    });
  });
}

/**
 * Register cleanup handlers to kill the cloudflared child process on exit.
 */
export function registerCleanup(child) {
  const kill = () => {
    if (!child.killed) {
      child.kill();
    }
  };

  process.on('SIGINT', () => { kill(); process.exit(0); });
  process.on('SIGTERM', () => { kill(); process.exit(0); });
  process.on('exit', kill);
}
