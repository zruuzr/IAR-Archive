/**
 * Sample data for <HeritageDemo />. Real records from books.json (ids noted),
 * grouped by a simple keyword classifier — replace with your catalog hooks.
 */
export interface DemoBook {
  id: number;
  title: string;
  author: string;
  category: string;
  type: string;
  year: number;
  pages: number;
  size: string;
  group: string;
}

export const DEMO_BOOKS: readonly DemoBook[] = [
  {
    id: 1,
    title: 'دليل الطالب للقبول المركزي في الجامعات العراقية',
    author: 'وزارة التعليم العالي والبحث العلمي',
    category: 'التعليم والقبول',
    type: 'دليل رسمي',
    year: 2026,
    pages: 140,
    size: '9.63 MB',
    group: 'edu'
  },
  {
    id: 95,
    title: 'موسوعة معايير المحاسبة الدولية والمصرية - المجلد الثاني',
    author: 'سلسلة المعايير المحاسبية والتطبيقات المهنية',
    category: 'محاسبة ومالية',
    type: 'كتاب مرجعي / تعليمي',
    year: 2015,
    pages: 401,
    size: '18.72 MB',
    group: 'acct'
  },
  {
    id: 140,
    title: 'سياسات صندوق النقد الدولي وأثرها على الدول النامية',
    author: 'محمد عبد الله محمد شاهين',
    category: 'الاقتصاد',
    type: 'كتاب',
    year: 2017,
    pages: 312,
    size: '20.4 MB',
    group: 'econ'
  },
  {
    id: 34,
    title: 'الإحصاء والاحتمال',
    author: 'أنيس إسماعيل كنجو',
    category: 'الرياضيات والإحصاء',
    type: 'كتاب أكاديمي',
    year: 2000,
    pages: 485,
    size: '9.59 MB',
    group: 'stat'
  },
  {
    id: 152,
    title:
      'شيء واحد يجب أن تعرفه: عن الإدارة الناجحة والقيادة الفعالة والحفاظ على النجاح الفردي',
    author: 'ماركوس باكينجهام',
    category: 'الإدارة والقيادة',
    type: 'كتاب',
    year: 2006,
    pages: 317,
    size: '7.4 MB',
    group: 'lead'
  },
  {
    id: 161,
    title: 'دليل البائع الناجح',
    author: 'جيفري غيتومر',
    category: 'إدارة الأعمال والتسويق',
    type: 'كتاب',
    year: 2006,
    pages: 216,
    size: '2.7 MB',
    group: 'mkt'
  },
  {
    id: 17,
    title: 'كيف تجعل من نفسك عاملاً فعالاً في منظمتك؟',
    author: 'د. مؤيد الفضل، د. فيصل الفضل',
    category: 'إدارة الأعمال وتطوير الذات',
    type: 'كتاب',
    year: 2026,
    pages: 82,
    size: '8.79 MB',
    group: 'lead'
  },
  {
    id: 4,
    title: 'مناهج البحث العلمي: تطبيقات إدارية واقتصادية',
    author: 'أحمد حسين الرفاعي',
    category: 'مناهج البحث العلمي والعلوم الإدارية',
    type: 'كتاب أكاديمي',
    year: 1999,
    pages: 312,
    size: '23.00 MB',
    group: 'research'
  }
];

export const DEMO_SPINES = [
  {
    id: 36,
    short: 'الموظف الإداري',
    title: 'الموظف الإداري',
    author: 'د. عاطف عبد الله المكاوي',
    year: 2013,
    pages: 189,
    color: '#a14a28',
    light: false,
    height: 86
  },
  {
    id: 122,
    short: 'منظمات الأعمال',
    title: 'منظمات الأعمال: المفاهيم والوظائف',
    author: 'محفوظ جودة، حسن الزعبي، ياسر المنصور',
    year: 2008,
    pages: 288,
    color: '#0f5a5e',
    light: false,
    height: 100
  },
  {
    id: 152,
    short: 'شيء واحد يجب أن تعرفه',
    title:
      'شيء واحد يجب أن تعرفه: عن الإدارة الناجحة والقيادة الفعالة والحفاظ على النجاح الفردي',
    author: 'ماركوس باكينجهام',
    year: 2006,
    pages: 317,
    color: '#c9992e',
    light: true,
    height: 92
  },
  {
    id: 155,
    short: 'إدارة المبيعات',
    title: 'إدارة المبيعات',
    author: 'محمود جاسم الصميدعي، ردينة عثمان يوسف',
    year: 2010,
    pages: 346,
    color: '#6b1f2c',
    light: false,
    height: 100
  },
  {
    id: 156,
    short: 'أخلاقيات الإدارة',
    title: 'أخلاقيات الإدارة ومسؤولية الأعمال في شركات الأعمال',
    author: 'د. نجم عبود نجم',
    year: 2005,
    pages: 468,
    color: '#2d5a3d',
    light: false,
    height: 82
  },
  {
    id: 149,
    short: 'الخطة الاستراتيجية',
    title: 'البرنامج العلمي لكتابة الخطة الاستراتيجية',
    author: 'محمود عبد الفتاح رضوان',
    year: 2012,
    pages: 100,
    color: '#8a5a14',
    light: false,
    height: 96
  },
  {
    id: 4,
    short: 'مناهج البحث العلمي',
    title: 'مناهج البحث العلمي: تطبيقات إدارية واقتصادية',
    author: 'أحمد حسين الرفاعي',
    year: 1999,
    pages: 312,
    color: '#27346b',
    light: false,
    height: 90
  },
  {
    id: 61,
    short: 'الاحصاء للتجاريين',
    title: 'الاحصاء للتجاريين مدخل حديث',
    author: 'جورج كانافوس، دون ميلر',
    year: 2004,
    pages: 888,
    color: '#9a4426',
    light: false,
    height: 100
  },
  {
    id: 140,
    short: 'سياسات صندوق النقد',
    title: 'سياسات صندوق النقد الدولي وأثرها على الدول النامية',
    author: 'محمد عبد الله محمد شاهين',
    year: 2017,
    pages: 312,
    color: '#1b6a6d',
    light: false,
    height: 88
  }
] as const;

