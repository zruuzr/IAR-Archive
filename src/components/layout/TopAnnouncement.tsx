import { useI18n } from '@/i18n/I18nProvider';

/**
 * Slim editorial colophon bar displaying the official IAR Archive notice.
 */
export function TopAnnouncement() {
  const { t, translate } = useI18n();

  return (
    <div
      role="region"
      aria-label={translate('شريط الإعلان المؤسسي', 'Institutional announcement bar')}
      data-testid="top-announcement"
      className="w-full border-b hairline-border bg-secondary/60 text-secondary-foreground"
    >
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 shrink-0 rounded-full bg-primary"
          />
          <span
            id="txtAnnouncement"
            className="truncate font-medium tracking-wide text-foreground/90"
          >
            {t('txtAnnouncement')}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground font-mono">
          <span>IAR · BAGHDAD · 2026</span>
          <span aria-hidden="true" className="text-border">
            |
          </span>
          <span className="font-sans">
            {translate(
              'فهرسة مفتوحة · توثيق أكاديمي مباشر',
              'Open Indexing · Direct Academic Citation'
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
