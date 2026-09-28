/* ============================================================
   IAR Archive — UI helpers
   Toast notifications, clipboard, modal system, citation, share.
   ============================================================ */

import { $, $$ } from './utils.js';
import { t, field, labels } from './i18n.js';

export function toast(message, error = false) {
  let host = $('notificationHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'notificationHost';
    host.className = 'notification-host';
    document.body.append(host);
  }

  const notification = document.createElement('div');
  notification.className = `iar-notice ${error ? 'is-error' : ''}`;
  notification.setAttribute('role', error ? 'alert' : 'status');

  const content = document.createElement('span');
  content.textContent = message;

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', t('إغلاق', 'Close'));
  dismiss.onclick = () => notification.remove();

  notification.append(content, dismiss);
  host.append(notification);

  while (host.children.length > 3) host.firstElementChild.remove();
  setTimeout(() => notification.remove(), 6500);
}

export async function copy(value) {
  try {
    if (navigator.clipboard && isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const helper = document.createElement('textarea');
      helper.value = value;
      helper.style.position = 'fixed';
      helper.style.top = '-1000px';
      document.body.append(helper);
      helper.select();
      let success;
      try { success = document.execCommand('copy'); }
      finally { helper.remove(); }
      if (!success) throw new Error('Copy unavailable');
    }
    toast(t('تم النسخ إلى الحافظة.', 'Copied to clipboard.'));
  } catch {
    window.prompt(t('انسخ النص التالي:', 'Copy the following text:'), value);
  }
}

export const modal = {
  open(id) {
    const el = $(id);
    if (!el) return;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    const focusable = el.querySelector('button, [href], input, select, textarea, iframe');
    focusable?.focus?.();
  },
  close(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('is-open');
    setTimeout(() => {
      el.hidden = true;
      if (!document.querySelector('.modal.is-open')) {
        document.body.style.overflow = '';
      }
    }, 220);
  },
  closeAll() {
    $$('.modal.is-open').forEach(m => this.close(m.id));
  }
};

document.addEventListener('click', e => {
  const closeTrigger = e.target.closest('[data-close]');
  if (!closeTrigger) return;
  const modalEl = closeTrigger.closest('.modal');
  if (modalEl) modal.close(modalEl.id);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const open = document.querySelector('.modal.is-open');
    if (open) modal.close(open.id);
  }
});

export const citation = book =>
  `${field(book, 'author') || labels().unknown} (${book.year || t('د.ت.', 'n.d.')}).
${field(book, 'title')}.
${field(book, 'publisher') || labels().unknown}.`;

export function bookUrl(id) {
  const url = new URL(location.href);
  url.searchParams.delete('bundle');
  url.searchParams.set('book', id);
  url.hash = '';
  return url.href;
}

export async function share(book) {
  const url = bookUrl(book.id);
  if (navigator.share) {
    try {
      await navigator.share({
        title: field(book, 'title'),
        text: field(book, 'author'),
        url
      });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  await copy(`${field(book, 'title')}\n${url}`);
}