export const DEMO_SPOTLIGHT = {
  id: 36,
  title: 'الموظف الإداري',
  author: 'د. عاطف عبد الله المكاوي',
  publisher: 'مؤسسة طيبة للنشر والتوزيع',
  year: 2013,
  pages: 189,
  size: '14.84 MB',
  category: 'إدارة الأعمال والقانون الإداري',
  badge: 'مرجع إداري وتنظيمي معتمد',
  description:
    'كتاب يتناول بالتفصيل مبادئ ووظائف الإدارة، التعريف القانوني والفقهي للموظف العام، مفهوم وأركان الجريمة التأديبية، بالإضافة إلى دراسة أنماط الشخصيات الإدارية والمهارات والكفايات اللازمة لتحقيق القيادة والعمل الإداري الفعال.',
  points: [
    'عرض مبادئ الإدارة ووظائفها الأساسية: التخطيط والتنظيم والتوجيه والرقابة.',
    'توضيح المفهوم القانوني والفقهي للموظف العام في التشريعات المختلفة.',
    'دراسة أحكام وأركان الجريمة التأديبية ومفهوم سحب القرارات الإدارية.',
    'تحليل أنماط الشخصيات الإدارية واستعراض الكفايات والمهارات المطلوبة للقيادة والتميز الوظيفي.'
  ],
  audience:
    'المدراء، والموظفون في المؤسسات الحكومية والخاصة، وطلاب وباحثو العلوم الإدارية والقانون الإداري.'
} as const;

export const DEMO_PATHWAYS = [
  {
    key: 'mgmt',
    label: 'الإدارة وإدارة الأعمال',
    count: 79,
    blurb: 'المفاهيم والوظائف والتنظيم',
    color: '#1c3f94'
  },
  {
    key: 'lead',
    label: 'القيادة وتطوير الذات',
    count: 13,
    blurb: 'الفعالية والتأثير في بيئة العمل',
    color: '#8a5a14'
  },
  {
    key: 'acct',
    label: 'المحاسبة والمالية',
    count: 58,
    blurb: 'المعايير والمبادئ والتدقيق',
    color: '#12525a'
  },
  {
    key: 'econ',
    label: 'الاقتصاد',
    count: 35,
    blurb: 'النظرية والسياسات والاقتصاد الإسلامي',
    color: '#2d5a3d'
  },
  {
    key: 'stat',
    label: 'الإحصاء والرياضيات',
    count: 29,
    blurb: 'الاحتمال والتحليل الكمي',
    color: '#6b1f2c'
  },
  {
    key: 'mkt',
    label: 'التسويق والمبيعات',
    count: 19,
    blurb: 'السوق والعميل وفنون البيع',
    color: '#9a4426'
  },
  {
    key: 'law',
    label: 'القانون والإدارة العامة',
    count: 11,
    blurb: 'الوظيفة العامة والقرار الإداري',
    color: '#27346b'
  },
  {
    key: 'edu',
    label: 'التعليم والتربية',
    count: 6,
    blurb: 'القبول والإدارة التربوية',
    color: '#7a4a1f'
  },
  {
    key: 'research',
    label: 'مناهج البحث',
    count: 4,
    blurb: 'الأساليب العلمية للبحث',
    color: '#0f4d4a'
  }
] as const;

export const DEMO_TOTAL_BOOKS = 254;
export const DEMO_TOTAL_CATEGORIES = 145;
