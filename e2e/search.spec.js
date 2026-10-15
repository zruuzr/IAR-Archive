import { test, expect } from '@playwright/test';

test.describe('Search and filtering (Modern Bayt al-Hikma Editorial)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.reference-card').first().waitFor({ timeout: 15_000 });
  });

  test('typing in search filters reference results', async ({ page }) => {
    const initialCount = await page.locator('.reference-card').count();
    expect(initialCount).toBeGreaterThan(0);

    const searchInput = page.locator('.search-input');
    await searchInput.fill('إدار');
    await page.waitForTimeout(400);

    const filteredCount = await page.locator('.reference-card').count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('search clears with clear button', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.fill('اختبار');
    await page.waitForTimeout(300);

    const clearBtn = page.locator('.search-clear-btn');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
  });

  test('category filter pills switch active state and filter', async ({ page }) => {
    const pills = page.locator('.cat-pill');
    const pillCount = await pills.count();
    expect(pillCount).toBeGreaterThan(2);

    // Click on another category pill
    await pills.nth(1).click();
    await page.waitForTimeout(400);

    await expect(pills.nth(1)).toHaveClass(/active/);
    const count = await page.locator('.reference-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('interactive star ratings trigger toast', async ({ page }) => {
    const firstStar = page.locator('.reference-card .star-btn').first();
    await firstStar.click();
    await expect(page.locator('.toast-alert')).toBeVisible({ timeout: 4000 });
  });

  test('bookmark toggles research bundle dock', async ({ page }) => {
    const bookmarkBtn = page.locator('.reference-card .btn-bookmark').first();
    await bookmarkBtn.click();
    await expect(page.locator('.floating-bundle-dock')).toBeVisible({ timeout: 4000 });
  });
});
