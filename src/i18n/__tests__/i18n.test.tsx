// @vitest-environment jsdom
import { type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, LANG_STORAGE_KEY, useI18n } from '@/i18n/I18nProvider';
import { ar, type TranslationKey } from '@/i18n/locales/ar';
import { en } from '@/i18n/locales/en';
import { normalizeBook } from '@/services/catalog';

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('i18n — Arabic and English locale dictionaries', () => {
  it('contains identical keys and non-empty string values in both ar and en dictionaries', () => {
    const arKeys = Object.keys(ar).sort();
    const enKeys = Object.keys(en).sort();

    expect(arKeys).toEqual(enKeys);
    expect(arKeys.length).toBeGreaterThanOrEqual(75);

    for (const key of arKeys as TranslationKey[]) {
      expect(typeof ar[key]).toBe('string');
      expect(ar[key].trim().length).toBeGreaterThan(0);
      expect(typeof en[key]).toBe('string');
      expect(en[key].trim().length).toBeGreaterThan(0);
    }
  });
});

describe('i18n — I18nProvider & useI18n hook', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  });

  it('defaults to Arabic (RTL) when no preference is stored and syncs documentElement', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.lang).toBe('ar');
    expect(result.current.dir).toBe('rtl');
    expect(result.current.isRTL).toBe(true);
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(result.current.t('txtSubtitle')).toBe('الأرشيف الإداري العراقي');
  });

  it('restores English (LTR) from localStorage iar_lang and ignores invalid values', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'en');
    const { result, unmount } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.lang).toBe('en');
    expect(result.current.dir).toBe('ltr');
    expect(result.current.isRTL).toBe(false);
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(result.current.t('txtSubtitle')).toBe('Iraqi Administrative Reference');
    unmount();

    localStorage.setItem(LANG_STORAGE_KEY, 'invalid-locale');
    document.documentElement.lang = 'ar';
    const fallbackHook = renderHook(() => useI18n(), { wrapper });
    expect(fallbackHook.result.current.lang).toBe('ar');
    expect(fallbackHook.result.current.dir).toBe('rtl');
  });

  it('toggles between RTL and LTR, updates DOM attributes, and persists to localStorage', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    act(() => {
      result.current.toggleLang();
    });

    expect(result.current.lang).toBe('en');
    expect(result.current.dir).toBe('ltr');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    act(() => {
      result.current.setLang('ar');
    });

    expect(result.current.lang).toBe('ar');
    expect(result.current.dir).toBe('rtl');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('provides localized book field lookup with Arabic fallback and localized number formatting', () => {
    const book = normalizeBook(
      {
        id: 10,
        title: 'عنوان عربي',
        title_en: 'English Title',
        author: 'مؤلف بالعربية فقط',
        author_en: '',
        file_path: 'pdf/10.pdf'
      },
      { baseHref: 'http://localhost/' }
    )!;

    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.getBookField(book, 'title')).toBe('عنوان عربي');
    expect(result.current.formatNumber(1234)).toBe(
      new Intl.NumberFormat('ar-u-nu-latn').format(1234)
    );

    act(() => {
      result.current.setLang('en');
    });

    expect(result.current.getBookField(book, 'title')).toBe('English Title');
    // Falls back to Arabic author when author_en is empty
    expect(result.current.getBookField(book, 'author')).toBe('مؤلف بالعربية فقط');
    expect(result.current.formatNumber(1234)).toBe('1,234');
  });

  it('synchronizes language when a storage event occurs for iar_lang', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.lang).toBe('ar');

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: LANG_STORAGE_KEY,
          newValue: 'en'
        })
      );
    });

    expect(result.current.lang).toBe('en');
    expect(result.current.dir).toBe('ltr');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
