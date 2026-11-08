import { useI18n } from '@/i18n/I18nProvider';
import { AN_SIGN } from '@/components/heritage';

/**
 * Top Babylonian / Sumerian heritage announcement bar.
 * Built with `.hx-announce` + `AN_SIGN` cuneiform wedges and i18n text.
 */
export function TopAnnouncement() {
  const { t } = useI18n();

  return (
    <div data-testid="top-announcement" className="hx-announce" role="note">
      <span data-testid="top-ishtar-frieze" className="sr-only" />
      <span className="hx-cune" aria-hidden="true">
        {AN_SIGN}
      </span>
      <span id="txtAnnouncement">{t('txtAnnouncement')}</span>
      <span className="hx-cune" aria-hidden="true">
        {AN_SIGN}
      </span>
    </div>
  );
}
