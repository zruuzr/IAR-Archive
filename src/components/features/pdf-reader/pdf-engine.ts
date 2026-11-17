import type { PDFDocumentProxy } from 'pdfjs-dist';
import { normalizeSearchText } from '@/lib/arabic-search';
import { resolveAssetUrl } from '@/services/catalog';
import type { Language } from '@/types/book';

export const PDFJS_WORKER_URL = '/pdfjs/pdf.worker.min.js';
export const PDFJS_CMAP_URL = '/pdfjs/cmaps/';
export const PDFJS_STANDARD_FONT_URL = '/pdfjs/standard_fonts/';

export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const ZOOM_STEPS = [
  0.4, 0.5, 0.65, 0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2, 2.5, 3
] as const;

export type PdfZoomMode = 'fit-width' | 'fit-page' | number;
export type PdfLayoutMode = 'continuous' | 'single' | 'book';
export type PdfPaperMode = 'original' | 'parchment' | 'night';
export type PdfSidebarTab = 'thumbnails' | 'outline' | 'bookmarks' | 'info';

export interface PdfOutlineNode {
  id: string;
  title: string;
  pageNumber: number | null;
  items: PdfOutlineNode[];
}

export interface PdfSearchHit {
  pageNumber: number;
  count: number;
}

type PdfJsModule = typeof import('pdfjs-dist');
let pdfJsPromise: Promise<PdfJsModule> | null = null;

/**
 * Dynamically loads the self-hosted `pdfjs-dist` engine on demand and configures
 * its local worker URL (`/pdfjs/pdf.worker.min.js`) so the initial catalog bundle
 * stays fast and zero external Mozilla UI dependencies are ever requested.
 */
export async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist').then((mod) => {
      if (typeof window !== 'undefined' && mod.GlobalWorkerOptions) {
        mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      }
      return mod;
    });
  }
  return pdfJsPromise;
}

/**
 * Resolves a book's `file_path` and strictly verifies that the resulting URL uses
 * `http:` or `https:` without embedded credentials.
 *
 * Preserves the GitHub Raw conversion defined in `src/services/catalog.ts` while
 * blocking `file:`, `javascript:`, `data:`, or malformed URLs.
 */
