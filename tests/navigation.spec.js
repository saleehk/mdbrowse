import { test, expect } from '@playwright/test';

test.describe('Navigation & File Tree', () => {
  test('page loads and shows content', async ({ page }) => {
    // The app auto-navigates to README.md if it exists,
    // so we verify the app loads successfully with content
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    // Sidebar logo is visible
    await expect(page.locator('.logo')).toHaveText('mdbrowse-cli');
    // README was auto-loaded
    await expect(page.locator('.markdown-body')).toBeVisible();
  });

  test('file tree shows expected files', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    const fileNames = await page.locator('.tree-file .tree-name').allTextContents();
    expect(fileNames).toContain('README.md');
    expect(fileNames).toContain('code-sample.js');
    expect(fileNames).toContain('empty.txt');
    expect(fileNames).toContain('frontmatter.md');
    expect(fileNames).toContain('table.md');
    expect(fileNames).toContain('math.md');
    expect(fileNames).toContain('doc-with-image.md');
    expect(fileNames).toContain('image.png');

    // Check nested directory exists
    const dirNames = await page.locator('.tree-dir .tree-name').allTextContents();
    expect(dirNames).toContain('nested');
  });

  test('ignored-file.txt is NOT in the tree', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    const fileNames = await page.locator('.tree-file .tree-name').allTextContents();
    expect(fileNames).not.toContain('ignored-file.txt');
  });

  test('click README.md loads content and updates URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    // The app auto-navigates to README.md if it exists, so go to a path without it first
    // Actually, let's just verify README loads correctly
    await page.locator('.tree-file', { hasText: 'README.md' }).click();
    await page.waitForSelector('.markdown-body');

    expect(page.url()).toContain('/view/README.md');
    await expect(page.locator('.markdown-body h1')).toHaveText('Test README');
  });

  test('click nested folder then deep-file.md loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    const deepFile = page.locator('.tree-file', { hasText: 'deep-file.md' });

    // If deep-file.md is not visible, click the nested directory to expand it
    if (!(await deepFile.isVisible())) {
      await page.locator('.tree-dir', { hasText: 'nested' }).click();
    }

    await deepFile.click();
    await page.waitForSelector('.markdown-body');

    expect(page.url()).toContain('/view/nested/deep-file.md');
    await expect(page.locator('.markdown-body h1')).toHaveText('Deep File');
  });

  test('direct URL /view/nested/deep-file.md loads content', async ({ page }) => {
    await page.goto('/view/nested/deep-file.md');
    await page.waitForSelector('.markdown-body');

    await expect(page.locator('.markdown-body h1')).toHaveText('Deep File');
  });

  test('browser back button returns to previous file', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    // Navigate to README
    await page.locator('.tree-file', { hasText: 'README.md' }).click();
    await page.waitForSelector('.markdown-body h1');
    await expect(page.locator('.markdown-body h1')).toHaveText('Test README');

    // Navigate to table.md
    await page.locator('.tree-file', { hasText: 'table.md' }).click();
    await page.waitForSelector('.markdown-body h1');
    await expect(page.locator('.markdown-body h1')).toHaveText('Table Test');

    // Go back
    await page.goBack();
    await page.waitForSelector('.markdown-body h1');
    await expect(page.locator('.markdown-body h1')).toHaveText('Test README');
  });
});
