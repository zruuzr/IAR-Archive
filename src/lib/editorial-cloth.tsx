import type { Book } from '@/types/book';

export type ClothPigment =
  | 'prussian'
  | 'linen'
  | 'terracotta'
  | 'cypress'
  | 'oatmeal'
  | 'oxblood'
  | 'petrol'
  | 'ochre'
  | 'slate';

export type ShelfDiscipline = 'all' | 'admin' | 'finance' | 'law' | 'research';

export const BOOK_CLOTHS: readonly ClothPigment[] = [
  'prussian',
  'linen',
  'terracotta',
  'cypress',
  'oatmeal',
  'oxblood',
  'petrol',
  'ochre',
  'slate'
] as const;

export interface CuratedShelfSpec {
  readonly id: number;
  readonly spineTitleAr: string;
  readonly spineTitleEn: string;
  readonly cloth: ClothPigment;
  readonly height: number;
  readonly width: number;
}

export interface CuratedShelfVolume {
  readonly book: Book;
  readonly shelfNo: string;
  readonly spineTitleAr: string;
  readonly spineTitleEn: string;
  readonly cloth: ClothPigment;
  readonly height: number;
  readonly width: number;
  readonly discipline: Exclude<ShelfDiscipline, 'all'>;
}

const FLAGSHIP_SHELF_SPECS: readonly CuratedShelfSpec[] = [
  {
    id: 146,
    spineTitleAr: 'إدارة المحفوظات والأرشيف',
    spineTitleEn: 'Archives & Records Management',
    cloth: 'linen',
    height: 332,
    width: 54
  },
  {
    id: 63,
    spineTitleAr: 'القرار الإداري السلبي',
    spineTitleEn: 'Administrative Decisions',
    cloth: 'prussian',
    height: 344,
    width: 56
  },
  {
    id: 43,
    spineTitleAr: 'المحاسبة الحكومية',
    spineTitleEn: 'Governmental Accounting',
    cloth: 'oatmeal',
    height: 328,
    width: 52
  },
  {
    id: 15,
    spineTitleAr: 'إدارة المكاتب والسكرتارية',
    spineTitleEn: 'Office Administration',
    cloth: 'cypress',
    height: 340,
    width: 56
  },
  {
    id: 28,
    spineTitleAr: 'نماذج العقود القانونية',
    spineTitleEn: 'Legal Contract Templates',
    cloth: 'oxblood',
    height: 336,
    width: 58
  },
  {
    id: 44,
    spineTitleAr: 'معايير تدقيق الحسابات',
    spineTitleEn: 'Auditing Standards',
    cloth: 'linen',
    height: 346,
    width: 55
  },
  {
    id: 1,
    spineTitleAr: 'دليل القبول المركزي',
    spineTitleEn: 'Central Admission Guide',
    cloth: 'terracotta',
    height: 348,
    width: 58
  },
  {
    id: 35,
    spineTitleAr: 'السلوك التنظيمي الإداري',
    spineTitleEn: 'Organizational Behavior',
    cloth: 'prussian',
    height: 338,
    width: 55
  },
  {
    id: 47,
    spineTitleAr: 'معالجة الفساد الإداري',
    spineTitleEn: 'Anti-Corruption Governance',
    cloth: 'oatmeal',
    height: 332,
    width: 53
  },
  {
    id: 149,
    spineTitleAr: 'كتابة الخطة الاستراتيجية',
    spineTitleEn: 'Strategic Plan Authoring',
    cloth: 'petrol',
    height: 342,
    width: 56
  },
  {
    id: 104,
    spineTitleAr: 'المالية العامة والتشريع',
    spineTitleEn: 'Public Finance & Legislation',
    cloth: 'ochre',
    height: 336,
    width: 58
  },
  {
    id: 4,
    spineTitleAr: 'مناهج البحث العلمي',
    spineTitleEn: 'Scientific Research Methods',
    cloth: 'linen',
    height: 344,
    width: 55
  },
  {
    id: 172,
    spineTitleAr: 'المراجعة والرقابة الداخلية',
    spineTitleEn: 'Internal Control & Audit',
    cloth: 'slate',
    height: 334,
    width: 56
  }
] as const;

const FALLBACK_CLOTHS_SEQUENCE: readonly ClothPigment[] = [
  'linen',
  'prussian',
  'oatmeal',
  'cypress',
  'oxblood',
  'linen',
  'terracotta',
  'prussian',
  'oatmeal',
  'petrol',
  'ochre',
  'linen',
  'slate'
] as const;

const FALLBACK_HEIGHTS: readonly number[] = [
  332, 344, 328, 340, 336, 346, 348, 338, 332, 342, 336, 344, 334
] as const;

const FALLBACK_WIDTHS: readonly number[] = [
  54, 56, 52, 56, 58, 55, 58, 55, 53, 56, 58, 55, 56
] as const;

/**
 * Deterministic archival book-cloth pigment for any book ID in the catalog.
 */
export function getBookCloth(bookId: number): ClothPigment {
  const flagship = FLAGSHIP_SHELF_SPECS.find((item) => item.id === bookId);
  if (flagship) return flagship.cloth;
  return BOOK_CLOTHS[Math.abs(bookId) % BOOK_CLOTHS.length];
}

/**
 * Classifies a book into one of the four architectural shelf disciplines.
 */
