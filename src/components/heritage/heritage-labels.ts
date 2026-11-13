import type { HeritageBookDetailsLabels } from './HeritageBookDetails';

export type HeritageLanguage = 'ar' | 'en';

/**
 * Every visible string of the heritage book components, in one place, in both languages.
 * The Arabic and English wording matches `src/i18n/locales/ar.ts` / `en.ts` where a key
 * already exists (read, download, cite, share, favourites, back to the library, about,
 * target audience…), so a button never says one thing on the card and another on the
 * details page.
 */
export interface HeritageLabels {
  card: {
    read: string;
    /** Menu items. */
    download: string;
    cite: string;
    summary: string;
    share: string;
    bundleAdd: string;
    bundleRemove: string;
    favoriteAdd: string;
    favoriteRemove: string;
    more: string;
    zoomCover: string;
    pagesUnit: string;
    rating: (value: number, count: number) => string;
    downloads: (count: number) => string;
  };
  view: { grid: string; list: string };
  details: HeritageBookDetailsLabels & {
    authorBy: string;
    readReference: string;
    download: string;
    favoriteAdd: string;
    bundleAdd: string;
    share: string;
    rate: string;
    factYear: string;
    factPages: string;
    factFormat: string;
    metricDownloads: string;
    stampTitle: string;
    stampText: string;
    rating: (value: number) => string;
  };
}

const ar: HeritageLabels = {
  card: {
    read: 'قراءة',
    download: 'تحميل الملف',
    cite: 'نسخ توثيق APA',
    summary: 'ملخص 3 دقائق',
    share: 'مشاركة',
    bundleAdd: 'إضافة إلى الحزمة',
    bundleRemove: 'إزالة من الحزمة',
    favoriteAdd: 'إضافة إلى المفضلة',
    favoriteRemove: 'إزالة من المفضلة',
    more: 'المزيد من الإجراءات',
    zoomCover: 'معاينة الغلاف بالحجم الكامل',
    pagesUnit: 'صفحة',
    rating: (value, count) => `التقييم ${value} من 5 (${count})`,
    downloads: (count) => `${count} تحميل`
  },
  view: { grid: 'عرض شبكي', list: 'عرض قائمة' },
  details: {
    back: 'العودة إلى المكتبة',
    referenceNo: 'مرجع رقم',
    about: 'عن المرجع',
    keyPoints: 'الأفكار الرئيسية',
    keywords: 'الكلمات المفتاحية',
    audience: 'الفئة المستهدفة',
    citation: 'توثيق APA',
    copy: 'نسخ التوثيق',
    copied: 'تم النسخ',
    previous: 'المرجع السابق',
    next: 'المرجع التالي',
    related: 'مراجع قريبة',
    zoomCover: 'معاينة الغلاف بالحجم الكامل',
    authorBy: 'تأليف',
    readReference: 'قراءة المرجع',
    download: 'تحميل',
    favoriteAdd: 'إضافة إلى المفضلة',
    bundleAdd: 'إضافة إلى حزمة البحث',
    share: 'مشاركة',
    rate: 'تقييم المرجع',
    factYear: 'سنة الإصدار',
    factPages: 'عدد الصفحات',
    factFormat: 'الصيغة والحجم',
    metricDownloads: 'التحميلات',
    stampTitle: 'مرجع موثَّق في الأرشيف',
    stampText: 'فُهرس ووُثّق وفق معايير الفهرسة الأكاديمية.',
    rating: (value) => `التقييم ${value} من 5`
  }
};

const en: HeritageLabels = {
  card: {
    read: 'Read',
    download: 'Download file',
    cite: 'Copy APA citation',
    summary: '3-minute summary',
    share: 'Share',
    bundleAdd: 'Add to bundle',
    bundleRemove: 'Remove from bundle',
    favoriteAdd: 'Add favorite',
    favoriteRemove: 'Remove favorite',
    more: 'More actions',
    zoomCover: 'View the cover in full size',
    pagesUnit: 'pages',
    rating: (value, count) => `Rated ${value} out of 5 (${count})`,
    downloads: (count) => `${count} downloads`
  },
  view: { grid: 'Grid view', list: 'List view' },
  details: {
    back: 'Back to the library',
    referenceNo: 'Reference no.',
    about: 'About this reference',
    keyPoints: 'Key concepts',
    keywords: 'Keywords',
    audience: 'Target audience',
    citation: 'Cite APA',
    copy: 'Copy citation',
    copied: 'Copied',
    previous: 'Previous reference',
    next: 'Next reference',
    related: 'Related references',
    zoomCover: 'View the cover in full size',
    authorBy: 'By',
    readReference: 'Read this reference',
    download: 'Download',
    favoriteAdd: 'Add favorite',
    bundleAdd: 'Add to research bundle',
    share: 'Share',
    rate: 'Rate this reference',
    factYear: 'Year',
    factPages: 'Pages',
    factFormat: 'Format & size',
    metricDownloads: 'Downloads',
    stampTitle: 'Verified in the archive',
    stampText: 'Catalogued and cited to academic indexing standards.',
    rating: (value) => `Rated ${value} out of 5`
  }
};

const LABELS: Record<HeritageLanguage, HeritageLabels> = { ar, en };

export function getHeritageLabels(lang: HeritageLanguage): HeritageLabels {
  return LABELS[lang] ?? ar;
}
