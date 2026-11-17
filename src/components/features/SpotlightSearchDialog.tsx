import { BookOpen, Compass, CornerDownLeft, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog';
import { useI18n } from '@/i18n/I18nProvider';
import { normalizeSearchText } from '@/lib/arabic-search';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/services/catalog';
import type { Book, CategoryOption } from '@/types/book';

export interface SpotlightSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: readonly Book[];
  categories: readonly CategoryOption[];
  onSelectBook: (book: Book) => void;
  onSelectCategory: (categoryKey: string) => void;
}

interface SpotlightItem {
  type: 'book' | 'category';
  id: string;
  book?: Book;
  categoryKey?: string;
  title: string;
  subtitle?: string;
}

export function SpotlightSearchDialog({
  open,
  onOpenChange,
  books,
  categories,
  onSelectBook,
  onSelectCategory
}: SpotlightSearchDialogProps) {
  const { lang, t, translate, getBookField } = useI18n();
  const titleId = useId();
  const descId = useId();
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const dialogRef = useAccessibleDialog<HTMLDivElement>({
    open,
    onEscape: () => {
      setQuery('');
      setSelectedIndex(0);
      onOpenChange(false);
    },
    initialFocusRef: inputRef
  });

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Search logic
  const items = useMemo<SpotlightItem[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // If empty query, show top 5 popular categories + first 5 books
      const sampleCategories: SpotlightItem[] = categories.slice(0, 4).map((c) => ({
        type: 'category',
        id: `cat-${c.key}`,
        categoryKey: c.key,
        title: c.label,
        subtitle: t('spotlightCategories')
      }));

      const sampleBooks: SpotlightItem[] = books.slice(0, 6).map((b) => ({
        type: 'book',
        id: `book-${b.id}`,
        book: b,
        title: getBookField(b, 'title'),
        subtitle: `${getBookField(b, 'author')} • ${getCategoryLabel(b, lang)}`
      }));

      return [...sampleCategories, ...sampleBooks];
    }

    const norm = normalizeSearchText(trimmed, lang);
    const tokens = trimmed
      .split(/\s+/)
      .map((tok) => normalizeSearchText(tok, lang))
      .filter(Boolean);
    const results: SpotlightItem[] = [];

    // Matching categories
    for (const c of categories) {
      const cNorm = normalizeSearchText(`${c.label} ${c.key}`, lang);
      if (
        cNorm.includes(norm) ||
        (tokens.length > 0 && tokens.every((tok) => cNorm.includes(tok)))
      ) {
        results.push({
          type: 'category',
          id: `cat-${c.key}`,
          categoryKey: c.key,
          title: c.label,
          subtitle: t('spotlightCategories')
        });
        if (results.length >= 4) break;
      }
    }

    // Matching books
    for (const b of books) {
      const bTitle = getBookField(b, 'title');
      const bAuthor = getBookField(b, 'author');
      const bDesc = getBookField(b, 'description');
      const bCat = getCategoryLabel(b, lang);
      const fullText = `${bTitle} ${bAuthor} ${bDesc} ${bCat} ${b.keywords?.join(' ') || ''} ${b.title_en || ''} ${b.author_en || ''}`;
      const normHaystack = normalizeSearchText(fullText, lang);
      if (
        normHaystack.includes(norm) ||
        (tokens.length > 0 && tokens.every((tok) => normHaystack.includes(tok)))
      ) {
        results.push({
          type: 'book',
          id: `book-${b.id}`,
          book: b,
          title: bTitle,
          subtitle: `${bAuthor} • ${bCat}${b.year && b.year !== '0' ? ` (${b.year})` : ''}`
        });
      }
      if (results.length >= 25) break;
    }

    return results;
  }, [query, lang, categories, books, getBookField, t]);

  const safeSelectedIndex =
    items.length === 0 ? 0 : Math.min(selectedIndex, items.length - 1);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[safeSelectedIndex] as
      HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [safeSelectedIndex]);

  const handleSelect = (item: SpotlightItem) => {
    setQuery('');
    setSelectedIndex(0);
    onOpenChange(false);
    if (item.type === 'book' && item.book) {
      onSelectBook(item.book);
    } else if (item.type === 'category' && item.categoryKey) {
      onSelectCategory(item.categoryKey);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        items.length ? (prev - 1 + items.length) % items.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[safeSelectedIndex]) {
        handleSelect(items[safeSelectedIndex]);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      data-testid="spotlight-search-dialog"
      className="hx-modal hx-modal--top"
      onClick={() => onOpenChange(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="hx-modal-card max-w-2xl"
      >
        <span id={titleId} className="sr-only">
          {t('spotlightSearch')}
        </span>
        <span id={descId} className="sr-only">
          {t('spotlightPlaceholder')}
        </span>

        {/* Search Input Bar */}
        <div className="hx-spotdlg-bar">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('spotlightPlaceholder')}
            autoComplete="off"
            spellCheck="false"
            data-testid="spotlight-input"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="hx-modal-x"
              style={{ width: 30, height: 30 }}
              aria-label={t('clearSearchAria')}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <kbd className="hx-kbd hidden sm:inline-flex">ESC</kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} role="listbox" className="hx-spotdlg-list">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--hx-ink-soft)]">
              <Search className="mx-auto mb-2 size-8 opacity-40" aria-hidden="true" />
              {t('spotlightNoResults')}
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === safeSelectedIndex;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="hx-spotdlg-row"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={cn(
                        'hx-tile',
                        item.type === 'category' ? 'hx-tile--cat' : 'hx-tile--book'
                      )}
                    >
                      {item.type === 'category' ? (
                        <Compass aria-hidden="true" />
                      ) : (
                        <BookOpen aria-hidden="true" />
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="hx-spotdlg-title truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="hx-spotdlg-sub truncate">{item.subtitle}</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 flex items-center text-[var(--hx-link)] transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0 sm:opacity-40'
                    )}
                  >
                    <CornerDownLeft className="size-3.5" aria-hidden="true" />
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Guide */}
        <div className="hx-spotdlg-foot">
          <span className="hidden sm:inline">{t('spotlightHint')}</span>
          <span className="ms-auto flex items-center gap-2">
            <b dir="ltr">IAR ARCHIVE</b>
            <span>
              {translate('المرجع الإداري العراقي', 'Iraqi Administrative Reference')}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
