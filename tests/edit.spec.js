import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

test.describe('Edit Mode', () => {
  const readmePath = path.join(fixturesDir, 'README.md');
  let originalContent;

  test.beforeAll(() => {
    originalContent = fs.readFileSync(readmePath, 'utf-8');
  });

  test.afterEach(() => {
    // Restore original content after each test
    fs.writeFileSync(readmePath, originalContent, 'utf-8');
  });

  test('Edit button is visible on README.md', async ({ page }) => {
    await page.goto('/view/README.md');
    await page.waitForSelector('.markdown-body');

    await expect(page.locator('#edit-btn')).toBeVisible();
  });

  test('click Edit shows textarea with raw markdown', async ({ page }) => {
    await page.goto('/view/README.md');
    await page.waitForSelector('.markdown-body');

    await page.locator('#edit-btn').click();
    await page.waitForSelector('#editor');

    const editorValue = await page.locator('#editor').inputValue();
    expect(editorValue).toContain('# Test README');
    expect(editorValue).toContain('## Section Two');
  });

  test('click Cancel returns to rendered view', async ({ page }) => {
    await page.goto('/view/README.md');
    await page.waitForSelector('.markdown-body');

    await page.locator('#edit-btn').click();
    await page.waitForSelector('#editor');

    await page.locator('#cancel-edit-btn').click();
    await page.waitForSelector('.markdown-body');

    await expect(page.locator('#editor')).not.toBeVisible();
    await expect(page.locator('.markdown-body')).toBeVisible();
  });

  test('modify content and save persists changes', async ({ page }) => {
    await page.goto('/view/README.md');
    await page.waitForSelector('.markdown-body');

    await page.locator('#edit-btn').click();
    await page.waitForSelector('#editor');

    // Clear and type new content
    await page.locator('#editor').fill('# Modified README\nThis was edited.');

    // Click save
    await page.locator('#save-btn').click();

    // Wait for rendered view to come back
    await page.waitForSelector('.markdown-body');
    await expect(page.locator('.markdown-body h1')).toHaveText('Modified README');

    // Verify on disk
    const onDisk = fs.readFileSync(readmePath, 'utf-8');
    expect(onDisk).toContain('# Modified README');
  });
});
