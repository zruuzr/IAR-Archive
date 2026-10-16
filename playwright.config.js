// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for IAR Archive
 *
 * يستخدم python http.server محليًا لتقديم الملفات الثابتة.
 * لا يحتاج Firebase — الاختبارات لا تعتمد على الشبكة الخارجية.
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
  reporter: process.env.CI
    ? [['github'], ['list']]
    : [['list']],

  // إعدادات مشتركة
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // منع Service Worker من التسجيل أثناء الاختبارات.
    // السبب: SW يُطلق controllerchange → window.location.reload()
    // مما يسبب flakiness في الاختبارات التي تقيس DOM بعد التحميل مباشرة.
    serviceWorkers: 'block',
  },

  // متصفح واحد — Chromium فقط (الأخف والأسرع)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // خادم محلي تلقائي
  webServer: {
    command: 'python3 -m http.server 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
