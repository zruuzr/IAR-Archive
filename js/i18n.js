/* ============================================================
   IAR Archive — internationalization
   Text lookup, number formatting, icon helper, labels.
   ============================================================ */

import { state } from './state.js';

export const t = (ar, en) => (state.ui.lang === 'ar' ? ar : en);

export const field = (book, name) =>
  state.ui.lang === 'en' && book[name + '_en'] ? book[name + '_en'] : book[name];

export const number = (v) =>
  new Intl.NumberFormat(state.ui.lang === 'ar' ? 'ar-u-nu-latn' : 'en-US').format(v);

export const i = (name) =>
  `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

export const labels = () => ({
  read: t('قراءة', 'Read'),
  download: t('تحميل', 'Download'),
  summary: t('ملخص 3 دقائق', '3-minute summary'),
  cite: t('توثيق APA', 'Cite APA'),
  share: t('مشاركة', 'Share'),
  favorite: t('المفضلة', 'Favorite'),
  unknown: t('غير متوفر', 'Not provided')
});
