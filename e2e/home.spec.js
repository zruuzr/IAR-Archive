import { test, expect } from '@playwright/test';

test.describe('Homepage loading (Modern Bayt al-Hikma Editorial)', () => {
  test('loads without critical console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/مستودع المراجع الإدارية العراقية/);

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('Firebase') &&
        !e.includes('firebase') &&
        !e.includes('net::ERR') &&
        !e.includes('Failed to load resource') &&
        !e.includes('SW registration failed') &&
        !e.includes('Service Worker')
    );

    expect(criticalErrors).toEqual([]);
  });

  test('renders main Bayt al-Hikma sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.portal-header')).toBeVisible();
    await expect(page.locator('.portal-title')).toHaveText('مستودع المراجع الإدارية العراقية');
    await expect(page.locator('.search-input-box')).toBeVisible();
    await expect(page.locator('.category-pills')).toBeVisible();
    await expect(page.locator('#colophon')).toBeVisible();
  });

  test('loads reference cards into the grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.reference-card').first()).toBeVisible({ timeout: 15_000 });
    const count = await page.locator('.reference-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('featured spotlight tome is rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.featured-spotlight-card')).toBeVisible();
    await expect(page.locator('.tome-img')).toBeVisible();
  });

  test('APA citation and download buttons are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.badge-apa-citation').first()).toBeVisible();
    await expect(page.locator('.btn-download-navy').first()).toBeVisible();
  });
});
