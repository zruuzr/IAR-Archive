/* ============================================================
   IAR Archive — Firebase Ratings Transaction Service
   TypeScript port of js/ratings.js using Firebase Modular SDK
   (doc, runTransaction) in strict compliance with firestore.rules.
   ============================================================ */

import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import { finite } from '@/services/catalog';
import {
  connectFirebase,
  DEFAULT_FIRESTORE_TIMEOUT_MS,
  withTimeout,
  type ConnectFirebaseOptions
} from '@/services/firebase';
import { RATINGS_COLLECTION } from '@/services/firebase-metrics';
import type { Book, BookMetrics, Language } from '@/types/book';

export const VOTES_SUBCOLLECTION = 'votes';
export const MIN_RATING_VALUE = 1;
export const MAX_RATING_VALUE = 5;

export type RatingErrorCode =
  | 'INVALID_BOOK_ID'
  | 'INVALID_RATING'
  | 'BUSY'
  | 'ALREADY_VOTED'
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'TRANSACTION_FAILED';

export class RatingServiceError extends Error {
  readonly code: RatingErrorCode;
  readonly cause?: unknown;

  constructor(code: RatingErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'RatingServiceError';
    this.code = code;
    this.cause = cause;
  }
}

export interface RatingAggregateDocument {
  ratingSum: number;
  ratingCount: number;
  average: number;
  voters?: string[];
}

export interface RatingVoteDocument {
  value: number;
}

export interface FirestoreRatingsDeps {
  docImpl?: typeof doc;
  runTransactionImpl?: typeof runTransaction;
}

export interface SubmitBookRatingOptions extends ConnectFirebaseOptions {
  book?: Pick<Book, 'id' | 'voters'> | null;
  db?: Firestore | null;
  uid?: string | null;
  timeoutMs?: number;
  lang?: Language;
  busyRatings?: Set<number>;
  firestoreDeps?: FirestoreRatingsDeps;
}

export interface RatingSubmissionResult {
  ok: boolean;
  bookId: number;
  value: number;
  code: 'SAVED' | RatingErrorCode;
  message: string;
  metricsPatch: Partial<BookMetrics> | null;
  aggregate: RatingAggregateDocument | null;
}

const defaultBusyRatings = new Set<number>();

/**
 * Checks whether the current user UID has already rated a given book based on its `voters` array.
 * Equivalent to `rated(book)` in `js/ratings.js`.
 */
export function hasUserRatedBook(
  book: Pick<Book, 'voters'> | null | undefined,
  uid: string | null | undefined
): boolean {
  if (!book || !uid || !Array.isArray(book.voters)) return false;
  return book.voters.includes(uid);
}

export const rated = hasUserRatedBook;

/**
 * Checks whether a rating transaction is currently in flight for `bookId`.
 */
export function isRatingBusy(
  bookId: number,
  busySet: ReadonlySet<number> = defaultBusyRatings
): boolean {
  return busySet.has(bookId);
}

/**
 * Clears the internal busy ratings set (useful in tests).
 */
export function clearBusyRatingsForTests(): void {
  defaultBusyRatings.clear();
}

/**
 * Validates that a rating value is an integer in `[1, 5]`.
 * Matches `if (!Number.isInteger(value) || value < 1 || value > 5)` in `js/ratings.js`
 * and `value is int && value >= 1 && value <= 5` in `firestore.rules`.
 */
export function isValidRatingValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_RATING_VALUE &&
    value <= MAX_RATING_VALUE
  );
}

/**
 * Computes the new aggregate document payload for `ratings/{bookId}` in strict compliance
 * with `firestore.rules` (`validAggregateFields`, `validAverage` within ±0.005).
 */
