/* ============================================================
   IAR Archive — UI initialization
   Language switcher, theme toggle, ambient effects.
   ============================================================ */

import { $, attr, text } from './utils.js';
import { state } from './state.js';
import { t } from './i18n.js';
import { byId } from './data.js';
import {
  render,
  categories,
  syncBundle,
  metadata,
  summary,
  updateInstantReader
} from './render.js';

export function language() {
  const root = document.documentElement;
  root.lang = state.ui.lang;
  root.dir = state.ui.lang === 'ar' ? 'rtl' : 'ltr';

  const pairs = {
    langLabel: ['EN', 'عربي'],
    'txt-install': ['تثبيت', 'Install'],
    'txt-announcement': ['بوابة الباحثين', 'Researcher Portal'],
    'txt-subtitle': [
      'مستودع المراجع الإدارية العراقية',
      'Iraqi Administrative Reference Repository'
    ],
    'txt-about-title': [
      'دار الحكمة المعاصرة للمراجع الإدارية.',
      'Modern Bayt al-Hikma for Administrative References.'
    ],
    'txt-about-desc': [
      'مجموعة منتقاة من المراجع الإدارية، مفهرسة بعناية، مرفقة بملخصات مركزة وتوثيق أكاديمي مباشر — لتكون وجهتك الأولى للبحث والاطلاع.',
      'A curated collection of administrative references — indexed with care, accompanied by focused summaries and direct academic citation — so it becomes your first stop for research and reading.'
    ],
    'txt-kicker': [
      'مستودع المراجع الإدارية العراقية · من ألواح سومر إلى أوراق الحاضر',
      'Iraqi Administrative Reference Repository · From Sumerian Tablets to Modern Folios'
    ],
    'txt-tag-summary': ['ملخصات 3 دقائق', '3-minute summaries'],
    'txt-tag-cite': ['توثيق APA مباشر', 'Direct APA citations'],
    'txt-tag-bundle': ['حزم بحثية مخصصة', 'Curated research bundles'],
    'txt-search-btn': ['بحث', 'Search'],
    'txt-library-title': ['فهرس المراجع التفاعلي', 'Interactive Reference Catalog'],
    'txt-favorites-only': ['مفضلة', 'My favorites'],
    'txt-toggle-reader': ['القارئ الفوري', 'Instant Reader'],
    'txt-stat-books': ['مرجع', 'References'],
    'txt-stat-cats': ['تصنيف', 'Categories'],
    'txt-stat-visits': ['زيارة', 'Visits'],
    'txt-stat-year': ['إصدار', 'Edition'],
    searchLabel: ['البحث في المراجع', 'Search references'],
    'opt-sort-default': ['اختيار الأرشيف', 'Archive selection'],
    'opt-sort-title': ['العنوان: أ — ي', 'Title: A — Z'],
    'opt-sort-year': ['الأحدث أولاً', 'Newest first'],
    'opt-sort-pages': ['الأقل صفحات أولاً', 'Fewest pages first'],
    'opt-sort-downloads': ['الأكثر تحميلاً', 'Most downloaded'],
    'opt-sort-favorites': ['المفضلة أولاً', 'Favorites first'],
    'opt-sort-rating': ['الأعلى تقييماً', 'Highest rated'],
    'txt-reader-badge': ['القارئ الفوري للمراجع', 'Instant Reference Reader'],
    'txt-tab-brief': ['ملخص 3 دقائق & APA', '3-Min Summary & APA'],
    'txt-tab-pdf': ['معاينة PDF مباشرة', 'Live PDF Preview'],
    'txt-reader-of': ['من', 'of'],
    'txt-paper-state': ['جمهورية العراق', 'Republic of Iraq'],
    'txt-paper-lib': ['المكتبة الإدارية الرقمية', 'Digital Administrative Library'],
    'txt-reader-desc-heading': ['المستخلص التنفيذي:', 'Executive Summary:'],
    'txt-reader-points-heading': [
      'المحاور والأفكار الرئيسية:',
      'Core Pillars & Key Concepts:'
    ],
    'txt-reader-audience-heading': ['الفئة المستهدفة:', 'Target Audience:'],
    'txt-reader-apa-heading': ['التوثيق المرجعي (APA):', 'Academic Citation (APA):'],
    'txt-reader-copy-apa': ['نسخ التوثيق', 'Copy Citation'],
    'txt-bundle-heading': ['حزمة الأبحاث', 'Research Bundle'],
    'txt-bundle-btn': ['نسخ رابط الحزمة', 'Copy bundle link'],
    'txt-clear-bundle': ['إلغاء الحزمة', 'Clear bundle'],
    'txt-footer-brand': [
      'مستودع المراجع الإدارية العراقية',
      'Iraqi Administrative Reference Repository'
    ],
    summaryModalTitle: ['ملخص المرجع · 3 دقائق', 'Reference summary · 3 minutes'],
    'txt-modal-ideas-title': ['أهم الأفكار', 'Key ideas'],
    'txt-modal-audience-title': ['الفئة المستهدفة', 'Target audience'],
    'txt-modal-apa-title': ['التوثيق الأكاديمي · APA', 'Academic citation · APA'],
    'txt-modal-close': ['إغلاق', 'Close'],
    'txt-share-modal-btn': ['مشاركة', 'Share'],
    'txt-back-to-list': ['العودة إلى المكتبة', 'Back to the library'],
    singleDescLabel: ['عن المرجع', 'About this reference'],
    singleKeyPointsLabel: ['الأفكار الرئيسية', 'Key concepts'],
    singleAudienceLabel: ['الفئة المستهدفة', 'Target audience'],
    singleReadLabel: ['قراءة', 'Read'],
    singleDownloadLabel: ['تحميل', 'Download'],
    singleCiteLabel: ['توثيق APA', 'Cite APA'],
    singleShareLabel: ['مشاركة', 'Share'],
    'txt-loading': ['جارٍ تحميل المراجع…', 'Loading references…'],
    dlCancelLabel: ['إلغاء', 'Cancel'],
    dlTitle: ['جارٍ تحضير الملف…', 'Preparing file…']
  };

  Object.entries(pairs).forEach(([id, values]) =>
    text(id, values[state.ui.lang === 'ar' ? 0 : 1])
  );

  const attributes = {
    searchInput: [
      'placeholder',
      t(
        'ابحث في المستودع حسب العنوان، المؤلف، أو الكلمات المفتاحية…',
        'Search repository by title, author, or keywords…'
      )
    ],
    btnClearSearch: ['aria-label', t('مسح البحث', 'Clear search')],
    langToggleBtn: ['aria-label', t('Switch to English', 'التبديل إلى العربية')],
    themeToggleBtn: ['aria-label', t('تبديل المظهر', 'Toggle theme')],
    sortOrder: ['aria-label', t('ترتيب المراجع', 'Sort references')],
    btnViewGrid: ['aria-label', t('عرض شبكي', 'Grid view')],
    btnViewList: ['aria-label', t('عرض قائمة', 'List view')],
    categoryChips: ['aria-label', t('التصنيفات', 'Categories')],
    chipsScrollLeft: ['aria-label', t('السابق', 'Previous')],
    chipsScrollRight: ['aria-label', t('التالي', 'Next')],
    btnCloseReaderPane: ['aria-label', t('إغلاق القارئ', 'Close reader')],
    btnReaderFullModal: ['aria-label', t('تكبير بملء الشاشة', 'Fullscreen reader')],
    btnReaderDownload: ['aria-label', t('تحميل PDF', 'Download PDF')],
    btnReaderPrev: ['aria-label', t('المرجع السابق', 'Previous reference')],
    btnReaderNext: ['aria-label', t('المرجع التالي', 'Next reference')],
    summaryDismissBtn: ['aria-label', t('إغلاق', 'Close')],
    pdfDismissBtn: ['aria-label', t('إغلاق', 'Close')],
    dlCancel: ['aria-label', t('إلغاء التحميل', 'Cancel download')]
  };

  Object.entries(attributes).forEach(([id, [key, value]]) => attr(id, key, value));

  $('paginationContainer')?.parentElement?.setAttribute(
    'aria-label',
    t('صفحات المراجع', 'Reference pages')
  );

  const bundleTextEl = $('txt-bundle-text');
  if (bundleTextEl) {
    bundleTextEl.innerHTML = t(
      'حزمة الأبحاث (<strong id="bundleCount">0</strong> مراجع مختارة)',
      'Research Bundle (<strong id="bundleCount">0</strong> references selected)'
    );
  }

  text(
    'booksCounter',
    state.data.books.length
      ? new Intl.NumberFormat(state.ui.lang === 'ar' ? 'ar-u-nu-latn' : 'en-US').format(
          state.data.books.length
        )
      : '—'
  );

  if (state.data.loaded) {
    categories();
    render();
    updateInstantReader();
  } else {
    syncBundle();
  }

  metadata(state.ui.single !== null ? byId(state.ui.single) : null);

  if (state.ui.summary !== null && $('summaryModal')?.classList.contains('is-open')) {
    summary(byId(state.ui.summary));
  }

  const isAr = state.ui.lang === 'ar';
  const prevChevron = isAr ? '#i-chevron-right' : '#i-chevron-left';
  const nextChevron = isAr ? '#i-chevron-left' : '#i-chevron-right';

  $('chipsScrollLeft')?.querySelector('use')?.setAttribute('href', prevChevron);
  $('chipsScrollRight')?.querySelector('use')?.setAttribute('href', nextChevron);
  $('btnReaderPrev')?.querySelector('use')?.setAttribute('href', prevChevron);
  $('btnReaderNext')?.querySelector('use')?.setAttribute('href', nextChevron);

  const backIcon = $('btnBackToList')?.querySelector('use');
  if (backIcon) {
    backIcon.setAttribute('href', `#i-arrow-${isAr ? 'right' : 'left'}`);
  }

  text('archiveYear', '2026');
}

export function theme() {
  document.documentElement.dataset.theme = state.ui.theme;
  const icon = $('themeIcon');
  if (icon)
    icon
      .querySelector('use')
      ?.setAttribute('href', state.ui.theme === 'dark' ? '#i-sun' : '#i-moon');
  attr('themeToggleBtn', 'aria-pressed', state.ui.theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', state.ui.theme === 'dark' ? '#080c14' : '#faf7f0');
}

export function initAmbient() {
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canHover && !reduceMotion) {
    const glow = $('cursorGlow');
    if (glow) {
      let rafId = 0,
        pendingX = 0,
        pendingY = 0;
      const flush = () => {
        glow.style.left = pendingX + 'px';
        glow.style.top = pendingY + 'px';
        rafId = 0;
      };

      window.addEventListener(
        'pointermove',
        (e) => {
          pendingX = e.clientX;
          pendingY = e.clientY;
          if (!rafId) rafId = requestAnimationFrame(flush);
          glow.classList.add('is-active');
        },
        { passive: true }
      );

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
