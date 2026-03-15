import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering', () => {
  test('README.md renders h1 and h2 headings', async ({ page }) => {
    await page.goto('/view/README.md');
    await page.waitForSelector('.markdown-body');

    await expect(page.locator('.markdown-body h1')).toHaveText('Test README');
    await expect(page.locator('.markdown-body h2')).toHaveText('Section Two');
  });

  test('table.md renders an HTML table with rows', async ({ page }) => {
    await page.goto('/view/table.md');
    await page.waitForSelector('.markdown-body table');

    const rows = page.locator('.markdown-body table tr');
    await expect(rows).toHaveCount(3); // header + 2 data rows

    // Check cell contents
    const cells = page.locator('.markdown-body table td');
    const texts = await cells.allTextContents();
    expect(texts).toContain('foo');
    expect(texts).toContain('bar');
    expect(texts).toContain('baz');
    expect(texts).toContain('qux');
  });

  test('code-sample.js has syntax highlighting', async ({ page }) => {
    await page.goto('/view/code-sample.js');
    await page.waitForSelector('.code-view');

    // Shiki produces a pre with class "shiki"
    await expect(page.locator('pre.shiki')).toBeVisible();
  });

  test('frontmatter.md shows frontmatter metadata block', async ({ page }) => {
    await page.goto('/view/frontmatter.md');
    await page.waitForSelector('.markdown-body');

    await expect(page.locator('.frontmatter')).toBeVisible();

    // Check frontmatter keys
    const keys = await page.locator('.fm-key').allTextContents();
    expect(keys).toContain('title');
    expect(keys).toContain('author');
    expect(keys).toContain('date');

    // Check frontmatter values
    const values = await page.locator('.fm-value').allTextContents();
    expect(values).toContain('Test Document');
    expect(values).toContain('Test Author');
  });

  test('doc-with-image.md renders an img tag with /raw/ src', async ({ page }) => {
    await page.goto('/view/doc-with-image.md');
    await page.waitForSelector('.markdown-body');

    const img = page.locator('.markdown-body img');
    await expect(img).toBeVisible();

    const src = await img.getAttribute('src');
    expect(src).toContain('/raw/');
    expect(src).toContain('image.png');
  });
});
