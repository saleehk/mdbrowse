#!/usr/bin/env node

/**
 * Takes screenshots of mdbrowse-cli for documentation.
 * Uses Playwright to launch the app against demo/ and capture key views.
 */

import { chromium } from '@playwright/test';
import { startServer } from '../src/server.js';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const screenshotDir = path.join(rootDir, 'docs', 'screenshots');
const sequenceDir = path.join(screenshotDir, 'sequence');

const PORT = 9999;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1280, height: 800 };

async function main() {
  // Ensure output dirs exist
  await mkdir(screenshotDir, { recursive: true });
  await mkdir(sequenceDir, { recursive: true });

  // Start the server against docs/
  console.log('Starting mdbrowse-cli server on port', PORT);
  const { server } = await startServer({
    directory: path.join(rootDir, 'docs'),
    port: PORT,
    host: 'localhost',
    respectIgnore: false,
    readOnly: false,
  });

  // Launch browser
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    // Helper: wait for content to fully render
    async function waitForContent() {
      await page.waitForSelector('.markdown-body, .code-view, .image-preview', { timeout: 10000 });
      // Give shiki/mermaid a moment to render
      await page.waitForTimeout(1500);
    }

    // Helper: set light theme
    async function setLightTheme() {
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('mdbrowse-cli-theme', 'light');
      });
      await page.waitForTimeout(300);
    }

    // Helper: set dark theme
    async function setDarkTheme() {
      await page.evaluate(() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        localStorage.setItem('mdbrowse-cli-theme', 'dark');
      });
      await page.waitForTimeout(300);
    }

    // Helper: navigate to a file via sidebar click
    async function navigateToFile(fileName) {
      await page.locator('.tree-file', { hasText: fileName }).click();
      await waitForContent();
    }

    // ─── Screenshot 1: hero-light.png ───
    console.log('Screenshot 1: hero-light.png');
    await page.goto(BASE_URL);
    await page.waitForSelector('.tree-file', { timeout: 10000 });
    await waitForContent();
    await setLightTheme();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'hero-light.png') });

    // ─── Screenshot 2: hero-dark.png ───
    console.log('Screenshot 2: hero-dark.png');
    await setDarkTheme();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'hero-dark.png') });

    // ─── Screenshot 3: code-highlight.png ───
    console.log('Screenshot 3: code-highlight.png');
    await setLightTheme();
    await navigateToFile('getting-started.md');
    // Scroll to Code Examples section
    await page.evaluate(() => {
      const h2 = [...document.querySelectorAll('.markdown-body h2')].find(
        (el) => el.textContent.includes('Code Examples')
      );
      if (h2) h2.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'code-highlight.png') });

    // ─── Screenshot 4: search.png ───
    console.log('Screenshot 4: search.png');
    await page.locator('#search-input').click();
    await page.locator('#search-input').fill('function');
    // Wait for search debounce + results
    await page.waitForTimeout(600);
    await page.waitForSelector('.search-results', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, 'search.png') });
    // Clear search
    await page.locator('#search-clear').click();
    await page.waitForTimeout(300);

    // ─── Screenshot 5: edit-mode.png ───
    console.log('Screenshot 5: edit-mode.png');
    await navigateToFile('README.md');
    // Click edit button
    await page.locator('#edit-btn').click();
    await page.waitForSelector('#editor', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'edit-mode.png') });
    // Cancel edit
    await page.locator('#cancel-edit-btn').click();
    await page.waitForTimeout(500);

    // ─── Screenshot 6: mermaid.png ───
    console.log('Screenshot 6: mermaid.png');
    await navigateToFile('architecture.md');
    // Wait for mermaid diagrams to render
    await page.waitForSelector('.mermaid svg', { timeout: 10000 }).catch(() => {
      console.log('  (mermaid SVG not found, taking screenshot anyway)');
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'mermaid.png') });

    // ─── GIF Sequence Frames ───
    console.log('\nCapturing GIF sequence frames...');

    // Frame 1: Landing page (README.md) - light theme
    console.log('Frame 1: Landing page');
    await setLightTheme();
    await navigateToFile('README.md');
    await page.screenshot({ path: path.join(sequenceDir, 'frame-01.png') });

    // Frame 2: getting-started.md
    console.log('Frame 2: getting-started.md');
    await navigateToFile('getting-started.md');
    await page.screenshot({ path: path.join(sequenceDir, 'frame-02.png') });

    // Frame 3: dark theme
    console.log('Frame 3: Dark theme');
    await setDarkTheme();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(sequenceDir, 'frame-03.png') });

    // Frame 4: Search "fibonacci"
    console.log('Frame 4: Search fibonacci');
    await page.locator('#search-input').click();
    await page.locator('#search-input').fill('fibonacci');
    await page.waitForTimeout(600);
    await page.waitForSelector('.search-results', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(sequenceDir, 'frame-04.png') });

    // Frame 5: Click search result
    console.log('Frame 5: Click search result');
    const firstResult = page.locator('.search-file-header').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      await waitForContent();
    }
    await page.screenshot({ path: path.join(sequenceDir, 'frame-05.png') });

    // Frame 6: architecture.md (mermaid)
    console.log('Frame 6: architecture.md');
    await navigateToFile('architecture.md');
    await page.waitForSelector('.mermaid svg', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(sequenceDir, 'frame-06.png') });

    // Frame 7: Edit mode on README.md
    console.log('Frame 7: Edit mode');
    await navigateToFile('README.md');
    await page.locator('#edit-btn').click();
    await page.waitForSelector('#editor', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(sequenceDir, 'frame-07.png') });
    await page.locator('#cancel-edit-btn').click();
    await page.waitForTimeout(300);

    // Frame 8: Back to light theme, README view
    console.log('Frame 8: Light theme README');
    await setLightTheme();
    await navigateToFile('README.md');
    await page.screenshot({ path: path.join(sequenceDir, 'frame-08.png') });

    console.log('\nAll screenshots captured successfully!');
    console.log(`  Individual: ${screenshotDir}/`);
    console.log(`  Sequence:   ${sequenceDir}/`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
