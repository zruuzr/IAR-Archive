/* ============================================================
   IAR Archive — PWA install prompt handling
   ============================================================ */

import { $ } from './utils.js';
import { state } from './state.js';
import { t } from './i18n.js';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function showInstallButton(promptEvent) {
  if (isStandalone()) return;
  state.meta.deferredPrompt = promptEvent || null;
  $('installBtn')?.classList.remove('d-none');
}

export function initPWA() {
  window.__iarPWAReady = showInstallButton;
  if (window.__iarInstallPrompt) showInstallButton(window.__iarInstallPrompt);

  setTimeout(() => {
    if (isStandalone()) return;
    if (!state.meta.deferredPrompt && !window.__iarInstallPrompt) {
      $('installBtn')?.classList.remove('d-none');
    }
  }, 3000);

  $('installBtn')?.addEventListener('click', async () => {
    const prompt = state.meta.deferredPrompt || window.__iarInstallPrompt;
    if (prompt) {
      prompt.prompt();
      try {
        const { outcome } = await prompt.userChoice;
        console.log('PWA install outcome:', outcome);
      } catch (err) {
        console.warn('PWA install failed:', err);
      }
      state.meta.deferredPrompt = null;
      window.__iarInstallPrompt = null;
      $('installBtn')?.classList.add('d-none');
    } else {
      alert(
        t(
          'لتثبيت التطبيق:\n' +
            '• Android/Chrome: افتح قائمة المتصفح (⋮) واختر "تثبيت التطبيق".\n' +
            '• iPhone/Safari: اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية".',
          'To install:\n' +
            '• Android/Chrome: open browser menu (⋮) → "Install app".\n' +
            '• iPhone/Safari: tap Share → "Add to Home Screen".'
        )
      );
    }
  });
}
