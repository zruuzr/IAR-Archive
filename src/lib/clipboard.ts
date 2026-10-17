import { buildBookUrl } from '@/hooks/useBundle';
import { getBookField } from '@/services/catalog';
import type { Book, Language } from '@/types/book';

/**
 * Copies text to the clipboard using the modern Clipboard API when available,
 * falling back to an offscreen `<textarea>` and `document.execCommand('copy')`
 * in non-secure or restricted environments.
 *
 * Returns `true` when copied successfully, or `false` if both mechanisms fail.
 */
export async function copyTextToClipboard(value: string): Promise<boolean> {
  if (!value) return false;

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to legacy textarea fallback
  }

  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.top = '-1000px';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } finally {
      helper.remove();
    }
    return Boolean(success);
  } catch {
    return false;
  }
}

export type ShareBookOutcome = 'shared' | 'copied' | 'aborted' | 'failed';

/**
 * Shares a reference link via the Web Share API (`navigator.share`) when supported,
 * or falls back to copying `${title}\n${url}` to the clipboard (matching `share(book)` in `js/ui-helpers.js`).
 */
export async function shareBookLink(
  book: Pick<Book, 'id' | 'title' | 'title_en' | 'author' | 'author_en'>,
  lang: Language = 'ar'
): Promise<ShareBookOutcome> {
  const url = buildBookUrl(book.id);
  const title = lang === 'en' && book.title_en ? book.title_en : book.title;
  const author = lang === 'en' && book.author_en ? book.author_en : book.author;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text: author || title,
        url
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'aborted';
      }
      // Fall back to clipboard copy on non-abort share failure
    }
  }

  const copied = await copyTextToClipboard(`${title}\n${url}`);
  return copied ? 'copied' : 'failed';
}

export { getBookField };
