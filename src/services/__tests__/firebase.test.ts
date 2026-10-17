// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User, UserCredential } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalog } from '@/hooks/useCatalog';
import { queryCatalog } from '@/lib/catalog-query';
import { normalizeCatalog } from '@/services/catalog';
import {
  connectFirebase,
  DEFAULT_FIREBASE_CONFIG,
  ensureAnonymousAuth,
  FirebaseServiceError,
  initializeFirebaseServices,
  isValidFirebaseConfig,
  resetFirebaseStateForTests,
  withTimeout
} from '@/services/firebase';
import {
  DOWNLOADS_COLLECTION,
  LAST_VISIT_STORAGE_KEY,
  loadBookMetricsFromFirestore,
  loadCatalogMetrics,
  mergeMetricsIntoBooks,
  mergeSingleBookMetrics,
  parseDownloadMetricDoc,
  parseRatingMetricDoc,
  RATINGS_COLLECTION,
  recordBookDownload,
  recordOrLoadSiteVisit,
  STATS_COLLECTION,
  VISIT_COOLDOWN_MS,
  VISITS_DOC_ID
} from '@/services/firebase-metrics';
import {
  clearBusyRatingsForTests,
  computeNextRatingAggregate,
  hasUserRatedBook,
  submitBookRating,
  VOTES_SUBCOLLECTION
} from '@/services/firebase-ratings';

