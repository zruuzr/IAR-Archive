import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { HeritageFrieze, HeritageLogo } from '@/components/heritage';
import { AN_SIGN, SUMER_SIGNS } from '@/components/heritage/seal-signs';
import { useI18n } from '@/i18n/I18nProvider';

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
export function SiteFooter({
  booksCount: _booksCount = 254,
  loaded: _loaded = true
}: SiteFooterProps = {}) {
  const { isRTL, translate } = useI18n();
  const ExternalArrowIcon = isRTL ? ArrowUpLeft : ArrowUpRight;

  return (
    <footer data-testid="site-footer" className="hx-footer site-footer relative mt-16">
      <HeritageFrieze testId="footer-ishtar-frieze" />

      <div className="hx-wrap">
        <div className="hx-foot">
          {/* Brand Colophon */}
          <div>
            <div className="hx-brand">
              <HeritageLogo size={42} />
              <span className="hx-brand-txt">
                <b>{translate('الأرشيف الإداري العراقي', 'IAR ARCHIVE')}</b>
                <small>IAR ARCHIVE</small>
              </span>
            </div>
            <p className="hx-about">
              {translate(
                'المكتبة المرجعية الرقمية المتخصصة في أرشفة وتوثيق مراجع الإدارة العامة، القانون، الاقتصاد، المحاسبة الحكومية، ومناهج البحث العلمي وفق معايير الفهرسة الأكاديمية.',
                'The digital reference library dedicated to archiving and indexing public administration, law, economics, governmental accounting, and scientific research monographs.'
              )}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4>{translate('أقسام الأرشيف', 'Navigation')}</h4>
            <a href="#booksDisplayContainer">
              {translate('رفوف المعرفة', 'Knowledge Shelves')}
            </a>
            <a href="#paths">{translate('المسارات المعرفية', 'Knowledge Pathways')}</a>
            <a href="#featuredSection">
              {translate('في دائرة الضوء', 'In the Spotlight')}
            </a>
          </div>

          {/* Channels Showcase */}
          <div>
            <h4>{translate('المنصات الرسمية للأرشيف', 'Official Archive Channels')}</h4>
            <div className="space-y-2.5">
              <a
                href={OFFICIAL_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                title="Telegram: iarArchive"
                data-testid="footer-telegram-link"
                className="group flex items-center gap-3 rounded-[10px] border border-white/10 bg-white/5 p-2.5 text-start transition-all hover:border-[#229ED9] hover:bg-white/10"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#229ED9]/20 text-[#229ED9] transition-colors group-hover:bg-[#229ED9] group-hover:text-white">
                  <TelegramBrandIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>{translate('قناة التليغرام', 'Telegram Channel')}</span>
                    <ExternalArrowIcon className="size-3 opacity-60 group-hover:opacity-100" />
                  </div>
                  <span
                    dir="ltr"
                    className="inline-block font-mono text-[10.5px] text-[#e2b84e]"
                  >
                    @iarArchive
                  </span>
                </div>
              </a>

              <a
                href={OFFICIAL_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                title="TikTok: iar.archive"
                data-testid="footer-tiktok-link"
                className="group flex items-center gap-3 rounded-[10px] border border-white/10 bg-white/5 p-2.5 text-start transition-all hover:border-[#e2b84e] hover:bg-white/10"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e2b84e]/20 text-[#e2b84e] transition-colors group-hover:bg-[#e2b84e] group-hover:text-[#1a1203]">
                  <TikTokBrandIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>{translate('منصة تيك توك المرئية', 'TikTok Channel')}</span>
                    <ExternalArrowIcon className="size-3 opacity-60 group-hover:opacity-100" />
                  </div>
                  <span
                    dir="ltr"
                    className="inline-block font-mono text-[10.5px] text-[#e2b84e]"
                  >
                    @iar.archive
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Legal Colophon */}
        <div className="hx-legal">
          <span>
            &copy; 2026 IAR ARCHIVE —{' '}
            {translate(
              'جميع الحقوق محفوظة للأرشيف الإداري العراقي',
              'All rights reserved'
            )}
          </span>
          <span className="hx-cune" aria-hidden="true">
            {`${AN_SIGN} ${SUMER_SIGNS} ${AN_SIGN}`}
          </span>
          <span className="text-xs font-medium text-[#f5eedb] tracking-wide">
            {translate('الفهرسة الأكاديمية الرقمية', 'Digital Academic Cataloging')}
          </span>
        </div>
      </div>
    </footer>
  );
}
