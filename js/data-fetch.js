/* ============================================================
   IAR Archive — data loading
   Fetch books.json, normalize, connect Firebase, load metrics.
   ============================================================ */

import { $, text, finite, store } from './utils.js';
import { state } from './state.js';
import { t, number, i } from './i18n.js';
import { normalize, byId } from './data.js';
import { fb, timeout, connectFirebase } from './firebase.js';
import { refreshCounts } from './download.js';
import { refreshRatings } from './ratings.js';
import { render } from './render.js';
import { language } from './ui-init.js';
import { route } from './router.js';

export async function loadMetrics() {
  await fb.ready;
  if (!fb.db) {
    text('siteVisitsCounter', '—');
    return;
  }

  await Promise.allSettled(
    ['ratings', 'downloads'].map(async (name) => {
      const snapshot = await timeout(fb.db.collection(name).get());
      snapshot.forEach((doc) => {
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
            ? data.voters.filter((v) => typeof v === 'string')
            : [];
        }
      });
    })
  );

  refreshRatings();
  refreshCounts();

  try {
    const visits = fb.db.collection('stats').doc('visits');
    const last = finite(store.get('iar_last_visit', '0'));
    let count;

    if (fb.auth?.currentUser && Date.now() - last > 86400000) {
      count = await timeout(
        fb.db.runTransaction(async (transaction) => {
          const doc = await transaction.get(visits);
          const next = finite(doc.data()?.count) + 1;
          transaction.set(visits, { count: next }, { merge: true });
          return next;
        })
      );
      store.set('iar_last_visit', Date.now());
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

export async function fetchBooks() {
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
    state.data.books = payload.map(normalize).filter((book) => {
      if (!book || ids.has(book.id)) return false;
      ids.add(book.id);
      return true;
    });

    state.data.loaded = true;
    state.data.loading = false;

    language();
    route();

    fb.ready = connectFirebase();
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
