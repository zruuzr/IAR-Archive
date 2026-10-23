import { Check, Copy, Eye, Layers, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { UseBundleReturn } from '@/hooks/useBundle';
import { useI18n } from '@/i18n/I18nProvider';

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
          className="bundle-mode-notice flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal/40 bg-teal/10 px-4 py-3 text-xs sm:text-sm text-foreground"
        >
          <div className="flex items-center gap-2 font-semibold">
            <Layers className="size-4 text-teal shrink-0" aria-hidden="true" />
            <span>
              {t('sharedResearchBundle')} · {formatNumber(bundle.bundleCount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              data-testid="exit-bundle-mode-btn"
              onClick={() => bundle.setBundleMode(false)}
            >
              {translate('عرض كل المكتبة', 'Show full library')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="xs"
              data-testid="bundle-notice-clear-btn"
              onClick={onClearBundle}
            >
              {t('backToLibraryShort')}
            </Button>
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
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-md px-4 py-3.5 shadow-lg shadow-primary/10 ring-1 ring-primary/20 animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-foreground">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold tabular-nums">
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
            <Button
              type="button"
              variant={bundle.bundleMode ? 'secondary' : 'outline'}
              size="xs"
              data-testid="bundle-toggle-mode-btn"
              aria-pressed={bundle.bundleMode}
              onClick={() => bundle.setBundleMode(!bundle.bundleMode)}
            >
              <Eye className="size-3.5 shrink-0" aria-hidden="true" />
              <span>
                {bundle.bundleMode
                  ? translate('العودة للكل', 'Show all')
                  : translate('استعراض الحزمة', 'Review bundle')}
              </span>
            </Button>

            <Button
              type="button"
              id="copyBundleBtn"
              variant="default"
              size="xs"
              data-testid="bundle-copy-link-btn"
              onClick={() => {
                void handleCopy();
              }}
            >
              {copiedRecently ? (
                <Check className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span id="txtBundleBtn">
                {copiedRecently ? t('copiedToClipboard') : t('txtBundleBtn')}
              </span>
            </Button>

            <Button
              type="button"
              id="clearBundleBtn"
              variant="ghost"
              size="xs"
              data-testid="bundle-clear-btn"
              onClick={onClearBundle}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span id="txtClearBundle">{t('txtClearBundle')}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
