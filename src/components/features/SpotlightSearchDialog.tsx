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
          subtitle: `${bAuthor} • ${bCat} (${b.year || ''})`
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
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:pt-20 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
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
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-primary/30 bg-card text-card-foreground shadow-2xl ring-1 ring-primary/20 animate-in zoom-in-95 duration-200"
      >
        <span id={titleId} className="sr-only">
          {t('spotlightSearch')}
        </span>
        <span id={descId} className="sr-only">
          {t('spotlightPlaceholder')}
        </span>

        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-border/80 px-4 py-3.5 bg-secondary/30">
          <Search className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('spotlightPlaceholder')}
            autoComplete="off"
            spellCheck="false"
            data-testid="spotlight-input"
            className="flex-1 bg-transparent px-3 text-base text-foreground placeholder:text-muted-foreground outline-hidden"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={t('clearSearchAria')}
            >
              <X className="size-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          role="listbox"
          className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-border/30 scroll-smooth"
        >
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Search className="mx-auto mb-2 size-8 opacity-40 text-muted-foreground" />
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
                  className={cn(
                    'group flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary/15 text-foreground ring-1 ring-primary/40'
                      : 'text-foreground hover:bg-secondary/60'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs transition-colors',
                        item.type === 'category'
                          ? 'border-teal/40 bg-teal/10 text-teal'
                          : 'border-primary/40 bg-primary/10 text-primary'
                      )}
                    >
                      {item.type === 'category' ? (
                        <Compass className="size-4" />
                      ) : (
                        <BookOpen className="size-4" />
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm truncate leading-snug">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate leading-snug">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 text-xs font-medium text-muted-foreground group-hover:text-primary flex items-center gap-1 transition-opacity',
                      isSelected ? 'opacity-100 text-primary' : 'opacity-0 sm:opacity-50'
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
        <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="hidden sm:inline">{t('spotlightHint')}</span>
          <span className="text-primary font-medium tracking-wide ms-auto">
            IAR Archive · 2026
          </span>
        </div>
      </div>
    </div>
  );
}
