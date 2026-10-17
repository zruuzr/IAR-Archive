/* ============================================================
   IAR Archive — Firebase Modular Initialization & Anonymous Auth
   TypeScript port of js/firebase.js using the official Firebase
   Modular SDK (firebase/app, firebase/auth, firebase/firestore).
   ============================================================ */

import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions
} from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  type Auth,
  type User,
  type UserCredential
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export const DEFAULT_FIRESTORE_TIMEOUT_MS = 8_000;
export const DEFAULT_AUTH_TIMEOUT_MS = 5_000;

/**
 * Public Firebase client configuration for the IAR Archive project (`iar-archive-328bc`),
 * ported from `js/firebase.js`.
 *
 * Note: Client-side Firebase config identifiers are public by design and governed by
 * `firestore.rules`. Optional `VITE_FIREBASE_*` overrides are supported without making
 * production builds depend on environment variables.
 */
export const DEFAULT_FIREBASE_CONFIG: Readonly<FirebaseOptions> = Object.freeze({
  apiKey: 'AIzaSyAug0yFzjQ4ud6zX2ugK_T7Lj7LfuO04tw',
  authDomain: 'iar-archive-328bc.firebaseapp.com',
  projectId: 'iar-archive-328bc',
  storageBucket: 'iar-archive-328bc.firebasestorage.app',
  messagingSenderId: '81911492650',
  appId: '1:81911492650:web:c6ac2f89d52bdd7065d353',
  measurementId: 'G-PYZEY63LTR'
});

export type FirebaseErrorCode =
  | 'CONFIG_MISSING'
  | 'INIT_FAILED'
  | 'AUTH_TIMEOUT'
  | 'AUTH_FAILED'
  | 'TIMEOUT'
  | 'UNAVAILABLE';

export class FirebaseServiceError extends Error {
  readonly code: FirebaseErrorCode;
  readonly cause?: unknown;

  constructor(code: FirebaseErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'FirebaseServiceError';
    this.code = code;
    this.cause = cause;
  }
}

export interface FirebaseServices {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
}

export interface FirebaseAuthResult {
  user: User | null;
  uid: string | null;
  authenticated: boolean;
  error: FirebaseServiceError | null;
}

export interface FirebaseConnectionResult {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  user: User | null;
  uid: string | null;
  ready: boolean;
  authenticated: boolean;
  error: FirebaseServiceError | null;
}

export interface FirebaseDeps {
  getAppsImpl?: typeof getApps;
  getAppImpl?: typeof getApp;
  initializeAppImpl?: typeof initializeApp;
  getFirestoreImpl?: typeof getFirestore;
  getAuthImpl?: typeof getAuth;
  signInAnonymouslyImpl?: (auth: Auth) => Promise<UserCredential>;
}

export interface InitializeFirebaseOptions {
  config?: FirebaseOptions | null;
  deps?: FirebaseDeps;
  forceReinit?: boolean;
}

export interface ConnectFirebaseOptions extends InitializeFirebaseOptions {
  authTimeoutMs?: number;
}

/**
 * Races a promise against a timer. Clears the timer once settled.
 * Equivalent to `timeout(promise, ms = 8000)` in `js/firebase.js`.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = DEFAULT_FIRESTORE_TIMEOUT_MS,
  timeoutCode: FirebaseErrorCode = 'TIMEOUT'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new FirebaseServiceError(timeoutCode, 'Timeout'));
      }, ms);
    })
  ]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}

export const timeout = withTimeout;

/**
 * Resolves the Firebase configuration, merging any non-empty `VITE_FIREBASE_*`
 * environment overrides on top of `DEFAULT_FIREBASE_CONFIG`.
 */
