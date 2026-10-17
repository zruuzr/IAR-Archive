import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { getBookField as getBookFieldForLang } from '@/services/catalog';
import type { Book, BookLocalizedField, Language } from '@/types/book';
import { ar, type TranslationDictionary, type TranslationKey } from './locales/ar';
import { en } from './locales/en';

export const LANG_STORAGE_KEY = 'iar_lang';

const DICTIONARIES: Record<Language, TranslationDictionary> = {
  ar,
  en
};

export type TextDirection = 'rtl' | 'ltr';

export interface I18nContextValue {
  lang: Language;
  dir: TextDirection;
  isRTL: boolean;
  dictionary: TranslationDictionary;
  setLang: (next: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
  translate: (arText: string, enText: string) => string;
  getBookField: (
    book: Pick<Book, BookLocalizedField | `${BookLocalizedField}_en`>,
    fieldName: BookLocalizedField
  ) => string;
  formatNumber: (value: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'en' || stored === 'ar') {
      return stored;
    }
  } catch {
    // Ignore storage access errors (private mode / disabled storage)
  }

  if (typeof document !== 'undefined' && document.documentElement?.lang === 'en') {
    return 'en';
  }

  return 'ar';
}

export function applyDocumentLanguage(lang: Language): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const dir: TextDirection = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', dir);
}

export function formatLocalizedNumber(value: number, lang: Language = 'ar'): string {
  const locale = lang === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  return new Intl.NumberFormat(locale).format(value);
}

export interface I18nProviderProps {
  children: ReactNode;
  initialLang?: Language;
}

export function I18nProvider({ children, initialLang }: I18nProviderProps) {
  const [lang, setLangState] = useState<Language>(
    () => initialLang ?? readStoredLanguage()
  );

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    const normalized: Language = next === 'en' ? 'en' : 'ar';
    setLangState(normalized);
    applyDocumentLanguage(normalized);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Language = prev === 'ar' ? 'en' : 'ar';
      applyDocumentLanguage(next);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LANG_STORAGE_KEY) return;
      const next: Language = event.newValue === 'en' ? 'en' : 'ar';
      setLangState(next);
      applyDocumentLanguage(next);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = DICTIONARIES[lang];
    const dir: TextDirection = lang === 'ar' ? 'rtl' : 'ltr';

    return {
      lang,
      dir,
      isRTL: lang === 'ar',
      dictionary,
      setLang,
      toggleLang,
      t: (key: TranslationKey) => dictionary[key],
      translate: (arText: string, enText: string) => (lang === 'ar' ? arText : enText),
      getBookField: (book, fieldName) => getBookFieldForLang(book, fieldName, lang),
      formatNumber: (num: number) => formatLocalizedNumber(num, lang)
    };
  }, [lang, setLang, toggleLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
