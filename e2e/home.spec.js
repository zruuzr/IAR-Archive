const { test, expect } = require('@playwright/test');

test.describe('Homepage loading', () => {
  test('loads without critical console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/IAR Archive/);

    // نتجاهل أخطاء Firebase (لا يمكن الاتصال في اختبار محلي)
    const criticalErrors = errors.filter(e =>
      !e.includes('Firebase') &&
      !e.includes('firebase') &&
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource')
    );

    expect(criticalErrors).toEqual([]);
  });

  test('renders main sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header.site-header')).toBeVisible();
    await expect(page.locator('#booksDisplayContainer')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toBeVisible();
  });

  test('loads books into the grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.book-card').first()).toBeVisible({ timeout: 15_000 });
    const count = await page.locator('.book-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('books counter is populated', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#booksCounter')).not.toHaveText('—', { timeout: 10_000 });
  });

  test('hero section is rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-title')).toBeVisible();
    await expect(page.locator('.hero-stats')).toBeVisible();
  });
});