export function classifyShelfDiscipline(
  book: Pick<Book, 'title' | 'title_en' | 'category' | 'category_en'>
): Exclude<ShelfDiscipline, 'all'> {
  const text =
    `${book.category} ${book.title} ${book.category_en} ${book.title_en}`.toLowerCase();
  if (/(قانون|عقود|دعاو|قضائ|تشريع|جرائم|law|legal|contract|legislat)/.test(text)) {
    return 'law';
  }
  if (
    /(محاسب|مالي|تدقيق|موازنات|تكاليف|ضريب|اقتصاد|تمويل|account|financ|audit|econom|budget)/.test(
      text
    )
  ) {
    return 'finance';
  }
  if (
    /(أرشيف|محفوظات|بحث|قبول|تعليم|مكتبات|إحصاء|معاجم|archiv|research|admission|educat|statist)/.test(
      text
    )
  ) {
    return 'research';
  }
  return 'admin';
}

function shortenTitle(text: string, maxWords = 4): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ');
}

/**
 * Builds the 13-volume curated shelf from live `books.json` records,
 * falling back cleanly to the first available books when testing with smaller fixtures.
 */
export function buildCuratedShelfBooks(books: readonly Book[]): CuratedShelfVolume[] {
  if (books.length === 0) return [];

  const byId = new Map<number, Book>(books.map((b) => [b.id, b]));
  const matchedFlagships: CuratedShelfVolume[] = [];

  for (const spec of FLAGSHIP_SHELF_SPECS) {
    const found = byId.get(spec.id);
    if (found) {
      matchedFlagships.push({
        book: found,
        shelfNo: String(matchedFlagships.length + 1).padStart(2, '0'),
        spineTitleAr: spec.spineTitleAr,
        spineTitleEn: spec.spineTitleEn,
        cloth: spec.cloth,
        height: spec.height,
        width: spec.width,
        discipline: classifyShelfDiscipline(found)
      });
    }
  }

  if (matchedFlagships.length >= 7) {
    return matchedFlagships;
  }

  // Fallback for smaller catalogs / unit test fixtures
  return books.slice(0, 13).map((book, idx) => ({
    book,
    shelfNo: String(idx + 1).padStart(2, '0'),
    spineTitleAr: shortenTitle(book.title, 4),
    spineTitleEn: shortenTitle(book.title_en || book.title, 4),
    cloth: FALLBACK_CLOTHS_SEQUENCE[idx % FALLBACK_CLOTHS_SEQUENCE.length],
    height: FALLBACK_HEIGHTS[idx % FALLBACK_HEIGHTS.length],
    width: FALLBACK_WIDTHS[idx % FALLBACK_WIDTHS.length],
    discipline: classifyShelfDiscipline(book)
  }));
}

/**
 * Architectural 1px geometric SVG ornament for each discipline (zero emojis).
 */
export function DisciplineOrnament({
  discipline,
  className = 'size-20'
}: {
  discipline: Exclude<ShelfDiscipline, 'all'>;
  className?: string;
}) {
  switch (discipline) {
    case 'law':
      return (
        <svg
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden="true"
          className={className}
        >
          <rect x="14" y="14" width="72" height="72" />
          <path d="M26 86V44a24 24 0 0 1 48 0v42" />
          <line x1="50" y1="14" x2="50" y2="86" />
          <circle cx="50" cy="44" r="9" />
          <line x1="26" y1="64" x2="74" y2="64" />
        </svg>
      );
    case 'finance':
      return (
        <svg
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden="true"
          className={className}
        >
          <circle cx="50" cy="50" r="34" />
          <circle cx="50" cy="50" r="22" />
          <rect x="26" y="26" width="48" height="48" transform="rotate(45 50 50)" />
          <line x1="16" y1="50" x2="84" y2="50" />
          <line x1="50" y1="16" x2="50" y2="84" />
        </svg>
      );
    case 'research':
      return (
        <svg
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden="true"
          className={className}
        >
          <ellipse cx="50" cy="50" rx="35" ry="18" transform="rotate(-30 50 50)" />
          <ellipse cx="50" cy="50" rx="35" ry="18" transform="rotate(30 50 50)" />
          <circle cx="50" cy="50" r="34" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="7" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden="true"
          className={className}
        >
          <rect x="18" y="18" width="64" height="64" />
          <rect x="26" y="26" width="48" height="48" transform="rotate(45 50 50)" />
          <circle cx="50" cy="50" r="12" />
          <circle cx="50" cy="50" r="3" />
        </svg>
      );
  }
}

/**
 * Official IAR Archive Monograph & Ribbon SVG Emblem.
 */
export function IarMonogramIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M8.5 3.5h8v8.8a.6.6 0 0 1-.91.51L12.5 11l-3.09 1.81a.6.6 0 0 1-.91-.51V3.5z"
        opacity="0.9"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        d="M5.5 2.5h13a2.5 2.5 0 0 1 2.5 2.5v14a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 19V5a2.5 2.5 0 0 1 2.5-2.5z"
      />
      <line
        x1="1.5"
        y1="7"
        x2="4.5"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="1.5"
        y1="12"
        x2="4.5"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="1.5"
        y1="17"
        x2="4.5"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

let sharedAudioCtx: AudioContext | null = null;

/**
 * Soft bandpass-filtered white noise paper rustle acoustic cue.
 * Safely no-ops when disabled or in test/headless environments without Web Audio.
 */
export function playPaperSound(kind: 'rustle' | 'open' = 'rustle', enabled = true): void {
  if (!enabled || typeof window === 'undefined') return;

  try {
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtxCtor) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtxCtor();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }

    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;
    const duration = kind === 'open' ? 0.14 : 0.065;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(kind === 'open' ? 950 : 1350, now);
    filter.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(kind === 'open' ? 0.05 : 0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  } catch {
    // Ignore audio errors when autoplay policy blocks before first gesture
  }
}
