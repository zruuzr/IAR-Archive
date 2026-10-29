import { Download, Globe, Heart, Moon, Search, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UsePWAInstallReturn } from '@/hooks/usePWAInstall';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

export interface SiteHeaderProps {
  favoritesOnly: boolean;
  favoritesCount: number;
  booksCount?: number;
  categoriesCount?: number;
  onToggleFavoritesOnly: () => void;
  onBrandClick?: () => void;
  onOpenSpotlight?: () => void;
  pwa: UsePWAInstallReturn;
}

/**
 * Sovereign National Archival Header (Concept 1: البوابة السيادية الوطنية).
 * Features royal institutional dark-green ribbon, gold trim, Iraqi state documentation
 * lockup, sovereign crest emblem, quick stats badge, and all essential interactive controls.
 */
export function SiteHeader({
  favoritesOnly,
  favoritesCount,
  booksCount = 179,
  categoriesCount = 110,
  onToggleFavoritesOnly,
  onBrandClick,
  onOpenSpotlight,
  pwa
}: SiteHeaderProps) {
  const { lang, t, translate, formatNumber, toggleLang } = useI18n();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      data-testid="site-header"
      className="site-header bg-regal-900 text-white border-b-4 border-gold-500 shadow-md transition-all"
    >
      {/* Top Sovereign Utility Ribbon */}
      <div className="border-b border-regal-800/80 bg-regal-950/70 px-4 sm:px-6 py-2 text-[11px] text-regal-100">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-bold flex items-center gap-1.5 truncate">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="hidden sm:inline">
                {translate(
                  'الأرشيف الإداري العراقي · IAR Archive — منصة المعرفة والعلوم الإدارية',
                  'IAR Archive · Iraqi Administrative Reference — Management Knowledge Portal'
                )}
              </span>
              <span className="sm:hidden">
                {translate('الأرشيف الإداري العراقي', 'IAR Archive')}
              </span>
            </span>
            <span className="text-regal-600 hidden sm:inline">|</span>
            <span className="text-regal-200 hidden md:inline truncate">IAR Archive</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 text-xs">
            <span className="hidden lg:inline text-regal-300">
              {translate(
                `${formatNumber(categoriesCount)} مساراً وتصنيفاً إدارياً`,
                `${formatNumber(categoriesCount)} Management Pathways`
              )}
            </span>
            <span className="hidden xl:inline text-regal-600">·</span>
            <span className="hidden xl:inline text-regal-300">
              {translate('التوثيق الأكاديمي APA', 'APA Academic Citation')}
            </span>

            {/* Spotlight Search Shortcut */}
            {onOpenSpotlight && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="header-spotlight-btn"
                onClick={onOpenSpotlight}
                aria-label={t('spotlightSearch')}
                title={t('spotlightSearch')}
                className="h-7 px-2 text-[11px] font-medium text-gold-400 hover:text-white hover:bg-regal-800 border border-regal-700/60 rounded-md"
              >
                <Search className="size-3 text-gold-400 shrink-0" aria-hidden="true" />
                <span className="hidden xs:inline">{t('searchShortcut')}</span>
                <kbd className="hidden sm:inline-flex items-center rounded border border-regal-700 bg-regal-950 px-1 text-[9px] font-mono text-gold-300 ms-1">
                  ⌘K
                </kbd>
              </Button>
            )}

            {/* PWA Install Trigger */}
            {!pwa.isInstalled && (
              <Button
                type="button"
                id="installAppBtn"
                variant="ghost"
                size="sm"
                data-testid="header-install-btn"
                onClick={() => {
                  void pwa.promptInstall();
                }}
                aria-label={t('txtInstall')}
                title={t('txtInstall')}
                className="h-7 px-2 text-[11px] font-medium text-regal-100 hover:text-white hover:bg-regal-800 border border-regal-700/60 rounded-md"
              >
                <Download className="size-3 shrink-0" aria-hidden="true" />
                <span id="txtInstall" className="hidden sm:inline">
                  {t('txtInstall')}
                </span>
              </Button>
            )}

            {/* Favorites Toggle */}
            <Button
              type="button"
              id="favoritesOnlyBtn"
              variant="ghost"
              size="sm"
              data-testid="header-favorites-btn"
              aria-pressed={favoritesOnly}
              aria-label={t('txtFavoritesOnly')}
              title={t('txtFavoritesOnly')}
              onClick={onToggleFavoritesOnly}
              className={cn(
                'h-7 px-2 text-[11px] font-medium text-regal-100 hover:text-white hover:bg-regal-800 border border-regal-700/60 rounded-md transition-colors',
                favoritesOnly &&
                  'bg-gold-500 text-regal-950 font-bold border-gold-400 hover:bg-gold-400 hover:text-regal-950'
              )}
            >
              <Heart
                className={cn('size-3 shrink-0', favoritesOnly && 'fill-current')}
                aria-hidden="true"
              />
              <span id="txtFavoritesOnly" className="hidden md:inline">
                {t('txtFavoritesOnly')}
              </span>
              {favoritesCount > 0 && (
                <span
                  data-testid="header-favorites-count"
                  className={cn(
                    'inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold tabular-nums ms-0.5',
                    favoritesOnly
                      ? 'bg-regal-950 text-gold-400'
                      : 'bg-gold-500/25 text-gold-300'
                  )}
                >
                  {formatNumber(favoritesCount)}
                </span>
              )}
            </Button>

            {/* Language Switcher */}
            <button
              type="button"
              id="langToggleBtn"
              data-testid="header-lang-btn"
              onClick={toggleLang}
              aria-label={t('langToggleAria')}
              title={t('langToggleAria')}
              className="h-7 px-2.5 rounded-md bg-regal-800 hover:bg-regal-700 border border-regal-700 text-gold-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Globe className="size-3 shrink-0" aria-hidden="true" />
              <span id="langLabel">{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Theme Switcher */}
            <button
              type="button"
              id="themeToggleBtn"
              data-testid="header-theme-btn"
              onClick={toggleTheme}
              aria-label={t('themeToggleAria')}
              title={t('themeToggleAria')}
              className="size-7 rounded-md bg-regal-800 hover:bg-regal-700 border border-regal-700 flex items-center justify-center text-gold-400 transition cursor-pointer"
            >
              {isDark ? (
                <Sun className="size-3.5 text-gold-400" aria-hidden="true" />
              ) : (
                <Moon className="size-3.5 text-regal-200" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Sovereign Institutional Banner */}
      <div className="mx-auto max-w-[1360px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
        <a
          href="#booksDisplayContainer"
          onClick={(e) => {
            if (onBrandClick) {
              e.preventDefault();
              onBrandClick();
            }
          }}
          data-testid="brand-link"
          aria-label="IAR Archive"
          className="group flex items-center gap-3.5 min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400 cursor-pointer"
        >
          {/* Sovereign Golden Crest Logo */}
          <div className="size-14 sm:size-16 rounded-2xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 p-0.5 shadow-xl flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-regal-950 rounded-[14px] flex flex-col items-center justify-center text-center p-1 border border-gold-400/40 transition-colors group-hover:bg-regal-900">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-6 sm:size-7 text-gold-400"
                aria-hidden="true"
              >
                <path d="M12 2L2 7l10 5 10-5-10-2zm0 8.5l-8-4v6l8 4 8-4v-6l-8 4zm0 8.5l-8-4v3l8 4 8-4v-3l-8 4z" />
              </svg>
              <span className="text-[8px] font-black tracking-widest text-gold-300 mt-0.5 font-mono">
                IAR
              </span>
            </div>
          </div>

          <div className="flex flex-col min-w-0 text-start">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                {translate(
                  'المكتبة الرقمية وأرشيف العلوم الإدارية',
                  'Digital Library & Administrative Sciences Archive'
                )}
              </h1>
              <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-regal-800 text-gold-300 border border-gold-500/30">
                IAR
              </span>
            </div>
            <p
              id="txtSubtitle"
              className="text-xs sm:text-[13px] text-regal-100/90 leading-normal mt-0.5 line-clamp-1"
            >
              {t('txtSubtitle')}
            </p>
          </div>
        </a>

        {/* Quick Institutional Stats Badge */}
        <div className="flex items-center gap-3 sm:gap-6 bg-regal-950/70 border border-regal-800/80 px-4 sm:px-5 py-2.5 rounded-xl text-center shadow-inner shrink-0">
          <div>
            <div className="text-base sm:text-lg font-black text-gold-400 tabular-nums">
              {formatNumber(booksCount)}
            </div>
            <div className="text-[10px] text-regal-100 font-medium">
              {translate('مرجعاً إدارياً', 'References')}
            </div>
          </div>
          <div className="w-px h-6 sm:h-7 bg-regal-800" />
          <div>
            <div className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
              {formatNumber(categoriesCount)}
            </div>
            <div className="text-[10px] text-regal-100 font-medium">
              {translate('مساراً معرفياً', 'Pathways')}
            </div>
          </div>
          <div className="w-px h-6 sm:h-7 bg-regal-800" />
          <div>
            <div className="text-base sm:text-lg font-black text-white tabular-nums">
              100%
            </div>
            <div className="text-[10px] text-regal-100 font-medium">
              {translate('توثيق أكاديمي', 'APA Verified')}
            </div>
          </div>
        </div>
      </div>

      {/* Manual PWA Installation Banner */}
      {pwa.manualInstructionsShown && (
        <div
          role="status"
          data-testid="pwa-manual-banner"
          className="border-t border-regal-800 bg-regal-950 px-4 py-2 text-xs text-regal-200"
        >
          <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3">
            <p className="whitespace-pre-line leading-relaxed">
              {pwa.manualInstructions}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              data-testid="pwa-manual-dismiss"
              aria-label={translate('إغلاق الإرشادات', 'Dismiss instructions')}
              onClick={pwa.dismissManualInstructions}
              className="shrink-0 text-gold-400 hover:text-white"
            >
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
