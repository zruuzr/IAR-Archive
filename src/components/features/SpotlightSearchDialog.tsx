import { BookOpen, Compass, CornerDownLeft, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { HeritageFrieze, HeritageIcon } from '@/components/heritage';
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
  const { lang, t, getBookField } = useI18n();
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
      className="hx-dialog-backdrop fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:pt-20"
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
        className="hx-dialog-panel w-full max-w-2xl overflow-hidden"
      >
        <HeritageFrieze />
        <span id={titleId} className="sr-only">
          {t('spotlightSearch')}
        </span>
        <span id={descId} className="sr-only">
          {t('spotlightPlaceholder')}
        </span>

        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-[var(--hx-line)] px-4 py-3.5 bg-[var(--hx-surface-2)]">
          <Search
            className="size-4.5 shrink-0 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('spotlightPlaceholder')}
            autoComplete="off"
            spellCheck="false"
            data-testid="spotlight-input"
            className="flex-1 bg-transparent px-3 text-base text-[var(--hx-ink)] placeholder:text-[var(--hx-muted)] outline-hidden [&::-webkit-search-cancel-button]:hidden"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-lg p-1.5 text-[var(--hx-muted)] hover:bg-[var(--hx-surface)] hover:text-[var(--hx-ink)] transition-colors"
              aria-label={t('clearSearchAria')}
            >
              <X className="size-4" />
            </button>
          )}
          <kbd className="hx-kbd hidden sm:inline-flex">ESC</kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          role="listbox"
          className="max-h-[60vh] overflow-y-auto p-2 space-y-1 scroll-smooth"
        >
          {items.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="hx-state-seal" aria-hidden="true">
                <Search className="size-5" />
              </div>
              <p className="text-sm text-[var(--hx-muted)]">{t('spotlightNoResults')}</p>
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
                  className={cn(
                    'group flex items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-[var(--hx-surface-2)] border-[var(--hx-gold)] text-[var(--hx-ink)]'
                      : 'text-[var(--hx-ink)] border-transparent hover:bg-[var(--hx-surface-2)]/70'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-[9px] border text-xs transition-colors',
                        item.type === 'category'
                          ? 'border-[rgba(201,153,46,0.45)] bg-[var(--hx-gold-soft)] text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]'
                          : 'border-[var(--hx-line)] bg-[var(--hx-surface)] text-[var(--hx-lapis)] dark:text-[var(--hx-gold-bright)]'
                      )}
                    >
                      {item.type === 'category' ? (
                        <Compass className="size-4" />
                      ) : (
                        <BookOpen className="size-4" />
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-serif font-bold text-base text-[var(--hx-ink)] truncate leading-snug">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-[var(--hx-muted)] truncate leading-snug">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 text-xs font-medium flex items-center gap-1 transition-opacity',
                      isSelected
                        ? 'opacity-100 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]'
                        : 'opacity-0 sm:opacity-50 text-[var(--hx-muted)] group-hover:text-[var(--hx-ink)]'
                    )}
                  >
                    <CornerDownLeft className="size-3.5" />
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Guide */}
        <div className="hx-dialog-footer flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] text-[var(--hx-muted)]">
          <span className="hidden sm:inline">{t('spotlightHint')}</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)] font-semibold ms-auto">
            <HeritageIcon name="octagram" size={11} />
            <span>IAR ARCHIVE — المرجع الإداري العراقي</span>
          </span>
        </div>
      </div>
    </div>
  );
}
