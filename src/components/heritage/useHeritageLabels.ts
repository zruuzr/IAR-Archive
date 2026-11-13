import { useI18n } from '@/i18n/I18nProvider';
import { getHeritageLabels, type HeritageLabels } from './heritage-labels';

/** Heritage labels in the language the visitor chose (follows the site's `useI18n`). */
export function useHeritageLabels(): HeritageLabels {
  return getHeritageLabels(useI18n().lang);
}
