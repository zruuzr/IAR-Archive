/* ============================================================
   IAR Archive — download system
   Overlay progress, streaming download, abort, counter increment.
   ============================================================ */

import { $, $$, text, finite } from './utils.js';
import { state, DL_RING_CIRC } from './state.js';
import { t, field, number } from './i18n.js';
import { byId } from './data.js';
import { toast } from './ui-helpers.js';
import { fb, timeout } from './firebase.js';

function fmtBytes(b) {
  if (!b || b < 0) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(2) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

function parseEstimatedBytes(sizeStr) {
  if (!sizeStr || typeof sizeStr !== 'string') return 0;
  const match = sizeStr.trim().match(/^([\d.]+)\s*(B|KB|MB|GB)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  if (!Number.isFinite(val) || val <= 0) return 0;
  const unit = match[2].toUpperCase();
  if (unit === 'B') return Math.round(val);
  if (unit === 'KB') return Math.round(val * 1024);
  if (unit === 'MB') return Math.round(val * 1048576);
  if (unit === 'GB') return Math.round(val * 1073741824);
  return 0;
}

function showDownloadOverlay(book) {
  const overlay = $('downloadOverlay');
  if (!overlay) return;

  text('dlBook', field(book, 'title') || '');
  text('dlPercent', '0');
  text('dlMeta', book.file_size || '—');

  const ring = overlay.querySelector('.dl-ring-fg');
  if (ring) {
    ring.style.strokeDasharray = DL_RING_CIRC;
    ring.style.strokeDashoffset = DL_RING_CIRC;
    ring.classList.remove('is-indeterminate');
  }

  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
}

function updateDownloadOverlay(received, total, isDone = false) {
  const overlay = $('downloadOverlay');
  if (!overlay || overlay.hidden) return;

  const ring = overlay.querySelector('.dl-ring-fg');
  const pctEl = $('dlPercent');
  const metaEl = $('dlMeta');

  if (isDone) {
    if (pctEl) pctEl.textContent = '100';
    if (ring) {
      ring.style.strokeDasharray = DL_RING_CIRC;
      ring.style.strokeDashoffset = 0;
      ring.classList.remove('is-indeterminate');
    }
    if (metaEl && received > 0) {
      metaEl.textContent = `${fmtBytes(received)} / ${fmtBytes(received)}`;
    }
    return;
  }

  if (total > 0) {
    const p = Math.max(0, Math.min(0.99, received / total));
    const percent = Math.round(p * 100);
    if (pctEl) pctEl.textContent = String(percent);
    if (ring) {
      ring.style.strokeDasharray = DL_RING_CIRC;
      ring.style.strokeDashoffset = DL_RING_CIRC * (1 - p);
      ring.classList.remove('is-indeterminate');
    }
    if (metaEl) metaEl.textContent = `${fmtBytes(received)} / ${fmtBytes(total)}`;
  } else {
    const pseudoP = received > 0 ? Math.min(0.9, 1 - Math.exp(-received / 2097152)) : 0;
    const percent = Math.round(pseudoP * 100);
    if (pctEl) pctEl.textContent = String(percent);
    if (ring) {
      ring.style.strokeDasharray = DL_RING_CIRC;
      ring.style.strokeDashoffset = DL_RING_CIRC * (1 - pseudoP);
      ring.classList.toggle('is-indeterminate', received === 0);
    }
    if (metaEl) metaEl.textContent = received > 0 ? fmtBytes(received) : '—';
  }
}

function hideDownloadOverlay() {
  const overlay = $('downloadOverlay');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  setTimeout(() => {
    overlay.hidden = true;
    if (!document.querySelector('.modal.is-open')) {
      document.body.style.overflow = '';
    }
  }, 240);
}

export function cancelDownload() {
  const controller = state.meta.downloadAbort;
  if (controller) {
    try {
      controller.abort();
    } catch {}
  }
}

export async function download(book) {
  if (!book.file_path || state.meta.busyDownloads.has(book.id)) return;
  state.meta.busyDownloads.add(book.id);
  setDownloadBusy(book.id, true);

  showDownloadOverlay(book);

  const controller = new AbortController();
  state.meta.downloadAbort = controller;
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new DOMException('Timeout', 'TimeoutError'));
    } catch {}
  }, 120000);

  try {
    const response = await fetch(book.file_path, { signal: controller.signal });
    if (!response.ok) throw new Error('Download unavailable');

    const headerTotal = Number(response.headers.get('Content-Length')) || 0;
    const total = headerTotal || parseEstimatedBytes(book.file_size);
    const reader =
      response.body && typeof response.body.getReader === 'function'
        ? response.body.getReader()
        : null;

    let blob;
    let received = 0;
    if (reader) {
      const chunks = [];
      updateDownloadOverlay(0, total, false);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        updateDownloadOverlay(received, Math.max(total, received), false);
      }

      const mime = response.headers.get('Content-Type') || 'application/pdf';
      blob = new Blob(chunks, { type: mime });
    } else {
      updateDownloadOverlay(0, total, false);
      blob = await response.blob();
      received = blob.size || total;
    }

    updateDownloadOverlay(received || total, received || total, true);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = book.file_name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);

    await new Promise((r) => setTimeout(r, 450));

    if (fb.db && fb.auth?.currentUser) {
      try {
        const ref = fb.db.collection('downloads').doc(String(book.id));
        await timeout(
          ref.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true })
        );
        book.downloadCount = finite((await timeout(ref.get())).data()?.count);
      } catch {}
    }

    refreshCounts();
    toast(t('تم إرسال الملف إلى المتصفح.', 'File sent to your browser.'));
  } catch (error) {
    if (error.name === 'AbortError') {
      toast(t('تم إلغاء التحميل.', 'Download cancelled.'), true);
    } else {
      toast(
        t(
          'تعذّر التحميل. جرّب فتح الملف من زر القراءة؛ قد يمنع المصدر التحميل المباشر.',
          'Download failed. Try opening the file with Read; the source may restrict direct downloads.'
        ),
        true
      );
    }
  } finally {
    clearTimeout(timeoutId);
    state.meta.downloadAbort = null;
    hideDownloadOverlay();
    state.meta.busyDownloads.delete(book.id);
    setDownloadBusy(book.id, false);
  }
}

export function setDownloadBusy(id, busy) {
  $$(`[data-action="download"][data-id="${id}"]`).forEach((button) => {
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  });
  if (state.ui.single === id && $('singleDownloadBtn')) {
    $('singleDownloadBtn').disabled = busy;
  }
}

export function refreshCounts() {
  state.data.books.forEach((book) => {
    $$(`[data-download-count="${book.id}"]`).forEach(
      (el) => (el.textContent = number(book.downloadCount))
    );
  });
  if (state.ui.single != null) {
    text('singleDownloadCount', number(byId(state.ui.single)?.downloadCount || 0));
  }
}