describe('Firebase Modular Initialization & Anonymous Auth (src/services/firebase.ts)', () => {
  beforeEach(() => {
    resetFirebaseStateForTests();
    clearBusyRatingsForTests();
    localStorage.clear();
  });

  it('1. initializes Firebase once and reuses existing FirebaseApp without duplicate instances', () => {
    const fakeApp = { name: '[DEFAULT]' } as unknown as FirebaseApp;
    const fakeDb = { type: 'firestore' } as unknown as Firestore;
    const fakeAuth = { currentUser: null } as unknown as Auth;

    const apps: FirebaseApp[] = [];
    const getAppsImpl = vi.fn(() => apps);
    const getAppImpl = vi.fn(() => fakeApp);
    const initializeAppImpl = vi.fn(() => {
      apps.push(fakeApp);
      return fakeApp;
    });
    const getFirestoreImpl = vi.fn(() => fakeDb);
    const getAuthImpl = vi.fn(() => fakeAuth);

    const first = initializeFirebaseServices({
      deps: {
        getAppsImpl,
        getAppImpl,
        initializeAppImpl,
        getFirestoreImpl,
        getAuthImpl
      }
    });

    const second = initializeFirebaseServices({
      deps: {
        getAppsImpl,
        getAppImpl,
        initializeAppImpl,
        getFirestoreImpl,
        getAuthImpl
      }
    });

    expect(first.app).toBe(fakeApp);
    expect(second.app).toBe(fakeApp);
    expect(initializeAppImpl).toHaveBeenCalledTimes(1);
    expect(initializeAppImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: DEFAULT_FIREBASE_CONFIG.projectId,
        apiKey: DEFAULT_FIREBASE_CONFIG.apiKey
      })
    );
    expect(getAppImpl).toHaveBeenCalledTimes(1);
  });

  it('2. handles missing configuration and initialization errors gracefully', async () => {
    expect(isValidFirebaseConfig(null)).toBe(false);
    expect(isValidFirebaseConfig({ apiKey: '', projectId: 'iar-archive-328bc' })).toBe(
      false
    );
    expect(isValidFirebaseConfig(DEFAULT_FIREBASE_CONFIG)).toBe(true);

    expect(() =>
      initializeFirebaseServices({
        config: { apiKey: '', projectId: '' }
      })
    ).toThrowError(FirebaseServiceError);

    const connMissing = await connectFirebase({
      config: { apiKey: '', projectId: '' }
    });
    expect(connMissing.ready).toBe(false);
    expect(connMissing.db).toBeNull();
    expect(connMissing.auth).toBeNull();
    expect(connMissing.error?.code).toBe('CONFIG_MISSING');

    const connInitError = await connectFirebase({
      deps: {
        getAppsImpl: () => [],
        initializeAppImpl: () => {
          throw new Error('SDK init crash');
        }
      }
    });
    expect(connInitError.ready).toBe(false);
    expect(connInitError.db).toBeNull();
    expect(connInitError.error?.code).toBe('INIT_FAILED');
    expect(connInitError.error?.message).toContain('SDK init crash');
  });

  it('3. handles anonymous auth success, existing session reuse, failure, and timeout while keeping Firestore available for public reads', async () => {
    const fakeUser = { uid: 'anon-uid-123' } as User;

    // 3a. Reuses existing currentUser without calling signInAnonymously
    const signInSpy = vi.fn();
    const authWithUser = { currentUser: fakeUser } as unknown as Auth;
    const reused = await ensureAnonymousAuth(authWithUser, {
      signInAnonymouslyImpl: signInSpy
    });
    expect(reused.authenticated).toBe(true);
    expect(reused.uid).toBe('anon-uid-123');
    expect(signInSpy).not.toHaveBeenCalled();

    // 3b. Signs in anonymously when currentUser is null
    const authWithoutUser = { currentUser: null } as unknown as Auth;
    const signInSuccess = vi.fn(async () => ({ user: fakeUser }) as UserCredential);
    const signedIn = await ensureAnonymousAuth(authWithoutUser, {
      signInAnonymouslyImpl: signInSuccess
    });
    expect(signedIn.authenticated).toBe(true);
    expect(signedIn.uid).toBe('anon-uid-123');
    expect(signedIn.error).toBeNull();

    // 3c. Handles auth failure without nullifying db in connectFirebase
    const fakeApp = { name: '[DEFAULT]' } as unknown as FirebaseApp;
    const fakeDb = { type: 'firestore' } as unknown as Firestore;
    const connAuthFailed = await connectFirebase({
      deps: {
        getAppsImpl: () => [fakeApp],
        getAppImpl: () => fakeApp,
        getFirestoreImpl: () => fakeDb,
        getAuthImpl: () => authWithoutUser,
        signInAnonymouslyImpl: async () => {
          throw new Error('auth/network-request-failed');
        }
      }
    });
    expect(connAuthFailed.ready).toBe(true);
    expect(connAuthFailed.db).toBe(fakeDb);
    expect(connAuthFailed.authenticated).toBe(false);
    expect(connAuthFailed.error?.code).toBe('AUTH_FAILED');

    // 3d. Handles auth timeout
    const slowSignIn = () =>
      new Promise<UserCredential>((resolve) => {
        setTimeout(() => resolve({ user: fakeUser } as UserCredential), 200);
      });
    const timedOut = await ensureAnonymousAuth(authWithoutUser, {
      timeoutMs: 15,
      signInAnonymouslyImpl: slowSignIn
    });
    expect(timedOut.authenticated).toBe(false);
    expect(timedOut.error?.code).toBe('AUTH_TIMEOUT');
  });
});

