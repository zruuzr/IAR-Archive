import { Download, Globe, Heart, Moon, Search, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UsePWAInstallReturn } from '@/hooks/usePWAInstall';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

export interface SiteHeaderProps {
  favoritesOnly: boolean;
  favoritesCount: number;
  onToggleFavoritesOnly: () => void;
  onBrandClick?: () => void;
  onOpenSpotlight?: () => void;
  pwa: UsePWAInstallReturn;
}

/**
 * Main sticky editorial header for IAR Archive.
 * Houses the institutional brand lockup, spotlight search trigger, PWA install trigger,
 * favorites filter toggle, language switcher (AR/EN), and theme switcher (Light/Dark).
 */
export function SiteHeader({
  favoritesOnly,
  favoritesCount,
  onToggleFavoritesOnly,
  onBrandClick,
  onOpenSpotlight,
  pwa
}: SiteHeaderProps) {
  const { t, translate, formatNumber, toggleLang } = useI18n();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      data-testid="site-header"
      className="site-header sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md transition-all shadow-xs"
    >
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-2 px-3 py-3 sm:px-6 lg:px-8">
        {/* Brand Identity Lockup */}
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
          className="group flex items-center gap-2.5 sm:gap-3 min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span
            aria-hidden="true"
            className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-card text-primary shadow-2xs transition-colors group-hover:border-primary group-hover:bg-primary/10"
          >
            <svg
              viewBox="0 0 28 28"
              fill="none"
              className="size-5 sm:size-5.5"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="4"
                width="20"
                height="20"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M9 9.5H19M9 14H19M9 18.5H14.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="18" cy="18.5" r="1.4" fill="currentColor" />
            </svg>
          </span>

          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold tracking-tight text-foreground leading-tight truncate">
              IAR Archive
            </span>
            <span
              id="txtSubtitle"
              className="text-[11px] sm:text-xs text-muted-foreground leading-tight truncate"
            >
              {t('txtSubtitle')}
            </span>
          </div>
        </a>

        {/* Navigation & Utility Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Spotlight Quick Search Trigger */}
          {onOpenSpotlight && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="header-spotlight-btn"
              onClick={onOpenSpotlight}
              aria-label={t('spotlightSearch')}
              title={t('spotlightSearch')}
              className="h-9 px-2.5 sm:px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Search className="size-3.5 text-primary shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{t('searchShortcut')}</span>
              <kbd className="hidden md:inline-flex items-center rounded border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground ms-1">
                ⌘K
              </kbd>
            </Button>
          )}

          {!pwa.isInstalled && (
            <Button
              type="button"
              id="installAppBtn"
              variant={pwa.isInstallPromptAvailable ? 'default' : 'outline'}
              size="sm"
              data-testid="header-install-btn"
              onClick={() => {
                void pwa.promptInstall();
              }}
              aria-label={t('txtInstall')}
              title={t('txtInstall')}
              className="h-9 px-2.5 sm:px-3 text-xs font-medium"
            >
              <Download className="size-3.5 shrink-0" aria-hidden="true" />
              <span id="txtInstall" className="hidden sm:inline">
                {t('txtInstall')}
              </span>
            </Button>
          )}

          {/* Favorites Filter Toggle */}
          <Button
            type="button"
            id="favoritesOnlyBtn"
            variant={favoritesOnly ? 'default' : 'outline'}
            size="sm"
            data-testid="header-favorites-btn"
            aria-pressed={favoritesOnly}
            aria-label={t('txtFavoritesOnly')}
            title={t('txtFavoritesOnly')}
            onClick={onToggleFavoritesOnly}
            className={cn(
              'h-9 px-2.5 sm:px-3 text-xs font-medium transition-colors',
              favoritesOnly && 'shadow-xs'
            )}
          >
            <Heart
              className={cn('size-3.5 shrink-0', favoritesOnly && 'fill-current')}
              aria-hidden="true"
            />
            <span id="txtFavoritesOnly" className="hidden md:inline">
              {t('txtFavoritesOnly')}
            </span>
            {favoritesCount > 0 && (
              <span
                data-testid="header-favorites-count"
                className={cn(
                  'inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[11px] font-semibold tabular-nums',
                  favoritesOnly
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary/15 text-primary'
                )}
              >
                {formatNumber(favoritesCount)}
              </span>
            )}
          </Button>

          {/* Language Switcher */}
          <Button
            type="button"
            id="langToggleBtn"
            variant="outline"
            size="sm"
            data-testid="header-lang-btn"
            onClick={toggleLang}
            aria-label={t('langToggleAria')}
            title={t('langToggleAria')}
            className="h-9 px-2.5 sm:px-3 text-xs font-semibold tracking-wide"
          >
            <Globe className="size-3.5 shrink-0 hidden xs:inline" aria-hidden="true" />
            <span id="langLabel">{t('langLabel')}</span>
          </Button>

          {/* Theme Switcher */}
          <Button
            type="button"
            id="themeToggleBtn"
            variant="outline"
            size="icon"
            data-testid="header-theme-btn"
            onClick={toggleTheme}
            aria-label={t('themeToggleAria')}
            title={t('themeToggleAria')}
            className="size-9 shrink-0"
          >
            {isDark ? (
              <Sun className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <Moon className="size-4 text-foreground/80" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Manual PWA Installation Instructions Banner (shown when browser lacks native beforeinstallprompt) */}
      {pwa.manualInstructionsShown && (
        <div
          role="status"
          data-testid="pwa-manual-banner"
          className="border-t border-border bg-secondary/90 px-4 py-2.5 text-xs text-secondary-foreground"
        >
          <div className="mx-auto flex max-w-[1360px] items-start justify-between gap-3 sm:px-4">
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
