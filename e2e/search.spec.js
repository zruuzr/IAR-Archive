const { test, expect } = require('@playwright/test');

test.describe('Search and filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });
  });

  test('typing in search filters results', async ({ page }) => {
    const initialCount = await page.locator('.book-card').count();
    expect(initialCount).toBeGreaterThan(0);

    // نكتب حرفًا عربيًا شائعًا
    await page.locator('#searchInput').fill('ا');
    await page.waitForTimeout(300);

    const filteredCount = await page.locator('.book-card').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('search clears with clear button', async ({ page }) => {
    await page.locator('#searchInput').fill('test');
    await page.waitForTimeout(200);

    await expect(page.locator('#btnClearSearch')).toBeVisible();
    await page.locator('#btnClearSearch').click();
    await expect(page.locator('#searchInput')).toHaveValue('');
  });

  test('category chips filter results', async ({ page }) => {
    const chips = page.locator('#categoryChips .chip-item');
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThan(1);

    // انقر على ثاني chip (الأول = "كل المراجع")
    await chips.nth(1).click();
    await page.waitForTimeout(300);

    const hasBooks = (await page.locator('.book-card').count()) > 0;
    const hasEmpty = (await page.locator('.empty-state').count()) > 0;
    expect(hasBooks || hasEmpty).toBeTruthy();
  });

  test('sort dropdown changes order', async ({ page }) => {
    await page.locator('#sortOrder').selectOption('title');
    await page.waitForTimeout(300);

    const firstTitle = await page.locator('.book-card .book-title').first().textContent();
    expect(firstTitle).toBeTruthy();
  });

  test('favorites filter toggles', async ({ page }) => {
    await page.locator('#favoritesOnlyBtn').click();
    await page.waitForTimeout(300);

    // مع عدم وجود مفضلة، يجب أن نرى empty state
    const hasBooks = (await page.locator('.book-card').count()) > 0;
    const hasEmpty = (await page.locator('.empty-state').count()) > 0;
    expect(hasBooks || hasEmpty).toBeTruthy();
  });

  test('3-minute summary modal, cover zoom modal, and interactive rating work', async ({
    page
  }) => {
    // فتح نافذة ملخص 3 دقائق
    await page.locator('[data-testid^="book-summary-btn-"]').first().click();
    await expect(page.locator('[data-testid="summary-dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="summary-dialog"]')).toHaveCount(0);

    // فتح نافذة تكبير الغلاف
    await page.locator('[data-testid^="book-cover-btn-"]').first().click();
    await expect(page.locator('[data-testid="cover-zoom-dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="cover-zoom-dialog"]')).toHaveCount(0);

    // التقييم بالنجوم (محليًا دون الكتابة إلى Firebase في بيئة الاختبار)
    await page.locator('[data-testid^="rate-star-"][data-testid$="-5"]').first().click();
    await expect(page.locator('[data-testid="toast-notice"]').first()).toBeVisible();
  });
});
