import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');
const binPath = path.join(__dirname, '..', 'bin', 'mdbrowse-cli.js');

function startServer(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [binPath, fixturesDir, ...args], {
      stdio: 'pipe',
      env: { ...process.env, SSH_CLIENT: '1' },
    });
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 10000);
    const onData = (data) => {
      const str = data.toString();
      const match = str.match(/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve({ proc, port: parseInt(match[1], 10) });
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

test.describe('Token Auth', () => {
  let server;
  let port;

  test.beforeAll(async () => {
    const result = await startServer(['--port', '9877', '--token', 'mysecret']);
    server = result.proc;
    port = result.port;
  });

  test.afterAll(() => {
    if (server && !server.killed) server.kill();
  });

  test('unauthenticated browser request redirects to /login', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()['location']).toBe('/login');
  });

  test('login page is accessible without token', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/login`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('mdbrowse');
    expect(html).toContain('access token');
  });

  test('API requires token — 401 without', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/tree`);
    expect(res.status()).toBe(401);
  });

  test('API works with Bearer token', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/tree`, {
      headers: { 'Authorization': 'Bearer mysecret' },
    });
    expect(res.status()).toBe(200);
  });

  test('API works with ?token= query param', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/tree?token=mysecret`);
    expect(res.status()).toBe(200);
  });

  test('login endpoint accepts correct token', async ({ request }) => {
    const res = await request.post(`http://localhost:${port}/api/login`, {
      data: { token: 'mysecret' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('login endpoint rejects wrong token', async ({ request }) => {
    const res = await request.post(`http://localhost:${port}/api/login`, {
      data: { token: 'wrongtoken' },
    });
    expect(res.status()).toBe(401);
  });

  test('config endpoint reports auth enabled', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/config`, {
      headers: { 'Authorization': 'Bearer mysecret' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.auth).toBe(true);
  });

  test('WebSocket with token query param connects', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=mysecret`);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('WS connect timeout')), 5000);
    });
    ws.close();
  });

  test('WebSocket without token is rejected', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await new Promise((resolve) => {
      ws.on('open', () => resolve('open'));
      ws.on('unexpected-response', () => resolve('rejected'));
      ws.on('error', () => resolve('rejected'));
      setTimeout(() => resolve('timeout'), 5000);
    }).then(result => {
      expect(result).toBe('rejected');
    });
  });
});

test.describe('No Auth (default)', () => {
  let server;
  let port;

  test.beforeAll(async () => {
    const result = await startServer(['--port', '9878']);
    server = result.proc;
    port = result.port;
  });

  test.afterAll(() => {
    if (server && !server.killed) server.kill();
  });

  test('API accessible without token', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/tree`);
    expect(res.status()).toBe(200);
  });

  test('config reports auth disabled', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/config`);
    const body = await res.json();
    expect(body.auth).toBe(false);
  });

  test('WebSocket connects without token', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('WS connect timeout')), 5000);
    });
    ws.close();
  });
});

test.describe('Backwards compat: --auth flag', () => {
  let server;
  let port;

  test.beforeAll(async () => {
    const result = await startServer(['--port', '9879', '--auth', 'user:mypassword']);
    server = result.proc;
    port = result.port;
  });

  test.afterAll(() => {
    if (server && !server.killed) server.kill();
  });

  test('--auth password used as token', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/tree`, {
      headers: { 'Authorization': 'Bearer mypassword' },
    });
    expect(res.status()).toBe(200);
  });

  test('old basic auth no longer works', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/tree`, {
      headers: { 'Authorization': 'Basic ' + Buffer.from('user:mypassword').toString('base64') },
    });
    expect(res.status()).toBe(401);
  });
});
