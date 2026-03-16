import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');
const binPath = path.join(__dirname, '..', 'bin', 'mdbrowse-cli.js');

const AUTH_PORT = 9878;
const NOAUTH_PORT = 9879;
const AUTH_BASE = `http://localhost:${AUTH_PORT}`;
const NOAUTH_BASE = `http://localhost:${NOAUTH_PORT}`;
const AUTH_CREDS = 'testuser:testpass';
const AUTH_HEADER = 'Basic ' + Buffer.from(AUTH_CREDS).toString('base64');

function startServer(port, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [binPath, fixturesDir, '--port', String(port), ...extraArgs], {
      stdio: 'pipe',
      env: { ...process.env, SSH_CLIENT: '1' },
    });

    const timeout = setTimeout(() => reject(new Error(`Server start timeout on port ${port}`)), 10000);

    function onData(data) {
      if (data.toString().includes(String(port))) {
        clearTimeout(timeout);
        resolve(proc);
      }
    }

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function connectWs(port, query = '') {
  const url = `ws://localhost:${port}/ws${query ? '?' + query : ''}`;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket connect timeout'));
    }, 5000);

    // The server authenticates inside wss.on('connection'), which fires AFTER
    // the HTTP upgrade completes. So even for rejected connections the client
    // sees an 'open' event followed immediately by a 'close(1008)'.
    // We therefore wait briefly after open to see if the server closes us.
    ws.on('open', () => {
      const stableTimer = setTimeout(() => {
        clearTimeout(timeout);
        resolve({ ws, opened: true });
      }, 500);

      ws.on('close', (code, reason) => {
        clearTimeout(stableTimer);
        clearTimeout(timeout);
        resolve({ ws, opened: false, code, reason: reason.toString() });
      });
    });

    // Close before open means the upgrade itself failed
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      resolve({ ws, opened: false, code, reason: reason.toString() });
    });

    ws.on('error', () => {
      // error fires before close, let close handler resolve
    });
  });
}

async function fetchWsToken(port, auth = true) {
  const headers = auth ? { Authorization: AUTH_HEADER } : {};
  const res = await fetch(`http://localhost:${port}/api/ws-token`, { headers });
  return res;
}

test.describe('WebSocket Auth', () => {
  let authServer;
  let noAuthServer;

  test.beforeAll(async () => {
    [authServer, noAuthServer] = await Promise.all([
      startServer(AUTH_PORT, ['--auth', AUTH_CREDS]),
      startServer(NOAUTH_PORT),
    ]);
  });

  test.afterAll(() => {
    if (authServer && !authServer.killed) authServer.kill();
    if (noAuthServer && !noAuthServer.killed) noAuthServer.kill();
  });

  test('WebSocket connects successfully with auth token', async () => {
    const res = await fetchWsToken(AUTH_PORT);
    expect(res.status).toBe(200);
    const { token } = await res.json();

    const { ws, opened } = await connectWs(AUTH_PORT, `token=${token}`);
    expect(opened).toBe(true);
    ws.close();
  });

  test('WebSocket rejected without token when auth enabled', async () => {
    const { opened, code } = await connectWs(AUTH_PORT);
    expect(opened).toBe(false);
    expect(code).toBe(1008);
  });

  test('WebSocket rejected with invalid token', async () => {
    const { opened, code } = await connectWs(AUTH_PORT, 'token=invalidtoken123');
    expect(opened).toBe(false);
    expect(code).toBe(1008);
  });

  test('WebSocket connects without token when no auth', async () => {
    const { ws, opened } = await connectWs(NOAUTH_PORT);
    expect(opened).toBe(true);
    ws.close();
  });

  test('ws-token endpoint requires auth', async () => {
    const noAuth = await fetchWsToken(AUTH_PORT, false);
    expect(noAuth.status).toBe(401);

    const withAuth = await fetchWsToken(AUTH_PORT, true);
    expect(withAuth.status).toBe(200);
    const body = await withAuth.json();
    expect(body.token).toBeTruthy();
  });

  test('token is single-use', async () => {
    const res = await fetchWsToken(AUTH_PORT);
    const { token } = await res.json();

    // First use — should succeed
    const first = await connectWs(AUTH_PORT, `token=${token}`);
    expect(first.opened).toBe(true);
    first.ws.close();

    // Second use of same token — should be rejected
    const second = await connectWs(AUTH_PORT, `token=${token}`);
    expect(second.opened).toBe(false);
    expect(second.code).toBe(1008);
  });
});
