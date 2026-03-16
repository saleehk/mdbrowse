import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('theme toggle button exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#theme-toggle')).toBeVisible();
  });

  test('click toggle changes theme class', async ({ page }) => {
    await page.goto('/');

    // Clear any stored theme so we start from a known state
    await page.evaluate(() => localStorage.removeItem('mdbrowse-cli-theme'));
    await page.reload();
    await page.waitForSelector('#theme-toggle');

    // Click toggle - should switch to dark or light
    await page.locator('#theme-toggle').click();

    const html = page.locator('html');
    const hasDark = await html.evaluate(el => el.classList.contains('dark'));
    const hasLight = await html.evaluate(el => el.classList.contains('light'));

    // One of them should be set
    expect(hasDark || hasLight).toBe(true);
  });

  test('theme persists after reload', async ({ page }) => {
    await page.goto('/');

    // Set to dark explicitly
    await page.evaluate(() => {
      localStorage.setItem('mdbrowse-cli-theme', 'dark');
    });
    await page.reload();
    await page.waitForSelector('#theme-toggle');

    await expect(page.locator('html')).toHaveClass(/dark/);

    // Now toggle to light
    await page.locator('#theme-toggle').click();

    // Verify localStorage was updated
    const theme = await page.evaluate(() => localStorage.getItem('mdbrowse-cli-theme'));
    expect(theme).toBe('light');

    // Reload and check it persists
    await page.reload();
    await page.waitForSelector('#theme-toggle');

    await expect(page.locator('html')).toHaveClass(/light/);
  });
});
