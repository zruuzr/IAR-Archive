// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for IAR Archive (React + Vite Application)
 *
 * Launches the local Vite server on port 8000 serving the main `index.html` entry point.
 * Isolated from production Firebase writes via `navigator.webdriver` guard.
 */
module.exports = defineConfig({
  testDir: './e2e',

  // تشغيل الاختبارات بالتوازي حيث أمكن
  fullyParallel: true,

  // منع .only في CI (حماية من نسيان)
  forbidOnly: !!process.env.CI,

  // إعادة محاولة فاشلة مرتين في CI فقط
  retries: process.env.CI ? 2 : 0,

  // عامل واحد في CI، تلقائي محليًا
  workers: process.env.CI ? 1 : undefined,

  // تقارير
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  // إعدادات مشتركة
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block'
  },

  // متصفح واحد — Chromium فقط (الأخف والأسرع)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // خادم Vite للمعاينة لتقديم حزمة الإنتاج الفعلية في dist/
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 8000 --strictPort',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
