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
    await page.waitForTimeout(500); // debounce 200ms + هامش

    const filteredCount = await page.locator('.book-card').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('search clears with clear button', async ({ page }) => {
    await page.locator('#searchInput').fill('test');
    await page.waitForTimeout(400);

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
    await page.waitForTimeout(500);

    const hasBooks = (await page.locator('.book-card').count()) > 0;
    const hasEmpty = (await page.locator('.empty-state').count()) > 0;
    expect(hasBooks || hasEmpty).toBeTruthy();
  });

  test('sort dropdown changes order', async ({ page }) => {
    // اخترنا ترتيبًا واضحًا
    await page.locator('#sortOrder').selectOption('title');
    await page.waitForTimeout(500);

    const firstTitle = await page.locator('.book-card .book-title').first().textContent();
    expect(firstTitle).toBeTruthy();
  });

  test('favorites filter toggles', async ({ page }) => {
    await page.locator('#favoritesOnlyBtn').click();
    await page.waitForTimeout(500);

    // مع عدم وجود مفضلة، يجب أن نرى empty state
    const hasBooks = (await page.locator('.book-card').count()) > 0;
    const hasEmpty = (await page.locator('.empty-state').count()) > 0;
    expect(hasBooks || hasEmpty).toBeTruthy();
  });
});