export function resolveFirebaseConfig(
  overrides?: FirebaseOptions | null
): FirebaseOptions {
  if (overrides !== undefined && overrides !== null) {
    return { ...overrides };
  }

  const env = (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env;

  const cleanEnv = (val: string | undefined, fallback: string | undefined) =>
    typeof val === 'string' && val.trim().length > 0 ? val.trim() : fallback;

  return {
    apiKey: cleanEnv(env?.VITE_FIREBASE_API_KEY, DEFAULT_FIREBASE_CONFIG.apiKey),
    authDomain: cleanEnv(
      env?.VITE_FIREBASE_AUTH_DOMAIN,
      DEFAULT_FIREBASE_CONFIG.authDomain
    ),
    projectId: cleanEnv(env?.VITE_FIREBASE_PROJECT_ID, DEFAULT_FIREBASE_CONFIG.projectId),
    storageBucket: cleanEnv(
      env?.VITE_FIREBASE_STORAGE_BUCKET,
      DEFAULT_FIREBASE_CONFIG.storageBucket
    ),
    messagingSenderId: cleanEnv(
      env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
      DEFAULT_FIREBASE_CONFIG.messagingSenderId
    ),
    appId: cleanEnv(env?.VITE_FIREBASE_APP_ID, DEFAULT_FIREBASE_CONFIG.appId),
    measurementId: cleanEnv(
      env?.VITE_FIREBASE_MEASUREMENT_ID,
      DEFAULT_FIREBASE_CONFIG.measurementId
    )
  };
}

/**
 * Validates that a Firebase configuration object contains the required public fields.
 */
export function isValidFirebaseConfig(
  config: FirebaseOptions | null | undefined
): config is FirebaseOptions {
  if (!config || typeof config !== 'object') return false;
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
  const projectId = typeof config.projectId === 'string' ? config.projectId.trim() : '';
  return apiKey.length > 0 && projectId.length > 0;
}

// Singleton cache for default runtime instances and in-flight auth promise
let cachedServices: FirebaseServices | null = null;
let inFlightAuthPromise: Promise<FirebaseAuthResult> | null = null;
let inFlightConnectPromise: Promise<FirebaseConnectionResult> | null = null;

/**
 * Resets internal singleton state (used in unit tests to verify initialization behavior).
 */
export function resetFirebaseStateForTests(): void {
  cachedServices = null;
  inFlightAuthPromise = null;
  inFlightConnectPromise = null;
}

/**
 * Initializes or reuses the Firebase App, Firestore, and Auth instances using the Modular SDK.
 * Never creates duplicate Firebase app instances.
 */
export function initializeFirebaseServices(
  options: InitializeFirebaseOptions = {}
): FirebaseServices {
  const { config: configOverride, deps, forceReinit = false } = options;

  if (cachedServices && !forceReinit && !deps && configOverride === undefined) {
    return cachedServices;
  }

  const resolvedConfig =
    configOverride === null ? null : resolveFirebaseConfig(configOverride);
  if (!isValidFirebaseConfig(resolvedConfig)) {
    throw new FirebaseServiceError(
      'CONFIG_MISSING',
      'Firebase configuration is missing required fields (apiKey, projectId).'
    );
  }

  const getAppsFn = deps?.getAppsImpl ?? getApps;
  const getAppFn = deps?.getAppImpl ?? getApp;
  const initializeAppFn = deps?.initializeAppImpl ?? initializeApp;
  const getFirestoreFn = deps?.getFirestoreImpl ?? getFirestore;
  const getAuthFn = deps?.getAuthImpl ?? getAuth;

  try {
    const existingApps = getAppsFn();
    const app = existingApps.length > 0 ? getAppFn() : initializeAppFn(resolvedConfig);
    const db = getFirestoreFn(app);
    const auth = getAuthFn(app);

    const services: FirebaseServices = { app, db, auth };
    if (!deps && configOverride === undefined) {
      cachedServices = services;
    }
    return services;
  } catch (error) {
    if (error instanceof FirebaseServiceError) {
      throw error;
    }
    throw new FirebaseServiceError(
      'INIT_FAILED',
      error instanceof Error
        ? `Failed to initialize Firebase: ${error.message}`
        : 'Failed to initialize Firebase.',
      error
    );
  }
}

/**
 * Ensures the current user is signed in anonymously using Firebase Auth Modular API.
 *
 * - Reuses `auth.currentUser` immediately if a session already exists.
 * - Deduplicates concurrent sign-in requests so component re-renders do not trigger
 *   redundant `signInAnonymously()` network calls.
 * - Enforces a timeout (default 5000ms, matching `js/firebase.js`) so the UI never hangs.
 * - Distinguishes between timeout (`AUTH_TIMEOUT`) and general auth failure (`AUTH_FAILED`).
 */
export async function ensureAnonymousAuth(
  auth: Auth,
  options: {
    timeoutMs?: number;
    signInAnonymouslyImpl?: (auth: Auth) => Promise<UserCredential>;
  } = {}
): Promise<FirebaseAuthResult> {
  const { timeoutMs = DEFAULT_AUTH_TIMEOUT_MS, signInAnonymouslyImpl } = options;

  if (auth.currentUser) {
    return {
      user: auth.currentUser,
      uid: auth.currentUser.uid,
      authenticated: true,
      error: null
    };
  }

  const signInFn = signInAnonymouslyImpl ?? signInAnonymously;

  const executeSignIn = async (): Promise<FirebaseAuthResult> => {
    try {
      const credential = await withTimeout(signInFn(auth), timeoutMs, 'AUTH_TIMEOUT');
      const user = credential?.user ?? auth.currentUser ?? null;
      return {
        user,
        uid: user?.uid ?? null,
        authenticated: Boolean(user?.uid),
        error: null
      };
    } catch (err) {
      const serviceError =
        err instanceof FirebaseServiceError
          ? err
          : new FirebaseServiceError(
              'AUTH_FAILED',
              err instanceof Error ? err.message : 'Anonymous authentication failed',
              err
            );
      return {
        user: auth.currentUser ?? null,
        uid: auth.currentUser?.uid ?? null,
        authenticated: Boolean(auth.currentUser?.uid),
        error: serviceError
      };
    }
  };

  // Deduplicate concurrent calls when using the default signIn implementation
  if (!signInAnonymouslyImpl) {
    if (!inFlightAuthPromise) {
      inFlightAuthPromise = executeSignIn().finally(() => {
        inFlightAuthPromise = null;
      });
    }
    return inFlightAuthPromise;
  }

  return executeSignIn();
}

/**
 * Connects to Firebase (initializes App, Firestore, and Auth, then performs anonymous sign-in).
 *
 * Equivalent to `connectFirebase()` in `js/firebase.js`, enhanced with typed diagnostics:
 * - If anonymous authentication fails or times out, `db` and `auth` remain available for
 *   public read operations (`ratings`, `downloads`, `stats/visits` allow public reads in `firestore.rules`),
 *   while `authenticated` is `false` and `error` describes the auth failure.
 * - If initialization or configuration fails, `ready` is `false` and `db`/`auth` are `null`.
 */
export async function connectFirebase(
  options: ConnectFirebaseOptions = {}
): Promise<FirebaseConnectionResult> {
  const { authTimeoutMs = DEFAULT_AUTH_TIMEOUT_MS, config, deps, forceReinit } = options;

  const isDefaultCall = !deps && config === undefined && !forceReinit;
  if (isDefaultCall && inFlightConnectPromise) {
    return inFlightConnectPromise;
  }

  const runConnect = async (): Promise<FirebaseConnectionResult> => {
    let services: FirebaseServices;
    try {
      services = initializeFirebaseServices({ config, deps, forceReinit });
    } catch (err) {
      const serviceError =
        err instanceof FirebaseServiceError
          ? err
          : new FirebaseServiceError(
              'INIT_FAILED',
              err instanceof Error ? err.message : 'Firebase initialization failed',
              err
            );
      return {
        app: null,
        db: null,
        auth: null,
        user: null,
        uid: null,
        ready: false,
        authenticated: false,
        error: serviceError
      };
    }

    const authResult = await ensureAnonymousAuth(services.auth, {
      timeoutMs: authTimeoutMs,
      signInAnonymouslyImpl: deps?.signInAnonymouslyImpl
    });

    return {
      app: services.app,
      db: services.db,
      auth: services.auth,
      user: authResult.user,
      uid: authResult.uid,
      ready: true,
      authenticated: authResult.authenticated,
      error: authResult.error
    };
  };

  if (isDefaultCall) {
    inFlightConnectPromise = runConnect().finally(() => {
      inFlightConnectPromise = null;
    });
    return inFlightConnectPromise;
  }

  return runConnect();
}

/**
 * Returns the currently initialized Firebase services if available, without triggering initialization.
 */
export function getInitializedFirebaseServices(): FirebaseServices | null {
  return cachedServices;
}
