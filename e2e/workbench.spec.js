// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = '/home/zayan/.gemini/antigravity/brain/0bab4cb3-f49e-4c05-b32b-1d9aea0d041e';

test.describe("Scholar's Dual-Pane Workbench View Mode", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/');
    await page.waitForSelector('.book-card, [data-testid="scholar-workbench"]');
  });

  test('switches to workbench mode and renders dual-pane layout on desktop', async ({ page }) => {
    // Switch to workbench mode
    const workbenchBtn = page.locator('[data-testid="view-workbench-btn"]');
    await expect(workbenchBtn).toBeVisible();
    await workbenchBtn.click();

    // Verify workbench container
    const workbench = page.locator('[data-testid="scholar-workbench"]');
    await expect(workbench).toBeVisible();
    await workbench.scrollIntoViewIfNeeded();

    // Verify stream list items
    const streamItems = page.locator('[data-testid^="workbench-stream-item-"]');
    await expect(streamItems.first()).toBeVisible();

    // Verify inspector tabs
    const inspector = page.locator('[data-testid="workbench-inspector"]');
    await expect(inspector).toBeVisible();

    // Click on Citation tab
    await page.locator('[data-testid="workbench-tab-citation"]').click();
    await expect(page.locator('text=7th Edition')).toBeVisible();

    // Click on Contents tab
    await page.locator('[data-testid="workbench-tab-contents"]').click();

    // Click on Notes tab and type a note
    await page.locator('[data-testid="workbench-tab-notes"]').click();
    const notesInput = page.locator('[data-testid="workbench-notes-textarea"]');
    await expect(notesInput).toBeVisible();
    await notesInput.fill('ملاحظة تجريبية خاصة بالباحث لاختبار الحفظ التلقائي.');

    // Switch to another book in the stream
    const secondItem = streamItems.nth(1);
    await secondItem.click();
    await page.waitForTimeout(300);

    // Click back to first book and verify note restored
    await streamItems.first().click();
    await page.locator('[data-testid="workbench-tab-notes"]').click();
    await expect(notesInput).toHaveValue('ملاحظة تجريبية خاصة بالباحث لاختبار الحفظ التلقائي.');

    // Capture desktop screenshots
    await page.setViewportSize({ width: 1440, height: 900 });
    // Light mode screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'workbench_desktop_light.png'),
      fullPage: false
    });

    // Toggle dark mode
    await page.locator('#themeToggleBtn').click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'workbench_desktop_dark.png'),
      fullPage: false
    });

    // Test English LTR
    await page.locator('#langToggleBtn').click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'workbench_desktop_en_ltr.png'),
      fullPage: false
    });
  });

  test('adapts seamlessly to mobile viewport with tab switcher', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    const workbenchBtn = page.locator('[data-testid="view-workbench-btn"]');
    await workbenchBtn.click();

    const workbench = page.locator('[data-testid="scholar-workbench"]');
    await expect(workbench).toBeVisible();
    await workbench.scrollIntoViewIfNeeded();

    // Mobile switcher should be visible
    const mobileSwitcher = page.locator('[data-testid="workbench-mobile-switcher"]');
    await expect(mobileSwitcher).toBeVisible();

    // Screenshot mobile stream list
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'workbench_mobile_stream.png'),
      fullPage: false
    });

    // Click Inspector tab in mobile switcher
    await page.locator('[data-testid="workbench-mobile-tab-inspector"]').click();
    await page.waitForTimeout(300);

    // Screenshot mobile inspector
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'workbench_mobile_inspector.png'),
      fullPage: false
    });
  });
});
