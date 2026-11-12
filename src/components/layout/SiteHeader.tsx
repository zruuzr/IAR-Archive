import { Download, Heart, Moon, Search, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { HeritageFrieze, HeritageLogo } from '@/components/heritage';
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
  loaded?: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onToggleFavoritesOnly: () => void;
  onBrandClick?: () => void;
  onOpenSpotlight?: () => void;
  pwa: UsePWAInstallReturn;
}

/**
 * Heritage Masthead for IAR ARCHIVE — المرجع الإداري العراقي.
 * Built with HeritageLogo, .hx-site-header, HeritageFrieze,
 * preserving all navigation, PWA, sound, language, theme, and test hooks.
 */
export function SiteHeader({
  favoritesOnly,
  favoritesCount,
  booksCount = 254,
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
    <header data-testid="site-header" className="hx-site-header">
      <div className="hx-wrap hx-bar">
        {/* Brand link with Heritage octagram logo & typography */}
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
          className="hx-brand"
        >
          <HeritageLogo size={44} />
          <span className="hx-brand-txt">
            <b className="whitespace-nowrap">
              {translate('الأرشيف الإداري العراقي', 'IAR Archive')}
            </b>
            <small>IAR ARCHIVE</small>
            <span id="txtSubtitle" className="sr-only">
              {t('txtSubtitle')}
            </span>
          </span>
        </a>

        {/* Center navigation links */}
        <nav
          className="hx-nav hidden lg:flex"
          aria-label={translate('التنقل الرئيسي', 'Main navigation')}
        >
          <a href="#booksDisplayContainer">
            {translate('رفوف المعرفة', 'Knowledge Shelves')}
          </a>
          <a href="#paths">{translate('المسارات', 'Pathways')}</a>
          <a href="#featuredSection">{translate('في دائرة الضوء', 'In the Spotlight')}</a>
          <span className="hidden xl:inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-[var(--hx-surface-2)] border border-[var(--hx-gold)]/40 text-[var(--hx-ink)]">
            <span className="font-mono font-bold tabular-nums text-[var(--hx-gold-deep)] dark:text-[var(--hx-gold-bright)]">
              {loaded ? formatNumber(booksCount) : '—'}
            </span>
            <span className="ms-1.5 font-medium">{translate('مرجعاً', 'refs')}</span>
          </span>
        </nav>

        {/* Tools and Utility Controls */}
        <div className="hx-tools">
          {/* Spotlight Search Trigger (Ctrl/Cmd + K) */}
          {onOpenSpotlight && (
            <button
              type="button"
              data-testid="header-spotlight-btn"
              onClick={onOpenSpotlight}
              aria-label={t('spotlightSearch')}
              title={t('spotlightSearch')}
              className="hx-icon-btn"
            >
              <Search className="size-4" aria-hidden="true" />
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
              'hx-icon-btn relative',
              favoritesOnly &&
                '!border-[var(--hx-gold)] !bg-[var(--hx-surface-2)] text-[var(--hx-gold-deep)] dark:text-[var(--hx-gold-bright)]'
            )}
          >
            <Heart
              className={cn(
                'size-4',
                favoritesOnly &&
                  'fill-current text-[var(--hx-gold-deep)] dark:text-[var(--hx-gold-bright)]'
              )}
              aria-hidden="true"
            />
            <span id="txtFavoritesOnly" className="sr-only">
              {t('txtFavoritesOnly')}
            </span>
            {favoritesCount > 0 && (
              <span
                data-testid="header-favorites-count"
                className="absolute -top-1 -end-1 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-[var(--hx-gold)] text-[var(--hx-lapis-night)] px-1 font-mono text-[10px] font-bold tabular-nums"
              >
                {formatNumber(favoritesCount)}
              </span>
            )}
          </button>

          {/* PWA Install Trigger (hidden on mobile phones where browser banner handles it) */}
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
              className="hx-icon-btn hidden sm:grid"
            >
              <Download className="size-4" aria-hidden="true" />
              <span id="txtInstall" className="sr-only">
                {t('txtInstall')}
              </span>
            </button>
          )}

          {/* Tactile Paper Acoustic Toggle (desktop/tablet) */}
          {onToggleSound && (
            <button
              type="button"
              data-testid="header-sound-btn"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              aria-label={translate('تبديل الصوت التفاعلي', 'Toggle paper acoustics')}
              title={translate('الصوت الورقي التفاعلي', 'Interactive paper acoustics')}
              className="hx-icon-btn hidden sm:grid"
            >
              {soundEnabled ? (
                <Volume2 className="size-4" aria-hidden="true" />
              ) : (
                <VolumeX
                  className="size-4 text-[var(--hx-ink-soft)]"
                  aria-hidden="true"
                />
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
            className={cn(
              'hx-icon-btn text-xs font-bold',
              lang === 'ar' ? 'font-mono' : 'font-sans min-w-[42px] w-auto px-2'
            )}
          >
            <span id="langLabel">{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            id="themeToggleBtn"
            data-testid="header-theme-btn"
            onClick={toggleTheme}
            aria-label={t('themeToggleAria')}
            title={t('themeToggleAria')}
            className="hx-icon-btn"
          >
            {isDark ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <HeritageFrieze />

      {/* Manual PWA Installation Banner */}
      {pwa.manualInstructionsShown && (
        <div
          role="status"
          data-testid="pwa-manual-banner"
          className="border-t border-[var(--hx-line)] bg-[var(--hx-surface)] px-4 py-2.5 text-xs text-[var(--hx-ink-soft)]"
        >
          <div className="hx-wrap flex items-center justify-between gap-3">
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