export function computeNextRatingAggregate(
  existingData: Record<string, unknown> | null | undefined,
  value: number,
  uid: string
): RatingAggregateDocument {
  const data = existingData ?? {};
  const ratingSum = Math.trunc(finite(data.ratingSum)) + value;
  const ratingCount = Math.trunc(finite(data.ratingCount)) + 1;
  const average = Number((ratingSum / ratingCount).toFixed(2));

  const newData: RatingAggregateDocument = {
    ratingSum,
    ratingCount,
    average
  };

  if (Array.isArray(data.voters)) {
    const existingVoters = data.voters.filter((v): v is string => typeof v === 'string');
    newData.voters = existingVoters.includes(uid)
      ? existingVoters
      : [...existingVoters, uid];
  }

  return newData;
}

/**
 * Returns the localized user-facing message for a rating outcome, matching `js/ratings.js`.
 */
export function getRatingResultMessage(
  code: 'SAVED' | RatingErrorCode,
  lang: Language = 'ar'
): string {
  if (code === 'SAVED') {
    return lang === 'ar' ? 'تم حفظ تقييمك.' : 'Your rating was saved.';
  }
  if (code === 'ALREADY_VOTED') {
    return lang === 'ar'
      ? 'سبق أن قيّمت هذا المرجع.'
      : 'You already rated this reference.';
  }
  return lang === 'ar'
    ? 'تعذّر حفظ التقييم. تحقق من الاتصال وصلاحيات Firebase.'
    : 'Rating failed. Check connectivity and Firebase permissions.';
}

function snapshotExists(snap: unknown): boolean {
  if (!snap || typeof snap !== 'object') return false;
  const candidate = snap as { exists?: boolean | (() => boolean) };
  if (typeof candidate.exists === 'function') {
    return Boolean(candidate.exists());
  }
  return Boolean(candidate.exists);
}

function classifyTransactionError(err: unknown): RatingErrorCode {
  if (err instanceof RatingServiceError) {
    return err.code;
  }
  const message = err instanceof Error ? err.message : String(err);
  const codeProp =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';

  if (message === 'ALREADY_VOTED' || codeProp === 'ALREADY_VOTED') {
    return 'ALREADY_VOTED';
  }
  if (message === 'AUTH' || codeProp === 'AUTH_REQUIRED') {
    return 'AUTH_REQUIRED';
  }
  if (message === 'Timeout' || codeProp === 'TIMEOUT' || codeProp === 'AUTH_TIMEOUT') {
    return 'TIMEOUT';
  }
  if (
    codeProp.includes('permission-denied') ||
    message.toLowerCase().includes('permission') ||
    message.toLowerCase().includes('insufficient permissions')
  ) {
    return 'PERMISSION_DENIED';
  }
  return 'TRANSACTION_FAILED';
}

/**
 * Submits a 1–5 star rating for a book using a Firestore transaction.
 *
 * Strictly preserves the schema and rules of `js/ratings.js` and `firestore.rules`:
 * - Aggregate document path: `ratings/{String(bookId)}`
 * - Individual vote path: `ratings/{String(bookId)}/votes/{uid}`
 * - Vote payload: `{ value }` (`int` in `1..5`)
 * - Aggregate payload: `{ ratingSum, ratingCount, average }` (+ `voters` if array exists)
 * - Rejects duplicate votes via both `votes/{uid}` existence check and `data.voters.includes(uid)`
 * - Never reports `ok: true` before the transaction commits.
 */
