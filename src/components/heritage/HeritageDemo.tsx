import { useMemo, useState } from 'react';

import {
  DEMO_BOOKS,
  DEMO_PATHWAYS,
  DEMO_SPINES,
  DEMO_SPOTLIGHT,
  DEMO_TOTAL_BOOKS,
  DEMO_TOTAL_CATEGORIES
} from './heritage-demo-data';
import { HeritageBookCard, HeritageGrid } from './HeritageBookCard';
import { HeritageBookCover } from './HeritageBookCover';
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
              {`يُعرض ${visible.length} من هذه العيّنة — الأرشيف الكامل يضم ${DEMO_TOTAL_BOOKS} مرجعاً`}
            </p>
            <HeritageGrid list={list}>
              {visible.map((book) => (
                <HeritageBookCard
                  key={book.id}
                  cover={{
                    title: book.title,
                    category: book.category,
                    year: book.year,
                    cloth: pickCloth(book.id),
                    href: `https://iararchive.web.app/?book=${book.id}`,
                    label: `عرض: ${book.title}`
                  }}
                  author={book.author}
                  meta={[book.type, `${book.pages} صفحة`]}
                  actions={
                    <>
                      <HeritageButton size="sm" variant="solid">
                        قراءة
                      </HeritageButton>
                      <HeritageButton size="sm" variant="line">
                        تحميل
                      </HeritageButton>
                      <HeritageFavButton
                        pressed={favs.has(book.id)}
                        onToggle={() => toggleFav(book.id)}
                        labelOn="إزالة من المفضلة"
                        labelOff="إضافة إلى المفضلة"
                      />
                    </>
                  }
                />
              ))}
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
              href={`https://iararchive.web.app/?book=${spot.id}`}
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
    </div>
  );
}
