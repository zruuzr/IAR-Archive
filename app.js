/* ============================================================
   IAR Archive — application logic (vanilla)
   Stack: Vanilla JS. No frameworks.
   Preserved: Firebase (Firestore + Anonymous Auth), pdf.js viewer
             (Mozilla), PWA install prompt, Service Worker.
   ============================================================ */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, String(value)); } catch {}
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch {}
    }
  };

  const savedArray = key => {
    try {
      const v = JSON.parse(store.get(key, '[]'));
      return Array.isArray(v) ? v.filter(Number.isSafeInteger) : [];
    } catch { return []; }
  };

  const state = {
    data: { books: [], loaded: false, loading: true, error: false },
    ui: {
      lang: document.documentElement.lang === 'en' ? 'en' : 'ar',
      theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      view: store.get('iar_view_mode', 'grid') === 'list' ? 'list' : 'grid',
      page: 1,
      single: null,
      summary: null
    },
    filters: { query: '', category: 'all', favoritesOnly: false },
    user: {
      favorites: new Set(savedArray('iar_favorites')),
      bundle: new Set(),
      bundleMode: false
    },
    meta: {
      savedLibraryState: null,
      deferredPrompt: null,
      busyRatings: new Set(),
      busyDownloads: new Set(),
      ratedIds: new Set(),
      ratedLoadedIds: new Set(),
      downloadAbort: null
    }
  };

  const motion = () =>
    matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  const esc = v =>
    String(v ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

  const text = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const attr = (id, k, v) => { const el = $(id); if (el) el.setAttribute(k, v); };
  const visible = (id, show) => { const el = $(id); if (el) el.classList.toggle('d-none', !show); };

  const clean = v => (v == null ? '' : String(v).trim());
  const finite = v => Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0;
  const words = v => Array.isArray(v) ? v.map(clean).filter(Boolean) : [];

  const field = (book, name) =>
    state.ui.lang === 'en' && book[name + '_en'] ? book[name + '_en'] : book[name];

  const t = (ar, en) => (state.ui.lang === 'ar' ? ar : en);

  const number = v =>
    new Intl.NumberFormat(
      state.ui.lang === 'ar' ? 'ar-u-nu-latn' : 'en-US'
    ).format(v);

  const i = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  const labels = () => ({
    read: t('قراءة', 'Read'),
    download: t('تحميل', 'Download'),
    summary: t('ملخص 3 دقائق', '3-minute summary'),
    cite: t('توثيق APA', 'Cite APA'),
    share: t('مشاركة', 'Share'),
    favorite: t('المفضلة', 'Favorite'),
    unknown: t('غير متوفر', 'Not provided')
  });

  function asset(value, pdf = false) {
    const raw = clean(value);
    if (!raw) return '';
    try {
      if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return '';
      if (/^https?:\/\//i.test(raw)) {
        const url = new URL(raw);
        if (url.username || url.password) return '';
        if (url.hostname === 'github.com' && url.pathname.includes('/blob/')) {
          url.hostname = 'raw.githubusercontent.com';
          url.pathname = url.pathname.replace('/blob/', '/');
        }
        return url.href;
      }
      const base = pdf
        ? 'https://raw.githubusercontent.com/zruuzr/IAR-Archive/main/'
        : location.href;
      const url = new URL(raw.replace(/^\/+/, ''), base);
      return ['http:', 'https:', 'file:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || raw.id === '' || raw.id == null) return null;
    const id = Number(raw.id);
    if (!Number.isSafeInteger(id) || id < 0 || !clean(raw.title)) return null;

    const book = { id };
    ['title', 'author', 'category', 'description', 'publisher', 'type', 'target_audience', 'badge_text']
      .forEach(key => {
        book[key] = clean(raw[key]);
        book[key + '_en'] = clean(raw[key + '_en']);
      });

    ['year', 'pages', 'file_size'].forEach(key => (book[key] = clean(raw[key])));
    ['keywords', 'keywords_en', 'key_points', 'key_points_en']
      .forEach(key => (book[key] = words(raw[key])));

    book.featured = raw.featured === true;
    book.cover_image = asset(raw.cover_image);
    book.file_path = asset(raw.file_path, true);

    let name = clean(raw.file_name) ||
      clean(raw.file_path).split('/').pop()?.split('?')[0] || '';
    try { name = decodeURIComponent(name); } catch {}
    book.file_name = name.replace(/[\\/\u0000-\u001f]/g, '_') || `IAR-${id}.pdf`;

    book.downloadCount = 0;
    book.publicRating = 0;
    book.ratingSum = 0;
    book.ratingCount = 0;
    book.voters = [];
    return book;
  }

  const byId = id => state.data.books.find(b => b.id === Number(id));
  const categoryKey = b => b.category || '__general__';
  const categoryLabel = b => field(b, 'category') || t('عام', 'General');

  // ---------- Firebase ----------
  let db = null;
  let auth = null;
  let firebaseReady = Promise.resolve();

  const timeout = (promise, ms = 8000) => {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout')), ms); })
    ]).finally(() => clearTimeout(timer));
  };

  async function connectFirebase() {
    try {
      if (!window.firebase) throw new Error('Firebase SDK not loaded');
      const config = {
        apiKey: 'AIzaSyAug0yFzjQ4ud6zX2ugK_T7Lj7LfuO04tw',
        authDomain: 'iar-archive-328bc.firebaseapp.com',
        projectId: 'iar-archive-328bc',
        storageBucket: 'iar-archive-328bc.firebasestorage.app',
        messagingSenderId: '81911492650',
        appId: '1:81911492650:web:c6ac2f89d52bdd7065d353',
        measurementId: 'G-PYZEY63LTR'
      };
      if (!firebase.apps.length) firebase.initializeApp(config);
      db = firebase.firestore();
      try {
        db.settings({
          experimentalAutoDetectLongPolling: true,
          useFetchStreams: false
        });
      } catch {}
      auth = firebase.auth();
      await timeout(auth.signInAnonymously(), 5000);
    } catch (error) {
      console.warn('Firebase services unavailable:', error.message);
    }
  }

  async function loadMetrics() {
    await firebaseReady;
    if (!db) { text('siteVisitsCounter', '—'); return; }

    await Promise.allSettled(['ratings', 'downloads'].map(async name => {
      const snapshot = await timeout(db.collection(name).get());
      snapshot.forEach(doc => {
        const book = byId(doc.id);
        if (!book) return;
        const data = doc.data();
        if (name === 'downloads') {
          book.downloadCount = finite(data.count);
        } else {
          book.ratingSum = finite(data.ratingSum);
          book.ratingCount = finite(data.ratingCount);
          book.publicRating = Math.min(5, finite(data.average));
          book.voters = Array.isArray(data.voters)
            ? data.voters.filter(v => typeof v === 'string')
            : [];
        }
      });
    }));

    refreshRatings();
    refreshCounts();

    try {
      const visits = db.collection('stats').doc('visits');
      const dateParts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Baghdad',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).formatToParts(new Date()).map(part => [part.type, part.value])
      );
      const dateKey = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
      const lastDate = store.get('iar_last_visit_date', '');
      let count;

      if (auth?.currentUser && lastDate !== dateKey) {
        count = await timeout(db.runTransaction(async transaction => {
          const doc = await transaction.get(visits);
          const data = doc.data() || {};
          const sameDay = typeof data.date === 'string' && data.date === dateKey;
          const legacy = !Object.prototype.hasOwnProperty.call(data, 'date') && Number.isFinite(Number(data.count));
          const next = sameDay ? finite(data.count) + 1 : (legacy ? finite(data.count) + 1 : 1);
          transaction.set(visits, { date: dateKey, count: next }, { merge: true });
          return next;
        }));
        store.set('iar_last_visit_date', dateKey);
      } else {
        count = finite((await timeout(visits.get())).data()?.count);
      }

      text('siteVisitsCounter', number(count));
    } catch {
      text('siteVisitsCounter', '—');
    }

    if (!state.ui.single && ['rating', 'downloads'].includes($('sortOrder')?.value)) {
      render();
    }
  }

  function toast(message, error = false) {
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

  async function copy(value) {
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

  const citation = book =>
    `${field(book, 'author') || labels().unknown} (${book.year || t('د.ت.', 'n.d.')}).
${field(book, 'title')}.
${field(book, 'publisher') || labels().unknown}.`;

  function bookUrl(id) {
    const url = new URL(location.href);
    url.searchParams.delete('bundle');
    url.searchParams.set('book', id);
    url.hash = '';
    return url.href;
  }

  async function share(book) {
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

  // ---------- Vanilla modal system ----------
  const modal = {
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

  function readBook(book) {
    if (!book.file_path) {
      return toast(t('ملف المرجع غير متاح.', 'Reference file unavailable.'), true);
    }
    text('modalBookTitle', field(book, 'title'));
    const frame = $('pdfFrame');
    if (!frame) return;
    const absoluteUrl = new URL(book.file_path, location.href).href;
    frame.src = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(absoluteUrl)}`;
    modal.open('pdfReaderModal');
  }

  const pdfModal = $('pdfReaderModal');
  if (pdfModal) {
    const observer = new MutationObserver(() => {
      if (pdfModal.hidden) {
        const frame = $('pdfFrame');
        if (frame) frame.src = 'about:blank';
      }
    });
    observer.observe(pdfModal, { attributes: true, attributeFilter: ['hidden'] });
  }

  // ============================================================
  // Download progress overlay
  // ============================================================
  const DL_RING_CIRC = 2 * Math.PI * 88;

  function fmtBytes(b) {
    if (!b || b < 0) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(2) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }

  function showDownloadOverlay(book) {
    const overlay = $('downloadOverlay');
    if (!overlay) return;

    text('dlBook', field(book, 'title') || '');
    text('dlPercent', '0');
    text('dlMeta', '—');

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

  function updateDownloadOverlay(received, total) {
    const overlay = $('downloadOverlay');
    if (!overlay || overlay.hidden) return;

    const ring = overlay.querySelector('.dl-ring-fg');
    const pctEl = $('dlPercent');
    const metaEl = $('dlMeta');

    if (total > 0) {
      const p = Math.max(0, Math.min(1, received / total));
      const percent = Math.round(p * 100);
      if (pctEl) pctEl.textContent = String(percent);
      if (ring) {
        ring.style.strokeDasharray = DL_RING_CIRC;
        ring.style.strokeDashoffset = DL_RING_CIRC * (1 - p);
        ring.classList.remove('is-indeterminate');
      }
      if (metaEl) metaEl.textContent = `${fmtBytes(received)} / ${fmtBytes(total)}`;
    } else {
      if (pctEl) pctEl.textContent = '—';
      if (ring) ring.classList.add('is-indeterminate');
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

  $('dlCancel')?.addEventListener('click', () => {
    const controller = state.meta.downloadAbort;
    if (controller) {
      try { controller.abort(); } catch {}
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const overlay = $('downloadOverlay');
    if (overlay && overlay.classList.contains('is-open')) {
      const controller = state.meta.downloadAbort;
      if (controller) {
        try { controller.abort(); } catch {}
      }
    }
  });

  async function download(book) {
    if (!book.file_path || state.meta.busyDownloads.has(book.id)) return;
    state.meta.busyDownloads.add(book.id);
    setDownloadBusy(book.id, true);

    showDownloadOverlay(book);

    const controller = new AbortController();
    state.meta.downloadAbort = controller;
    const timeoutId = setTimeout(() => {
      try { controller.abort(new DOMException('Timeout', 'TimeoutError')); } catch {}
    }, 120000);

    try {
      const response = await fetch(book.file_path, { signal: controller.signal });
      if (!response.ok) throw new Error('Download unavailable');

      const total = Number(response.headers.get('Content-Length')) || 0;
      const reader = response.body && typeof response.body.getReader === 'function'
        ? response.body.getReader()
        : null;

      let blob;
      if (reader) {
        const chunks = [];
        let received = 0;
        updateDownloadOverlay(0, total);

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          updateDownloadOverlay(received, total);
        }

        const mime = response.headers.get('Content-Type') || 'application/pdf';
        blob = new Blob(chunks, { type: mime });
      } else {
        updateDownloadOverlay(0, 0);
        blob = await response.blob();
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = book.file_name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      if (total > 0) updateDownloadOverlay(total, total);
      await new Promise(r => setTimeout(r, 400));

      if (db && auth?.currentUser) {
        try {
          const ref = db.collection('downloads').doc(String(book.id));
          await timeout(ref.set(
            { count: firebase.firestore.FieldValue.increment(1) },
            { merge: true }
          ));
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

  function setDownloadBusy(id, busy) {
    $$(`[data-action="download"][data-id="${id}"]`).forEach(button => {
      button.disabled = busy;
      button.setAttribute('aria-busy', String(busy));
    });
    if (state.ui.single === id && $('singleDownloadBtn')) {
      $('singleDownloadBtn').disabled = busy;
    }
  }

  function refreshCounts() {
    state.data.books.forEach(book => {
      $$(`[data-download-count="${book.id}"]`).forEach(
        el => (el.textContent = number(book.downloadCount))
      );
    });
    if (state.ui.single != null) {
      text('singleDownloadCount', number(byId(state.ui.single)?.downloadCount || 0));
    }
  }

  const rated = book =>
    state.meta.ratedIds.has(book.id) ||
    (Array.isArray(book.voters) && book.voters.includes(auth?.currentUser?.uid));

  async function loadRated(book) {
    try {
      await firebaseReady;
      if (!db || !auth?.currentUser || !book) return false;
      const uid = auth.currentUser.uid;
      const ref = db.collection('ratings').doc(String(book.id)).collection('votes').doc(uid);
      const snap = await timeout(ref.get());
      if (snap.exists) state.meta.ratedIds.add(book.id);
      else state.meta.ratedIds.delete(book.id);
      state.meta.ratedLoadedIds.add(book.id);
      return snap.exists;
    } catch (error) {
      console.warn('Unable to load private rating status:', error?.message || error);
      return false;
    }
  }

  function scheduleRatedLoad(bookIds) {
    const ids = [...new Set(bookIds.map(Number).filter(Number.isSafeInteger))]
      .filter(id => !state.meta.ratedLoadedIds.has(id));
    if (!ids.length) return;
    const run = () => {
      void Promise.all(ids.map(id => loadRated(byId(id)))).then(() => refreshRatings());
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      window.setTimeout(run, 0);
    }
  }

  function stars(book) {
    const done = rated(book);
    const busy = state.meta.busyRatings.has(book.id);

    const ratingDisplay = book.ratingCount
      ? `${book.publicRating.toFixed(2)} · ${number(book.ratingCount)}`
      : t('كن أول المقيّمين', 'Be the first to rate');

    return `<div class="rating-stars" data-stars="${book.id}" role="group" aria-label="${esc(t('تقييم المرجع', 'Rate reference'))}">
${[1, 2, 3, 4, 5].map(value =>
  `<button type="button" class="star-button ${value <= Math.round(book.publicRating) ? 'active' : ''}"
    data-action="rate" data-id="${book.id}" data-rating="${value}"
    aria-label="${esc(t(`تقييم ${value} من 5`, `Rate ${value} out of 5`))}"
    ${done || busy ? 'disabled' : ''}>${i(value <= Math.round(book.publicRating) ? 'star-filled' : 'star')}</button>`
).join('')}
<small>${ratingDisplay}</small>
</div>`;
  }

  function refreshRatings() {
    $$('[data-stars]').forEach(el => {
      const book = byId(el.dataset.stars);
      if (book) el.outerHTML = stars(book);
    });
  }

  async function rate(book, value) {
    if (!Number.isInteger(value) || value < 1 || value > 5) return;
    if (state.meta.busyRatings.has(book.id) || rated(book)) return;

    state.meta.busyRatings.add(book.id);
    refreshRatings();

    try {
      await firebaseReady;
      if (!db || !auth?.currentUser) throw Object.assign(new Error('AUTH'), { code: 'auth/unavailable' });

      const uid = auth.currentUser.uid;
      const result = await db.runTransaction(async transaction => {
        const aggregateRef = db.collection('ratings').doc(String(book.id));
        const voteRef = aggregateRef.collection('votes').doc(uid);

        // Firestore transactions require all reads to happen before writes.
        const aggregateDoc = await transaction.get(aggregateRef);
        const voteDoc = await transaction.get(voteRef);

        if (voteDoc.exists) throw Object.assign(new Error('ALREADY_VOTED'), { code: 'already-voted' });

        const data = aggregateDoc.exists ? (aggregateDoc.data() || {}) : {};
        const legacyVoters = Array.isArray(data.voters)
          ? data.voters.filter(v => typeof v === 'string')
          : [];

        // Preserve duplicate-vote protection for legacy aggregate documents.
        if (legacyVoters.includes(uid)) {
          throw Object.assign(new Error('ALREADY_VOTED'), { code: 'already-voted' });
        }

        const ratingSum = finite(data.ratingSum) + value;
        const ratingCount = finite(data.ratingCount) + 1;
        const result = {
          ratingSum,
          ratingCount,
          average: Number((ratingSum / ratingCount).toFixed(2))
        };

        // Legacy documents retain voters. New documents remain private.
        if (aggregateDoc.exists && Object.prototype.hasOwnProperty.call(data, 'voters')) {
          result.voters = [...legacyVoters, uid];
        }

        // The aggregate and private vote are committed atomically.
        transaction.create(voteRef, { value });
        transaction.set(aggregateRef, result);

        return result;
      });

      Object.assign(book, {
        ratingSum: result.ratingSum,
        ratingCount: result.ratingCount,
        publicRating: result.average
      });
      if (Array.isArray(result.voters)) book.voters = result.voters;
      state.meta.ratedIds.add(book.id);
      state.meta.ratedLoadedIds.add(book.id);

      toast(t('تم حفظ تقييمك.', 'Your rating was saved.'));
    } catch (error) {
      console.error('Rating failed:', {
        code: error?.code || '',
        name: error?.name || '',
        message: error?.message || String(error)
      });

      const code = error?.code || '';
      const duplicate = code === 'already-voted' || error?.message === 'ALREADY_VOTED';
      const denied = code === 'permission-denied' || code === 'PERMISSION_DENIED';

      if (duplicate) state.meta.ratedIds.add(book.id);

      toast(
        duplicate
          ? t('سبق أن قيّمت هذا المرجع.', 'You already rated this reference.')
          : denied
            ? t('رفضت قواعد Firebase عملية التقييم. تأكد من نشر firestore.rules ثم أعد المحاولة.', 'Firebase rules rejected the rating. Deploy firestore.rules, then try again.')
            : code === 'auth/unavailable'
              ? t('تعذّر إنشاء جلسة Firebase. أعد تحميل الصفحة.', 'Firebase authentication is unavailable. Reload the page.')
              : t('تعذّر حفظ التقييم. تحقق من الاتصال وصلاحيات Firebase.', 'Rating failed. Check connectivity and Firebase permissions.'),
        true
      );
    } finally {
      state.meta.busyRatings.delete(book.id);
      refreshRatings();
    }
  }

  function cover(book, featured = false) {
    const title = esc(field(book, 'title'));
    const color = book.id % 5;
    const symbols = ['command', 'git-branch', 'layers', 'asterisk', 'circle'];

    const image = book.cover_image
      ? `<img class="cover-img" src="${esc(book.cover_image)}" alt="${title}" loading="${featured ? 'eager' : 'lazy'}">`
      : '';

    const fallback = `<span class="cover-placeholder designed-cover cover-tone-${color}" ${image ? 'hidden' : ''}>
      <span class="cover-edition">IAR / ${esc(book.year || 'ARCHIVE')}</span>
      <span class="cover-symbol" aria-hidden="true">${i(symbols[color])}</span>
      <span class="cover-name">${title}</span>
      <span class="cover-caption">IAR ARCHIVE</span>
    </span>`;

    return `<div class="cover-container ${featured ? 'featured-cover' : ''}">
      <button type="button" class="cover-btn" data-action="${book.cover_image ? 'cover' : 'details'}" data-id="${book.id}" aria-label="${esc(t('عرض', 'View'))}: ${title}">
        ${image}
        ${fallback}
      </button>
    </div>`;
  }

  function action(book, name, icon, label, primary = false, iconOnly = false) {
    const disabled = ['read', 'download'].includes(name) && !book.file_path;
    const pressed = name === 'favorite' ? `aria-pressed="${state.user.favorites.has(book.id)}"` : '';
    const count = name === 'download'
      ? `<span class="download-count" data-download-count="${book.id}">${number(book.downloadCount)}</span>`
      : '';

    return `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-ghost'}"
      data-action="${name}" data-id="${book.id}" ${disabled ? 'disabled' : ''}
      aria-label="${esc(label)}" title="${esc(label)}" ${pressed}>
      ${i(icon)}${iconOnly ? '' : `<span>${esc(label)}</span>`}${count}
    </button>`;
  }

  function actions(book) {
    const l = labels();
    const fav = state.user.favorites.has(book.id);

    return `<div class="book-actions">
      ${action(book, 'read', 'book', l.read)}
      ${action(book, 'download', 'download', l.download, true)}
      ${action(book, 'summary', 'zap', l.summary)}
      ${action(book, 'cite', 'quote', l.cite, false, true)}
      ${action(book, 'favorite',
        fav ? 'heart-filled' : 'heart',
        fav ? t('إزالة من المفضلة', 'Remove favorite') : t('إضافة إلى المفضلة', 'Add favorite'),
        false, true)}
      ${action(book, 'share', 'share', l.share, false, true)}
    </div>`;
  }

  function bookCard(book) {
    return `<article class="book-card">
      <div class="book-topline">
        <span class="badge-type">${esc(field(book, 'type') || t('مرجع إداري', 'Reference'))}</span>
        <label class="bundle-select">
          <input type="checkbox" data-action="bundle" data-id="${book.id}"
            ${state.user.bundle.has(book.id) ? 'checked' : ''}
            aria-label="${esc(t('أضف إلى الحزمة: ', 'Add to bundle: ') + field(book, 'title'))}">
          <span>${t('حزمة البحث', 'Bundle')}</span>
        </label>
      </div>
      <div class="book-main">
        ${cover(book)}
        <div class="book-info">
          <span class="badge-tag">${esc(categoryLabel(book))}</span>
          <h3 class="book-title">
            <a href="${esc(bookUrl(book.id))}" data-action="details" data-id="${book.id}">
              ${esc(field(book, 'title'))}
            </a>
          </h3>
          <p class="book-author">${esc(field(book, 'author') || labels().unknown)}</p>
          ${stars(book)}
          <div class="book-meta">
            <span class="meta-chip">${i('calendar')} ${esc(book.year || '—')}</span>
            <span class="meta-chip">${i('file-text')} ${esc(book.pages || '—')} ${t('صفحة', 'pages')}</span>
          </div>
        </div>
      </div>
      <p class="book-desc">${esc(field(book, 'description') || labels().unknown)}</p>
      ${actions(book)}
    </article>`;
  }

  function featured(book) {
    return `<article class="featured-card">
      <div class="featured-inner">
        <div class="featured-sweep" aria-hidden="true"></div>
        <div class="featured-layout">
          ${cover(book, true)}
          <div class="featured-copy">
            <span class="featured-badge">
              ${i('sparkles')}
              ${esc(field(book, 'badge_text') || t('في دائرة الضوء', 'In the spotlight'))}
            </span>
            <div class="featured-meta-row">
              <span class="badge-tag">${esc(categoryLabel(book))}</span>
              <span class="featured-index">01 / IAR SELECTION</span>
            </div>
            <h2>
              <a href="${esc(bookUrl(book.id))}" data-action="details" data-id="${book.id}">
                ${esc(field(book, 'title'))}
              </a>
            </h2>
            <p class="book-author">${esc(field(book, 'author'))}</p>
            <p class="book-desc">${esc(field(book, 'description'))}</p>
            ${stars(book)}
            ${actions(book)}
          </div>
        </div>
      </div>
    </article>`;
  }

  function filteredBooks() {
    const norm = v => v
      .toLocaleLowerCase(state.ui.lang)
      .normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/\u0640/g, '');

    const query = norm(state.filters.query);

    const books = state.data.books.filter(book => {
      if (state.user.bundleMode && !state.user.bundle.has(book.id)) return false;
      if (state.filters.favoritesOnly && !state.user.favorites.has(book.id)) return false;
      if (state.filters.category !== 'all' && categoryKey(book) !== state.filters.category) return false;

      const haystack = ['title', 'author', 'publisher', 'description', 'category']
        .flatMap(key => [book[key], book[key + '_en']])
        .concat(book.keywords, book.keywords_en)
        .join(' ');

      return !query || norm(haystack).includes(query);
    });

    const titleSort = (a, b) => field(a, 'title').localeCompare(field(b, 'title'), state.ui.lang);

    const sorts = {
      default: (a, b) => Number(b.featured) - Number(a.featured) || a.id - b.id,
      title: titleSort,
      year: (a, b) => finite(b.year) - finite(a.year),
      pages: (a, b) => finite(a.pages) - finite(b.pages),
      downloads: (a, b) => b.downloadCount - a.downloadCount,
      rating: (a, b) => b.publicRating - a.publicRating,
      favorites: (a, b) =>
        Number(state.user.favorites.has(b.id)) - Number(state.user.favorites.has(a.id)) || titleSort(a, b)
    };

    return books.sort(sorts[$('sortOrder')?.value] || sorts.default);
  }

  function pagination(total) {
    const nav = $('paginationContainer');
    if (!nav) return;
    nav.innerHTML = '';
    if (total <= 1) return;

    const values = [...new Set([
      1, total, state.ui.page - 1, state.ui.page, state.ui.page + 1,
      ...(state.ui.page < 4 ? [2, 3, 4, 5] : []),
      ...(state.ui.page > total - 3 ? [total - 4, total - 3, total - 2, total - 1] : [])
    ])]
      .filter(v => v > 0 && v <= total)
      .sort((a, b) => a - b);

    const button = (value, label, disabled = false, role = '') =>
      `<li class="page-item">
        <button type="button" class="page-btn ${value === state.ui.page ? 'active' : ''}"
          ${role ? `data-page-${role}` : ''}
          data-page="${value}" ${disabled ? 'disabled' : ''}
          ${value === state.ui.page ? 'aria-current="page"' : ''}>
          <span class="page-label">${label}</span>
        </button>
      </li>`;

    let html = button(state.ui.page - 1, t('السابق', 'Previous'), state.ui.page === 1, 'prev');
    let last = 0;

    values.forEach(value => {
      if (last && value - last > 1) {
        html += `<li class="page-item"><span class="page-ellipsis" aria-hidden="true">…</span></li>`;
      }
      html += button(value, number(value));
      last = value;
    });

    nav.innerHTML = html + button(state.ui.page + 1, t('التالي', 'Next'), state.ui.page === total, 'next');
  }

  function syncBundle() {
    text('bundleCount', number(state.user.bundle.size));
    visible('bundleBar', state.user.bundle.size > 0 && state.ui.single === null);

    if ($('copyBundleBtn')) $('copyBundleBtn').disabled = state.user.bundle.size === 0;

    const host = $('bundleModeAlertContainer');
    visible('bundleModeAlertContainer', state.ui.single === null);
    if (!host) return;

    host.innerHTML = state.user.bundleMode
      ? `<div class="bundle-mode-notice">
          ${i('layers-filled')}
          <span>${t('حزمة بحثية مشتركة', 'Shared research bundle')} · ${number(state.user.bundle.size)}</span>
          <button type="button" class="btn btn-ghost" data-action="clear-bundle">
            ${t('العودة للمكتبة', 'Back to library')}
          </button>
        </div>`
      : '';
  }

  function render() {
    if (state.ui.single !== null) { renderSingle(); return; }

    visible('singleBookView', false);
    ['booksDisplayContainer', 'controlsRow'].forEach(id => visible(id, true));

    document.querySelector('.chips-container')?.classList.remove('d-none');
    $('paginationContainer')?.parentElement?.classList.remove('d-none');

    syncBundle();
    if (!state.data.loaded) return;

    const books = filteredBooks();

    const isDefaultView =
      !state.filters.query &&
      state.filters.category === 'all' &&
      !state.user.bundleMode &&
      !state.filters.favoritesOnly;

    const featuredBook = isDefaultView ? books.find(b => b.featured) : null;
    const spotlight = isDefaultView && state.ui.page === 1 ? featuredBook : null;

    $('featuredSection').innerHTML = spotlight ? featured(spotlight) : '';

    const gridBooks = featuredBook
      ? books.filter(b => b.id !== featuredBook.id)
      : books;

    const size = 6;
    const total = Math.ceil(gridBooks.length / size);
    state.ui.page = Math.min(state.ui.page, Math.max(1, total));

    const page = gridBooks.slice((state.ui.page - 1) * size, state.ui.page * size);

    $('booksDisplayContainer').innerHTML = gridBooks.length
      ? `<div class="books-grid ${state.ui.view === 'list' ? 'is-list' : ''}">${page.map(bookCard).join('')}</div>`
      : `<div class="empty-state">
          ${i('search')}
          <h3>${t('لا توجد نتائج مطابقة', 'No matching references')}</h3>
          <p>${t('جرّب كلمات أخرى أو أعد ضبط خيارات العرض.', 'Try another search or reset your filters.')}</p>
          <button class="btn btn-primary" data-action="reset">${t('إعادة ضبط البحث', 'Reset filters')}</button>
        </div>`;

    pagination(total);
    refreshCounts();
    updateChips();
    scheduleRatedLoad(page.map(book => book.id));

    $('btnViewGrid')?.classList.toggle('active', state.ui.view === 'grid');
    attr('btnViewGrid', 'aria-pressed', state.ui.view === 'grid');
    $('btnViewList')?.classList.toggle('active', state.ui.view === 'list');
    attr('btnViewList', 'aria-pressed', state.ui.view === 'list');
    $('favoritesOnlyBtn')?.classList.toggle('active', state.filters.favoritesOnly);
    attr('favoritesOnlyBtn', 'aria-pressed', state.filters.favoritesOnly);
  }

  function categories() {
    const map = new Map();
    state.data.books.forEach(book => map.set(categoryKey(book), categoryLabel(book)));
    text('catCounter', number(map.size));

    const chips = $('categoryChips');
    if (!chips) return;

    chips.innerHTML = [['all', t('كل المراجع', 'All references')], ...map]
      .map(([key, label]) => `<button type="button" class="chip-item ${state.filters.category === key ? 'active' : ''}"
        data-category="${esc(key)}" aria-pressed="${state.filters.category === key}">${esc(label)}</button>`)
      .join('');

    requestAnimationFrame(updateChips);
  }

  function updateChips() {
    const wrapper = $('categoryChips');
    if (!wrapper) return;
    const container = wrapper.closest('.chips-container');
    if (!container) return;

    const max = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
    const current = Math.min(max, Math.abs(wrapper.scrollLeft));
    const start = max > 5 && current > 5;
    const end = max > 5 && current < max - 5;

    $('chipsScrollLeft')?.classList.toggle('can-show', start);
    $('chipsScrollRight')?.classList.toggle('can-show', end);
  }

  function metadata(book = null) {
    const title = book
      ? `${field(book, 'title')} | IAR Archive`
      : 'IAR Archive | Iraqi Administrative Reference';

    const description = book
      ? field(book, 'description')
      : t(
          'مساحة معرفية للمراجع الإدارية، والملخصات، والتوثيق الأكاديمي.',
          'A knowledge space for management references, summaries and academic citations.'
        );

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description.slice(0, 160));
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description.slice(0, 160));
  }

  function points(book) {
    const list = state.ui.lang === 'en' && book.key_points_en.length
      ? book.key_points_en
      : book.key_points;

    return list.length
      ? list
      : [t('لم يُرفق ملخص لهذا المرجع بعد.', 'No summary has been provided for this reference yet.')];
  }

  function summary(book) {
    state.ui.summary = book.id;

    text('summaryBookTitle', field(book, 'title'));
    text('summaryBookAuthor', field(book, 'author'));
    text('summaryCategory', categoryLabel(book));
    text('summaryType', field(book, 'type'));
    text('summaryPages', `${book.pages || '—'} ${t('صفحة', 'pages')}`);
    text('summarySize', book.file_size || '—');
    text('summaryAudience', field(book, 'target_audience') || labels().unknown);
    text('summaryAPA', citation(book));

    const apa = $('summaryAPA');
    if (apa) apa.dir = 'auto';

    const list = $('summaryKeyPoints');
    if (list) list.innerHTML = points(book).map(p => `<li>${esc(p)}</li>`).join('');

    modal.open('summaryModal');
  }

  function renderSingle() {
    const book = byId(state.ui.single);
    if (!book) return;

    ['booksDisplayContainer', 'controlsRow', 'bundleBar', 'bundleModeAlertContainer']
      .forEach(id => visible(id, false));
    document.querySelector('.chips-container')?.classList.add('d-none');
    $('paginationContainer')?.parentElement?.classList.add('d-none');
    $('featuredSection').innerHTML = '';

    visible('singleBookView', true);

    const img = $('singleBookCover');
    if (img) {
      if (book.cover_image) {
        img.src = book.cover_image;
        img.hidden = false;
      } else {
        img.hidden = true;
        img.removeAttribute('src');
      }
      img.alt = field(book, 'title');
    }

    let fallback = $('singleCoverFallback');
    if (!fallback && img) {
      fallback = document.createElement('div');
      fallback.id = 'singleCoverFallback';
      img.parentElement.append(fallback);
    }
    if (fallback) fallback.innerHTML = book.cover_image ? '' : cover(book, true);

    text('singleBookTitle', field(book, 'title'));
    text('singleBookAuthor', field(book, 'author') || labels().unknown);
    text('singleBookCategory', categoryLabel(book));
    text('singleBookType', field(book, 'type'));
    text('singleBookDescription', field(book, 'description') || labels().unknown);
    text('singleBookAudience', field(book, 'target_audience') || labels().unknown);

    const kp = $('singleBookKeyPoints');
    if (kp) kp.innerHTML = points(book).map(p => `<li>${esc(p)}</li>`).join('');

    const starsContainer = $('singleBookStars');
    if (starsContainer) starsContainer.innerHTML = stars(book);

    text('singleDownloadCount', number(book.downloadCount));

    if ($('singleReadBtn')) {
      $('singleReadBtn').disabled = !book.file_path;
      $('singleReadBtn').onclick = () => readBook(book);
    }
    if ($('singleDownloadBtn')) {
      $('singleDownloadBtn').disabled = !book.file_path || state.meta.busyDownloads.has(book.id);
      $('singleDownloadBtn').onclick = () => download(book);
    }
    if ($('singleCiteBtn')) $('singleCiteBtn').onclick = () => copy(citation(book));
    if ($('singleShareBtn')) $('singleShareBtn').onclick = () => share(book);

    metadata(book);
    syncBundle();
  }

  function navigateBook(book) {
    if (state.ui.single === null) {
      state.meta.savedLibraryState = {
        page: state.ui.page,
        category: state.filters.category,
        query: state.filters.query,
        favoritesOnly: state.filters.favoritesOnly,
        view: state.ui.view
      };
    }

    history.pushState({}, '', bookUrl(book.id));
    state.ui.single = book.id;
    renderSingle();
    window.scrollTo({ top: 0, behavior: motion() });
  }

  function restoreLibraryState() {
    if (!state.meta.savedLibraryState) return false;
    const s = state.meta.savedLibraryState;
    if (typeof s.page === 'number' && s.page > 0) state.ui.page = s.page;
    if (typeof s.category === 'string') state.filters.category = s.category;
    if (typeof s.query === 'string') state.filters.query = s.query;
    if (typeof s.favoritesOnly === 'boolean') state.filters.favoritesOnly = s.favoritesOnly;
    if (typeof s.view === 'string') state.ui.view = s.view === 'list' ? 'list' : 'grid';

    if ($('searchInput')) $('searchInput').value = state.filters.query;
    visible('btnClearSearch', !!state.filters.query);

    state.meta.savedLibraryState = null;
    return true;
  }

  function backToList() {
    const url = new URL(location.href);
    url.searchParams.delete('book');
    history.replaceState({}, '', url);
    state.ui.single = null;
    restoreLibraryState();
    metadata();
    render();
  }

  function route() {
    const params = new URLSearchParams(location.search);
    const raw = params.get('book');
    const wasSingle = state.ui.single;

    state.ui.single = raw !== null && raw.trim() !== '' &&
      Number.isSafeInteger(Number(raw)) && byId(Number(raw))
      ? Number(raw) : null;

    const bundle = params.get('bundle');
    state.user.bundleMode = bundle !== null;

    if (bundle !== null) {
      state.user.bundle = new Set(
        bundle.split(',').filter(v => v.trim() !== '').map(Number)
          .filter(id => Number.isSafeInteger(id) && byId(id))
      );
    }

    if (!state.ui.single && wasSingle !== null) {
      restoreLibraryState();
    } else if (!state.ui.single) {
      state.ui.page = 1;
    }

    metadata();
    render();
  }

  function clearBundle() {
    state.user.bundleMode = false;
    state.user.bundle.clear();
    state.ui.single = null;
    state.filters.query = '';
    state.filters.category = 'all';
    state.filters.favoritesOnly = false;
    state.ui.page = 1;

    if ($('searchInput')) $('searchInput').value = '';
    visible('btnClearSearch', false);

    const url = new URL(location.href);
    url.searchParams.delete('bundle');
    url.searchParams.delete('book');
    history.pushState({}, '', url);

    categories();
    metadata();
    render();
  }

  function language() {
    const root = document.documentElement;
    root.lang = state.ui.lang;
    root.dir = state.ui.lang === 'ar' ? 'rtl' : 'ltr';

    const pairs = {
      'langLabel': ['EN', 'عربي'],
      'txt-install': ['تثبيت', 'Install'],
      'txt-announcement': ['IAR ARCHIVE · مساحة للمعرفة الإدارية', 'IAR ARCHIVE · A space for management knowledge'],
      'txt-subtitle': ['الأرشيف الإداري العراقي', 'Iraqi Administrative Reference'],
      'txt-about-title': ['من ألواح سومر إلى أوراق الحاضر.', 'From Sumer\'s tablets to today\'s pages.'],
      'txt-about-desc': ['مجموعة منتقاة من المراجع الإدارية، مفهرسة بعناية، مرفقة بملخصات مركزة وتوثيق أكاديمي مباشر — لتكون وجهتك الأولى للبحث والاطلاع.', 'A curated collection of administrative references — indexed with care, accompanied by focused summaries and direct academic citation — so it becomes your first stop for research and reading.'],
      'txt-kicker': ['𒆠𒂗𒂠 · المكتبة الرقمية العراقية · 2026', '𒆠𒂗𒂠 · The Iraqi Digital Library · 2026'],
      'txt-tag-summary': ['ملخصات 3 دقائق', '3-minute summaries'],
      'txt-tag-cite': ['توثيق APA مباشر', 'Direct APA citations'],
      'txt-tag-bundle': ['حزم بحثية مخصصة', 'Curated research bundles'],
      'txt-library-title': ['رفوف المعرفة', 'The knowledge shelves'],
      'txt-favorites-only': ['مفضلة', 'My favorites'],
      'txt-stat-books': ['مرجع في الأرشيف', 'Archived references'],
      'txt-stat-cats': ['مسارات معرفية', 'Knowledge paths'],
      'txt-stat-visits': ['الزيارات اليومية', 'Daily visits'],
      'txt-stat-year': ['سنة الأرشفة', 'Archive year'],
      'searchLabel': ['البحث في المراجع', 'Search references'],
      'opt-sort-default': ['اختيار الأرشيف', 'Archive selection'],
      'opt-sort-title': ['العنوان: أ — ي', 'Title: A — Z'],
      'opt-sort-year': ['الأحدث أولاً', 'Newest first'],
      'opt-sort-pages': ['الأقل صفحات أولاً', 'Fewest pages first'],
      'opt-sort-downloads': ['الأكثر تحميلاً', 'Most downloaded'],
      'opt-sort-favorites': ['المفضلة أولاً', 'Favorites first'],
      'opt-sort-rating': ['الأعلى تقييماً', 'Highest rated'],
      'txt-bundle-btn': ['نسخ رابط الحزمة', 'Copy bundle link'],
      'txt-clear-bundle': ['إلغاء الحزمة', 'Clear bundle'],
      'summaryModalTitle': ['ملخص المرجع · 3 دقائق', 'Reference summary · 3 minutes'],
      'txt-modal-ideas-title': ['أهم الأفكار', 'Key ideas'],
      'txt-modal-audience-title': ['الفئة المستهدفة', 'Target audience'],
      'txt-modal-apa-title': ['التوثيق الأكاديمي · APA', 'Academic citation · APA'],
      'txt-modal-close': ['إغلاق', 'Close'],
      'txt-share-modal-btn': ['مشاركة', 'Share'],
      'txt-back-to-list': ['العودة إلى المكتبة', 'Back to the library'],
      'singleDescLabel': ['عن المرجع', 'About this reference'],
      'singleKeyPointsLabel': ['الأفكار الرئيسية', 'Key concepts'],
      'singleAudienceLabel': ['الفئة المستهدفة', 'Target audience'],
      'singleReadLabel': ['قراءة', 'Read'],
      'singleDownloadLabel': ['تحميل', 'Download'],
      'singleCiteLabel': ['توثيق APA', 'Cite APA'],
      'singleShareLabel': ['مشاركة', 'Share'],
      'txt-loading': ['جارٍ تحميل المراجع…', 'Loading references…'],
      'dlCancelLabel': ['إلغاء', 'Cancel'],
      'dlTitle': ['جارٍ تحضير الملف…', 'Preparing file…']
    };

    Object.entries(pairs).forEach(([id, values]) =>
      text(id, values[state.ui.lang === 'ar' ? 0 : 1])
    );

    const attributes = {
      searchInput: ['placeholder', t('ابحث بعنوان، مؤلف، أو فكرة…', 'Search a title, author or idea…')],
      btnClearSearch: ['aria-label', t('مسح البحث', 'Clear search')],
      langToggleBtn: ['aria-label', t('Switch to English', 'التبديل إلى العربية')],
      themeToggleBtn: ['aria-label', t('تبديل المظهر', 'Toggle theme')],
      sortOrder: ['aria-label', t('ترتيب المراجع', 'Sort references')],
      btnViewGrid: ['aria-label', t('عرض شبكي', 'Grid view')],
      btnViewList: ['aria-label', t('عرض قائمة', 'List view')],
      categoryChips: ['aria-label', t('التصنيفات', 'Categories')],
      chipsScrollLeft: ['aria-label', t('السابق', 'Previous')],
      chipsScrollRight: ['aria-label', t('التالي', 'Next')],
      summaryDismissBtn: ['aria-label', t('إغلاق', 'Close')],
      pdfDismissBtn: ['aria-label', t('إغلاق', 'Close')],
      dlCancel: ['aria-label', t('إلغاء التحميل', 'Cancel download')]
    };

    Object.entries(attributes).forEach(([id, [key, value]]) => attr(id, key, value));

    $('paginationContainer')?.parentElement?.setAttribute('aria-label', t('صفحات المراجع', 'Reference pages'));

    const bundleTextEl = $('txt-bundle-text');
    if (bundleTextEl) {
      bundleTextEl.innerHTML = t(
        'تم تحديد <strong id="bundleCount">0</strong> مراجع لحزمتك',
        'Selected <strong id="bundleCount">0</strong> references for your bundle'
      );
    }

    text('booksCounter', number(state.data.books.length));

    if (state.data.loaded) { categories(); render(); }
    else { syncBundle(); }

    metadata(state.ui.single !== null ? byId(state.ui.single) : null);

    if (state.ui.summary !== null && $('summaryModal')?.classList.contains('is-open')) {
      summary(byId(state.ui.summary));
    }

    const backIcon = $('btnBackToList')?.querySelector('use');
    if (backIcon) {
      backIcon.setAttribute('href', `#i-arrow-${state.ui.lang === 'ar' ? 'right' : 'left'}`);
    }

    text('archiveYear', '2026');
  }

  function theme() {
    document.documentElement.dataset.theme = state.ui.theme;
    const icon = $('themeIcon');
    if (icon) icon.querySelector('use')?.setAttribute('href', state.ui.theme === 'dark' ? '#i-sun' : '#i-moon');
    attr('themeToggleBtn', 'aria-pressed', state.ui.theme === 'dark');
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', state.ui.theme === 'dark' ? '#0a0d14' : '#f4efe4');
  }

  function initAmbient() {
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (canHover && !reduceMotion) {
      const glow = $('cursorGlow');
      if (glow) {
        let rafId = 0, pendingX = 0, pendingY = 0;
        const flush = () => { glow.style.left = pendingX + 'px'; glow.style.top = pendingY + 'px'; rafId = 0; };

        window.addEventListener('pointermove', e => {
          pendingX = e.clientX; pendingY = e.clientY;
          if (!rafId) rafId = requestAnimationFrame(flush);
          glow.classList.add('is-active');
        }, { passive: true });

        window.addEventListener('pointerleave', () => glow.classList.remove('is-active'));
        document.addEventListener('pointerleave', () => glow.classList.remove('is-active'));
        document.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
      }
    }

    if (!reduceMotion) {
      const progress = $('scrollProgressFill');
      if (progress) {
        const update = () => {
          const h = document.documentElement;
          const max = h.scrollHeight - h.clientHeight;
          const p = max > 0 ? h.scrollTop / max : 0;
          progress.style.transform = `scaleX(${p})`;
        };
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
      }
    }
  }

  // ---------- Event wiring ----------
  $('themeToggleBtn')?.addEventListener('click', () => {
    state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
    store.set('iar_theme', state.ui.theme);
    theme();
  });

  $('langToggleBtn')?.addEventListener('click', () => {
    state.ui.lang = state.ui.lang === 'ar' ? 'en' : 'ar';
    store.set('iar_lang', state.ui.lang);
    language();
  });

  $('btnViewGrid')?.addEventListener('click', () => {
    state.ui.view = 'grid';
    store.set('iar_view_mode', 'grid');
    render();
  });

  $('btnViewList')?.addEventListener('click', () => {
    state.ui.view = 'list';
    store.set('iar_view_mode', 'list');
    render();
  });

  $('favoritesOnlyBtn')?.addEventListener('click', () => {
    state.filters.favoritesOnly = !state.filters.favoritesOnly;
    state.ui.page = 1;
    render();
  });

  let searchTimer;
  $('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    state.filters.query = $('searchInput').value.trim();
    state.ui.page = 1;
    visible('btnClearSearch', !!state.filters.query);
    searchTimer = setTimeout(render, 200);
  });

  $('btnClearSearch')?.addEventListener('click', () => {
    clearTimeout(searchTimer);
    state.filters.query = '';
    if ($('searchInput')) $('searchInput').value = '';
    visible('btnClearSearch', false);
    state.ui.page = 1;
    render();
    $('searchInput')?.focus();
  });

  $('sortOrder')?.addEventListener('change', () => {
    state.ui.page = 1;
    render();
  });

  $('categoryChips')?.addEventListener('click', e => {
    const chip = e.target.closest('[data-category]');
    if (!chip) return;
    state.filters.category = chip.dataset.category;
    state.ui.page = 1;
    categories();
    render();
  });

  $('categoryChips')?.addEventListener('scroll', updateChips, { passive: true });
  window.addEventListener('resize', updateChips);

  $('chipsScrollLeft')?.addEventListener('click', () =>
    $('categoryChips')?.scrollBy({
      left: state.ui.lang === 'ar' ? 220 : -220,
      behavior: motion()
    })
  );

  $('chipsScrollRight')?.addEventListener('click', () =>
    $('categoryChips')?.scrollBy({
      left: state.ui.lang === 'ar' ? -220 : 220,
      behavior: motion()
    })
  );

  $('paginationContainer')?.addEventListener('click', e => {
    const button = e.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.ui.page = Number(button.dataset.page);
    render();
    $('controlsRow')?.scrollIntoView({ behavior: motion(), block: 'start' });
  });

  $('btnBackToList')?.addEventListener('click', backToList);

  document.querySelector('.brand-lockup')?.addEventListener('click', e => {
    e.preventDefault();
    clearBundle();
    window.scrollTo({ top: 0, behavior: motion() });
  });

  $('copyBundleBtn')?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('book');
    url.searchParams.set('bundle', [...state.user.bundle].join(','));
    url.hash = '';
    copy(url.href);
  });

  $('clearBundleBtn')?.addEventListener('click', clearBundle);

  $('modalShareBtn')?.addEventListener('click', () => {
    const book = byId(state.ui.summary);
    if (book) share(book);
  });

  document.addEventListener('change', e => {
    const input = e.target.closest('[data-action="bundle"]');
    if (!input) return;

    const id = Number(input.dataset.id);
    if (!byId(id)) return;

    input.checked ? state.user.bundle.add(id) : state.user.bundle.delete(id);

    $$(`input[data-action="bundle"][data-id="${id}"]`)
      .forEach(el => (el.checked = input.checked));

    if (state.user.bundleMode) {
      const url = new URL(location.href);
      url.searchParams.set('bundle', [...state.user.bundle].join(','));
      history.replaceState({}, '', url);
      render();
    } else {
      syncBundle();
    }
  });

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-action]');
    if (!trigger) return;
    const name = trigger.dataset.action;
    if (name === 'bundle') return;

    if (trigger.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) return;
    e.preventDefault();

    if (name === 'clear-bundle') { clearBundle(); return; }
    if (name === 'retry') { fetchBooks(); return; }
    if (name === 'reset') {
      state.filters.query = '';
      state.filters.category = 'all';
      state.filters.favoritesOnly = false;
      state.ui.page = 1;
      if ($('searchInput')) $('searchInput').value = '';
      visible('btnClearSearch', false);
      categories();
      render();
      return;
    }

    const book = byId(trigger.dataset.id);
    if (!book) return;

    switch (name) {
      case 'details': navigateBook(book); break;
      case 'read': readBook(book); break;
      case 'download': download(book); break;
      case 'summary': summary(book); break;
      case 'cite': copy(citation(book)); break;
      case 'share': share(book); break;
      case 'rate': rate(book, Number(trigger.dataset.rating)); break;
      case 'favorite': {
        const was = state.user.favorites.has(book.id);
        was ? state.user.favorites.delete(book.id) : state.user.favorites.add(book.id);
        store.set('iar_favorites', JSON.stringify([...state.user.favorites]));
        render();
        toast(was
          ? t('أزيل من المفضلة.', 'Removed from favorites.')
          : t('أضيف إلى المفضلة.', 'Added to favorites.'));
        break;
      }
      case 'cover': {
        attr('coverImageLarge', 'src', book.cover_image);
        attr('coverImageLarge', 'alt', field(book, 'title'));
        modal.open('coverImageModal');
        break;
      }
    }
  });

  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName !== 'IMG') return;

    if (img.classList.contains('cover-img')) {
      img.hidden = true;
      if (img.nextElementSibling) img.nextElementSibling.hidden = false;
    } else if (img.id === 'singleBookCover') {
      img.hidden = true;
      const book = byId(state.ui.single);
      if (book && $('singleCoverFallback')) {
        const clone = { ...book, cover_image: '' };
        $('singleCoverFallback').innerHTML = cover(clone, true);
      }
    }
  }, true);

  window.addEventListener('popstate', route);

  async function fetchBooks() {
    state.data.loading = true;
    state.data.error = false;
    state.data.loaded = false;

    const container = $('booksDisplayContainer');
    if (container) {
      container.innerHTML = `<div class="empty-state" role="status">
        ${i('hourglass')}
        <p>${t('جارٍ تحميل المراجع…', 'Loading references…')}</p>
      </div>`;
    }

    try {
      const response = await fetch('./books.json', {
        cache: 'no-cache',
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('books.json unavailable');

      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('books.json must contain an array');

      const ids = new Set();
      state.data.books = payload.map(normalize).filter(book => {
        if (!book || ids.has(book.id)) return false;
        ids.add(book.id);
        return true;
      });

      state.data.loaded = true;
      state.data.loading = false;

      language();
      route();

      firebaseReady = connectFirebase();
      loadMetrics();
    } catch (error) {
      state.data.loading = false;
      state.data.error = true;

      const featuredEl = $('featuredSection');
      if (featuredEl) featuredEl.innerHTML = '';
      text('booksCounter', '—');

      if (container) {
        container.innerHTML = `<div class="empty-state" role="alert">
          ${i('cloud-off')}
          <h3>${t('تعذّر تحميل المراجع', 'Could not load references')}</h3>
          <p>${t('تأكد من وجود books.json بجانب index.html، ثم أعد المحاولة.', 'Ensure books.json is available next to index.html, then retry.')}</p>
          <button type="button" class="btn btn-primary" data-action="retry">${t('إعادة المحاولة', 'Retry')}</button>
        </div>`;
      }

      console.warn(error.message);
    }
  }

  initAmbient();
  theme();
  language();

  // ---------- PWA install prompt ----------
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  }

  function showInstallButton(promptEvent) {
    if (isStandalone()) return;
    state.meta.deferredPrompt = promptEvent || null;
    $('installBtn')?.classList.remove('d-none');
  }

  // beforeinstallprompt is intentionally prevented so the archive can show
  // its own installation button; Chrome's 'Banner not shown' console note is expected.
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
      alert(t(
        'لتثبيت التطبيق:\n' +
        '• Android/Chrome: افتح قائمة المتصفح (⋮) واختر "تثبيت التطبيق".\n' +
        '• iPhone/Safari: اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية".',
        'To install:\n' +
        '• Android/Chrome: open browser menu (⋮) → "Install app".\n' +
        '• iPhone/Safari: tap Share → "Add to Home Screen".'
      ));
    }
  });

  fetchBooks();
})();
