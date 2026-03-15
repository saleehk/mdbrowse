import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

test.describe('Live Reload', () => {
  const readmePath = path.join(fixturesDir, 'README.md');
  let originalContent;

  test.beforeAll(() => {
    originalContent = fs.readFileSync(readmePath, 'utf-8');
  });

  test.afterEach(() => {
    fs.writeFileSync(readmePath, originalContent, 'utf-8');
  });

  test('file change on disk auto-updates browser content', async ({ page }) => {
    await page.goto('/view/README.md');
    await page.waitForSelector('.markdown-body');

    // Verify initial content
    await expect(page.locator('.markdown-body h1')).toHaveText('Test README');

    // Modify the file on disk
    fs.writeFileSync(readmePath, '# Live Reloaded\nContent was updated on disk.', 'utf-8');

    // Wait for the content to update via WebSocket
    await expect(page.locator('.markdown-body h1')).toHaveText('Live Reloaded', { timeout: 10000 });
  });
});
