import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');
const binPath = path.join(__dirname, '..', 'bin', 'mdbrowse.js');

test.describe('Basic Auth', () => {
  let authServer;

  test.beforeAll(async () => {
    // Start a separate mdbrowse instance with auth on port 9877
    authServer = spawn('node', [binPath, fixturesDir, '--port', '9877', '--auth', 'testuser:testpass'], {
      stdio: 'pipe',
      env: { ...process.env, SSH_CLIENT: '1' }, // prevent browser open
    });

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Auth server start timeout')), 10000);
      authServer.stdout.on('data', (data) => {
        if (data.toString().includes('9877')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      authServer.stderr.on('data', (data) => {
        if (data.toString().includes('9877')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      authServer.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  test.afterAll(() => {
    if (authServer && !authServer.killed) {
      authServer.kill();
    }
  });

  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get('http://localhost:9877/api/tree');
    expect(res.status()).toBe(401);
  });

  test('authenticated request returns 200', async ({ request }) => {
    const res = await request.get('http://localhost:9877/api/tree', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('testuser:testpass').toString('base64'),
      },
    });
    expect(res.status()).toBe(200);
  });
});