describe('Firebase Metrics, Visits & Download Counter Service (src/services/firebase-metrics.ts)', () => {
  const fakeDb = { type: 'firestore' } as unknown as Firestore;

  beforeEach(() => {
    localStorage.clear();
  });

  it('4 & 6. loads metrics when documents exist or are missing, preserving field names and preventing NaN', async () => {
    // Direct document parser checks for corrupted/missing fields
    expect(parseDownloadMetricDoc(null)).toEqual({ downloadCount: 0 });
    expect(parseDownloadMetricDoc({ count: 'invalid' })).toEqual({ downloadCount: 0 });
    expect(parseDownloadMetricDoc({ count: -10 })).toEqual({ downloadCount: 0 });
    expect(parseDownloadMetricDoc({ count: 42 })).toEqual({ downloadCount: 42 });

    expect(parseRatingMetricDoc(undefined)).toEqual({
      ratingSum: 0,
      ratingCount: 0,
      publicRating: 0,
      voters: []
    });
    expect(
      parseRatingMetricDoc({
        ratingSum: 19,
        ratingCount: 4,
        average: 9.5, // Clamped to 5
        voters: ['uid-1', 123, null, 'uid-2']
      })
    ).toEqual({
      ratingSum: 19,
      ratingCount: 4,
      publicRating: 5,
      voters: ['uid-1', 'uid-2']
    });

    // Mock Firestore collection snapshots
    const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
    const mockGetDocs = vi.fn(async (colRef: { name: string }) => {
      if (colRef.name === RATINGS_COLLECTION) {
        return {
          forEach: (
            cb: (doc: { id: string; data: () => Record<string, unknown> }) => void
          ) => {
            cb({
              id: '1',
              data: () => ({
                ratingSum: 14,
                ratingCount: 3,
                average: 4.67,
                voters: ['u1', 'u2', 'u3']
              })
            });
            cb({
              id: 'invalid-id',
              data: () => ({ ratingSum: 5, ratingCount: 1, average: 5 })
            });
          }
        };
      }
      if (colRef.name === DOWNLOADS_COLLECTION) {
        return {
          forEach: (
            cb: (doc: { id: string; data: () => Record<string, unknown> }) => void
          ) => {
            cb({
              id: '1',
              data: () => ({ count: 27 })
            });
            cb({
              id: '2',
              data: () => ({ count: 9 })
            });
          }
        };
      }
      return { forEach: () => {} };
    });

    const result = await loadBookMetricsFromFirestore(fakeDb, {
      deps: {
        collectionImpl:
          mockCollection as unknown as typeof import('firebase/firestore').collection,
        getDocsImpl: mockGetDocs as unknown as typeof import('firebase/firestore').getDocs
      }
    });

    expect(result.ratingsLoaded).toBe(true);
    expect(result.downloadsLoaded).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.byBookId.get(1)).toEqual({
      ratingSum: 14,
      ratingCount: 3,
      publicRating: 4.67,
      voters: ['u1', 'u2', 'u3'],
      downloadCount: 27
    });
    expect(result.byBookId.get(2)).toEqual({
      downloadCount: 9
    });
    expect(result.byBookId.get(999)).toBeUndefined();

    // Also verify loadCatalogMetrics end-to-end with injected mocks and unavailable DB
    const unavailableSnapshot = await loadCatalogMetrics({
      config: { apiKey: '', projectId: '' }
    });
    expect(unavailableSnapshot.firebaseReady).toBe(false);
    expect(unavailableSnapshot.visitsCount).toBeNull();
    expect(unavailableSnapshot.byBookId.size).toBe(0);
  });

  it('5. handles network errors and timeouts gracefully via Promise.allSettled', async () => {
    await expect(
      withTimeout(new Promise((resolve) => setTimeout(resolve, 200)), 15)
    ).rejects.toThrow('Timeout');

    const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
    const mockGetDocs = vi.fn(async (colRef: { name: string }) => {
      if (colRef.name === RATINGS_COLLECTION) {
        throw new Error('Firestore ratings network error');
      }
      return {
        forEach: (
          cb: (doc: { id: string; data: () => Record<string, unknown> }) => void
        ) => {
          cb({ id: '3', data: () => ({ count: 15 }) });
        }
      };
    });

    const partialResult = await loadBookMetricsFromFirestore(fakeDb, {
      deps: {
        collectionImpl:
          mockCollection as unknown as typeof import('firebase/firestore').collection,
        getDocsImpl: mockGetDocs as unknown as typeof import('firebase/firestore').getDocs
      }
    });

    expect(partialResult.ratingsLoaded).toBe(false);
    expect(partialResult.downloadsLoaded).toBe(true);
    expect(partialResult.byBookId.get(3)).toEqual({ downloadCount: 15 });
    expect(partialResult.errors).toContain('Firestore ratings network error');
  });

  it('9. prevents counting a download before completion or when aborted, and increments downloads/{id} on completion', async () => {
    const setDocSpy = vi.fn();
    const getDocSpy = vi.fn(async () => ({
      data: () => ({ count: 12 })
    }));
    const docSpy = vi.fn((_db: unknown, col: string, id: string) => ({
      path: `${col}/${id}`
    }));
    const incrementSpy = vi.fn((n: number) => ({ __increment: n }));

    const deps = {
      docImpl: docSpy as unknown as typeof import('firebase/firestore').doc,
      setDocImpl: setDocSpy as unknown as typeof import('firebase/firestore').setDoc,
      getDocImpl: getDocSpy as unknown as typeof import('firebase/firestore').getDoc,
      incrementImpl:
        incrementSpy as unknown as typeof import('firebase/firestore').increment
    };

    // Not completed yet -> must NOT write to Firestore
    const notCompleted = await recordBookDownload(5, {
      completed: false,
      db: fakeDb,
      uid: 'anon-1',
      deps
    });
    expect(notCompleted.ok).toBe(false);
    expect(notCompleted.skipped).toBe(true);
    expect(notCompleted.reason).toBe('DOWNLOAD_NOT_COMPLETED');
    expect(setDocSpy).not.toHaveBeenCalled();

    // Aborted -> must NOT write to Firestore
    const abortedResult = await recordBookDownload(5, {
      completed: true,
      aborted: true,
      db: fakeDb,
      uid: 'anon-1',
      deps
    });
    expect(abortedResult.ok).toBe(false);
    expect(abortedResult.reason).toBe('DOWNLOAD_ABORTED');
    expect(setDocSpy).not.toHaveBeenCalled();

    // Completed -> writes { count: increment(1) } with { merge: true } to downloads/5
    const completedResult = await recordBookDownload(5, {
      completed: true,
      db: fakeDb,
      uid: 'anon-1',
      deps
    });
    expect(completedResult.ok).toBe(true);
    expect(completedResult.downloadCount).toBe(12);
    expect(docSpy).toHaveBeenCalledWith(fakeDb, DOWNLOADS_COLLECTION, '5');
    expect(setDocSpy).toHaveBeenCalledWith(
      { path: 'downloads/5' },
      { count: { __increment: 1 } },
      { merge: true }
    );
  });

  it('10. records or reads site visits in stats/visits respecting 24h cooldown and handles errors safely', async () => {
    let serverVisits = 100;
    const docSpy = vi.fn((_db: unknown, col: string, id: string) => ({
      path: `${col}/${id}`
    }));
    const getDocSpy = vi.fn(async () => ({
      data: () => ({ count: serverVisits })
    }));
    const runTransactionSpy = vi.fn(
      async (_db: unknown, updateFn: (tx: unknown) => Promise<number>) => {
        const tx = {
          get: async () => ({ data: () => ({ count: serverVisits }) }),
          set: (_ref: unknown, data: { count: number }) => {
            serverVisits = data.count;
          }
        };
        return updateFn(tx);
      }
    );

    const deps = {
      docImpl: docSpy as unknown as typeof import('firebase/firestore').doc,
      getDocImpl: getDocSpy as unknown as typeof import('firebase/firestore').getDoc,
      runTransactionImpl:
        runTransactionSpy as unknown as typeof import('firebase/firestore').runTransaction
    };

    const now = 1_700_000_000_000;

    // First visit by authenticated user -> increments via transaction and saves iar_last_visit
    const firstCount = await recordOrLoadSiteVisit(fakeDb, {
      uid: 'anon-1',
      now,
      deps
    });
    expect(firstCount).toBe(101);
    expect(docSpy).toHaveBeenCalledWith(fakeDb, STATS_COLLECTION, VISITS_DOC_ID);
    expect(runTransactionSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LAST_VISIT_STORAGE_KEY)).toBe(String(now));

    // Second visit within 24 hours -> reads count without transaction increment
    const secondCount = await recordOrLoadSiteVisit(fakeDb, {
      uid: 'anon-1',
      now: now + 3_600_000, // +1 hour (< 24h cooldown)
      deps
    });
    expect(secondCount).toBe(101);
    expect(runTransactionSpy).toHaveBeenCalledTimes(1);
    expect(getDocSpy).toHaveBeenCalledTimes(1);

    // Visit after 24 hours + 1ms -> increments again
    const thirdCount = await recordOrLoadSiteVisit(fakeDb, {
      uid: 'anon-1',
      now: now + VISIT_COOLDOWN_MS + 1,
      deps
    });
    expect(thirdCount).toBe(102);
    expect(runTransactionSpy).toHaveBeenCalledTimes(2);

    // Error handling: returns null when Firestore throws
    const errorCount = await recordOrLoadSiteVisit(fakeDb, {
      uid: null,
      deps: {
        ...deps,
        getDocImpl: (async () => {
          throw new Error('Network disconnected');
        }) as unknown as typeof import('firebase/firestore').getDoc
      }
    });
    expect(errorCount).toBeNull();
  });
});

