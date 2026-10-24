import { useI18n } from '@/i18n/I18nProvider';

export const OFFICIAL_TELEGRAM_URL = 'https://t.me/iarArchive';
export const OFFICIAL_TIKTOK_URL =
  'https://www.tiktok.com/@iar.archive?_r=1&_t=ZS-99lvhM76Ak6';

/**
 * Sovereign Institutional Footer (Concept 1: البوابة السيادية الوطنية).
 * Deep regal-950 backdrop, gold top border, national archive identity, and official links.
 */
export function SiteFooter() {
  const { translate } = useI18n();

  return (
    <footer
      data-testid="site-footer"
      className="site-footer bg-regal-950 text-slate-300 py-10 px-4 sm:px-6 lg:px-8 border-t-2 border-gold-500 mt-14 text-xs"
    >
      <div className="mx-auto max-w-[1360px] flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
        {/* Institutional Identity */}
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-full bg-gold-400"
            />
            <span className="font-black text-white text-sm sm:text-base tracking-tight">
              {translate(
                'المكتبة الرقمية وأرشيف العلوم الإدارية · IAR Archive',
                'Digital Library & Administrative Sciences Archive · IAR Archive'
              )}
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            {translate(
              'المنصة الرقمية المتخصصة في أرشفة وتوثيق مراجع العلوم الإدارية، القيادة، إدارة الأعمال، والتحليل المالي وفق أحدث معايير الفهرسة الأكاديمية.',
              'The dedicated digital platform for archiving and indexing management sciences, leadership, business administration, and financial analysis according to rigorous academic standards.'
            )}
          </p>
        </div>

        {/* Social & Institutional Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <a
            href={OFFICIAL_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            title="Telegram"
            data-testid="footer-telegram-link"
            className="inline-flex items-center gap-1.5 rounded-lg border border-regal-800 bg-regal-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-gold-500 hover:text-gold-400 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span>Telegram</span>
          </a>

          <a
            href={OFFICIAL_TIKTOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            title="TikTok"
            data-testid="footer-tiktok-link"
            className="inline-flex items-center gap-1.5 rounded-lg border border-regal-800 bg-regal-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-gold-500 hover:text-gold-400 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
            <span>TikTok</span>
          </a>

          <span className="text-slate-500 font-mono">
            &copy; 2026 IAR Archive ·{' '}
            {translate('الأرشيف الإداري العراقي', 'Iraqi Administrative Reference')}
          </span>
        </div>
      </div>
    </footer>
  );
}