export async function submitBookRating(
  bookId: number,
  value: number,
  options: SubmitBookRatingOptions = {}
): Promise<RatingSubmissionResult> {
  const {
    book = null,
    db: injectedDb,
    uid: injectedUid,
    timeoutMs = DEFAULT_FIRESTORE_TIMEOUT_MS,
    lang = 'ar',
    busyRatings = defaultBusyRatings,
    firestoreDeps,
    ...connectOptions
  } = options;

  if (!Number.isSafeInteger(bookId) || bookId < 0) {
    return {
      ok: false,
      bookId,
      value,
      code: 'INVALID_BOOK_ID',
      message: getRatingResultMessage('INVALID_BOOK_ID', lang),
      metricsPatch: null,
      aggregate: null
    };
  }

  if (!isValidRatingValue(value)) {
    return {
      ok: false,
      bookId,
      value,
      code: 'INVALID_RATING',
      message: getRatingResultMessage('INVALID_RATING', lang),
      metricsPatch: null,
      aggregate: null
    };
  }

  if (busyRatings.has(bookId)) {
    return {
      ok: false,
      bookId,
      value,
      code: 'BUSY',
      message: getRatingResultMessage('BUSY', lang),
      metricsPatch: null,
      aggregate: null
    };
  }

  if (book && injectedUid && hasUserRatedBook(book, injectedUid)) {
    return {
      ok: false,
      bookId,
      value,
      code: 'ALREADY_VOTED',
      message: getRatingResultMessage('ALREADY_VOTED', lang),
      metricsPatch: null,
      aggregate: null
    };
  }

  busyRatings.add(bookId);

  try {
    let db = injectedDb ?? null;
    let uid = injectedUid ?? null;

    if (!db || !uid) {
      const conn = await connectFirebase(connectOptions);
      db = db ?? conn.db;
      uid = uid ?? conn.uid;
    }

    if (!db || !uid) {
      throw new RatingServiceError('AUTH_REQUIRED', 'AUTH');
    }

    if (book && hasUserRatedBook(book, uid)) {
      throw new RatingServiceError('ALREADY_VOTED', 'ALREADY_VOTED');
    }

    const docFn = firestoreDeps?.docImpl ?? doc;
    const runTransactionFn = firestoreDeps?.runTransactionImpl ?? runTransaction;
    const currentUid = uid;
    const currentDb = db;

    const aggregateResult = await withTimeout(
      runTransactionFn(currentDb, async (transaction) => {
        const aggregateRef = docFn(currentDb, RATINGS_COLLECTION, String(bookId));
        const voteRef = docFn(
          currentDb,
          RATINGS_COLLECTION,
          String(bookId),
          VOTES_SUBCOLLECTION,
          currentUid
        );

        const aggregateDoc = await transaction.get(aggregateRef);
        const voteDoc = await transaction.get(voteRef);

        if (snapshotExists(voteDoc)) {
          throw new RatingServiceError('ALREADY_VOTED', 'ALREADY_VOTED');
        }

        const rawData = (aggregateDoc.data() ?? {}) as Record<string, unknown>;
        const legacyVoters = Array.isArray(rawData.voters)
          ? rawData.voters.filter((v): v is string => typeof v === 'string')
          : [];

        if (legacyVoters.includes(currentUid)) {
          throw new RatingServiceError('ALREADY_VOTED', 'ALREADY_VOTED');
        }

        const newData = computeNextRatingAggregate(rawData, value, currentUid);
        const votePayload: RatingVoteDocument = { value };

        transaction.set(voteRef, votePayload);
        transaction.set(aggregateRef, newData);
        return newData;
      }),
      timeoutMs
    );

    const existingBookVoters = Array.isArray(book?.voters) ? book.voters : [];
    const updatedVoters = Array.isArray(aggregateResult.voters)
      ? aggregateResult.voters
      : existingBookVoters.includes(currentUid)
        ? existingBookVoters
        : [...existingBookVoters, currentUid];

    const metricsPatch: Partial<BookMetrics> = {
      ratingSum: aggregateResult.ratingSum,
      ratingCount: aggregateResult.ratingCount,
      publicRating: aggregateResult.average,
      voters: updatedVoters
    };

    return {
      ok: true,
      bookId,
      value,
      code: 'SAVED',
      message: getRatingResultMessage('SAVED', lang),
      metricsPatch,
      aggregate: aggregateResult
    };
  } catch (err) {
    const code = classifyTransactionError(err);
    return {
      ok: false,
      bookId,
      value,
      code,
      message: getRatingResultMessage(code, lang),
      metricsPatch: null,
      aggregate: null
    };
  } finally {
    busyRatings.delete(bookId);
  }
}

export const rateBook = submitBookRating;
