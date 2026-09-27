const { test, expect } = require('@playwright/test');

test.describe('Language and theme', () => {
  test('default is Arabic RTL', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('language toggle switches to English LTR', async ({ page }) => {
    await page.goto('/');
    await page.locator('#langToggleBtn').click();
    await page.waitForTimeout(500);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('language persists in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.locator('#langToggleBtn').click();
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForTimeout(800);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('theme toggle switches color scheme', async ({ page }) => {
    await page.goto('/');

    const initialTheme = await page.locator('html').getAttribute('data-theme');
    expect(initialTheme).toBeTruthy();

    await page.locator('#themeToggleBtn').click();
    await page.waitForTimeout(500);

    const newTheme = await page.locator('html').getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('theme persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('#themeToggleBtn').click();
    await page.waitForTimeout(500);

    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBeTruthy();

    await page.reload();
    await page.waitForTimeout(800);

    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  });
});
