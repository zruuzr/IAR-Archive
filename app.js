/* IAR Archive — application logic (production). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* storage may be unavailable */ } }
  };
  const savedArray = key => {
    try { const v = JSON.parse(store.get(key, '[]')); return Array.isArray(v) ? v.filter(Number.isSafeInteger) : []; }
    catch { return []; }
  };
  const state = {
    books: [], lang: document.documentElement.lang === 'en' ? 'en' : 'ar',
    theme: document.documentElement.dataset.bsTheme === 'dark' ? 'dark' : 'light',
    view: store.get('iar_view_mode', 'grid') === 'list' ? 'list' : 'grid',
    category: 'all', page: 1, query: '', favoritesOnly: false,
    favorites: new Set(savedArray('iar_favorites')), bundle: new Set(), bundleMode: false,
    single: null, summary: null, loaded: false, loading: true, error: false,
    metricsLoadedIds: new Set(), metricsLoadingIds: new Set(), metricsAllLoaded: false, metricsAllLoading: false,
    ratedIds: new Set(), ratedLoadedIds: new Set(),
    visitsLoaded: false, visitsLoading: false
  };
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const attr = (id, k, v) => { const el = $(id); if (el) el.setAttribute(k, v); };
  const visible = (id, show) => { const el = $(id); if (el) el.classList.toggle('d-none', !show); };
  const clean = v => v == null ? '' : String(v).trim();
  const finite = v => Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0;
  const words = v => Array.isArray(v) ? v.map(clean).filter(Boolean) : [];
  const field = (book, name) => state.lang === 'en' && book[name + '_en'] ? book[name + '_en'] : book[name];
  const t = (ar, en) => state.lang === 'ar' ? ar : en;

  /* Consistent number formatting:
     - Uses Latin numerals on both Arabic and English to keep counters
       visually stable and to match the archive year "2026".
     - Group separator follows the reader's locale conventions. */
  const number = v => new Intl.NumberFormat(state.lang === 'ar' ? 'ar-u-nu-latn' : 'en-US').format(v);

  const i = name => `<i class="bi bi-${name}" aria-hidden="true"></i>`;
  const labels = () => ({
    read: t('قراءة','Read'), download: t('تحميل','Download'),
    summary: t('ملخص 3 دقائق','3-minute summary'), cite: t('توثيق APA','Cite APA'),
    share: t('مشاركة','Share'), favorite: t('المفضلة','Favorite'),
    unknown: t('غير متوفر','Not provided')
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
      // Covers resolve from the current deployment; PDFs intentionally remain on GitHub Raw.
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
    ['title','author','category','description','publisher','type','target_audience','badge_text'].forEach(key => {
      book[key] = clean(raw[key]);
      book[key + '_en'] = clean(raw[key + '_en']);
    });
    ['year','pages','file_size'].forEach(key => book[key] = clean(raw[key]));
    ['keywords','keywords_en','key_points','key_points_en'].forEach(key => book[key] = words(raw[key]));
    book.featured = raw.featured === true;
    book.cover_image = asset(raw.cover_image);
    book.file_path = asset(raw.file_path, true);
    let name = clean(raw.file_name) || clean(raw.file_path).split('/').pop()?.split('?')[0] || '';
    try { name = decodeURIComponent(name); } catch { /* malformed encoding is not fatal */ }
    book.file_name = name.replace(/[\\/\u0000-\u001f]/g, '_') || `IAR-${id}.pdf`;
    book.downloadCount = 0; book.publicRating = 0;
    book.ratingSum = 0; book.ratingCount = 0;
    return book;
  }

  const byId = id => state.books.find(b => b.id === Number(id));
  const categoryKey = b => b.category || '__general__';
  const categoryLabel = b => field(b, 'category') || t('عام','General');
  const busyRatings = new Set();
  const busyDownloads = new Set();

  let db = null, auth = null;
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
      auth = firebase.auth();
      await timeout(auth.signInAnonymously(), 5000);
    } catch (error) {
      console.warn('Firebase services unavailable:', error.message);
    }
  }

  function applyMetricDoc(name, doc) {
    const book = byId(doc.id);
    if (!book || !doc.exists) return;
    const data = doc.data() || {};
    if (name === 'downloads') {
      book.downloadCount = finite(data.count);
    } else {
      book.ratingSum = finite(data.ratingSum);
      book.ratingCount = finite(data.ratingCount);
      book.publicRating = Math.min(5, finite(data.average));
    }
  }

  async function loadRatedStatuses(ids) {
    try {
      await firebaseReady;
      if (!db || !auth?.currentUser) return false;
      const uid = auth.currentUser.uid;
      const values = [...new Set(ids.map(Number).filter(Number.isSafeInteger))]
        .filter(id => !state.ratedLoadedIds.has(id));
      if (!values.length) return true;

      const results = await Promise.allSettled(values.map(async id => {
        const voteRef = db.collection('ratings').doc(String(id)).collection('votes').doc(uid);
        const voteDoc = await timeout(voteRef.get());
        if (voteDoc.exists) state.ratedIds.add(id);
        else state.ratedIds.delete(id);
        state.ratedLoadedIds.add(id);
      }));

      return results.every(result => result.status === 'fulfilled');
    } catch (error) {
      console.warn('Unable to load private rating status:', error.message);
      return false;
    }
  }

  function scheduleRatedStatusLoad(ids) {
    const values = [...new Set(ids.map(Number).filter(Number.isSafeInteger))];
    if (!values.length) return;
    const run = () => {
      void loadRatedStatuses(values).then(ok => {
        if (ok) refreshRatings();
      });
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      window.setTimeout(run, 0);
    }
  }

  async function loadMetricChunks(name, ids) {
    const values = [...new Set(ids.map(Number).filter(Number.isSafeInteger))];
    if (!values.length || !db) return;
    const chunks = [];
    for (let i = 0; i < values.length; i += 30) chunks.push(values.slice(i, i + 30));
    const results = await Promise.allSettled(chunks.map(async chunk => {
      const snapshot = await timeout(
        db.collection(name)
          .where(firebase.firestore.FieldPath.documentId(), 'in', chunk.map(String))
          .get()
      );
      snapshot.forEach(doc => applyMetricDoc(name, doc));
    }));
    return results.every(result => result.status === 'fulfilled');
  }

  async function loadAllMetrics() {
    await firebaseReady;
    if (!db || state.metricsAllLoaded || state.metricsAllLoading) return;
    state.metricsAllLoading = true;
    const results = await Promise.allSettled(['ratings', 'downloads'].map(async name => {
      const snapshot = await timeout(db.collection(name).get());
      snapshot.forEach(doc => applyMetricDoc(name, doc));
    }));
    state.metricsAllLoaded = results.every(result => result.status === 'fulfilled');
    state.metricsAllLoading = false;
    if (!state.metricsAllLoaded) return;
    state.books.forEach(book => state.metricsLoadedIds.add(book.id));
    refreshRatings();
    refreshCounts();
  }

  function visibleMetricIds() {
    if (state.single !== null) return [state.single];
    const books = filteredBooks();
    const spotlight = !state.query && state.category === 'all' && !state.bundleMode && !state.favoritesOnly && state.page === 1
      ? books.find(b => b.featured) : null;
    const page = books.slice((state.page - 1) * 6, state.page * 6);
    return [...(spotlight ? [spotlight.id] : []), ...page.map(book => book.id)];
  }

  async function loadVisibleMetrics(ids = visibleMetricIds()) {
    await firebaseReady;
    if (!db) return;
    const needed = [...new Set(ids)].filter(id => !state.metricsLoadedIds.has(id) && !state.metricsLoadingIds.has(id));
    if (!needed.length) return;
    needed.forEach(id => state.metricsLoadingIds.add(id));
    try {
      const results = await Promise.allSettled([
        loadMetricChunks('ratings', needed),
        loadMetricChunks('downloads', needed)
      ]);
      const complete = results.every(result => result.status === 'fulfilled' && result.value === true);
      if (complete) needed.forEach(id => state.metricsLoadedIds.add(id));
      refreshRatings();
      refreshCounts();
    } finally {
      needed.forEach(id => state.metricsLoadingIds.delete(id));
    }
  }

  async function loadSiteVisits() {
    if (state.visitsLoaded || state.visitsLoading) return;
    state.visitsLoading = true;
    await firebaseReady;
    if (!db) { state.visitsLoading = false; text('siteVisitsCounter', '—'); return; }
    try {
      const visits = db.collection('stats').doc('visits');
      const day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
      const lastDay = store.get('iar_last_visit_day', '');
      let count = 0;
      if (auth?.currentUser) {
        count = await timeout(db.runTransaction(async transaction => {
          const doc = await transaction.get(visits);
          const data = doc.data() || {};
          const current = data.date === day ? finite(data.count) : 0;
          if (lastDay === day) return current;
          const next = current + 1;
          transaction.set(visits, { date: day, count: next }, { merge: true });
          return next;
        }));
        if (lastDay !== day) store.set('iar_last_visit_day', day);
      } else {
        const data = (await timeout(visits.get())).data() || {};
        count = data.date === day ? finite(data.count) : 0;
      }
      text('siteVisitsCounter', number(count));
    } catch { text('siteVisitsCounter', '—'); }
    state.visitsLoading = false;
    state.visitsLoaded = true;
  }

  async function loadMetrics() {
    if (['rating', 'downloads'].includes($('sortOrder')?.value)) await loadAllMetrics();
    else await loadVisibleMetrics();
    await loadSiteVisits();
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
    dismiss.setAttribute('aria-label', t('إغلاق','Close'));
    dismiss.onclick = () => notification.remove();
    notification.append(content, dismiss);
    host.append(notification);
    while (host.children.length > 3) host.firstElementChild.remove();
    setTimeout(() => notification.remove(), 6500);
  }

  async function copy(value) {
    try {
      if (navigator.clipboard && isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const helper = document.createElement('textarea');
        helper.value = value;
        helper.style.position = 'fixed';
        helper.style.top = '-1000px';
        document.body.append(helper);
        helper.select();
        let success;
        try { success = document.execCommand('copy'); } finally { helper.remove(); }
        if (!success) throw new Error('Copy unavailable');
      }
      toast(t('تم النسخ إلى الحافظة.','Copied to clipboard.'));
    } catch {
      window.prompt(t('انسخ النص التالي:','Copy the following text:'), value);
    }
  }

  const citation = book =>
    `${field(book,'author') || labels().unknown} (${book.year || t('د.ت.','n.d.')}). ${field(book,'title')}. ${field(book,'publisher') || labels().unknown}.`;

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
      try { await navigator.share({ title: field(book,'title'), text: field(book,'author'), url }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    await copy(`${field(book,'title')}\n${url}`);
  }

  function modal(id, open = true) {
    const el = $(id); if (!el) return;
    if (window.bootstrap?.Modal) {
      const instance = bootstrap.Modal.getOrCreateInstance(el);
      open ? instance.show() : instance.hide();
    } else {
      toast(t('تعذّر تحميل مكوّن النوافذ. أعد المحاولة بعد الاتصال بالإنترنت.','Dialog component unavailable. Reconnect and retry.'), true);
    }
  }

  /* PDF reader — Mozilla pdf.js viewer for maximum stability */
  let pdfLoadTimer = 0;

  function setPdfReaderState(mode) {
    const stateEl = $('pdfReaderState');
    const frame = $('pdfFrame');
    if (!stateEl) return;
    const loading = mode === 'loading';
    const error = mode === 'error';
    stateEl.hidden = !loading && !error;
    stateEl.classList.toggle('is-error', error);
    text('pdfReaderStateText', loading
      ? t('جارٍ فتح المرجع…', 'Opening reference…')
      : t('تعذر فتح القارئ الداخلي. استخدم الرابط المباشر أسفل النافذة.', 'The embedded reader could not open. Use the direct link below.'));
    if (frame) frame.hidden = loading;
  }

  function readBook(book) {
    if (!book.file_path) return toast(t('ملف المرجع غير متاح.','Reference file unavailable.'), true);
    text('modalBookTitle', field(book,'title'));
    const frame = $('pdfFrame');
    if (!frame) return;
    const absoluteUrl = new URL(book.file_path, location.href).href;
    clearTimeout(pdfLoadTimer);
    setPdfReaderState('loading');
    pdfLoadTimer = setTimeout(() => setPdfReaderState('error'), 12000);
    frame.src = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(absoluteUrl)}`;
    attr('pdfExternalLink', 'href', absoluteUrl);
    text('pdfExternalLink', t('فتح الملف في نافذة مستقلة إذا لم يظهر القارئ','Open file directly in a new tab if the reader is unavailable'));
    modal('pdfReaderModal');
  }

  $('pdfFrame')?.addEventListener('load', () => {
    clearTimeout(pdfLoadTimer);
    setPdfReaderState('ready');
  });
  $('pdfReaderModal')?.addEventListener('hidden.bs.modal', () => {
    clearTimeout(pdfLoadTimer);
    const frame = $('pdfFrame');
    if (frame) { frame.src = 'about:blank'; frame.hidden = false; }
    $('pdfReaderState')?.setAttribute('hidden', '');
  });

  async function download(book) {
    if (!book.file_path || busyDownloads.has(book.id)) return;
    busyDownloads.add(book.id); setDownloadBusy(book.id, true);
    toast(t('جارٍ تحضير الملف…','Preparing file…'));
    try {
      const response = await fetch(book.file_path, { signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error('Download unavailable');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = book.file_name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      if (db && auth?.currentUser) {
        try {
          const ref = db.collection('downloads').doc(String(book.id));
          await timeout(ref.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true }));
          book.downloadCount = finite((await timeout(ref.get())).data()?.count);
        } catch { /* metrics failure does not affect the download */ }
      }
      refreshCounts();
      toast(t('تم إرسال الملف إلى المتصفح.','File sent to your browser.'));
    } catch {
      toast(t('تعذّر التحميل. جرّب فتح الملف من زر القراءة؛ قد يمنع المصدر التحميل المباشر.','Download failed. Try opening the file with Read; the source may restrict direct downloads.'), true);
    } finally {
      busyDownloads.delete(book.id);
      setDownloadBusy(book.id, false);
    }
  }

  function setDownloadBusy(id, busy) {
    document.querySelectorAll(`[data-action="download"][data-id="${id}"]`).forEach(button => {
      button.disabled = busy;
      button.setAttribute('aria-busy', String(busy));
    });
    if (state.single === id && $('singleDownloadBtn')) $('singleDownloadBtn').disabled = busy;
  }

  function refreshCounts() {
    document.querySelectorAll('[data-download-count]').forEach(el => {
      const book = byId(el.dataset.downloadCount);
      if (book) el.textContent = number(book.downloadCount);
    });
    if (state.single != null) text('singleDownloadCount', number(byId(state.single)?.downloadCount || 0));
  }

  const rated = book => state.ratedIds.has(book.id);

  function stars(book) {
    const done = rated(book);
    const busy = busyRatings.has(book.id);
    const ratingDisplay = book.ratingCount
      ? `${book.publicRating.toFixed(2)} · ${number(book.ratingCount)}`
      : t('كن أول المقيّمين','Be the first to rate');
    return `<div class="rating-stars" data-stars="${book.id}" role="group" aria-label="${esc(t('تقييم المرجع','Rate reference'))}">${[1,2,3,4,5].map(value =>
      `<button type="button" class="star-button ${value <= Math.round(book.publicRating) ? 'active' : ''}" data-action="rate" data-id="${book.id}" data-rating="${value}" aria-label="${esc(t(`تقييم ${value} من 5`,`Rate ${value} out of 5`))}" ${done || busy ? 'disabled' : ''}>${i(value <= Math.round(book.publicRating) ? 'star-fill' : 'star')}</button>`
    ).join('')}<small>${ratingDisplay}</small></div>`;
  }

  function refreshRatings() {
    document.querySelectorAll('[data-stars]').forEach(el => {
      const book = byId(el.dataset.stars);
      if (book) el.outerHTML = stars(book);
    });
  }

  async function rate(book, value) {
    if (!Number.isInteger(value) || value < 1 || value > 5) return;
    if (busyRatings.has(book.id) || rated(book)) return;
    busyRatings.add(book.id); refreshRatings();
    try {
      await firebaseReady;
      if (!db || !auth?.currentUser) throw new Error('AUTH');
      const uid = auth.currentUser.uid;

      const result = await db.runTransaction(async transaction => {
        const aggregateRef = db.collection('ratings').doc(String(book.id));
        const voteRef = aggregateRef.collection('votes').doc(uid);

        // Firestore transactions require all reads before writes.
        const aggregateDoc = await transaction.get(aggregateRef);
        const voteDoc = await transaction.get(voteRef);

        if (voteDoc.exists) throw new Error('ALREADY_VOTED');

        const data = aggregateDoc.data() || {};
        const legacyVoters = Array.isArray(data.voters)
          ? data.voters.filter(v => typeof v === 'string')
          : [];

        // Preserve duplicate-vote protection for legacy aggregate documents
        // until their old voters are migrated to /votes/{uid}.
        if (legacyVoters.includes(uid)) throw new Error('ALREADY_VOTED');

        const ratingSum = finite(data.ratingSum) + value;
        const ratingCount = finite(data.ratingCount) + 1;
        const result = {
          ratingSum,
          ratingCount,
          average: Number((ratingSum / ratingCount).toFixed(2))
        };

        transaction.create(voteRef, { value });
        transaction.set(aggregateRef, result);

        return result;
      });

      Object.assign(book, {
        ratingSum: result.ratingSum,
        ratingCount: result.ratingCount,
        publicRating: result.average
      });
      state.ratedIds.add(book.id);
      toast(t('تم حفظ تقييمك.','Your rating was saved.'));
    } catch (error) {
      toast(
        error.message === 'ALREADY_VOTED'
          ? t('سبق أن قيّمت هذا المرجع.','You already rated this reference.')
          : t('تعذّر حفظ التقييم. تحقق من الاتصال وصلاحيات Firebase.','Rating failed. Check connectivity and Firebase permissions.'),
        true
      );
    } finally {
      busyRatings.delete(book.id); refreshRatings();
    }
  }

  function cover(book, featured = false) {
    const title = esc(field(book, 'title'));
    const color = book.id % 5;
    const image = book.cover_image
      ? `<img class="cover-img" src="${esc(book.cover_image)}" alt="${title}" loading="${featured ? 'eager' : 'lazy'}">`
      : '';
    const fallback = `<span class="cover-placeholder designed-cover cover-tone-${color}" ${image ? 'hidden' : ''}><span class="cover-edition">IAR / ${esc(book.year || 'ARCHIVE')}</span><span class="cover-symbol" aria-hidden="true">${i(['intersect','command','diagram-3','asterisk','layers'][color])}</span><span class="cover-name">${title}</span><span class="cover-caption">IAR ARCHIVE</span></span>`;
    return `<div class="cover-container ${featured ? 'featured-cover' : ''}"><button type="button" class="cover-img-wrapper book-cover-button" data-action="${book.cover_image ? 'cover' : 'details'}" data-id="${book.id}" aria-label="${esc(t('عرض','View'))}: ${title}">${image}${fallback}</button></div>`;
  }

  function action(book, name, icon, label, primary = false, iconOnly = false) {
    const disabled = ['read','download'].includes(name) && !book.file_path;
    const pressed = name === 'favorite' ? `aria-pressed="${state.favorites.has(book.id)}"` : '';
    const count = name === 'download' ? `<span class="download-count" data-download-count="${book.id}">${number(book.downloadCount)}</span>` : '';
    return `<button type="button" class="btn ${primary ? 'btn-iar-primary' : 'btn-iar-action'}" data-action="${name}" data-id="${book.id}" ${disabled ? 'disabled' : ''} aria-label="${esc(label)}" title="${esc(label)}" ${pressed}>${i(icon)}${iconOnly ? '' : `<span>${esc(label)}</span>`}${count}</button>`;
  }

  function actions(book) {
    const l = labels();
    const fav = state.favorites.has(book.id);
    return `<div class="book-actions">${action(book,'read','book',l.read)}${action(book,'download','arrow-down',l.download,true)}${action(book,'summary','lightning-charge',l.summary)}${action(book,'cite','quote',l.cite,false,true)}${action(book,'favorite',fav?'heart-fill':'heart',fav?t('إزالة من المفضلة','Remove favorite'):t('إضافة إلى المفضلة','Add favorite'),false,true)}${action(book,'share','share',l.share,false,true)}</div>`;
  }

  function bookCard(book) {
    return `<article class="book-card">
      <div class="book-topline">
        <span class="badge-type">${esc(field(book,'type') || t('مرجع إداري','Reference'))}</span>
        <label class="bundle-select">
          <input type="checkbox" data-action="bundle" data-id="${book.id}" ${state.bundle.has(book.id) ? 'checked' : ''} aria-label="${esc(t('أضف إلى الحزمة: ','Add to bundle: ') + field(book,'title'))}">
          <span>${t('حزمة البحث','Bundle')}</span>
        </label>
      </div>
      <div class="book-main">
        ${cover(book)}
        <div class="book-info">
          <span class="badge-tag">${esc(categoryLabel(book))}</span>
          <h3 class="book-title"><a href="${esc(bookUrl(book.id))}" data-action="details" data-id="${book.id}">${esc(field(book,'title'))}</a></h3>
          <p class="book-author">${esc(field(book,'author') || labels().unknown)}</p>
          ${stars(book)}
          <div class="book-meta">
            <span class="meta-spec-chip">${i('calendar3')}${esc(book.year || '—')}</span>
            <span class="meta-spec-chip">${i('file-earmark-text')}${esc(book.pages || '—')} ${t('صفحة','pages')}</span>
          </div>
        </div>
      </div>
      <p class="book-desc">${esc(field(book,'description') || labels().unknown)}</p>
      ${actions(book)}
    </article>`;
  }

  function featured(book) {
    return `<article class="featured-spotlight-card">
      <div class="featured-inner">
        <div class="featured-sweep" aria-hidden="true"></div>
        <div class="featured-layout">
          ${cover(book, true)}
          <div class="featured-copy">
            <span class="featured-badge-top">${i('stars')}${esc(field(book,'badge_text') || t('في دائرة الضوء','In the spotlight'))}</span>
            <div>
              <span class="badge-tag">${esc(categoryLabel(book))}</span>
              <span class="featured-index">01 / IAR SELECTION</span>
            </div>
            <h2><a href="${esc(bookUrl(book.id))}" data-action="details" data-id="${book.id}">${esc(field(book,'title'))}</a></h2>
            <p class="book-author">${esc(field(book,'author'))}</p>
            <p class="book-desc">${esc(field(book,'description'))}</p>
            ${stars(book)}
            ${actions(book)}
          </div>
        </div>
      </div>
    </article>`;
  }

  function filteredBooks() {
    const norm = v => v.toLocaleLowerCase(state.lang).normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/\u0640/g,'');
    const query = norm(state.query);
    const books = state.books.filter(book => {
      if (state.bundleMode && !state.bundle.has(book.id)) return false;
      if (state.favoritesOnly && !state.favorites.has(book.id)) return false;
      if (state.category !== 'all' && categoryKey(book) !== state.category) return false;
      const haystack = ['title','author','publisher','description','category']
        .flatMap(key => [book[key], book[key + '_en']])
        .concat(book.keywords, book.keywords_en).join(' ');
      return !query || norm(haystack).includes(query);
    });
    const titleSort = (a, b) => field(a,'title').localeCompare(field(b,'title'), state.lang);
    const sorts = {
      default: (a, b) => Number(b.featured) - Number(a.featured) || a.id - b.id,
      title: titleSort,
      year: (a, b) => finite(b.year) - finite(a.year),
      pages: (a, b) => finite(a.pages) - finite(b.pages),
      downloads: (a, b) => b.downloadCount - a.downloadCount,
      rating: (a, b) => b.publicRating - a.publicRating,
      favorites: (a, b) => Number(state.favorites.has(b.id)) - Number(state.favorites.has(a.id)) || titleSort(a, b)
    };
    return books.sort(sorts[$('sortOrder')?.value] || sorts.default);
  }

  function pagination(total) {
    const nav = $('paginationContainer'); if (!nav) return;
    nav.innerHTML = '';
    if (total <= 1) return;
    const values = [...new Set([
      1, total, state.page - 1, state.page, state.page + 1,
      ...(state.page < 4 ? [2, 3, 4, 5] : []),
      ...(state.page > total - 3 ? [total - 4, total - 3, total - 2, total - 1] : [])
    ])].filter(v => v > 0 && v <= total).sort((a, b) => a - b);
    const button = (value, label, disabled = false) =>
      `<li class="page-item ${value === state.page ? 'active' : ''}"><button type="button" class="page-link" data-page="${value}" ${disabled ? 'disabled' : ''} ${value === state.page ? 'aria-current="page"' : ''}>${label}</button></li>`;
    let html = button(state.page - 1, t('السابق','Previous'), state.page === 1);
    let last = 0;
    values.forEach(value => {
      if (last && value - last > 1) html += '<li class="page-item disabled"><span class="page-link" aria-hidden="true">…</span></li>';
      html += button(value, number(value));
      last = value;
    });
    nav.innerHTML = html + button(state.page + 1, t('التالي','Next'), state.page === total);
  }

  function syncBundle() {
    text('bundleCount', number(state.bundle.size));
    visible('bundleBar', state.bundle.size > 0 && state.single === null);
    if ($('copyBundleBtn')) $('copyBundleBtn').disabled = state.bundle.size === 0;
    const host = $('bundleModeAlertContainer');
    visible('bundleModeAlertContainer', state.single === null);
    if (!host) return;
    host.innerHTML = state.bundleMode
      ? `<div class="bundle-mode-notice">${i('collection')}<span>${t('حزمة بحثية مشتركة','Shared research bundle')} · ${number(state.bundle.size)}</span><button type="button" class="btn btn-iar-action" data-action="clear-bundle">${t('العودة للمكتبة','Back to library')}</button></div>`
      : '';
  }

  function render() {
    if (state.single !== null) { renderSingle(); return; }
    visible('singleBookView', false);
    ['booksDisplayContainer','controlsRow','categoryChips','resultsCount'].forEach(id => visible(id, true));
    document.querySelector('.chips-container')?.classList.remove('d-none');
    const pagWrap = $('paginationContainer')?.parentElement;
    if (pagWrap) pagWrap.classList.remove('d-none');
    syncBundle();
    if (!state.loaded) return;
    const books = filteredBooks();
    const spotlight = !state.query && state.category === 'all' && !state.bundleMode && !state.favoritesOnly && state.page === 1
      ? books.find(b => b.featured) : null;
    $('featuredSection').innerHTML = spotlight ? featured(spotlight) : '';
    const displayBooks = spotlight ? books.filter(book => book.id !== spotlight.id) : books;
    const size = 6;
    const total = Math.ceil(displayBooks.length / size);
    state.page = Math.min(state.page, Math.max(1, total));
    const page = displayBooks.slice((state.page - 1) * size, state.page * size);
    text('resultsCount', t(`${number(books.length)} مرجع في مساحة اكتشافك`,`${number(books.length)} references to explore`));
    $('booksDisplayContainer').innerHTML = books.length
      ? `<div class="books-grid ${state.view === 'list' ? 'is-list' : ''}">${page.map(bookCard).join('')}</div>`
      : `<div class="empty-state">${i('search')}<h3>${t('لا توجد نتائج مطابقة','No matching references')}</h3><p>${t('جرّب كلمات أخرى أو أعد ضبط خيارات العرض.','Try another search or reset your filters.')}</p><button class="btn btn-iar-primary" data-action="reset">${t('إعادة ضبط البحث','Reset filters')}</button></div>`;
    pagination(total);
    refreshCounts();
    updateChips();
    $('btnViewGrid')?.classList.toggle('active', state.view === 'grid');
    attr('btnViewGrid', 'aria-pressed', state.view === 'grid');
    $('btnViewList')?.classList.toggle('active', state.view === 'list');
    attr('btnViewList', 'aria-pressed', state.view === 'list');
    $('favoritesOnlyBtn')?.classList.toggle('active', state.favoritesOnly);
    attr('favoritesOnlyBtn', 'aria-pressed', state.favoritesOnly);
    syncLibraryHistoryState();
    void loadMetricsForCurrentState();
    scheduleRatedStatusLoad(visibleMetricIds());
  }

  function librarySnapshot() {
    return {
      page: state.page,
      query: state.query,
      category: state.category,
      favoritesOnly: state.favoritesOnly,
      view: state.view,
      bundle: [...state.bundle],
      bundleMode: state.bundleMode,
      sort: $('sortOrder')?.value || 'default'
    };
  }

  function syncLibraryHistoryState() {
    if (state.single !== null) return;
    const url = new URL(location.href);
    const current = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState({ ...current, iarLibrary: librarySnapshot() }, '', url);
  }

  function restoreLibraryState(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    state.page = Number.isSafeInteger(Number(snapshot.page)) && Number(snapshot.page) > 0 ? Number(snapshot.page) : 1;
    state.query = clean(snapshot.query);
    state.category = clean(snapshot.category) || 'all';
    state.favoritesOnly = snapshot.favoritesOnly === true;
    state.view = snapshot.view === 'list' ? 'list' : 'grid';
    state.bundleMode = snapshot.bundleMode === true;
    state.bundle = new Set(Array.isArray(snapshot.bundle)
      ? snapshot.bundle.map(Number).filter(id => Number.isSafeInteger(id) && byId(id))
      : []);
    if ($('searchInput')) $('searchInput').value = state.query;
    visible('btnClearSearch', !!state.query);
    if ($('sortOrder') && ['default','title','year','pages','downloads','favorites','rating'].includes(snapshot.sort)) {
      $('sortOrder').value = snapshot.sort;
    }
    return true;
  }

  async function loadMetricsForCurrentState() {
    if (!state.loaded) return;
    if (['rating','downloads'].includes($('sortOrder')?.value)) {
      if (!state.metricsAllLoaded) {
        await loadAllMetrics();
        if (state.single === null && state.metricsAllLoaded) render();
      }
      await loadSiteVisits();
      return;
    }
    await loadVisibleMetrics();
    await loadSiteVisits();
  }

  function categories() {
    const map = new Map();
    state.books.forEach(book => map.set(categoryKey(book), categoryLabel(book)));
    text('catCounter', number(map.size));
    const chips = $('categoryChips'); if (!chips) return;
    chips.innerHTML = [['all', t('كل المراجع','All references')], ...map]
      .map(([key, label]) => `<button type="button" class="chip-item ${state.category === key ? 'active' : ''}" data-category="${esc(key)}" aria-pressed="${state.category === key}">${esc(label)}</button>`)
      .join('');
    requestAnimationFrame(updateChips);
  }

  function updateChips() {
    const wrapper = $('categoryChips'); if (!wrapper) return;
    const container = wrapper.closest('.chips-container'); if (!container) return;
    const max = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
    const current = Math.min(max, Math.abs(wrapper.scrollLeft));
    const start = max > 5 && current > 5;
    const end = max > 5 && current < max - 5;
    container.classList.toggle('can-scroll-start', start);
    container.classList.toggle('can-scroll-end', end);
    $('chipsScrollLeft')?.classList.toggle('can-show', start);
    $('chipsScrollRight')?.classList.toggle('can-show', end);
  }

  function metadata(book = null) {
    const title = book ? `${field(book,'title')} | IAR Archive` : 'IAR Archive | Iraqi Administrative Reference';
    const description = book
      ? field(book,'description')
      : t('مساحة معرفية للمراجع الإدارية، والملخصات، والتوثيق الأكاديمي.','A knowledge space for management references, summaries and academic citations.');
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description.slice(0, 160));
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description.slice(0, 160));
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = book ? bookUrl(book.id) : `${location.origin}${location.pathname}`;
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', location.href);
  }

  function points(book) {
    const list = state.lang === 'en' && book.key_points_en.length ? book.key_points_en : book.key_points;
    return list.length ? list : [t('لم يُرفق ملخص لهذا المرجع بعد.','No summary has been provided for this reference yet.')];
  }

  function summary(book) {
    state.summary = book.id;
    text('summaryBookTitle', field(book,'title'));
    text('summaryBookAuthor', field(book,'author'));
    text('summaryCategory', categoryLabel(book));
    text('summaryType', field(book,'type'));
    text('summaryPages', `${book.pages || '—'} ${t('صفحة','pages')}`);
    text('summarySize', book.file_size || '—');
    text('summaryAudience', field(book,'target_audience') || labels().unknown);
    text('summaryAPA', citation(book));
    const apa = $('summaryAPA'); if (apa) apa.dir = 'auto';
    const list = $('summaryKeyPoints');
    if (list) list.innerHTML = points(book).map(p => `<li>${esc(p)}</li>`).join('');
    modal('summaryModal');
  }

  function renderSingle() {
    const book = byId(state.single); if (!book) return;
    ['booksDisplayContainer','controlsRow','categoryChips','bundleBar','bundleModeAlertContainer','resultsCount'].forEach(id => visible(id, false));
    document.querySelector('.chips-container')?.classList.add('d-none');
    const pagWrap = $('paginationContainer')?.parentElement;
    if (pagWrap) pagWrap.classList.add('d-none');
    $('featuredSection').innerHTML = '';
    visible('singleBookView', true);
    const img = $('singleBookCover');
    if (img) {
      if (book.cover_image) { img.src = book.cover_image; img.hidden = false; }
      else { img.hidden = true; img.removeAttribute('src'); }
      img.alt = field(book,'title');
    }
    let fallback = $('singleCoverFallback');
    if (!fallback && img) {
      fallback = document.createElement('div');
      fallback.id = 'singleCoverFallback';
      img.parentElement.append(fallback);
    }
    if (fallback) fallback.innerHTML = book.cover_image ? '' : cover(book, true);
    text('singleBookTitle', field(book,'title'));
    text('singleBookAuthor', field(book,'author') || labels().unknown);
    text('singleBookCategory', categoryLabel(book));
    text('singleBookType', field(book,'type'));
    text('singleBookDescription', field(book,'description') || labels().unknown);
    text('singleBookAudience', field(book,'target_audience') || labels().unknown);
    const kp = $('singleBookKeyPoints');
    if (kp) kp.innerHTML = points(book).map(p => `<li>${esc(p)}</li>`).join('');
    const starsContainer = $('singleBookStars');
    if (starsContainer) starsContainer.innerHTML = stars(book);
    text('singleDownloadCount', number(book.downloadCount));
    if ($('singleReadBtn')) { $('singleReadBtn').disabled = !book.file_path; $('singleReadBtn').onclick = () => readBook(book); }
    if ($('singleDownloadBtn')) { $('singleDownloadBtn').disabled = !book.file_path || busyDownloads.has(book.id); $('singleDownloadBtn').onclick = () => download(book); }
    if ($('singleCiteBtn')) $('singleCiteBtn').onclick = () => copy(citation(book));
    if ($('singleShareBtn')) $('singleShareBtn').onclick = () => share(book);
    metadata(book);
    syncBundle();
  }

  function navigateBook(book) {
    history.pushState({}, '', bookUrl(book.id));
    state.single = book.id;
    renderSingle();
    window.scrollTo({ top: 0, behavior: motion() });
  }

  function backToList() {
    const url = new URL(location.href);
    url.searchParams.delete('book');
    state.single = null;
    history.replaceState({ ...(history.state || {}), iarLibrary: librarySnapshot() }, '', url);
    metadata();
    render();
  }

  function route() {
    const params = new URLSearchParams(location.search);
    const raw = params.get('book');
    const parsedBook = raw !== null && raw.trim() !== '' && Number.isSafeInteger(Number(raw)) && byId(Number(raw))
      ? Number(raw) : null;
    state.single = parsedBook;
    if (raw !== null && parsedBook === null) {
      params.delete('book');
      const cleanUrl = new URL(location.href);
      cleanUrl.search = params.toString();
      history.replaceState(history.state, '', cleanUrl);
    }
    const bundle = params.get('bundle');
    state.bundleMode = bundle !== null;
    if (bundle !== null) {
      state.bundle = new Set(bundle.split(',').filter(v => v.trim() !== '').map(Number)
        .filter(id => Number.isSafeInteger(id) && byId(id)));
    } else if (state.single === null) {
      restoreLibraryState(history.state?.iarLibrary);
    }
    state.page = state.single === null && !history.state?.iarLibrary ? 1 : state.page;
    metadata(state.single !== null ? byId(state.single) : null);
    render();
  }

  function clearBundle() {
    state.bundleMode = false; state.bundle.clear();
    state.single = null; state.query = ''; state.category = 'all';
    state.favoritesOnly = false; state.page = 1;
    if ($('searchInput')) $('searchInput').value = '';
    visible('btnClearSearch', false);
    const url = new URL(location.href);
    url.searchParams.delete('bundle');
    url.searchParams.delete('book');
    history.pushState({ iarLibrary: librarySnapshot() }, '', url);
    categories(); metadata(); render();
  }

  function language() {
    const root = document.documentElement;
    root.lang = state.lang;
    root.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    const link = $('bootstrapCSS');
    const next = state.lang === 'ar'
      ? 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.rtl.min.css'
      : 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
    if (link) { link.href = next; link.onload = updateChips; }
    const pairs = {
      'langLabel':['EN','عربي'],
      'txt-announcement':['IAR ARCHIVE · مساحة للمعرفة الإدارية','IAR ARCHIVE · A space for management knowledge'],
      'txt-subtitle':['الأرشيف الإداري العراقي','Iraqi Administrative Reference'],
      'txt-about-title':['معرفة تُلهمك.\nومراجع تصنع الأثر.','Knowledge that inspires.\nReferences that matter.'],
      'txt-about-desc':['مساحتك لاستكشاف علوم الإدارة. اقرأ، اكتشف الأفكار، وابنِ حزمة مراجعك القادمة — كل ذلك في مكان واحد.','Your space to explore management sciences. Read, discover ideas and build your next research collection — all in one place.'],
      'txt-kicker':['مساحة للمعرفة الإدارية','A space for management knowledge'],
      'txt-tag-summary':['ملخصات 3 دقائق','3-minute summaries'],
      'txt-tag-cite':['توثيق APA مباشر','Direct APA citations'],
      'txt-tag-bundle':['حزم بحثية مخصصة','Curated research bundles'],
      'txt-explore':['استكشف المكتبة','Explore the library'],
      'txt-library-title':['رفوف المعرفة','The knowledge shelves'],
      'txt-favorites-only':['مفضلتي','My favorites'],
      'txt-stat-books':['مرجع في الأرشيف','Archived references'],
      'txt-stat-cats':['مسارات معرفية','Knowledge paths'],
      'txt-stat-visits':['زيارات يومية تقريبية','Approx. daily visits'],
      'txt-stat-year':['سنة الأرشفة','Archive year'],
      'searchLabel':['البحث في المراجع','Search references'],
      'opt-sort-default':['اختيار الأرشيف','Archive selection'],
      'opt-sort-title':['العنوان: أ — ي','Title: A — Z'],
      'opt-sort-year':['الأحدث أولاً','Newest first'],
      'opt-sort-pages':['الأقل صفحات أولاً','Fewest pages first'],
      'opt-sort-downloads':['الأكثر تحميلاً','Most downloaded'],
      'opt-sort-favorites':['المفضلة أولاً','Favorites first'],
      'opt-sort-rating':['الأعلى تقييماً','Highest rated'],
      'txt-bundle-btn':['نسخ رابط الحزمة','Copy bundle link'],
      'txt-clear-bundle':['إلغاء الحزمة','Clear bundle'],
      'summaryModalTitle':['ملخص المرجع · 3 دقائق','Reference summary · 3 minutes'],
      'txt-modal-ideas-title':['أهم الأفكار','Key ideas'],
      'txt-modal-audience-title':['الفئة المستهدفة','Target audience'],
      'txt-modal-apa-title':['التوثيق الأكاديمي · APA','Academic citation · APA'],
      'txt-modal-close':['إغلاق','Close'],
      'txt-share-modal-btn':['مشاركة','Share'],
      'txt-back-to-list':['العودة إلى المكتبة','Back to the library'],
      'singleDescLabel':['عن المرجع','About this reference'],
      'singleKeyPointsLabel':['الأفكار الرئيسية','Key concepts'],
      'singleAudienceLabel':['الفئة المستهدفة','Target audience'],
      'singleReadLabel':['قراءة','Read'],
      'singleDownloadLabel':['تحميل','Download'],
      'singleCiteLabel':['توثيق APA','Cite APA'],
      'singleShareLabel':['مشاركة','Share'],
      'txt-loading':['جارٍ تحميل المراجع…','Loading references…']
    };
    Object.entries(pairs).forEach(([id, values]) => text(id, values[state.lang === 'ar' ? 0 : 1]));
    const attributes = {
      searchInput: ['placeholder', t('ابحث بعنوان، مؤلف، أو فكرة…','Search a title, author or idea…')],
      btnClearSearch: ['aria-label', t('مسح البحث','Clear search')],
      langToggleBtn: ['aria-label', t('Switch to English','التبديل إلى العربية')],
      themeToggleBtn: ['aria-label', t('تبديل المظهر','Toggle theme')],
      sortOrder: ['aria-label', t('ترتيب المراجع','Sort references')],
      btnViewGrid: ['aria-label', t('عرض شبكي','Grid view')],
      btnViewList: ['aria-label', t('عرض قائمة','List view')],
      categoryChips: ['aria-label', t('التصنيفات','Categories')],
      chipsScrollLeft: ['aria-label', t('السابق','Previous')],
      chipsScrollRight: ['aria-label', t('التالي','Next')],
      summaryDismissBtn: ['aria-label', t('إغلاق','Close')],
      pdfDismissBtn: ['aria-label', t('إغلاق','Close')],
      brandLockup: ['aria-label', t('IAR Archive — العودة إلى المكتبة','IAR Archive — Back to library')],
      heroFeatureList: ['aria-label', t('ميزات الأرشيف','Archive features')],
      viewSwitch: ['aria-label', t('طريقة العرض','View mode')],
      pdfFrame: ['title', t('قارئ الملفات','File reader')],
      coverImageModal: ['aria-label', t('عرض الغلاف','View cover')]
    };
    Object.entries(attributes).forEach(([id, [key, value]]) => attr(id, key, value));
    attr('btnViewGrid', 'title', t('عرض شبكي','Grid view'));
    attr('btnViewList', 'title', t('عرض قائمة','List view'));
    attr('themeToggleBtn', 'title', t('تبديل المظهر','Toggle theme'));
    attr('brandLockup', 'aria-label', t('IAR Archive — العودة إلى المكتبة','IAR Archive — Back to library'));
    $('paginationContainer')?.parentElement?.setAttribute('aria-label', t('صفحات المراجع','Reference pages'));
    const bundleTextEl = $('txt-bundle-text');
    if (bundleTextEl) bundleTextEl.innerHTML = t('تم تحديد <strong id="bundleCount">0</strong> مراجع لحزمتك','Selected <strong id="bundleCount">0</strong> references for your bundle');
    text('booksCounter', number(state.books.length));
    if (state.loaded) { categories(); render(); } else syncBundle();
    metadata(state.single !== null ? byId(state.single) : null);
    if (state.summary !== null && $('summaryModal')?.classList.contains('show')) summary(byId(state.summary));
    const backIcon = $('btnBackToList')?.querySelector('i');
    if (backIcon) backIcon.className = 'bi bi-arrow-' + (state.lang === 'ar' ? 'right' : 'left');
    /* Archive year stays as Latin 2026 for consistency with counters */
    text('archiveYear', '2026');
  }

  function theme() {
    document.documentElement.dataset.bsTheme = state.theme;
    const icon = $('themeIcon');
    if (icon) icon.className = `bi bi-${state.theme === 'dark' ? 'sun' : 'moon'}`;
    attr('themeToggleBtn', 'aria-pressed', state.theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'dark' ? '#070b14' : '#f6f8fc');
  }

  /* ---------- Ambient effects: cursor glow + scroll progress ---------- */
  function initAmbient() {
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (canHover && !reduceMotion) {
      const glow = $('cursorGlow');
      if (glow) {
        let rafId = 0;
        let pendingX = 0, pendingY = 0;
        const flush = () => {
          glow.style.left = pendingX + 'px';
          glow.style.top = pendingY + 'px';
          rafId = 0;
        };
        window.addEventListener('pointermove', event => {
          pendingX = event.clientX;
          pendingY = event.clientY;
          if (!rafId) rafId = requestAnimationFrame(flush);
          glow.classList.add('is-active');
        }, { passive: true });
        window.addEventListener('pointerleave', () => glow.classList.remove('is-active'));
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
        window.addEventListener('resize', update, { passive: true });
        update();
      }
    }
  }

  // --- Event wiring ---------------------------------------------------------
  $('themeToggleBtn')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    store.set('iar_theme', state.theme);
    theme();
  });
  $('langToggleBtn')?.addEventListener('click', () => {
    state.lang = state.lang === 'ar' ? 'en' : 'ar';
    store.set('iar_lang', state.lang);
    language();
  });
  $('btnViewGrid')?.addEventListener('click', () => { state.view = 'grid'; store.set('iar_view_mode', 'grid'); render(); });
  $('btnViewList')?.addEventListener('click', () => { state.view = 'list'; store.set('iar_view_mode', 'list'); render(); });
  $('favoritesOnlyBtn')?.addEventListener('click', () => { state.favoritesOnly = !state.favoritesOnly; state.page = 1; render(); });

  let searchTimer;
  $('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    state.query = $('searchInput').value.trim();
    state.page = 1;
    visible('btnClearSearch', !!state.query);
    searchTimer = setTimeout(render, 200);
  });
  $('btnClearSearch')?.addEventListener('click', () => {
    clearTimeout(searchTimer);
    state.query = '';
    if ($('searchInput')) $('searchInput').value = '';
    visible('btnClearSearch', false);
    state.page = 1;
    render();
    $('searchInput')?.focus();
  });
  $('sortOrder')?.addEventListener('change', () => { state.page = 1; render(); });

  $('categoryChips')?.addEventListener('click', event => {
    const chip = event.target.closest('[data-category]');
    if (!chip) return;
    state.category = chip.dataset.category;
    state.page = 1;
    categories(); render();
  });
  $('categoryChips')?.addEventListener('scroll', updateChips, { passive: true });
  window.addEventListener('resize', updateChips);
  $('chipsScrollLeft')?.addEventListener('click', () =>
    $('categoryChips')?.scrollBy({ left: state.lang === 'ar' ? 220 : -220, behavior: motion() }));
  $('chipsScrollRight')?.addEventListener('click', () =>
    $('categoryChips')?.scrollBy({ left: state.lang === 'ar' ? -220 : 220, behavior: motion() }));

  $('paginationContainer')?.addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    render();
    $('controlsRow')?.scrollIntoView({ behavior: motion(), block: 'start' });
  });

  $('btnBackToList')?.addEventListener('click', backToList);
  document.querySelector('.brand-lockup')?.addEventListener('click', event => {
    event.preventDefault();
    clearBundle();
    window.scrollTo({ top: 0, behavior: motion() });
  });
  $('copyBundleBtn')?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('book');
    url.searchParams.set('bundle', [...state.bundle].join(','));
    url.hash = '';
    copy(url.href);
  });
  $('clearBundleBtn')?.addEventListener('click', clearBundle);
  $('modalShareBtn')?.addEventListener('click', () => {
    const book = byId(state.summary);
    if (book) share(book);
  });

  document.addEventListener('change', event => {
    const input = event.target.closest('[data-action="bundle"]');
    if (!input) return;
    const id = Number(input.dataset.id);
    if (!byId(id)) return;
    input.checked ? state.bundle.add(id) : state.bundle.delete(id);
    document.querySelectorAll(`input[data-action="bundle"][data-id="${id}"]`).forEach(el => el.checked = input.checked);
    if (state.bundleMode) {
      const url = new URL(location.href);
      url.searchParams.set('bundle', [...state.bundle].join(','));
      history.replaceState({}, '', url);
      render();
    } else syncBundle();
  });

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    const name = trigger.dataset.action;
    if (name === 'bundle') return;
    if (trigger.tagName === 'A' && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    if (name === 'clear-bundle') { clearBundle(); return; }
    if (name === 'retry') { fetchBooks(); return; }
    if (name === 'reset') {
      state.query = ''; state.category = 'all'; state.favoritesOnly = false; state.page = 1;
      if ($('searchInput')) $('searchInput').value = '';
      visible('btnClearSearch', false);
      categories(); render();
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
        const was = state.favorites.has(book.id);
        was ? state.favorites.delete(book.id) : state.favorites.add(book.id);
        store.set('iar_favorites', JSON.stringify([...state.favorites]));
        render();
        toast(was ? t('أزيل من المفضلة.','Removed from favorites.') : t('أضيف إلى المفضلة.','Added to favorites.'));
        break;
      }
      case 'cover': {
        attr('coverImageLarge', 'src', book.cover_image);
        attr('coverImageLarge', 'alt', field(book,'title'));
        modal('coverImageModal');
        break;
      }
    }
  });

  document.addEventListener('error', event => {
    const img = event.target;
    if (img.tagName !== 'IMG') return;
    if (img.classList.contains('cover-img')) {
      img.hidden = true;
      if (img.nextElementSibling) img.nextElementSibling.hidden = false;
    } else if (img.id === 'singleBookCover') {
      img.hidden = true;
      const book = byId(state.single);
      if (book && $('singleCoverFallback')) {
        const clone = { ...book, cover_image: '' };
        $('singleCoverFallback').innerHTML = cover(clone, true);
      }
    }
  }, true);

  window.addEventListener('popstate', route);

  async function fetchBooks() {
    state.loading = true; state.error = false; state.loaded = false;
    const container = $('booksDisplayContainer');
    if (container) {
      container.innerHTML = `<div class="empty-state" role="status">${i('hourglass-split')}<p>${t('جارٍ تحميل المراجع…','Loading references…')}</p></div>`;
    }
    try {
      const response = await fetch('./books.json', { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('books.json unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('books.json must contain an array');
      const ids = new Set();
      state.metricsLoadedIds.clear();
      state.metricsLoadingIds.clear();
      state.metricsAllLoaded = false;
      state.metricsAllLoading = false;
      state.ratedIds.clear();
      state.ratedLoadedIds.clear();
      state.visitsLoaded = false;
      state.visitsLoading = false;
      state.books = payload.map(normalize).filter(book => {
        if (!book || ids.has(book.id)) return false;
        ids.add(book.id);
        return true;
      });
      state.loaded = true; state.loading = false;
      firebaseReady = connectFirebase();
      language();
      route();
      void loadMetrics();
    } catch (error) {
      state.loading = false; state.error = true;
      const featured = $('featuredSection'); if (featured) featured.innerHTML = '';
      text('resultsCount', '');
      text('booksCounter', '—');
      if (container) {
        container.innerHTML = `<div class="empty-state" role="alert">${i('cloud-slash')}<h3>${t('تعذّر تحميل المراجع','Could not load references')}</h3><p>${t('تأكد من وجود books.json بجانب index.html، ثم أعد المحاولة.','Ensure books.json is available next to index.html, then retry.')}</p><button type="button" class="btn btn-iar-primary" data-action="retry">${t('إعادة المحاولة','Retry')}</button></div>`;
      }
      console.warn(error.message);
    }
  }

  initAmbient();
  theme();
  language();
  fetchBooks();
})();
