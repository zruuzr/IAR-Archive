import { test, expect } from '@playwright/test';

test.describe('Routing and detail modal', () => {
  test('clicking a book card opens 3-minute summary modal', async ({ page }) => {
    await page.goto('/');
    await page.locator('.reference-card').first().waitFor({ timeout: 15_000 });

    await page.locator('.reference-card').first().click();
    await page.waitForTimeout(400);

    await expect(page.locator('.modal-sheet')).toBeVisible();
    await expect(page.locator('#modal-book-title')).not.toHaveText('');
  });

  test('modal closes when close button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.locator('.reference-card').first().waitFor({ timeout: 15_000 });

    await page.locator('.reference-card').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('.modal-sheet')).toBeVisible();

    await page.locator('.modal-close-btn').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.modal-sheet')).not.toBeVisible();
  });

  test('direct URL to static book page works', async ({ page }) => {
    await page.goto('/book/1/');
    await expect(page.locator('.book-dossier-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.dossier-title')).toBeVisible();
    await expect(page.locator('.breadcrumbs')).toBeVisible();
    await expect(page.locator('.apa-citation-block')).toBeVisible();
  });

  test('APA citation button in modal works', async ({ page }) => {
    await page.goto('/');
    await page.locator('.reference-card').first().waitFor({ timeout: 15_000 });

    await page.locator('.reference-card').first().click();
    await page.waitForTimeout(400);

    await expect(page.locator('.modal-citation-box')).toBeVisible();
    await expect(page.locator('.btn-copy-citation')).toBeVisible();
  });
});
