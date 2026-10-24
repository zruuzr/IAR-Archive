export const ISSUER_FACETS = [
  {
    id: 'diwan',
    name: 'ديوان الرقابة المالية الاتحادي',
    nameEn: 'Federal Board of Supreme Audit',
    keyword: 'الرقابة'
  },
  {
    id: 'cabinet',
    name: 'الأمانة العامة لمجلس الوزراء',
    nameEn: 'General Secretariat of the Council of Ministers',
    keyword: 'مجلس الوزراء'
  },
  {
    id: 'state_council',
    name: 'مجلس الدولة (محكمة القضاء الإداري)',
    nameEn: 'State Council (Admin Court)',
    keyword: 'مجلس الدولة'
  },
  {
    id: 'nazaha',
    name: 'هيئة النزاهة الاتحادية',
    nameEn: 'Federal Commission of Integrity',
    keyword: 'النزاهة'
  },
  {
    id: 'justice',
    name: 'وزارة العدل (الوقائع الرسمية)',
    nameEn: 'Ministry of Justice (Official Gazette)',
    keyword: 'الوقائع'
  }
] as const;

export const ERA_FACETS = [
  {
    id: 'era_all',
    label: 'جميع الحقب التاريخية',
    labelEn: 'All Eras',
    min: 1900,
    max: 2099
  },
  {
    id: 'era_modern',
    label: '2020 — 2026 (الحديثة)',
    labelEn: '2020 — 2026 (Modern)',
    min: 2020,
    max: 2026
  },
  {
    id: 'era_post2003',
    label: '2003 — 2019 (ما بعد التغيير)',
    labelEn: '2003 — 2019 (Post-2003)',
    min: 2003,
    max: 2019
  },
  {
    id: 'era_pre2003',
    label: '1968 — 2002 (الأرشيف السابق)',
    labelEn: '1968 — 2002 (Prior Archive)',
    min: 1968,
    max: 2002
  },
  {
    id: 'era_royal',
    label: '1921 — 1967 (العهد الملكي والجمهوري)',
    labelEn: '1921 — 1967 (Early Republic & Royal)',
    min: 1921,
    max: 1967
  }
] as const;

export const TYPE_FACETS = [
  { id: 'type_all', label: 'جميع الأنواع', labelEn: 'All Types', keyword: '' },
  { id: 'type_laws', label: 'قوانين اتحادية', labelEn: 'Federal Laws', keyword: 'قانون' },
  {
    id: 'type_reports',
    label: 'تقارير تدقيقية',
    labelEn: 'Audit Reports',
    keyword: 'تقرير'
  },
  {
    id: 'type_decisions',
    label: 'قرارات مجلس وزراء',
    labelEn: 'Cabinet Decisions',
    keyword: 'قرار'
  },
  {
    id: 'type_judiciary',
    label: 'مبادئ قضائية',
    labelEn: 'Judicial Precedents',
    keyword: 'قضاء'
  }
] as const;
