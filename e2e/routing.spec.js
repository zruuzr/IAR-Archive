const { test, expect } = require('@playwright/test');

test.describe('Routing', () => {
  test('clicking a book opens single view', async ({ page }) => {
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });

    // انقر على عنوان أول كتاب
    await page.locator('.book-card .book-title a').first().click();
    await page.waitForTimeout(700);

    await expect(page.locator('#singleBookView')).toBeVisible();
    await expect(page.locator('#singleBookTitle')).not.toHaveText('');
  });

  test('back button restores grid', async ({ page }) => {
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });

    await page.locator('.book-card .book-title a').first().click();
    await page.waitForTimeout(700);
    await expect(page.locator('#singleBookView')).toBeVisible();

    await page.locator('#btnBackToList').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#booksDisplayContainer')).toBeVisible();
  });

  test('direct URL to book works', async ({ page }) => {
    // احصل على رابط كتاب
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });
    const href = await page.locator('.book-card .book-title a').first().getAttribute('href');

    expect(href).toContain('?book=');

    // افتح الرابط مباشرة
    await page.goto(href);
    await page.waitForTimeout(800);

    await expect(page.locator('#singleBookView')).toBeVisible();
  });

  test('URL contains book query param after navigation', async ({ page }) => {
    await page.goto('/');
    await page.locator('.book-card').first().waitFor({ timeout: 15_000 });

    await page.locator('.book-card .book-title a').first().click();
    await page.waitForTimeout(500);

    const url = page.url();
    expect(url).toContain('?book=');
  });
});
