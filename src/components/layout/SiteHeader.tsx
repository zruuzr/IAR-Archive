import {
  Download,
  Heart,
  Menu,
  Moon,
  Search,
  Sun,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { HeritageFrieze, HeritageIcon, HeritageLogo } from '@/components/heritage';
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
 * responsive mobile drawer, and full navigation/PWA/theme/language hooks.
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  return (
    <header data-testid="site-header" className="hx-site-header">
      <div className="hx-wrap hx-bar">
        {/* Brand link with Heritage octagram logo & typography */}
        <a
          href="#booksDisplayContainer"
          onClick={(e) => {
            setMobileNavOpen(false);
            if (onBrandClick) {
              e.preventDefault();
              onBrandClick();
            }
          }}
          data-testid="brand-link"
          aria-label="IAR ARCHIVE — المرجع الإداري العراقي"
          className="hx-brand min-w-0 flex-1 sm:flex-initial"
        >
          <HeritageLogo size={44} />
          <span className="hx-brand-txt min-w-0">
            <b className="whitespace-nowrap truncate">
              {translate('الأرشيف الإداري العراقي', 'IAR Archive')}
            </b>
            <small>IAR ARCHIVE</small>
            <span id="txtSubtitle" className="sr-only">
              {t('txtSubtitle')}
            </span>
          </span>
        </a>

        {/* Center navigation links (Desktop) */}
        <nav
          className="hx-nav hidden lg:flex"
          aria-label={translate('التنقل الرئيسي', 'Main navigation')}
        >
          <a href="#booksDisplayContainer">
            {translate('رفوف المعرفة', 'Knowledge Shelves')}
          </a>
          <a href="#paths">{translate('المسارات', 'Pathways')}</a>
          <a href="#featuredSection">{translate('في دائرة الضوء', 'In the Spotlight')}</a>
          <span className="hidden xl:inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-[var(--hx-surface-2)] border border-[var(--hx-gold)]/45 text-[var(--hx-ink)]">
            <span className="font-mono font-bold tabular-nums text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]">
              {loaded ? formatNumber(booksCount) : '—'}
            </span>
            <span className="ms-1.5 font-medium">{translate('مرجعاً', 'refs')}</span>
          </span>
        </nav>

        {/* Tools and Utility Controls */}
        <div className="hx-tools shrink-0">
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
                '!border-[var(--hx-gold)] !bg-[var(--hx-surface-2)] text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]'
            )}
          >
            <Heart
              className={cn(
                'size-4',
                favoritesOnly &&
                  'fill-current text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]'
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

          {/* PWA Install Trigger (hidden on narrow phones; accessible in mobile menu too) */}
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

          {/* Tactile Paper Acoustic Toggle (desktop/tablet; accessible in mobile menu too) */}
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
            className="hx-icon-btn min-w-[34px] sm:min-w-[42px] w-auto px-1.5 sm:px-2.5 text-[11px] sm:text-xs font-bold font-sans"
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

          {/* Mobile / Tablet Navigation Menu Button */}
          <button
            type="button"
            data-testid="header-mobile-menu-btn"
            aria-expanded={mobileNavOpen}
            aria-controls="headerMobileNavDrawer"
            aria-label={
              mobileNavOpen
                ? translate('إغلاق قائمة التنقل', 'Close navigation menu')
                : translate('فتح قائمة التنقل', 'Open navigation menu')
            }
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className={cn(
              'hx-icon-btn lg:hidden',
              mobileNavOpen &&
                '!border-[var(--hx-gold)] !bg-[var(--hx-surface-2)] text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]'
            )}
          >
            {mobileNavOpen ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Menu className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <HeritageFrieze />

      {/* Mobile / Tablet Heritage Navigation Drawer */}
      {mobileNavOpen && (
        <nav
          id="headerMobileNavDrawer"
          data-testid="header-mobile-nav"
          aria-label={translate('قائمة التنقل السريع', 'Quick navigation menu')}
          className="lg:hidden border-t border-[var(--hx-line)] bg-[var(--hx-surface)] px-4 py-3.5 shadow-lg hx-fade"
        >
          <div className="hx-wrap flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--hx-line)] text-xs text-[var(--hx-muted)]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <HeritageIcon
                  name="octagram"
                  size={13}
                  className="text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
                />
                {translate('الأقسام الرئيسية', 'Archive Sections')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--hx-surface-2)] border border-[var(--hx-line)] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]">
                {loaded ? formatNumber(booksCount) : '—'}{' '}
                <span className="font-sans font-medium text-[var(--hx-ink-soft)]">
                  {translate('مرجعاً', 'refs')}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <a
                href="#booksDisplayContainer"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-between rounded-[10px] border border-[var(--hx-line)] bg-[var(--hx-surface-2)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hx-ink)] hover:border-[var(--hx-gold)] transition-colors"
              >
                <span>{translate('رفوف المعرفة', 'Knowledge Shelves')}</span>
                <HeritageIcon
                  name="arrow-end"
                  size={15}
                  className="text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
                />
              </a>
              <a
                href="#paths"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-between rounded-[10px] border border-[var(--hx-line)] bg-[var(--hx-surface-2)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hx-ink)] hover:border-[var(--hx-gold)] transition-colors"
              >
                <span>{translate('المسارات', 'Pathways')}</span>
                <HeritageIcon
                  name="arrow-end"
                  size={15}
                  className="text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
                />
              </a>
              <a
                href="#featuredSection"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-between rounded-[10px] border border-[var(--hx-line)] bg-[var(--hx-surface-2)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hx-ink)] hover:border-[var(--hx-gold)] transition-colors"
              >
                <span>{translate('في دائرة الضوء', 'In the Spotlight')}</span>
                <HeritageIcon
                  name="arrow-end"
                  size={15}
                  className="text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
                />
              </a>
            </div>

            {(onToggleSound || !pwa.isInstalled) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 sm:hidden">
                {onToggleSound && (
                  <button
                    type="button"
                    onClick={onToggleSound}
                    aria-pressed={soundEnabled}
                    className="hx-pill-toggle flex-1 text-xs"
                  >
                    {soundEnabled ? (
                      <Volume2 className="size-3.5" aria-hidden="true" />
                    ) : (
                      <VolumeX className="size-3.5" aria-hidden="true" />
                    )}
                    <span>{translate('الصوت التفاعلي', 'Paper Acoustics')}</span>
                  </button>
                )}
                {!pwa.isInstalled && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      void pwa.promptInstall();
                    }}
                    className="hx-pill-toggle flex-1 text-xs"
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    <span>{t('txtInstall')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Manual PWA Installation Banner */}
      {pwa.manualInstructionsShown && (
        <div
          role="status"
          data-testid="pwa-manual-banner"
          className="border-t border-[var(--hx-line)] bg-[var(--hx-surface-2)] px-4 py-3 text-xs text-[var(--hx-ink)]"
        >
          <div className="hx-wrap flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <HeritageIcon
                name="octagram"
                size={15}
                className="mt-0.5 shrink-0 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
              />
              <p className="whitespace-pre-line leading-relaxed text-[var(--hx-ink-2)]">
                {pwa.manualInstructions}
              </p>
            </div>
            <button
              type="button"
              data-testid="pwa-manual-dismiss"
              aria-label={translate('إغلاق الإرشادات', 'Dismiss instructions')}
              onClick={pwa.dismissManualInstructions}
              className="hx-icon-btn !w-7 !h-7 !rounded-lg shrink-0"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
