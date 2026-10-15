import { test, expect } from '@playwright/test';

test.describe('Localization and PWA configuration', () => {
  test('default is Arabic RTL', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('default theme attribute is present', async ({ page }) => {
    await page.goto('/');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');
  });

  test('PWA manifest link is present in head', async ({ page }) => {
    await page.goto('/');
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('arch and medallion header images are loaded', async ({ page }) => {
    await page.goto('/');
    const archImg = page.locator('.arch-portal-img');
    await expect(archImg).toBeVisible();
    await expect(archImg).toHaveAttribute('src', '/icons/arch_portal.png');
  });
});