describe('Firebase Ratings Transaction Service (src/services/firebase-ratings.ts)', () => {
  const fakeDb = { type: 'firestore' } as unknown as Firestore;

  beforeEach(() => {
    clearBusyRatingsForTests();
  });

  it('7. validates rating inputs, enforces single vote per UID, and executes transaction matching firestore.rules', async () => {
    // Input validation: non-integer or out of 1..5 range
    const invalidLow = await submitBookRating(1, 0, { db: fakeDb, uid: 'u1' });
    expect(invalidLow.ok).toBe(false);
    expect(invalidLow.code).toBe('INVALID_RATING');

    const invalidHigh = await submitBookRating(1, 6, { db: fakeDb, uid: 'u1' });
    expect(invalidHigh.ok).toBe(false);
    expect(invalidHigh.code).toBe('INVALID_RATING');

    const invalidFloat = await submitBookRating(1, 4.5, { db: fakeDb, uid: 'u1' });
    expect(invalidFloat.ok).toBe(false);
    expect(invalidFloat.code).toBe('INVALID_RATING');

    // Already in book.voters
    const preVoted = await submitBookRating(1, 5, {
      db: fakeDb,
      uid: 'u1',
      book: { id: 1, voters: ['u1'] },
      lang: 'ar'
    });
    expect(preVoted.ok).toBe(false);
    expect(preVoted.code).toBe('ALREADY_VOTED');
    expect(preVoted.message).toBe('سبق أن قيّمت هذا المرجع.');

    // Verify transaction reads ratings/{id} and ratings/{id}/votes/{uid}, and writes exact schema
    const setCalls: Array<{ ref: { path: string }; data: unknown }> = [];
    const docSpy = vi.fn((_db: unknown, ...segments: string[]) => ({
      path: segments.join('/')
    }));

    const runTransactionSpy = vi.fn(
      async (_db: unknown, txFn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          get: async (ref: { path: string }) => {
            if (ref.path === `${RATINGS_COLLECTION}/7/${VOTES_SUBCOLLECTION}/user-42`) {
              return { exists: () => false, data: () => undefined };
            }
            if (ref.path === `${RATINGS_COLLECTION}/7`) {
              return {
                exists: () => true,
                data: () => ({
                  ratingSum: 9,
                  ratingCount: 2,
                  average: 4.5,
                  voters: ['user-1', 'user-2']
                })
              };
            }
            return { exists: () => false, data: () => undefined };
          },
          set: (ref: { path: string }, data: unknown) => {
            setCalls.push({ ref, data });
          }
        };
        return txFn(tx);
      }
    );

    const successResult = await submitBookRating(7, 4, {
      db: fakeDb,
      uid: 'user-42',
      lang: 'en',
      firestoreDeps: {
        docImpl: docSpy as unknown as typeof import('firebase/firestore').doc,
        runTransactionImpl:
          runTransactionSpy as unknown as typeof import('firebase/firestore').runTransaction
      }
    });

    expect(successResult.ok).toBe(true);
    expect(successResult.code).toBe('SAVED');
    expect(successResult.message).toBe('Your rating was saved.');
    expect(successResult.aggregate).toEqual({
      ratingSum: 13,
      ratingCount: 3,
      average: 4.33,
      voters: ['user-1', 'user-2', 'user-42']
    });

    // Verify firestore.rules validAverage tolerance (±0.005)
    const exactAvg = 13 / 3;
    expect(Math.abs(successResult.aggregate!.average - exactAvg)).toBeLessThanOrEqual(
      0.005
    );

    // Verify exact transaction writes
    expect(setCalls).toEqual([
      {
        ref: { path: 'ratings/7/votes/user-42' },
        data: { value: 4 }
      },
      {
        ref: { path: 'ratings/7' },
        data: {
          ratingSum: 13,
          ratingCount: 3,
          average: 4.33,
          voters: ['user-1', 'user-2', 'user-42']
        }
      }
    ]);

    expect(
      hasUserRatedBook({ voters: successResult.metricsPatch!.voters! }, 'user-42')
    ).toBe(true);
  });

  it('8. never reports rating success when the transaction fails (duplicate vote in DB, permission-denied, or network error)', async () => {
    const docSpy = vi.fn((_db: unknown, ...segments: string[]) => ({
      path: segments.join('/')
    }));

    // Case A: voteDoc already exists on server
    const duplicateVoteResult = await submitBookRating(10, 5, {
      db: fakeDb,
      uid: 'u-dup',
      lang: 'en',
      firestoreDeps: {
        docImpl: docSpy as unknown as typeof import('firebase/firestore').doc,
        runTransactionImpl: (async (
          _db: unknown,
          txFn: (tx: unknown) => Promise<unknown>
        ) => {
          const tx = {
            get: async (ref: { path: string }) => {
              if (ref.path.includes('/votes/')) {
                return { exists: () => true, data: () => ({ value: 5 }) };
              }
              return {
                exists: () => true,
                data: () => ({ ratingSum: 5, ratingCount: 1, average: 5 })
              };
            },
            set: vi.fn()
          };
          return txFn(tx);
        }) as unknown as typeof import('firebase/firestore').runTransaction
      }
    });

    expect(duplicateVoteResult.ok).toBe(false);
    expect(duplicateVoteResult.code).toBe('ALREADY_VOTED');
    expect(duplicateVoteResult.metricsPatch).toBeNull();
    expect(duplicateVoteResult.message).toBe('You already rated this reference.');

    // Case B: Firestore permission-denied / network rejection
    const permissionErrorResult = await submitBookRating(10, 5, {
      db: fakeDb,
      uid: 'u-perm',
      lang: 'ar',
      firestoreDeps: {
        docImpl: docSpy as unknown as typeof import('firebase/firestore').doc,
        runTransactionImpl: (async () => {
          const err = new Error('Missing or insufficient permissions.');
          (err as Error & { code?: string }).code = 'permission-denied';
          throw err;
        }) as unknown as typeof import('firebase/firestore').runTransaction
      }
    });

    expect(permissionErrorResult.ok).toBe(false);
    expect(permissionErrorResult.code).toBe('PERMISSION_DENIED');
    expect(permissionErrorResult.metricsPatch).toBeNull();
    expect(permissionErrorResult.message).toBe(
      'تعذّر حفظ التقييم. تحقق من الاتصال وصلاحيات Firebase.'
    );

    // Compute aggregate without legacy voters field omits voters key
    const aggregateWithoutVoters = computeNextRatingAggregate(
      { ratingSum: 4, ratingCount: 1, average: 4 },
      5,
      'uid-99'
    );
    expect(aggregateWithoutVoters).toEqual({
      ratingSum: 9,
      ratingCount: 2,
      average: 4.5
    });
    expect('voters' in aggregateWithoutVoters).toBe(false);
  });
});

