import { Download, Heart, Moon, Search, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UsePWAInstallReturn } from '@/hooks/usePWAInstall';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/i18n/I18nProvider';
import { IarMonogramIcon } from '@/lib/editorial-cloth';
import { cn } from '@/lib/utils';

export interface SiteHeaderProps {
  favoritesOnly: boolean;
  favoritesCount: number;
  booksCount?: number;
  categoriesCount?: number;
  loaded?: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onToggleFavoritesOnly: () => void;
  onBrandClick?: () => void;
  onOpenSpotlight?: () => void;
  pwa: UsePWAInstallReturn;
}

/**
 * Editorial Archival Masthead for IAR ARCHIVE — المرجع الإداري العراقي.
 * Features translucent cotton-rag / obsidian backdrop, 1px architectural hairlines,
 * official IAR monogram, live catalog counter, and tactile utility controls.
 */
export function SiteHeader({
  favoritesOnly,
  favoritesCount,
  booksCount = 180,
  loaded = true,
  soundEnabled = true,
  onToggleSound,
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
      className="site-header sticky top-0 z-30 border-b hairline-border bg-background/88 backdrop-blur-md transition-colors"
    >
      <div className="mx-auto grid max-w-[1360px] grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Start: Official Brand Monogram & Bilingual Lockup */}
        <div className="flex items-center min-w-0">
          <a
            href="#booksDisplayContainer"
            onClick={(e) => {
              if (onBrandClick) {
                e.preventDefault();
                onBrandClick();
              }
            }}
            data-testid="brand-link"
            aria-label="IAR ARCHIVE — المرجع الإداري العراقي"
            className="group inline-flex items-center gap-3 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring rounded-xs cursor-pointer"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[5px] border hairline-border-strong bg-card text-foreground transition-colors group-hover:border-primary group-hover:text-primary">
              <IarMonogramIcon className="size-5" />
            </span>

            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-mono text-xs font-medium tracking-[0.14em] text-foreground">
                IAR ARCHIVE
              </span>
              <span className="truncate text-xs font-medium text-muted-foreground">
                {translate('المرجع الإداري العراقي', 'Iraqi Administrative Reference')}
              </span>
              <span id="txtSubtitle" className="sr-only">
                {t('txtSubtitle')}
              </span>
            </span>
          </a>
        </div>

        {/* Center: Archival Edition & Live Verified Monograph Counter */}
        <div className="hidden lg:flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>
            {translate('المكتبة المرجعية الرقمية', 'Digital Reference Library')}
          </span>
          <span aria-hidden="true" className="font-bold text-primary">
            ·
          </span>
          <span className="font-medium text-foreground/90">
            <span className="font-mono font-semibold tabular-nums">
              {loaded ? formatNumber(booksCount) : '—'}
            </span>{' '}
            {translate('مصنفاً موثقاً', 'verified monographs')}
          </span>
        </div>

        {/* End: Architectural Hairline Utility Controls */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <a
            href="#controlsRow"
            className="hidden xl:inline-flex h-8 items-center rounded-[4px] border hairline-border px-3 text-xs font-medium text-secondary-foreground transition-colors hover:border-foreground hover:bg-card hover:text-foreground"
          >
            {translate('الفهرس الكامل', 'Full Index')}
          </a>

          {/* Spotlight Search Trigger (Ctrl/Cmd + K) */}
          {onOpenSpotlight && (
            <button
              type="button"
              data-testid="header-spotlight-btn"
              onClick={onOpenSpotlight}
              aria-label={t('spotlightSearch')}
              title={t('spotlightSearch')}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border hairline-border bg-transparent px-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:border-foreground hover:bg-card hover:text-foreground cursor-pointer"
            >
              <Search className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{t('searchShortcut')}</span>
              <kbd className="hidden md:inline-flex items-center rounded-[3px] border hairline-border bg-card px-1 text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Favorites Filter Toggle */}
          <button
            type="button"
            id="favoritesOnlyBtn"
            data-testid="header-favorites-btn"
            aria-pressed={favoritesOnly}
            aria-label={t('txtFavoritesOnly')}
            title={t('txtFavoritesOnly')}
            onClick={onToggleFavoritesOnly}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-2.5 text-xs font-medium transition-colors cursor-pointer',
              favoritesOnly
                ? 'border-foreground bg-foreground text-background'
                : 'hairline-border bg-transparent text-secondary-foreground hover:border-foreground hover:bg-card hover:text-foreground'
            )}
          >
            <Heart
              className={cn(
                'size-3.5 shrink-0',
                favoritesOnly && 'fill-current text-primary'
              )}
              aria-hidden="true"
            />
            <span id="txtFavoritesOnly" className="hidden md:inline">
              {t('txtFavoritesOnly')}
            </span>
            {favoritesCount > 0 && (
              <span
                data-testid="header-favorites-count"
                className={cn(
                  'inline-flex min-w-4 h-4 items-center justify-center rounded-xs px-1 font-mono text-[10px] font-semibold tabular-nums',
                  favoritesOnly
                    ? 'bg-background/20 text-background'
                    : 'bg-primary/12 text-primary'
                )}
              >
                {formatNumber(favoritesCount)}
              </span>
            )}
          </button>

          {/* PWA Install Trigger */}
          {!pwa.isInstalled && (
            <button
              type="button"
              id="installAppBtn"
              data-testid="header-install-btn"
              onClick={() => {
                void pwa.promptInstall();
              }}
              aria-label={t('txtInstall')}
              title={t('txtInstall')}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border hairline-border bg-transparent px-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:border-foreground hover:bg-card hover:text-foreground cursor-pointer"
            >
              <Download className="size-3.5 shrink-0" aria-hidden="true" />
              <span id="txtInstall" className="hidden sm:inline">
                {t('txtInstall')}
              </span>
            </button>
          )}

          {/* Tactile Paper Acoustic Toggle */}
          {onToggleSound && (
            <button
              type="button"
              data-testid="header-sound-btn"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              aria-label={translate('تبديل الصوت التفاعلي', 'Toggle paper acoustics')}
              title={translate('الصوت الورقي التفاعلي', 'Interactive paper acoustics')}
              className="hidden sm:inline-flex size-8 items-center justify-center rounded-[4px] border hairline-border bg-transparent text-secondary-foreground transition-colors hover:border-foreground hover:bg-card hover:text-foreground cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="size-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="size-3.5 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
          )}

          {/* Language Switcher */}
          <button
            type="button"
            id="langToggleBtn"
            data-testid="header-lang-btn"
            onClick={toggleLang}
            aria-label={t('langToggleAria')}
            title={t('langToggleAria')}
            className="inline-flex h-8 items-center justify-center rounded-[4px] border hairline-border bg-transparent px-2.5 font-mono text-xs font-medium text-secondary-foreground transition-colors hover:border-foreground hover:bg-card hover:text-foreground cursor-pointer"
          >
            <span id="langLabel">{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Reading Room Theme Switcher (Cotton-Rag Parchment / Evening Obsidian) */}
          <button
            type="button"
            id="themeToggleBtn"
            data-testid="header-theme-btn"
            onClick={toggleTheme}
            aria-label={t('themeToggleAria')}
            title={t('themeToggleAria')}
            className="inline-flex size-8 items-center justify-center rounded-[4px] border hairline-border bg-transparent text-secondary-foreground transition-colors hover:border-foreground hover:bg-card hover:text-foreground cursor-pointer"
          >
            {isDark ? (
              <Sun className="size-3.5" aria-hidden="true" />
            ) : (
              <Moon className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Manual PWA Installation Banner */}
      {pwa.manualInstructionsShown && (
        <div
          role="status"
          data-testid="pwa-manual-banner"
          className="border-t hairline-border bg-card px-4 py-2.5 text-xs text-secondary-foreground"
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
              className="shrink-0"
            >
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
