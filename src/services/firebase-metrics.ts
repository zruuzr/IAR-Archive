/* ============================================================
   IAR Archive — Firebase Metrics, Visits & Download Counter Service
   TypeScript port of loadMetrics() in js/data-fetch.js and
   download counter increment in js/download.js using Firebase Modular SDK.
   ============================================================ */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  runTransaction,
  setDoc,
  type Firestore
} from 'firebase/firestore';
import { finite } from '@/services/catalog';
import {
  connectFirebase,
  DEFAULT_FIRESTORE_TIMEOUT_MS,
  withTimeout,
  type ConnectFirebaseOptions
} from '@/services/firebase';
import type { Book, BookMetrics } from '@/types/book';

export const RATINGS_COLLECTION = 'ratings';
export const DOWNLOADS_COLLECTION = 'downloads';
export const STATS_COLLECTION = 'stats';
export const VISITS_DOC_ID = 'visits';

export const LAST_VISIT_STORAGE_KEY = 'iar_last_visit';
export const VISIT_COOLDOWN_MS = 86_400_000; // 24 hours in milliseconds

export interface FirestoreMetricsDeps {
  collectionImpl?: typeof collection;
  docImpl?: typeof doc;
  getDocsImpl?: typeof getDocs;
  getDocImpl?: typeof getDoc;
  setDocImpl?: typeof setDoc;
  runTransactionImpl?: typeof runTransaction;
  incrementImpl?: typeof increment;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadedBookMetricsResult {
  byBookId: Map<number, Partial<BookMetrics>>;
  ratingsLoaded: boolean;
  downloadsLoaded: boolean;
  errors: string[];
}

export interface CatalogMetricsSnapshot extends LoadedBookMetricsResult {
  visitsCount: number | null;
  firebaseReady: boolean;
  authenticated: boolean;
}

export interface LoadBookMetricsOptions {
  timeoutMs?: number;
  deps?: FirestoreMetricsDeps;
}

export interface SiteVisitOptions {
  uid?: string | null;
  allowIncrement?: boolean;
  now?: number;
  timeoutMs?: number;
  storage?: StorageLike | null;
  deps?: FirestoreMetricsDeps;
}

export interface LoadCatalogMetricsOptions extends ConnectFirebaseOptions {
  db?: Firestore | null;
  uid?: string | null;
  allowVisitIncrement?: boolean;
  now?: number;
  timeoutMs?: number;
  storage?: StorageLike | null;
  firestoreDeps?: FirestoreMetricsDeps;
}

export interface RecordDownloadOptions {
  /**
   * Must be explicitly `true` (indicating the file stream/blob completed and was dispatched)
   * before incrementing the Firestore counter. Mirrors `js/download.js` lines 133-153.
   */
  completed: boolean;
  aborted?: boolean;
  db?: Firestore | null;
  uid?: string | null;
  timeoutMs?: number;
  deps?: FirestoreMetricsDeps;
}

export type RecordDownloadSkipReason =
  | 'INVALID_BOOK_ID'
  | 'DOWNLOAD_NOT_COMPLETED'
  | 'DOWNLOAD_ABORTED'
  | 'FIREBASE_UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'WRITE_FAILED';

export interface RecordDownloadResult {
  ok: boolean;
  skipped: boolean;
  reason: RecordDownloadSkipReason | null;
  downloadCount: number | null;
  error: string | null;
}

function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readStorageItem(storage: StorageLike | null, key: string): string {
  if (!storage) return '';
  try {
    return storage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStorageItem(storage: StorageLike | null, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write errors (e.g. Safari private mode / quota exceeded)
  }
}

/**
 * Parses a raw Firestore document from `downloads/{bookId}` into a safe `downloadCount`.
 * Guarantees a non-negative finite integer and never returns `NaN`.
 */
export function parseDownloadMetricDoc(
  data: Record<string, unknown> | null | undefined
): Pick<BookMetrics, 'downloadCount'> {
  if (!data || typeof data !== 'object') {
    return { downloadCount: 0 };
  }
  return {
    downloadCount: Math.trunc(finite(data.count))
  };
}

/**
 * Parses a raw Firestore document from `ratings/{bookId}` into safe rating metrics.
 * Guarantees non-negative finite numbers, clamps `publicRating` to `[0, 5]`,
 * and filters `voters` to string UIDs only — matching `js/data-fetch.js` lines 34-40.
 */
export function parseRatingMetricDoc(
  data: Record<string, unknown> | null | undefined
): Pick<BookMetrics, 'ratingSum' | 'ratingCount' | 'publicRating' | 'voters'> {
  if (!data || typeof data !== 'object') {
    return {
      ratingSum: 0,
      ratingCount: 0,
      publicRating: 0,
      voters: []
    };
  }

  const ratingSum = Math.trunc(finite(data.ratingSum));
  const ratingCount = Math.trunc(finite(data.ratingCount));
  const publicRating = Math.min(5, finite(data.average));
  const voters = Array.isArray(data.voters)
    ? data.voters.filter((v): v is string => typeof v === 'string')
    : [];

  return {
    ratingSum,
    ratingCount,
    publicRating,
    voters
  };
}

/**
 * Loads `ratings` and `downloads` collections in parallel using `Promise.allSettled`.
 * Partial failure of one collection does not discard data from the other.
 */
export async function loadBookMetricsFromFirestore(
  db: Firestore,
  options: LoadBookMetricsOptions = {}
): Promise<LoadedBookMetricsResult> {
  const { timeoutMs = DEFAULT_FIRESTORE_TIMEOUT_MS, deps } = options;
  const collectionFn = deps?.collectionImpl ?? collection;
  const getDocsFn = deps?.getDocsImpl ?? getDocs;

  const byBookId = new Map<number, Partial<BookMetrics>>();
  const errors: string[] = [];
  let ratingsLoaded = false;
  let downloadsLoaded = false;

  const collectionNames = [RATINGS_COLLECTION, DOWNLOADS_COLLECTION] as const;

  const results = await Promise.allSettled(
    collectionNames.map(async (name) => {
      const colRef = collectionFn(db, name);
      const snapshot = await withTimeout(getDocsFn(colRef), timeoutMs);
      return { name, snapshot };
    })
  );

  for (const res of results) {
    if (res.status === 'rejected') {
      errors.push(res.reason instanceof Error ? res.reason.message : String(res.reason));
      continue;
    }

    const { name, snapshot } = res.value;
    if (name === RATINGS_COLLECTION) {
      ratingsLoaded = true;
    } else if (name === DOWNLOADS_COLLECTION) {
      downloadsLoaded = true;
    }

    snapshot.forEach((docSnap) => {
      const numericId = Number(docSnap.id);
      if (!Number.isSafeInteger(numericId) || numericId < 0) return;

      const rawData = (docSnap.data() ?? {}) as Record<string, unknown>;
      const existing = byBookId.get(numericId) ?? {};

      if (name === DOWNLOADS_COLLECTION) {
        const parsed = parseDownloadMetricDoc(rawData);
        byBookId.set(numericId, {
          ...existing,
          ...parsed
        });
      } else {
        const parsed = parseRatingMetricDoc(rawData);
        byBookId.set(numericId, {
          ...existing,
          ...parsed
        });
      }
    });
  }

  return {
    byBookId,
    ratingsLoaded,
    downloadsLoaded,
    errors
  };
}

/**
 * Reads or increments the site visits counter in `stats/visits`.
 *
 * Matches `js/data-fetch.js` lines 48-70 and `firestore.rules` lines 114-129:
 * - Only increments via a Firestore transaction when:
 *   1. `allowIncrement` is not `false`
 *   2. A signed-in user `uid` is present (`request.auth != null` in `firestore.rules`)
 *   3. More than 24 hours (`86_400_000` ms) have elapsed since `iar_last_visit` in `localStorage`.
 * - Otherwise performs a read-only `getDoc` on `stats/visits`.
 * - Returns `null` on failure so the UI can safely display `'—'`.
 */
export async function recordOrLoadSiteVisit(
  db: Firestore,
  options: SiteVisitOptions = {}
): Promise<number | null> {
  const {
    uid = null,
    allowIncrement = true,
    now = Date.now(),
    timeoutMs = DEFAULT_FIRESTORE_TIMEOUT_MS,
    storage = getDefaultStorage(),
    deps
  } = options;

  const docFn = deps?.docImpl ?? doc;
  const getDocFn = deps?.getDocImpl ?? getDoc;
  const runTransactionFn = deps?.runTransactionImpl ?? runTransaction;

  try {
    const visitsRef = docFn(db, STATS_COLLECTION, VISITS_DOC_ID);
    const lastVisit = finite(readStorageItem(storage, LAST_VISIT_STORAGE_KEY) || '0');
    const shouldIncrement =
      allowIncrement && Boolean(uid) && now - lastVisit > VISIT_COOLDOWN_MS;

    if (shouldIncrement) {
      const nextCount = await withTimeout(
        runTransactionFn(db, async (transaction) => {
          const visitDoc = await transaction.get(visitsRef);
          const rawData = visitDoc.data() as Record<string, unknown> | undefined;
          const next = Math.trunc(finite(rawData?.count)) + 1;
          transaction.set(visitsRef, { count: next }, { merge: true });
          return next;
        }),
        timeoutMs
      );

      writeStorageItem(storage, LAST_VISIT_STORAGE_KEY, String(now));
      return Math.trunc(finite(nextCount));
    }

    const visitDoc = await withTimeout(getDocFn(visitsRef), timeoutMs);
    const rawData = visitDoc.data() as Record<string, unknown> | undefined;
    return Math.trunc(finite(rawData?.count));
  } catch {
    return null;
  }
}

/**
 * Read-only helper for fetching the current site visits count without incrementing.
 * Safe to call in testbenches, previews, and unauthenticated sessions.
 */
export async function loadSiteVisitsReadOnly(
  db: Firestore,
  options: Omit<SiteVisitOptions, 'allowIncrement'> = {}
): Promise<number | null> {
  return recordOrLoadSiteVisit(db, {
    ...options,
    allowIncrement: false
  });
}

/**
 * Full equivalent of `loadMetrics()` in `js/data-fetch.js`.
 * Connects to Firebase (or uses an injected `db` instance), fetches `ratings` and `downloads`
 * snapshots, and loads/records `stats/visits`.
 *
 * Never throws when Firebase is unavailable; returns a safe snapshot so `books.json` remains intact.
 */
export async function loadCatalogMetrics(
  options: LoadCatalogMetricsOptions = {}
): Promise<CatalogMetricsSnapshot> {
  const {
    db: injectedDb,
    uid: injectedUid,
    allowVisitIncrement = true,
    now,
    timeoutMs = DEFAULT_FIRESTORE_TIMEOUT_MS,
    storage,
    firestoreDeps,
    ...connectOptions
  } = options;

  let db = injectedDb ?? null;
  let uid = injectedUid ?? null;
  let authenticated = Boolean(uid);
  const initialErrors: string[] = [];

  if (!db) {
    const conn = await connectFirebase(connectOptions);
    db = conn.db;
    uid = injectedUid !== undefined ? injectedUid : conn.uid;
    authenticated = conn.authenticated;
    if (conn.error) {
      initialErrors.push(conn.error.message);
    }
  }

  if (!db) {
    return {
      byBookId: new Map(),
      ratingsLoaded: false,
      downloadsLoaded: false,
      visitsCount: null,
      firebaseReady: false,
      authenticated: false,
      errors:
        initialErrors.length > 0 ? initialErrors : ['Firebase Firestore is unavailable']
    };
  }

  const metricsResult = await loadBookMetricsFromFirestore(db, {
    timeoutMs,
    deps: firestoreDeps
  });

  const visitsCount = await recordOrLoadSiteVisit(db, {
    uid,
    allowIncrement: allowVisitIncrement,
    now,
    timeoutMs,
    storage,
    deps: firestoreDeps
  });

  return {
    byBookId: metricsResult.byBookId,
    ratingsLoaded: metricsResult.ratingsLoaded,
    downloadsLoaded: metricsResult.downloadsLoaded,
    visitsCount,
    firebaseReady: true,
    authenticated,
    errors: [...initialErrors, ...metricsResult.errors]
  };
}

/**
 * Increments the download counter for a book in `downloads/{bookId}` ONLY after the file
 * download has completed (`completed === true` and `!aborted`).
 *
 * Matches `js/download.js` lines 145-153 and `firestore.rules` lines 96-112:
 * - Writes `{ count: increment(1) }` with `{ merge: true }` to `downloads/{String(bookId)}`.
 * - Reads back the updated document to return the authoritative `downloadCount`.
 * - Never throws on network or permission failure; returns a structured `RecordDownloadResult`.
 */
export async function recordBookDownload(
  bookId: number,
  options: RecordDownloadOptions
): Promise<RecordDownloadResult> {
  const {
    completed,
    aborted = false,
    db,
    uid,
    timeoutMs = DEFAULT_FIRESTORE_TIMEOUT_MS,
    deps
  } = options;

  if (!Number.isSafeInteger(bookId) || bookId < 0) {
    return {
      ok: false,
      skipped: true,
      reason: 'INVALID_BOOK_ID',
      downloadCount: null,
      error: 'Invalid book ID'
    };
  }

  if (aborted) {
    return {
      ok: false,
      skipped: true,
      reason: 'DOWNLOAD_ABORTED',
      downloadCount: null,
      error: null
    };
  }

  if (completed !== true) {
    return {
      ok: false,
      skipped: true,
      reason: 'DOWNLOAD_NOT_COMPLETED',
      downloadCount: null,
      error: null
    };
  }

  if (!db) {
    return {
      ok: false,
      skipped: true,
      reason: 'FIREBASE_UNAVAILABLE',
      downloadCount: null,
      error: 'Firestore instance is not available'
    };
  }

  if (!uid) {
    return {
      ok: false,
      skipped: true,
      reason: 'AUTH_REQUIRED',
      downloadCount: null,
      error: 'Anonymous authentication is required to increment download count'
    };
  }

  const docFn = deps?.docImpl ?? doc;
  const setDocFn = deps?.setDocImpl ?? setDoc;
  const getDocFn = deps?.getDocImpl ?? getDoc;
  const incrementFn = deps?.incrementImpl ?? increment;

  try {
    const ref = docFn(db, DOWNLOADS_COLLECTION, String(bookId));
    await withTimeout(
      setDocFn(ref, { count: incrementFn(1) }, { merge: true }),
      timeoutMs
    );
    const snap = await withTimeout(getDocFn(ref), timeoutMs);
    const rawData = snap.data() as Record<string, unknown> | undefined;
    const downloadCount = Math.trunc(finite(rawData?.count));

    return {
      ok: true,
      skipped: false,
      reason: null,
      downloadCount,
      error: null
    };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      reason: 'WRITE_FAILED',
      downloadCount: null,
      error: err instanceof Error ? err.message : 'Failed to record download'
    };
  }
}

/**
 * Pure, non-mutating helper that merges a map or record of `BookMetrics` patches into
 * a normalized `Book[]` array.
 *
 * - Does not mutate the input array or any input `Book` object.
 * - Sanitizes numeric fields with `finite()` and clamps `publicRating` to `[0, 5]`.
 * - Clones `voters` arrays so external mutations cannot leak into state.
 * - Returns the original `books` reference if no book was affected.
 */
export function mergeMetricsIntoBooks(
  books: readonly Book[],
  metricsByBookId:
    ReadonlyMap<number, Partial<BookMetrics>> | Record<number, Partial<BookMetrics>>
): Book[] {
  let changed = false;

  const next = books.map((book) => {
    const patch =
      'get' in metricsByBookId && typeof metricsByBookId.get === 'function'
        ? metricsByBookId.get(book.id)
        : (metricsByBookId as Record<number, Partial<BookMetrics> | undefined>)[book.id];

    if (!patch) return book;

    const nextDownloadCount =
      patch.downloadCount !== undefined
        ? Math.trunc(finite(patch.downloadCount))
        : book.downloadCount;
    const nextRatingSum =
      patch.ratingSum !== undefined
        ? Math.trunc(finite(patch.ratingSum))
        : book.ratingSum;
    const nextRatingCount =
      patch.ratingCount !== undefined
        ? Math.trunc(finite(patch.ratingCount))
        : book.ratingCount;
    const nextPublicRating =
      patch.publicRating !== undefined
        ? Math.min(5, finite(patch.publicRating))
        : book.publicRating;
    const nextVoters =
      patch.voters !== undefined
        ? patch.voters.filter((v): v is string => typeof v === 'string')
        : book.voters;

    const votersUnchanged =
      nextVoters === book.voters ||
      (nextVoters.length === book.voters.length &&
        nextVoters.every((v, idx) => v === book.voters[idx]));

    if (
      nextDownloadCount === book.downloadCount &&
      nextRatingSum === book.ratingSum &&
      nextRatingCount === book.ratingCount &&
      nextPublicRating === book.publicRating &&
      votersUnchanged
    ) {
      return book;
    }

    changed = true;
    return {
      ...book,
      downloadCount: nextDownloadCount,
      ratingSum: nextRatingSum,
      ratingCount: nextRatingCount,
      publicRating: nextPublicRating,
      voters: votersUnchanged ? book.voters : [...nextVoters]
    };
  });

  return changed ? next : (books as Book[]);
}

/**
 * Pure, non-mutating helper that merges a `BookMetrics` patch for a single `bookId`
 * into a normalized `Book[]` array.
 */
export function mergeSingleBookMetrics(
  books: readonly Book[],
  bookId: number,
  metricsPatch: Partial<BookMetrics>
): Book[] {
  return mergeMetricsIntoBooks(books, new Map([[bookId, metricsPatch]]));
}
