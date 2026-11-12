import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@/styles/heritage.css';
import '@/styles/heritage-books.css';
import { DEMO_DETAILS } from './heritage-demo-details';
import {
  DEMO_BOOKS,
  DEMO_PATHWAYS,
  DEMO_SPINES,
  DEMO_SPOTLIGHT,
  DEMO_TOTAL_BOOKS,
  DEMO_TOTAL_CATEGORIES
} from './heritage-demo-data';
import {
  HeritageBookCard,
  HeritageGrid,
  HeritageRating,
  HeritageStat
} from './HeritageBookCard';
import { HeritageBookCover } from './HeritageBookCover';
import { HeritageBookDetails } from './HeritageBookDetails';
import { HeritageIconButton, HeritageMenuItem, HeritageMoreMenu } from './controls';
import { HeritageIcon } from './icons';
import { HeritageHero } from './HeritageHero';
import { JourneyTimeline } from './JourneyTimeline';
import { PathwayGrid } from './PathwayGrid';
import { SpotlightPlaque } from './SpotlightPlaque';
import { defaultJourneyAr, pickCloth } from './heritage-data';
import {
  HeritageButton,
  HeritageFavButton,
  HeritageFrieze,
  HeritageLogo,
  HeritageSectionHead
} from './ornaments';
import { AN_SIGN, SUMER_SIGNS } from './seal-signs';

const CHIPS = [
  { key: 'all', label: 'كل المراجع' },
  { key: 'edu', label: 'التعليم والتربية' },
  { key: 'acct', label: 'المحاسبة والمالية' },
  { key: 'econ', label: 'الاقتصاد' },
  { key: 'stat', label: 'الإحصاء والرياضيات' },
  { key: 'lead', label: 'القيادة وتطوير الذات' },
  { key: 'mkt', label: 'التسويق والمبيعات' },
  { key: 'research', label: 'مناهج البحث' }
] as const;

/** Real covers from the repo, resized to 400px WebP (3–35 KB instead of 0.2–4 MB PNG). */
const COVER_URLS = import.meta.glob<string>('./demo-covers/*.webp', {
  eager: true,
  query: '?url',
  import: 'default'
});
/** Shows the generated cloth cover (the fallback used when a cover image is missing). */
const NO_COVER = new Set([161]);
const coverOf = (id: number) =>
  NO_COVER.has(id) ? undefined : COVER_URLS[`./demo-covers/${id}.webp`];

/** Illustrative numbers only: downloads and ratings live in Firestore, not in books.json. */
const DEMO_METRICS: Record<number, { downloads: number; rating: number; votes: number }> =
  {
    36: { downloads: 1240, rating: 4.8, votes: 23 },
    95: { downloads: 860, rating: 4.5, votes: 11 },
    34: { downloads: 530, rating: 4.2, votes: 7 },
    152: { downloads: 980, rating: 4.7, votes: 15 },
    17: { downloads: 220, rating: 0, votes: 0 }
  };

const DETAIL_LABELS = {
  back: 'العودة إلى المكتبة',
  referenceNo: 'مرجع رقم',
  about: 'نبذة عن المرجع',
  keyPoints: 'أبرز ما يتناوله',
  keywords: 'الكلمات المفتاحية',
  audience: 'الفئة المستهدفة',
  citation: 'التوثيق (APA)',
  copy: 'نسخ التوثيق',
  copied: 'تم النسخ',
  previous: 'المرجع السابق',
  next: 'المرجع التالي',
  related: 'مراجع قريبة',
  zoomCover: 'معاينة الغلاف بالحجم الكامل'
} as const;

/**
 * Reference page that assembles every heritage component with sample data.
 * Render it temporarily (e.g. in `main.tsx`) to compare against the approved design.
 * Theme: this demo only toggles `data-theme` on <html>; the real app uses `useTheme`.
 */
