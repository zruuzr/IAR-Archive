const { test, expect } = require('@playwright/test');

test.describe('Routing', () => {
  test('clicking a book opens single view', async ({ page }) => {
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });

    // انقر على عنوان أول كتاب
    await page.locator('.book-card .book-title a').first().click();

    await expect(page.locator('#singleBookView')).toBeVisible();
    await expect(page.locator('#singleBookTitle')).not.toHaveText('');
  });

  test('back button restores grid', async ({ page }) => {
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });

    await page.locator('.book-card .book-title a').first().click();
    await expect(page.locator('#singleBookView')).toBeVisible();

    await page.locator('#btnBackToList').click();

    await expect(page.locator('#booksDisplayContainer')).toBeVisible();
  });

  test('direct URL to book works', async ({ page }) => {
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });
    const href = await page
      .locator('.book-card .book-title a')
      .first()
      .getAttribute('href');

    expect(href).toContain('?book=');

    await page.goto(href);

    await expect(page.locator('#singleBookView')).toBeVisible();
  });

  test('URL contains book query param after navigation', async ({ page }) => {
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });

    await page.locator('.book-card .book-title a').first().click();

    const url = page.url();
    expect(url).toContain('?book=');
  });

  test('direct URL to shared research bundle filters books and exits cleanly', async ({
    page
  }) => {
    await page.goto('/?bundle=1,2');
    await expect(page.locator('[data-testid="bundle-mode-alert"]')).toBeVisible({
      timeout: 15_000
    });
    await expect(page.locator('.book-card')).toHaveCount(2);

    await page.locator('[data-testid="exit-bundle-mode-btn"]').click();
    await expect(page.locator('[data-testid="bundle-mode-alert"]')).toHaveCount(0);
    await expect(page.locator('.book-card').first()).toBeVisible();
  });

  test('direct URL with non-existent book ID displays not-found view and recovers', async ({
    page
  }) => {
    await page.goto('/?book=99999');
    await expect(page.locator('[data-testid="book-not-found-view"]')).toBeVisible({
      timeout: 15_000
    });

    await page.locator('[data-testid="not-found-back-btn"]').click();
    await expect(page.locator('[data-testid="book-not-found-view"]')).toHaveCount(0);
    await expect(page.locator('#booksDisplayContainer')).toBeVisible();
  });
});
