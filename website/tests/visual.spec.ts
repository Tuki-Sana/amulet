import { test, expect } from '@playwright/test';

test.describe('Visual Audit', () => {
  test('Home page - Desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  });

  test('Concepts page - Mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is for mobile only');
    await page.goto('/ja/concepts');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/concepts-mobile.png', fullPage: true });
  });

  test('Documentation page - Table check', async ({ page, isMobile }) => {
    await page.goto('/ja/concepts');
    const table = page.locator('.sl-markdown-content table').first();
    if (await table.isVisible()) {
      await table.scrollIntoViewIfNeeded();
      await table.screenshot({ path: `test-results/table-check-${isMobile ? 'mobile' : 'desktop'}.png` });
    }
  });

  test('Documentation page - Copy button check', async ({ page, isMobile }) => {
    await page.goto('/ja/concepts');
    const terminal = page.locator('.expressive-code').first();
    if (await terminal.isVisible()) {
      await terminal.scrollIntoViewIfNeeded();
      await terminal.screenshot({ path: `test-results/copy-button-check-${isMobile ? 'mobile' : 'desktop'}.png` });
    }
  });

  test('Font sizes & overflow audit', async ({ page, isMobile }) => {
    await page.goto('/getting-started');
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      const sel = (s: string) => document.querySelector(s);
      const fs = (el: Element | null) =>
        el ? parseFloat(getComputedStyle(el).fontSize) : null;

      // コードブロックのhorizontal overflow確認
      const codeBlocks = [...document.querySelectorAll('.expressive-code pre')];
      const overflowingCode = codeBlocks
        .filter(el => el.scrollWidth > el.clientWidth)
        .map(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));

      return {
        bodyFontSize: fs(sel('body')),
        h1: fs(sel('.sl-markdown-content h1')),
        h2: fs(sel('.sl-markdown-content h2')),
        h3: fs(sel('.sl-markdown-content h3')),
        paragraph: fs(sel('.sl-markdown-content p')),
        code: fs(sel('.expressive-code code')),
        inlineCode: fs(sel(':not(pre) > code')),
        titleSpanEmpty: document.querySelectorAll('.expressive-code .frame .title:empty').length,
        titleSpanTotal: document.querySelectorAll('.expressive-code .frame .title').length,
        overflowingCodeBlocks: overflowingCode,
      };
    });

    console.log(`[${isMobile ? 'MOBILE' : 'DESKTOP'}] Font sizes (px):`, JSON.stringify(metrics, null, 2));

    // フォントが極端に小さくないか確認
    if (metrics.paragraph !== null) {
      expect(metrics.paragraph, 'paragraph font too small').toBeGreaterThanOrEqual(isMobile ? 14 : 15);
    }
    if (metrics.code !== null) {
      expect(metrics.code, 'code font too small').toBeGreaterThanOrEqual(isMobile ? 12 : 13);
    }
  });
});