export function resolveSafePdfUrl(filePath: unknown, baseHref?: string): string | null {
  const resolved = resolveAssetUrl(filePath, true, baseHref);
  if (!resolved) return null;

  try {
    const parsed = new URL(resolved);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function clampPageNumber(page: number, totalPages: number): number {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return 1;
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.min(Math.trunc(page), Math.trunc(totalPages)));
}

export interface ComputePageScaleOptions {
  zoom: PdfZoomMode;
  baseWidth: number;
  baseHeight: number;
  stageWidth: number;
  stageHeight: number;
  layoutMode: PdfLayoutMode;
  isSpreadPair?: boolean;
}

/**
 * Computes rendered CSS pixel scale for a PDF page given current zoom mode,
 * rotated base dimensions, and available reader stage size.
 */
export function computePageScale({
  zoom,
  baseWidth,
  baseHeight,
  stageWidth,
  stageHeight,
  layoutMode,
  isSpreadPair = false
}: ComputePageScaleOptions): number {
  if (typeof zoom === 'number') {
    return Math.max(0.35, Math.min(3, zoom));
  }

  const safeW = Math.max(180, stageWidth || 720);
  const safeH = Math.max(240, stageHeight || 620);
  const bw = Math.max(1, baseWidth);
  const bh = Math.max(1, baseHeight);

  const horizontalGutter = safeW < 640 ? 20 : 48;
  const verticalGutter = safeW < 640 ? 28 : 44;

  if (zoom === 'fit-page') {
    const availW =
      layoutMode === 'book' && isSpreadPair
        ? Math.max(120, (safeW - horizontalGutter - 18) / 2)
        : Math.max(140, safeW - horizontalGutter);
    const availH = Math.max(180, safeH - verticalGutter);
    const raw = Math.min(availW / bw, availH / bh);
    return Math.max(0.35, Math.min(2.4, raw));
  }

  // fit-width: fills mobile cleanly and caps ultra-wide desktop line measure comfortably
  const maxComfortWidth = layoutMode === 'book' && isSpreadPair ? 1060 : 880;
  const targetStageW = Math.min(Math.max(140, safeW - horizontalGutter), maxComfortWidth);
  const availW =
    layoutMode === 'book' && isSpreadPair
      ? Math.max(120, (targetStageW - 18) / 2)
      : targetStageW;

  const raw = availW / bw;
  return Math.max(0.35, Math.min(2.2, raw));
}

export function stepZoom(currentScale: number, direction: 'in' | 'out'): number {
  const safe = Number.isFinite(currentScale) && currentScale > 0 ? currentScale : 1;
  if (direction === 'in') {
    const next = ZOOM_STEPS.find((step) => step > safe + 0.03);
    return next ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i -= 1) {
    if (ZOOM_STEPS[i] < safe - 0.03) {
      return ZOOM_STEPS[i];
    }
  }
  return ZOOM_STEPS[0];
}

/**
 * Builds codex-style spread groupings for 2-page book view:
 * Cover page [1], then facing pairs [2, 3], [4, 5], ...
 */
export function buildBookSpreads(totalPages: number): number[][] {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return [];
  const spreads: number[][] = [[1]];
  for (let page = 2; page <= totalPages; page += 2) {
    if (page + 1 <= totalPages) {
      spreads.push([page, page + 1]);
    } else {
      spreads.push([page]);
    }
  }
  return spreads;
}

export function getSpreadForPage(totalPages: number, pageNumber: number): number[] {
  const safePage = clampPageNumber(pageNumber, totalPages);
  if (safePage === 1 || totalPages <= 1) return [1];
  const pairStart = safePage % 2 === 0 ? safePage : safePage - 1;
  return pairStart + 1 <= totalPages ? [pairStart, pairStart + 1] : [pairStart];
}

async function resolveDestPageNumber(
  pdfDoc: PDFDocumentProxy,
  dest: unknown
): Promise<number | null> {
  try {
    let explicitDest: unknown[] | null = null;
    if (typeof dest === 'string') {
      explicitDest = await pdfDoc.getDestination(dest);
    } else if (Array.isArray(dest)) {
      explicitDest = dest;
    }
    if (!explicitDest || !explicitDest[0]) return null;
    const ref = explicitDest[0];
    if (typeof ref === 'number') {
      return clampPageNumber(ref + 1, pdfDoc.numPages);
    }
    if (typeof ref === 'object' && ref !== null) {
      const idx = await pdfDoc.getPageIndex(ref as never);
      return clampPageNumber(idx + 1, pdfDoc.numPages);
    }
    return null;
  } catch {
    return null;
  }
}

type RawOutlineItem = {
  title: string;
  dest: string | unknown[] | null;
  items: RawOutlineItem[];
};

/**
 * Extracts and resolves hierarchical PDF outline bookmarks into 1-based page numbers.
 */
export async function resolvePdfOutline(
  pdfDoc: PDFDocumentProxy
): Promise<PdfOutlineNode[]> {
  try {
    const rawOutline = (await pdfDoc.getOutline()) as RawOutlineItem[] | null;
    if (!rawOutline || rawOutline.length === 0) return [];

    const walk = async (
      nodes: RawOutlineItem[],
      prefix: string
    ): Promise<PdfOutlineNode[]> => {
      const resolved: PdfOutlineNode[] = [];
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const id = `${prefix}-${i}`;
        const pageNumber = node.dest
          ? await resolveDestPageNumber(pdfDoc, node.dest)
          : null;
        const children =
          Array.isArray(node.items) && node.items.length > 0
            ? await walk(node.items, id)
            : [];
        resolved.push({
          id,
          title: (node.title || '').trim() || `Section ${i + 1}`,
          pageNumber,
          items: children
        });
      }
      return resolved;
    };

    return walk(rawOutline, 'outline');
  } catch {
    return [];
  }
}

/**
 * Counts how many text spans/items on a page match the normalized Arabic/English query.
 */
export function countNormalizedTextMatches(
  text: string,
  normalizedQuery: string,
  lang: Language
): number {
  if (!normalizedQuery) return 0;
  const hay = normalizeSearchText(text, lang);
  if (!hay || !hay.includes(normalizedQuery)) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = hay.indexOf(normalizedQuery, idx)) !== -1) {
    count += 1;
    idx += Math.max(1, normalizedQuery.length);
  }
  return count;
}

export const PDF_READING_STATE_KEY = 'iar_pdf_reading_state_v1';
export const OFFLINE_PDF_CACHE_NAME = 'iar-offline-pdfs-v1';

export interface PdfBookReadingState {
  page: number;
  paperMode: PdfPaperMode;
  layoutMode: PdfLayoutMode;
  zoom: PdfZoomMode;
  bookmarks: number[];
  updatedAt: number;
}

