/** Helpers and default content for the Heritage design layer (no React here). */

/** Book-cloth pigments used by `HeritageBookCover` (lapis, ochre, terracotta, petrol, cypress, oxblood…). */
export const HERITAGE_CLOTHS = [
  '#1c3f94',
  '#8a5a14',
  '#9a4426',
  '#12525a',
  '#2d5a3d',
  '#6b1f2c',
  '#27346b',
  '#7a4a1f',
  '#0f4d4a'
] as const;

/** Stable pigment per book id. */
export function pickCloth(bookId: number): string {
  const index = Math.abs(Math.trunc(bookId)) % HERITAGE_CLOTHS.length;
  return HERITAGE_CLOTHS[index];
}

/**
 * Points of an n-pointed star polygon centred on (cx, cy).
 * `r / R = 0.765` gives the classic two-square (khatim / Rub el Hizb) octagram.
 */
export function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points = 8,
  rotationDeg = 0
): string {
  const out: string[] = [];
  for (let k = 0; k < points * 2; k += 1) {
    const radius = k % 2 === 0 ? outer : inner;
    const angle = ((rotationDeg + (k * 180) / points) * Math.PI) / 180 - Math.PI / 2;
    out.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
    );
  }
  return out.join(' ');
}

export const OCTAGRAM_RATIO = 0.765;

export type JourneyIcon = 'tablet' | 'stele' | 'library' | 'dome' | 'book';

export interface JourneyItem {
  era: string;
  title: string;
  text: string;
  icon: JourneyIcon;
}

/** Default Arabic timeline: from Sumerian clay tablets to the archive today. */
export function defaultJourneyAr(booksCount: number): readonly JourneyItem[] {
  return [
    {
      era: 'سومر · نحو 3200 ق.م',
      title: 'ألواح أوروك',
      text: 'أقدم السجلات الإدارية المكتوبة: ألواح طينية تُحصي الغلال والماشية.',
      icon: 'tablet'
    },
    {
      era: 'بابل · نحو 1754 ق.م',
      title: 'مسلّة حمورابي',
      text: 'تقنين مكتوب لقواعد الحكم والتعامل، منقوش على حجر ليراه الناس.',
      icon: 'stele'
    },
    {
      era: 'نينوى · القرن السابع ق.م',
      title: 'مكتبة آشوربانيبال',
      text: 'أشهر مكتبة ملكية في العالم القديم، جُمعت فيها آلاف الألواح.',
      icon: 'library'
    },
    {
      era: 'بغداد · القرن الثالث الهجري',
      title: 'بيت الحكمة',
      text: 'ترجمة المعارف ونسخها وتصنيفها في عاصمة العباسيين.',
      icon: 'dome'
    },
    {
      era: 'اليوم · 2026',
      title: 'الأرشيف الإداري العراقي',
      text: `${booksCount} مرجعاً مفهرساً، بملخصات وتوثيق جاهز للاقتباس.`,
      icon: 'book'
    }
  ];
}

/** Default English timeline. */
export function defaultJourneyEn(booksCount: number): readonly JourneyItem[] {
  return [
    {
      era: 'Sumer · c. 3200 BCE',
      title: 'The Uruk tablets',
      text: 'The earliest written administrative records: clay tablets tallying grain and livestock.',
      icon: 'tablet'
    },
    {
      era: 'Babylon · c. 1754 BCE',
      title: 'Stele of Hammurabi',
      text: 'A written code of rules for governance and dealings, carved in stone for all to see.',
      icon: 'stele'
    },
    {
      era: 'Nineveh · 7th c. BCE',
      title: 'Library of Ashurbanipal',
      text: 'The most famous royal library of the ancient world, holding thousands of tablets.',
      icon: 'library'
    },
    {
      era: 'Baghdad · 3rd c. AH',
      title: 'House of Wisdom',
      text: 'Translating, copying and classifying knowledge in the Abbasid capital.',
      icon: 'dome'
    },
    {
      era: 'Today · 2026',
      title: 'IAR Archive',
      text: `${booksCount} indexed references, with summaries and ready-to-cite citations.`,
      icon: 'book'
    }
  ];
}
