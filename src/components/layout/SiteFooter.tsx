import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { IarMonogramIcon } from '@/lib/editorial-cloth';
import { BabylonianIshtarFrieze } from './HeritageOrnaments';

export const OFFICIAL_TELEGRAM_URL = 'https://t.me/iarArchive';
export const OFFICIAL_TIKTOK_URL =
  'https://www.tiktok.com/@iar.archive?_r=1&_t=ZS-99lvhM76Ak6';

function TelegramBrandIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
    </svg>
  );
}

function TikTokBrandIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
    </svg>
  );
}

export interface SiteFooterProps {
  booksCount?: number;
  loaded?: boolean;
}

/**
 * Editorial Archival Footer for IAR ARCHIVE — المرجع الإداري العراقي.
 * Crowned with a Babylonian Ishtar Gate glazed frieze, official monogram lockup,
 * and engaging social channel showcase cards.
 */
export function SiteFooter({ booksCount = 254, loaded = true }: SiteFooterProps = {}) {
  const { isRTL, t, translate } = useI18n();
  const ExternalArrowIcon = isRTL ? ArrowUpLeft : ArrowUpRight;
  const displayCount = loaded && booksCount > 0 ? booksCount : 254;

  return (
    <footer
      data-testid="site-footer"
      className="site-footer relative mt-16 border-t hairline-border-strong bg-card text-xs text-muted-foreground"
    >
      {/* Babylonian Ishtar Gate Glazed Top Frieze */}
      <BabylonianIshtarFrieze testId="footer-ishtar-frieze" />

      <div className="mx-auto max-w-[1360px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8">
          {/* Official Brand Identity */}
          <div className="space-y-2.5 max-w-xl text-center lg:text-start mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2.5 text-foreground">
              <span className="inline-flex size-8 items-center justify-center rounded-[4px] border hairline-border-strong bg-secondary text-primary">
                <IarMonogramIcon className="size-4.5 shrink-0" />
              </span>
              <div className="text-start">
                <strong className="block font-serif text-base font-bold tracking-tight text-foreground">
                  {translate(
                    'IAR ARCHIVE — المرجع الإداري العراقي',
                    'IAR ARCHIVE — Iraqi Administrative Reference'
                  )}
                </strong>
                <span className="block font-serif text-[11.5px] font-semibold text-primary">
                  {t('txtAboutTitle')}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {translate(
                'المكتبة المرجعية الرقمية المتخصصة في أرشفة وتوثيق مراجع الإدارة العامة، القانون، المحاسبة الحكومية، ومناهج البحث العلمي وفق معايير الفهرسة الأكاديمية.',
                'The digital reference library dedicated to archiving and indexing public administration, law, governmental accounting, and scientific research monographs.'
              )}
            </p>
          </div>

          {/* Official Community Channels Showcase */}
          <div className="w-full lg:w-auto">
            <div className="mb-2.5 flex items-center justify-center lg:justify-start gap-2">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-wide text-foreground">
                {translate(
                  'المنصات الرسمية للأرشيف — تابع أحدث الإصدارات والمراجعات',
                  'Official Archive Channels — Follow Latest Releases & Briefs'
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Telegram Showcase Card */}
              <a
                href={OFFICIAL_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                title="Telegram: iarArchive"
                data-testid="footer-telegram-link"
                className="group relative flex items-center gap-3.5 rounded-[4px] border hairline-border-strong bg-background/85 p-3.5 text-start transition-all duration-200 hover:-translate-y-0.5 hover:border-[#229ED9] hover:bg-background doc-shadow"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-[#229ED9]/30 bg-[#229ED9]/12 text-[#229ED9] transition-colors duration-200 group-hover:bg-[#229ED9] group-hover:text-white">
                  <TelegramBrandIcon className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground group-hover:text-[#229ED9] transition-colors">
                      {translate('قناة التليغرام الرسمية', 'Official Telegram')}
                    </span>
                    <ExternalArrowIcon
                      className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-[#229ED9] group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>

                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {translate(
                      'إشعارات فورية بالكتب والملخصات الجديدة',
                      'Instant alerts for new books & briefs'
                    )}
                  </p>

                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-[3px] border hairline-border bg-secondary/60 px-2 py-0.5">
                    <span className="text-[10px] font-medium text-secondary-foreground">
                      Telegram
                    </span>
                    <span aria-hidden="true" className="text-border">
                      ·
                    </span>
                    <code
                      dir="ltr"
                      className="font-mono text-[10.5px] font-semibold text-foreground"
                    >
                      @iarArchive
                    </code>
                  </div>
                </div>
              </a>

              {/* TikTok Showcase Card */}
              <a
                href={OFFICIAL_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                title="TikTok: iar.archive"
                data-testid="footer-tiktok-link"
                className="group relative flex items-center gap-3.5 rounded-[4px] border hairline-border-strong bg-background/85 p-3.5 text-start transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-background doc-shadow"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-primary/30 bg-primary/12 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                  <TikTokBrandIcon className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {translate('منصة تيك توك المرئية', 'Official TikTok')}
                    </span>
                    <ExternalArrowIcon
                      className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>

                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {translate(
                      'مراجعات مرئية ومقتطفات إدارية مركّزة',
                      'Visual book reviews & concise briefs'
                    )}
                  </p>

                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-[3px] border hairline-border bg-secondary/60 px-2 py-0.5">
                    <span className="text-[10px] font-medium text-secondary-foreground">
                      TikTok
                    </span>
                    <span aria-hidden="true" className="text-border">
                      ·
                    </span>
                    <code
                      dir="ltr"
                      className="font-mono text-[10.5px] font-semibold text-foreground"
                    >
                      @iar.archive
                    </code>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Colophon Bottom Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t hairline-border pt-4 text-[11px] text-muted-foreground">
          <span>
            &copy; 2026 IAR ARCHIVE —{' '}
            {translate(
              'جميع الحقوق محفوظة للأرشيف الإداري العراقي',
              'All rights reserved'
            )}
          </span>
          <span className="text-[11px]">
            <strong className="font-mono font-semibold text-foreground/85 tabular-nums">
              {displayCount}
            </strong>{' '}
            {translate(
              'مرجعاً مفهرساً · الفهرسة الأكاديمية الرقمية',
              'Indexed Volumes · Digital Academic Cataloging'
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}