function readAllReadingStates(): Record<string, PdfBookReadingState> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(PDF_READING_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, PdfBookReadingState>;
  } catch {
    return {};
  }
}

function writeAllReadingStates(map: Record<string, PdfBookReadingState>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PDF_READING_STATE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota errors
  }
}

export function loadBookReadingState(bookId: number): PdfBookReadingState | null {
  if (!Number.isFinite(bookId)) return null;
  const all = readAllReadingStates();
  const entry = all[String(bookId)];
  if (!entry || typeof entry !== 'object') return null;

  const page =
    typeof entry.page === 'number' && Number.isFinite(entry.page) && entry.page >= 1
      ? Math.trunc(entry.page)
      : 1;
  const paperMode: PdfPaperMode =
    entry.paperMode === 'parchment' || entry.paperMode === 'night'
      ? entry.paperMode
      : 'original';
  const layoutMode: PdfLayoutMode =
    entry.layoutMode === 'single' || entry.layoutMode === 'book'
      ? entry.layoutMode
      : 'continuous';
  const zoom: PdfZoomMode =
    entry.zoom === 'fit-page' ||
    entry.zoom === 'fit-width' ||
    (typeof entry.zoom === 'number' &&
      Number.isFinite(entry.zoom) &&
      entry.zoom >= 0.35 &&
      entry.zoom <= 3)
      ? entry.zoom
      : 'fit-width';
  const bookmarks = Array.isArray(entry.bookmarks)
    ? [
        ...new Set(
          entry.bookmarks
            .filter(
              (n): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 1
            )
            .map((n) => Math.trunc(n))
        )
      ].sort((a, b) => a - b)
    : [];

  return {
    page,
    paperMode,
    layoutMode,
    zoom,
    bookmarks,
    updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : 0
  };
}

export function saveBookReadingState(
  bookId: number,
  patch: Partial<Omit<PdfBookReadingState, 'updatedAt'>>
): PdfBookReadingState {
  const existing = loadBookReadingState(bookId) ?? {
    page: 1,
    paperMode: 'original' as PdfPaperMode,
    layoutMode: 'continuous' as PdfLayoutMode,
    zoom: 'fit-width' as PdfZoomMode,
    bookmarks: [],
    updatedAt: 0
  };

  const next: PdfBookReadingState = {
    page:
      typeof patch.page === 'number' && Number.isFinite(patch.page) && patch.page >= 1
        ? Math.trunc(patch.page)
        : existing.page,
    paperMode: patch.paperMode ?? existing.paperMode,
    layoutMode: patch.layoutMode ?? existing.layoutMode,
    zoom: patch.zoom ?? existing.zoom,
    bookmarks: Array.isArray(patch.bookmarks)
      ? [
          ...new Set(
            patch.bookmarks
              .filter((n) => Number.isFinite(n) && n >= 1)
              .map((n) => Math.trunc(n))
          )
        ].sort((a, b) => a - b)
      : existing.bookmarks,
    updatedAt: Date.now()
  };

  const all = readAllReadingStates();
  all[String(bookId)] = next;
  writeAllReadingStates(all);
  return next;
}

export function toggleBookPageBookmark(bookId: number, pageNumber: number): number[] {
  const safePage = Math.max(1, Math.trunc(pageNumber || 1));
  const current = loadBookReadingState(bookId)?.bookmarks ?? [];
  const exists = current.includes(safePage);
  const nextBookmarks = exists
    ? current.filter((p) => p !== safePage)
    : [...current, safePage].sort((a, b) => a - b);
  saveBookReadingState(bookId, { bookmarks: nextBookmarks });
  return nextBookmarks;
}

export async function isPdfSavedOffline(safeUrl: string | null): Promise<boolean> {
  if (!safeUrl || typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(OFFLINE_PDF_CACHE_NAME);
    const match = await cache.match(safeUrl);
    return Boolean(match);
  } catch {
    return false;
  }
}

export async function togglePdfOfflineCache(safeUrl: string | null): Promise<boolean> {
  if (!safeUrl || typeof caches === 'undefined') return false;
  const cache = await caches.open(OFFLINE_PDF_CACHE_NAME);
  const existing = await cache.match(safeUrl);
  if (existing) {
    await cache.delete(safeUrl);
    return false;
  }
  const response = await fetch(safeUrl, { mode: 'cors' });
  if (!response.ok && response.type !== 'opaque') {
    throw new Error(`Failed to fetch PDF for offline cache (${response.status})`);
  }
  await cache.put(safeUrl, response);
  return true;
}
