import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('search input exists in sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#search-input')).toBeVisible();
  });

  test('type "README" shows results with README.md', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    await page.fill('#search-input', 'README');
    // Wait for debounced search results
    await page.waitForSelector('.search-results');

    const headers = await page.locator('.search-file-header').allTextContents();
    const hasReadme = headers.some(h => h.includes('README.md'));
    expect(hasReadme).toBe(true);
  });

  test('type "hello" shows code-sample.js with matching line', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    await page.fill('#search-input', 'hello');
    await page.waitForSelector('.search-results');

    const headers = await page.locator('.search-file-header').allTextContents();
    const hasCodeSample = headers.some(h => h.includes('code-sample.js'));
    expect(hasCodeSample).toBe(true);

    // Check that matching lines are shown
    await expect(page.locator('.search-match').first()).toBeVisible();
  });

  test('click search result navigates to file', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    await page.fill('#search-input', 'README');
    await page.waitForSelector('.search-results');

    await page.locator('.search-file-header').first().click();
    await page.waitForSelector('.markdown-body');

    expect(page.url()).toContain('/view/');
  });

  test('clear search restores file tree', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    await page.fill('#search-input', 'README');
    await page.waitForSelector('.search-results');

    // File tree should be hidden
    await expect(page.locator('#file-tree')).toBeHidden();

    // Clear search
    await page.locator('#search-clear').click();

    // File tree should be visible again
    await expect(page.locator('#file-tree')).toBeVisible();
  });

  test('Ctrl+K focuses search input', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tree-file');

    // Click somewhere else first
    await page.locator('#content').click();

    // Press Ctrl+K
    await page.keyboard.press('Control+k');

    // Search input should be focused
    await expect(page.locator('#search-input')).toBeFocused();
  });
});
