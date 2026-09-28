/* ============================================================
   IAR Archive — Firebase connection
   Initializes Firebase (compat SDK) and anonymous auth.
   Exports an `fb` object holding db, auth, and the ready promise.
   ============================================================ */

export const fb = {
  db: null,
  auth: null,
  ready: Promise.resolve()
};

export function timeout(promise, ms = 8000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Timeout')), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

export async function connectFirebase() {
  try {
    if (!window.firebase) throw new Error('Firebase SDK not loaded');

    const config = {
      apiKey: 'AIzaSyAug0yFzjQ4ud6zX2ugK_T7Lj7LfuO04tw',
      authDomain: 'iar-archive-328bc.firebaseapp.com',
      projectId: 'iar-archive-328bc',
      storageBucket: 'iar-archive-328bc.firebasestorage.app',
      messagingSenderId: '81911492650',
      appId: '1:81911492650:web:c6ac2f89d52bdd7065d353',
      measurementId: 'G-PYZEY63LTR'
    };

    if (!firebase.apps.length) firebase.initializeApp(config);

    fb.db = firebase.firestore();
    fb.auth = firebase.auth();

    await timeout(fb.auth.signInAnonymously(), 5000);
  } catch (error) {
    console.warn('Firebase services unavailable:', error.message);
  }
}
