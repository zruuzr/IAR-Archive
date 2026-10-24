/* ============================================================
   IAR Archive — Administrative Sciences Facets & Taxonomies
   Authentic categorization derived from books.json covering
   Management, Leadership, Business Administration, Accounting,
   Finance, Economics, and Scientific Research Methodology.
   ============================================================ */

export interface DisciplineFacet {
  readonly id: string;
  readonly name: string;
  readonly nameEn: string;
  readonly keyword: string;
  readonly keywords: readonly string[];
}

export interface EraFacet {
  readonly id: string;
  readonly label: string;
  readonly labelEn: string;
  readonly min: number;
  readonly max: number;
}

export interface TypeFacet {
  readonly id: string;
  readonly label: string;
  readonly labelEn: string;
  readonly keyword: string;
}

/**
 * Administrative Sciences Disciplines & Subject Areas
 */
export const DISCIPLINE_FACETS: readonly DisciplineFacet[] = [
  {
    id: 'business_strategy',
    name: 'إدارة الأعمال والاستراتيجية',
    nameEn: 'Business Administration & Strategy',
    keyword: 'أعمال',
    keywords: ['أعمال', 'استراتيج', 'مشروعات', 'تخطيط']
  },
  {
    id: 'accounting_finance',
    name: 'المحاسبة والتحليل المالي',
    nameEn: 'Accounting & Financial Analysis',
    keyword: 'محاسبة',
    keywords: ['محاسبة', 'مالية', 'تمويل', 'تدقيق', 'موازنة']
  },
  {
    id: 'leadership_org',
    name: 'القيادة والسلوك التنظيمي',
    nameEn: 'Leadership & Organizational Behavior',
    keyword: 'قيادة',
    keywords: ['قيادة', 'تنظيم', 'سلوك', 'إشراف', 'توجيه']
  },
  {
    id: 'marketing_ops',
    name: 'التسويق وإدارة العمليات',
    nameEn: 'Marketing & Operations Management',
    keyword: 'تسويق',
    keywords: ['تسويق', 'عمليات', 'إنتاج', 'سوق', 'جودة']
  },
  {
    id: 'economics_resources',
    name: 'الاقتصاد وإدارة الموارد',
    nameEn: 'Economics & Resource Management',
    keyword: 'اقتصاد',
    keywords: ['اقتصاد', 'موارد', 'تنمية', 'تجارة']
  },
  {
    id: 'research_dev',
    name: 'مناهج البحث والتطوير الإداري',
    nameEn: 'Research Methods & Development',
    keyword: 'بحث',
    keywords: ['بحث', 'تطوير', 'مناهج', 'إحصاء', 'دراسات']
  }
] as const;

// Backward-compatibility alias
export const ISSUER_FACETS = DISCIPLINE_FACETS;

/**
 * Publication Eras matching actual dates in books.json (1977 — 2026)
 */
export const ERA_FACETS: readonly EraFacet[] = [
  {
    id: 'era_all',
    label: 'جميع الحقب الإدارية',
    labelEn: 'All Administrative Eras',
    min: 0,
    max: 2099
  },
  {
    id: 'era_modern',
    label: '2020 — 2026 (المراجع المعاصرة)',
    labelEn: '2020 — 2026 (Contemporary References)',
    min: 2020,
    max: 2026
  },
  {
    id: 'era_contemporary',
    label: '2010 — 2019 (التطوير الإداري الحديث)',
    labelEn: '2010 — 2019 (Modern Management Era)',
    min: 2010,
    max: 2019
  },
  {
    id: 'era_millennium',
    label: '2000 — 2009 (إدارة الألفية الجديدة)',
    labelEn: '2000 — 2009 (New Millennium Era)',
    min: 2000,
    max: 2009
  },
  {
    id: 'era_foundational',
    label: '1980 — 1999 (تأسيس الفكر الإداري)',
    labelEn: '1980 — 1999 (Modern Foundations)',
    min: 1980,
    max: 1999
  },
  {
    id: 'era_classics',
    label: 'ما قبل 1980 (الكلاسيكيات والأصول)',
    labelEn: 'Pre-1980 (Management Classics)',
    min: 0,
    max: 1979
  }
] as const;

/**
 * Types of Administrative References
 */
export const TYPE_FACETS: readonly TypeFacet[] = [
  {
    id: 'type_all',
    label: 'جميع الأنواع المرجعية',
    labelEn: 'All Reference Types',
    keyword: ''
  },
  {
    id: 'type_textbooks',
    label: 'كتب ومؤلفات منهجية',
    labelEn: 'Textbooks & Treatises',
    keyword: 'كتاب'
  },
  {
    id: 'type_studies',
    label: 'دراسات وبحوث تطبيقية',
    labelEn: 'Applied Studies & Research',
    keyword: 'دراسة'
  },
  {
    id: 'type_guides',
    label: 'أدلة تدريبية وإرشادية',
    labelEn: 'Guides & Handbooks',
    keyword: 'دليل'
  },
  {
    id: 'type_theories',
    label: 'نظريات والفكر الإداري',
    labelEn: 'Management Theory & Thought',
    keyword: 'فكر'
  }
] as const;
