/* ============================================================
   IAR Archive — rating system
   Stars rendering, transaction-based rating, refresh.
   ============================================================ */

import { $$, esc, finite } from './utils.js';
import { state } from './state.js';
import { t, i, number } from './i18n.js';
import { byId } from './data.js';
import { toast } from './ui-helpers.js';
import { fb } from './firebase.js';

export const rated = (book) =>
  Array.isArray(book.voters) && book.voters.includes(fb.auth?.currentUser?.uid);

export function stars(book) {
  const done = rated(book);
  const busy = state.meta.busyRatings.has(book.id);

  const ratingDisplay = book.ratingCount
    ? `${book.publicRating.toFixed(2)} · ${number(book.ratingCount)}`
    : t('كن أول المقيّمين', 'Be the first to rate');

  return `<div class="rating-stars" data-stars="${book.id}" role="group" aria-label="${esc(t('تقييم المرجع', 'Rate reference'))}">
${[1, 2, 3, 4, 5]
  .map(
    (value) =>
      `<button type="button" class="star-button ${value <= Math.round(book.publicRating) ? 'active' : ''}"
    data-action="rate" data-id="${book.id}" data-rating="${value}"
    aria-label="${esc(t(`تقييم ${value} من 5`, `Rate ${value} out of 5`))}"
    ${done || busy ? 'disabled' : ''}>${i(value <= Math.round(book.publicRating) ? 'star-filled' : 'star')}</button>`
  )
  .join('')}
<small>${ratingDisplay}</small>
</div>`;
}

export function refreshRatings() {
  $$('[data-stars]').forEach((el) => {
    const book = byId(el.dataset.stars);
    if (book) el.outerHTML = stars(book);
  });
}

export async function rate(book, value) {
  if (!Number.isInteger(value) || value < 1 || value > 5) return;
  if (state.meta.busyRatings.has(book.id) || rated(book)) return;

  state.meta.busyRatings.add(book.id);
  refreshRatings();

  try {
    await fb.ready;
    if (!fb.db || !fb.auth?.currentUser) throw new Error('AUTH');

    const uid = fb.auth.currentUser.uid;
    const result = await fb.db.runTransaction(async (transaction) => {
      const aggregateRef = fb.db.collection('ratings').doc(String(book.id));
      const voteRef = aggregateRef.collection('votes').doc(uid);

      const aggregateDoc = await transaction.get(aggregateRef);
      const voteDoc = await transaction.get(voteRef);

      if (voteDoc.exists) throw new Error('ALREADY_VOTED');

      const data = aggregateDoc.data() || {};

      const legacyVoters = Array.isArray(data.voters) ? data.voters : [];
      if (legacyVoters.includes(uid)) throw new Error('ALREADY_VOTED');

      const ratingSum = finite(data.ratingSum) + value;
      const ratingCount = finite(data.ratingCount) + 1;

      const newData = {
        ratingSum,
        ratingCount,
        average: Number((ratingSum / ratingCount).toFixed(2))
      };

      if (Array.isArray(data.voters)) {
        newData.voters = [...data.voters, uid];
      }

      transaction.set(voteRef, { value });
      transaction.set(aggregateRef, newData);
      return newData;
    });

    Object.assign(book, {
      ratingSum: result.ratingSum,
      ratingCount: result.ratingCount,
      publicRating: result.average
    });
    if (Array.isArray(result.voters)) {
      book.voters = result.voters;
    }

    toast(t('تم حفظ تقييمك.', 'Your rating was saved.'));
  } catch (error) {
    toast(
      error.message === 'ALREADY_VOTED'
        ? t('سبق أن قيّمت هذا المرجع.', 'You already rated this reference.')
        : t(
            'تعذّر حفظ التقييم. تحقق من الاتصال وصلاحيات Firebase.',
            'Rating failed. Check connectivity and Firebase permissions.'
          ),
      true
    );
  } finally {
    state.meta.busyRatings.delete(book.id);
    refreshRatings();
  }
}