export function HeritageDemo() {
  const [group, setGroup] = useState<string>('all');
  const [term, setTerm] = useState('');
  const [list, setList] = useState(false);
  const [favs, setFavs] = useState<ReadonlySet<number>>(new Set());
  const [dark, setDark] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [bundle, setBundle] = useState<ReadonlySet<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [zoomId, setZoomId] = useState<number | null>(null);
  const zoomRef = useRef<HTMLDialogElement>(null);
  const savedScroll = useRef(0);

  const visible = useMemo(
    () =>
      DEMO_BOOKS.filter(
        (book) =>
          (group === 'all' || book.group === group) &&
          (!term.trim() ||
            `${book.title} ${book.author} ${book.category}`.includes(term.trim()))
      ),
    [group, term]
  );

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  const toggleFav = (id: number) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleBundle = (id: number) =>
    setBundle((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openBook = useCallback((id: number) => {
    savedScroll.current = window.scrollY;
    setOpenId(id);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const closeBook = useCallback(() => {
    setOpenId(null);
    setZoomId(null);
    requestAnimationFrame(() =>
      window.scrollTo({ top: savedScroll.current, behavior: 'auto' })
    );
  }, []);

  useEffect(() => {
    if (openId === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !zoomRef.current?.open) closeBook();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, closeBook]);

  useEffect(() => {
    const dialog = zoomRef.current;
    if (!dialog) return;
    if (zoomId !== null && !dialog.open) dialog.showModal();
    if (zoomId === null && dialog.open) dialog.close();
  }, [zoomId]);

  const detailOf = (id: number) =>
    DEMO_DETAILS[id] ?? {
      publisher: '',
      description: '',
      keyPoints: [],
      keywords: [],
      fileSize: ''
    };

  const renderCard = (book: (typeof DEMO_BOOKS)[number]) => {
    const metric = DEMO_METRICS[book.id];
    const detail = detailOf(book.id);
    return (
      <HeritageBookCard
        key={book.id}
        testId={`book-card-${book.id}`}
        titleTestId={`book-title-link-${book.id}`}
        title={book.title}
        href={`?book=${book.id}`}
        onOpen={() => openBook(book.id)}
        cover={{
          title: book.title,
          category: book.category,
          year: book.year,
          cloth: pickCloth(book.id),
          image: coverOf(book.id),
          testIds: {
            image: `book-cover-img-${book.id}`,
            fallback: `book-cover-fallback-${book.id}`
          }
        }}
        onZoomCover={coverOf(book.id) ? () => setZoomId(book.id) : undefined}
        zoomLabel={DETAIL_LABELS.zoomCover}
        zoomTestId={`book-cover-btn-${book.id}`}
        kicker={book.category}
        author={book.author}
        meta={[book.type, `${book.pages} صفحة`, <bdi dir="ltr">{book.size}</bdi>]}
        excerpt={detail.description}
        stats={
          metric ? (
            <>
              <HeritageRating
                value={metric.rating}
                count={metric.votes}
                label={`التقييم ${metric.rating} من 5 (${metric.votes})`}
              />
              <HeritageStat
                icon="download-count"
                value={metric.downloads.toLocaleString('ar-IQ')}
                label={`${metric.downloads} تحميل`}
              />
            </>
          ) : null
        }
        actions={
          <>
            <HeritageButton
              size="sm"
              variant="solid"
              data-testid={`book-read-btn-${book.id}`}
            >
              قراءة
            </HeritageButton>
            <HeritageFavButton
              testId={`book-favorite-btn-${book.id}`}
              pressed={favs.has(book.id)}
              onToggle={() => toggleFav(book.id)}
              labelOn="إزالة من المفضلة"
              labelOff="إضافة إلى المفضلة"
            />
            <HeritageMoreMenu label="المزيد من الإجراءات">
              <HeritageMenuItem
                icon={<HeritageIcon name="download" />}
                data-testid={`book-download-btn-${book.id}`}
              >
                تحميل الملف
              </HeritageMenuItem>
              <HeritageMenuItem
                icon={<HeritageIcon name="quote" />}
                data-testid={`book-cite-btn-${book.id}`}
              >
                نسخ توثيق APA
              </HeritageMenuItem>
              <HeritageMenuItem
                icon={<HeritageIcon name="summary" />}
                data-testid={`book-summary-btn-${book.id}`}
              >
                ملخص 3 دقائق
              </HeritageMenuItem>
              <HeritageMenuItem
                icon={<HeritageIcon name="bundle" />}
                pressed={bundle.has(book.id)}
                data-testid={`book-bundle-btn-${book.id}`}
                onClick={() => toggleBundle(book.id)}
              >
                {bundle.has(book.id) ? 'إزالة من الحزمة' : 'إضافة إلى الحزمة'}
              </HeritageMenuItem>
              <HeritageMenuItem
                icon={<HeritageIcon name="share" />}
                data-testid={`book-share-btn-${book.id}`}
              >
                مشاركة
              </HeritageMenuItem>
            </HeritageMoreMenu>
          </>
        }
      />
    );
  };

  const renderDetails = (id: number) => {
    const book = DEMO_BOOKS.find((item) => item.id === id) ?? null;
    const isSpot = id === DEMO_SPOTLIGHT.id;
    const detail = detailOf(id);
    const title = book?.title ?? DEMO_SPOTLIGHT.title;
    const author = book?.author ?? DEMO_SPOTLIGHT.author;
    const category = book?.category ?? DEMO_SPOTLIGHT.category;
    const year = book?.year ?? DEMO_SPOTLIGHT.year;
    const pages = book?.pages ?? DEMO_SPOTLIGHT.pages;
    const index = book ? DEMO_BOOKS.findIndex((item) => item.id === id) : -1;
    const prevBook = index > 0 ? DEMO_BOOKS[index - 1] : undefined;
    const nextBook =
      index >= 0 && index < DEMO_BOOKS.length - 1 ? DEMO_BOOKS[index + 1] : undefined;
    const related = DEMO_BOOKS.filter(
      (item) => item.id !== id && (!book || item.group === book.group)
    );
    const relatedShown = (
      related.length >= 3 ? related : DEMO_BOOKS.filter((item) => item.id !== id)
    ).slice(0, 4);
    const metric = DEMO_METRICS[id];
    const apa = `${author} (${year}).\n${title}.\n${detail.publisher}.`;
    const cover = (
      <HeritageBookCover
        title={title}
        category={category}
        year={year}
        cloth={pickCloth(id)}
        image={coverOf(id)}
        loading="eager"
        titleAs="span"
        onClick={() => setZoomId(id)}
        label={DETAIL_LABELS.zoomCover}
        testIds={{
          image: `book-cover-img-${id}`,
          fallback: `book-cover-fallback-${id}`,
          root: `book-cover-btn-${id}`
        }}
      />
    );

    return (
      <HeritageBookDetails
        id={id}
        title={title}
        subtitle={detail.titleEn}
        subtitleDir="ltr"
        category={category}
        type={book?.type}
        badge={isSpot ? DEMO_SPOTLIGHT.badge : undefined}
        authorLabel="تأليف"
        author={author}
        publisher={detail.publisher}
        facts={[
          { label: 'سنة الإصدار', value: year, ltr: true },
          { label: 'عدد الصفحات', value: `${pages} صفحة` },
          { label: 'الصيغة والحجم', value: `PDF · ${detail.fileSize}`, ltr: true }
        ]}
        description={detail.description}
        keyPoints={detail.keyPoints}
        keywords={detail.keywords}
        onKeyword={(keyword) => {
          setTerm(keyword);
          closeBook();
        }}
        audience={detail.audience}
        citation={apa}
        citationCopied={copied}
        onCopyCitation={() => {
          void navigator.clipboard?.writeText(apa).catch(() => undefined);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        cover={cover}
        onZoomCover={() => setZoomId(id)}
        actions={
          <>
            <HeritageButton variant="gold" data-testid="single-read-btn">
              <HeritageIcon name="read" />
              قراءة المرجع
            </HeritageButton>
            <HeritageButton variant="ghost" data-testid="single-download-btn">
              <HeritageIcon name="download" />
              تحميل
            </HeritageButton>
          </>
        }
        tools={
          <>
            <HeritageIconButton
              size="md"
              label="إضافة إلى المفضلة"
              pressed={favs.has(id)}
              data-testid="single-favorite-btn"
              onClick={() => toggleFav(id)}
            >
              <HeritageIcon name="octagram" size={20} />
            </HeritageIconButton>
            <HeritageIconButton
              size="md"
              label="إضافة إلى الحزمة البحثية"
              pressed={bundle.has(id)}
              data-testid="single-bundle-btn"
              onClick={() => toggleBundle(id)}
            >
              <HeritageIcon name="bundle" size={20} />
            </HeritageIconButton>
            <HeritageIconButton size="md" label="مشاركة" data-testid="single-share-btn">
              <HeritageIcon name="share" size={20} />
            </HeritageIconButton>
          </>
        }
        ratingLabel="قيّم هذا المرجع"
        rating={
          metric?.rating ? (
            <HeritageRating
              value={metric.rating}
              count={metric.votes}
              label={`التقييم ${metric.rating} من 5`}
            />
          ) : undefined
        }
        metrics={
          metric
            ? [{ label: 'التحميلات', value: metric.downloads.toLocaleString('ar-IQ') }]
            : undefined
        }
        stamp={{
          title: 'مرجع موثَّق في الأرشيف',
          text: 'فُهرس ومُوِّثق وفق معايير الفهرسة الأكاديمية.'
        }}
        onBack={closeBook}
        previous={
          prevBook
            ? { title: prevBook.title, onClick: () => openBook(prevBook.id) }
            : undefined
        }
        next={
          nextBook
            ? { title: nextBook.title, onClick: () => openBook(nextBook.id) }
            : undefined
        }
        related={
          <HeritageGrid>{relatedShown.map((item) => renderCard(item))}</HeritageGrid>
        }
        labels={DETAIL_LABELS}
      />
    );
  };

  const spot = DEMO_SPOTLIGHT;

  return (
    <div
      dir="rtl"
      lang="ar"
      style={{ background: 'var(--hx-bg)', color: 'var(--hx-ink)' }}
    >
      <div className="hx-announce" role="note">
        <span className="hx-cune" aria-hidden="true">
          {AN_SIGN}
        </span>
        <span>IAR ARCHIVE · مساحة للمعرفة الإدارية</span>
        <span className="hx-cune" aria-hidden="true">
          {AN_SIGN}
        </span>
      </div>

      <header className="hx-site-header">
        <div className="hx-wrap hx-bar">
          <a className="hx-brand" href="#top" aria-label="الأرشيف الإداري العراقي">
            <HeritageLogo />
            <span className="hx-brand-txt">
              <b>الأرشيف الإداري العراقي</b>
              <small>IAR ARCHIVE</small>
            </span>
          </a>
          <nav className="hx-nav" aria-label="التنقل الرئيسي">
            <a href="#shelves">رفوف المعرفة</a>
            <a href="#paths">المسارات</a>
            <a href="#spotlight">في دائرة الضوء</a>
            <a href="#journey">رحلة المعرفة</a>
          </nav>
          <div className="hx-tools">
            <button
              type="button"
              className="hx-icon-btn"
              aria-label="تبديل المظهر"
              onClick={toggleTheme}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
              </svg>
            </button>
          </div>
        </div>
        <HeritageFrieze />
      </header>

      <main id="top">
        {openId !== null ? (
          renderDetails(openId)
        ) : (
          <>
            <HeritageHero
              kicker="المكتبة الرقمية العراقية · 2026"
              kickerSigns={SUMER_SIGNS}
              title="من ألواح سومر"
              titleEmphasis="إلى أوراق الحاضر."
              lead="مجموعة منتقاة من المراجع الإدارية، مفهرسة بعناية، مرفقة بملخصات مركزة وتوثيق أكاديمي مباشر — لتكون وجهتك الأولى للبحث والاطلاع."
              tags={['ملخصات 3 دقائق', 'توثيق APA مباشر', 'حزم بحثية مخصصة']}
              primaryAction={{ label: 'تصفّح رفوف المعرفة', href: '#shelves' }}
              secondaryAction={{ label: 'البحث الشامل', hint: '⌘K' }}
              stats={[
                { value: DEMO_TOTAL_BOOKS, label: 'مرجع في الأرشيف' },
                { value: DEMO_TOTAL_CATEGORIES, label: 'تصنيفاً دقيقاً' },
                { value: DEMO_PATHWAYS.length, label: 'مسارات معرفية' },
                { value: 2026, label: 'سنة الأرشفة' }
              ]}
              spines={DEMO_SPINES}
            />

            <section className="hx-section" id="paths" aria-labelledby="paths-h">
              <div className="hx-wrap">
                <HeritageSectionHead
                  eyebrow="مسارات معرفية"
                  title="تسع بوابات إلى المعرفة الإدارية"
                  titleId="paths-h"
                  subtitle="تُصنَّف المراجع في مسارات رئيسية، ولكل مسار تصنيفاته الدقيقة. اختر بوابتك وابدأ."
                />
                <PathwayGrid
                  items={DEMO_PATHWAYS}
                  onSelect={(key) => {
                    setGroup(CHIPS.some((chip) => chip.key === key) ? key : 'all');
                    document
                      .getElementById('shelves')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>
            </section>

            <section
              className="hx-section"
              id="shelves"
              aria-labelledby="shelves-h"
              style={{ paddingTop: 0 }}
            >
              <div className="hx-wrap">
                <HeritageSectionHead
                  eyebrow="المكتبة"
                  title="رفوف المعرفة"
                  titleId="shelves-h"
                />
                <div className="hx-toolbar">
                  <label className="hx-field">
                    <span className="hx-sr">البحث في المراجع</span>
                    <input
                      type="search"
                      placeholder="ابحث بعنوان، مؤلف، أو فكرة…"
                      autoComplete="off"
                      value={term}
                      onChange={(event) => setTerm(event.target.value)}
                    />
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  </label>
                  <div className="hx-toggle" role="group" aria-label="طريقة العرض">
                    <button
                      type="button"
                      aria-pressed={!list}
                      aria-label="عرض شبكي"
                      onClick={() => setList(false)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="4" y="4" width="6" height="6" rx="1" />
                        <rect x="14" y="4" width="6" height="6" rx="1" />
                        <rect x="4" y="14" width="6" height="6" rx="1" />
                        <rect x="14" y="14" width="6" height="6" rx="1" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-pressed={list}
                      aria-label="عرض قائمة"
                      onClick={() => setList(true)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="hx-chips" role="group" aria-label="التصنيفات">
                  {CHIPS.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      className={group === chip.key ? 'hx-chip hx-is-on' : 'hx-chip'}
                      onClick={() => setGroup(chip.key)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <p className="hx-result-note" aria-live="polite">
                  {`يُعرض ${visible.length} من هذه العيّنة — الأرشيف الكامل يضم ${DEMO_TOTAL_BOOKS} مرجعاً · أرقام التحميل والتقييم توضيحية`}
                </p>
                <HeritageGrid list={list}>
                  {visible.map((book) => renderCard(book))}
                </HeritageGrid>
                {visible.length === 0 ? (
                  <p className="hx-empty">لا توجد نتائج مطابقة لبحثك</p>
                ) : null}
              </div>
            </section>

            <SpotlightPlaque
              id="spotlight"
              eyebrow="في دائرة الضوء"
              badge={spot.badge}
              title={spot.title}
              author={spot.author}
              description={spot.description}
              cover={
                <HeritageBookCover
                  title={spot.title}
                  category={spot.category}
                  year={spot.year}
                  cloth="#27346b"
                  image={coverOf(spot.id)}
                  onClick={() => openBook(spot.id)}
                  label={`عرض: ${spot.title}`}
                  titleAs="span"
                />
              }
              specs={[
                { label: 'الناشر', value: spot.publisher },
                { label: 'سنة النشر', value: spot.year },
                { label: 'عدد الصفحات', value: spot.pages },
                { label: 'حجم الملف', value: spot.size, ltr: true }
              ]}
              points={spot.points}
              audience={{ label: 'الفئة المستهدفة:', text: spot.audience }}
              actions={
                <>
                  <HeritageButton variant="gold">قراءة المرجع</HeritageButton>
                  <HeritageButton variant="ghost">ملخص 3 دقائق</HeritageButton>
                  <HeritageButton variant="ghost">توثيق APA</HeritageButton>
                </>
              }
            />

            <section className="hx-section" id="journey" aria-labelledby="journey-h">
              <div className="hx-wrap">
                <HeritageSectionHead
                  eyebrow="رحلة المعرفة"
                  title="من الطين إلى الورق: خمسة آلاف عام من الإدارة"
                  titleId="journey-h"
                />
                <JourneyTimeline items={defaultJourneyAr(DEMO_TOTAL_BOOKS)} />
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="hx-footer">
        <HeritageFrieze />
        <div className="hx-wrap">
          <div className="hx-foot">
            <div>
              <div className="hx-brand">
                <HeritageLogo />
                <span className="hx-brand-txt">
                  <b>الأرشيف الإداري العراقي</b>
                  <small>IAR ARCHIVE</small>
                </span>
              </div>
              <p className="hx-about">
                مستودع رقمي لأرشفة وتنظيم المراجع الإدارية العراقية.
              </p>
            </div>
            <div>
              <h4>الموقع</h4>
              <a href="#shelves">رفوف المعرفة</a>
              <a href="#paths">المسارات</a>
              <a href="#journey">رحلة المعرفة</a>
            </div>
            <div>
              <h4>تابعنا</h4>
              <a href="https://t.me/iarArchive" rel="noopener">
                قناة تيليغرام — المرجع الإداري العراقي
              </a>
              <a href="https://github.com/zruuzr/IAR-Archive" rel="noopener">
                المستودع على GitHub
              </a>
            </div>
          </div>
          <div className="hx-legal">
            <span>© 2026 IAR Archive</span>
            <span className="hx-cune" aria-hidden="true">
              {`${AN_SIGN} ${SUMER_SIGNS} ${AN_SIGN}`}
            </span>
          </div>
        </div>
      </footer>

      <dialog
        ref={zoomRef}
        className="hx-zoom"
        aria-label={DETAIL_LABELS.zoomCover}
        onClose={() => setZoomId(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setZoomId(null);
        }}
      >
        {zoomId !== null && coverOf(zoomId) ? <img src={coverOf(zoomId)} alt="" /> : null}
        <button
          type="button"
          className="hx-btn hx-btn-ghost"
          onClick={() => setZoomId(null)}
        >
          إغلاق
        </button>
      </dialog>
    </div>
  );
}