describe('Catalog Integration — Immutable Metrics Merging & Failure Resilience', () => {
  it('11. merges metrics into books immutably and triggers re-sorting by rating and downloads', () => {
    const books = normalizeCatalog(
      [
        { id: 1, title: 'الكتاب الأول', file_path: 'pdf/1.pdf' },
        { id: 2, title: 'الكتاب الثاني', file_path: 'pdf/2.pdf' },
        { id: 3, title: 'الكتاب الثالث', file_path: 'pdf/3.pdf' }
      ],
      { baseHref: 'http://localhost/' }
    );

    const originalBook1 = books[0];
    const originalBook2 = books[1];
    const originalBook3 = books[2];

    const metricsMap = new Map([
      [
        1,
        {
          downloadCount: 10,
          publicRating: 3.5,
          ratingSum: 7,
          ratingCount: 2,
          voters: ['u1', 'u2']
        }
      ],
      [
        2,
        {
          downloadCount: 80,
          publicRating: 4.9,
          ratingSum: 49,
          ratingCount: 10,
          voters: ['u3']
        }
      ]
    ]);

    const merged = mergeMetricsIntoBooks(books, metricsMap);

    // Input array and original book objects are untouched (no mutation)
    expect(merged).not.toBe(books);
    expect(originalBook1.downloadCount).toBe(0);
    expect(originalBook2.publicRating).toBe(0);

    // Untouched book #3 preserves exact object reference
    expect(merged[2]).toBe(originalBook3);

    // Updated books have new references and accurate metrics
    expect(merged[0].downloadCount).toBe(10);
    expect(merged[1].downloadCount).toBe(80);
    expect(merged[1].publicRating).toBe(4.9);

    // Sorting by downloads and rating uses the merged metrics
    const byDownloads = queryCatalog(merged, { sort: 'downloads' });
    expect(byDownloads.filteredBooks.map((b) => b.id)).toEqual([2, 1, 3]);

    const byRating = queryCatalog(merged, { sort: 'rating' });
    expect(byRating.filteredBooks.map((b) => b.id)).toEqual([2, 1, 3]);

    // Single book update
    const afterSingleUpdate = mergeSingleBookMetrics(merged, 3, {
      downloadCount: 200,
      publicRating: 5
    });
    const byDownloadsAfter = queryCatalog(afterSingleUpdate, { sort: 'downloads' });
    expect(byDownloadsAfter.filteredBooks.map((b) => b.id)).toEqual([3, 2, 1]);
  });

  it('12. keeps the catalog available when Firebase metrics fail to load', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, title: 'مرجع 1', file_path: 'pdf/1.pdf' },
        { id: 2, title: 'مرجع 2', file_path: 'pdf/2.pdf' }
      ]
    });

    const failingMetricsLoader = vi
      .fn()
      .mockRejectedValue(new Error('Firebase totally unreachable'));

    const { result } = renderHook(() =>
      useCatalog({
        fetchImpl: mockFetch as unknown as typeof fetch,
        baseHref: 'http://localhost/',
        autoLoadMetrics: true,
        metricsLoader: failingMetricsLoader
      })
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.error).toBe(false);
    expect(result.current.books).toHaveLength(2);
    expect(result.current.books[0].title).toBe('مرجع 1');
    expect(result.current.metricsLoaded).toBe(false);
    expect(result.current.visitsCount).toBeNull();

    // Update single book in state via updateBookInState
    act(() => {
      result.current.updateBookInState(1, { downloadCount: 33 });
    });
    expect(result.current.books[0].downloadCount).toBe(33);
  });
});
