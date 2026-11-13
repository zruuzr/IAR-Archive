import { Check, Copy, Eye, Layers, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { UseBundleReturn } from '@/hooks/useBundle';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

export interface BundleBarProps {
  bundle: UseBundleReturn;
  onCopyBundleUrl: (url: string) => Promise<void> | void;
  onClearBundle: () => void;
}

/**
 * Displays the active Research Bundle notice (when viewing a shared `?bundle=` URL)
 * and the interactive Bundle Action Bar whenever 1 or more references are selected.
 */
export function BundleBar({ bundle, onCopyBundleUrl, onClearBundle }: BundleBarProps) {
  const { t, translate, formatNumber } = useI18n();
  const [copiedRecently, setCopiedRecently] = useState<boolean>(false);

  if (bundle.bundleCount === 0 && !bundle.bundleMode) {
    return null;
  }

  const handleCopy = async () => {
    const shareUrl = bundle.bundleShareUrl;
    if (!shareUrl) return;
    await onCopyBundleUrl(shareUrl);
    setCopiedRecently(true);
    setTimeout(() => {
      setCopiedRecently(false);
    }, 2200);
  };

  return (
    <div className="mb-6 space-y-2.5" data-testid="bundle-section">
      {/* Shared Research Bundle Mode Notice */}
      {bundle.bundleMode && (
        <div
          id="bundleModeAlertContainer"
          role="status"
          data-testid="bundle-mode-alert"
          className="bundle-mode-notice hx-panel-recess border-[var(--hx-gold)]/50 px-4 py-3 text-xs sm:text-sm text-[var(--hx-ink)] flex flex-wrap items-center justify-between gap-3 hx-fade"
        >
          <div className="flex items-center gap-2 font-semibold">
            <Layers
              className="size-4 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)] shrink-0"
              aria-hidden="true"
            />
            <span>
              {t('sharedResearchBundle')} · {formatNumber(bundle.bundleCount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="exit-bundle-mode-btn"
              onClick={() => bundle.setBundleMode(false)}
              className="hx-btn hx-btn-line !min-h-8 !px-3 !py-1 !text-xs"
            >
              {translate('عرض كل المكتبة', 'Show full library')}
            </button>

            <button
              type="button"
              data-testid="bundle-notice-clear-btn"
              onClick={onClearBundle}
              className="hx-btn hx-btn-line !min-h-8 !px-3 !py-1 !text-xs"
            >
              {t('backToLibraryShort')}
            </button>
          </div>
        </div>
      )}

      {/* Interactive Research Bundle Bar */}
      {bundle.bundleCount > 0 && (
        <div
          id="bundleBar"
          role="region"
          aria-label={t('bundleCheckboxLabel')}
          data-testid="bundle-bar"
          className="hx-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hx-fade"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[var(--hx-ink)]">
            <span className="inline-flex size-7 items-center justify-center rounded-[8px] bg-[var(--hx-chip-on-bg)] text-[var(--hx-chip-on-ink)] font-mono font-bold tabular-nums">
              <span id="bundleCount" data-testid="bundle-count">
                {formatNumber(bundle.bundleCount)}
              </span>
            </span>
            <span>
              {t('bundleSelectedPrefix')} {formatNumber(bundle.bundleCount)}{' '}
              {t('bundleSelectedSuffix')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="bundle-toggle-mode-btn"
              aria-pressed={bundle.bundleMode}
              onClick={() => bundle.setBundleMode(!bundle.bundleMode)}
              className={cn(
                'hx-btn hx-btn-line !min-h-8 !px-3 !py-1 !text-xs',
                bundle.bundleMode && 'hx-is-active'
              )}
            >
              <Eye className="size-3.5 shrink-0" aria-hidden="true" />
              <span>
                {bundle.bundleMode
                  ? translate('العودة للكل', 'Show all')
                  : translate('استعراض الحزمة', 'Review bundle')}
              </span>
            </button>

            <button
              type="button"
              id="copyBundleBtn"
              data-testid="bundle-copy-link-btn"
              onClick={() => {
                void handleCopy();
              }}
              className="hx-btn hx-btn-solid !min-h-8 !px-3.5 !py-1 !text-xs"
            >
              {copiedRecently ? (
                <Check className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span id="txtBundleBtn">
                {copiedRecently ? t('copiedToClipboard') : t('txtBundleBtn')}
              </span>
            </button>

            <button
              type="button"
              id="clearBundleBtn"
              data-testid="bundle-clear-btn"
              onClick={onClearBundle}
              className="hx-btn hx-btn-line !min-h-8 !px-3 !py-1 !text-xs text-[var(--hx-muted)] hover:text-destructive hover:border-destructive/50"
            >
              <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span id="txtClearBundle">{t('txtClearBundle')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
