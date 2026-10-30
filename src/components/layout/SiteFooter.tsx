import { useI18n } from '@/i18n/I18nProvider';
import { IarMonogramIcon } from '@/lib/editorial-cloth';

export const OFFICIAL_TELEGRAM_URL = 'https://t.me/iarArchive';
export const OFFICIAL_TIKTOK_URL =
  'https://www.tiktok.com/@iar.archive?_r=1&_t=ZS-99lvhM76Ak6';

/**
 * Editorial Archival Footer for IAR ARCHIVE — المرجع الإداري العراقي.
 * Architectural hairline top rule, official monogram lockup, and exact social channels.
 */
export function SiteFooter() {
  const { translate } = useI18n();

  return (
    <footer
      data-testid="site-footer"
      className="site-footer mt-16 border-t hairline-border-strong bg-card py-10 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground"
    >
      <div className="mx-auto flex max-w-[1360px] flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
        {/* Official Brand Identity */}
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center justify-center md:justify-start gap-2.5 text-foreground">
            <IarMonogramIcon className="size-4.5 text-primary shrink-0" />
            <strong className="text-sm font-bold tracking-tight">
              {translate(
                'IAR ARCHIVE — المرجع الإداري العراقي',
                'IAR ARCHIVE — Iraqi Administrative Reference'
              )}
            </strong>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {translate(
              'المكتبة المرجعية الرقمية المتخصصة في أرشفة وتوثيق مراجع الإدارة العامة، القانون، المحاسبة الحكومية، ومناهج البحث العلمي وفق معايير الفهرسة الأكاديمية.',
              'The digital reference library dedicated to archiving and indexing public administration, law, governmental accounting, and scientific research monographs.'
            )}
          </p>
        </div>

        {/* Official Channels & Colophon */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <a
            href={OFFICIAL_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            title="Telegram: iarArchive"
            data-testid="footer-telegram-link"
            className="inline-flex items-center gap-2 rounded-[4px] border hairline-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <span>Telegram</span>
            <code dir="ltr" className="font-mono text-[11px] text-muted-foreground">
              iarArchive
            </code>
          </a>

          <a
            href={OFFICIAL_TIKTOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            title="TikTok: iar.archive"
            data-testid="footer-tiktok-link"
            className="inline-flex items-center gap-2 rounded-[4px] border hairline-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <span>TikTok</span>
            <code dir="ltr" className="font-mono text-[11px] text-muted-foreground">
              iar.archive
            </code>
          </a>

          <span className="font-mono text-[11px] text-muted-foreground">
            &copy; 2026 IAR ARCHIVE
          </span>
        </div>
      </div>
    </footer>
  );
}
