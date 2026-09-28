/* ============================================================
   ESLint Configuration — Flat Config (ESLint 9+)
   ============================================================
   هذا الملف يحدد قواعد فحص الكود لجافاسكريبت في مشروع IAR Archive.
   ============================================================ */

export default [
  {
    // ============================================================
    // 1. الملفات المستهدفة بالفحص
    // ============================================================
    files: ['js/**/*.js', 'app.js'],

    // ============================================================
    // 2. اللغة والبيئة
    // ============================================================
    languageOptions: {
      // ecmaVersion: 'latest' → يسمح بأحدث ميزات JavaScript
      // (مثل optional chaining ?. و nullish coalescing ??)
      ecmaVersion: 'latest',

      // sourceType: 'module' → يسمح بـ import/export
      // هذا ضروري لأننا نستخدم ES Modules
      sourceType: 'module',

      // globals: المتغيرات العامة التي يوفرها المتصفح
      // ESLint لا يعرفها تلقائيًا ويشتكي منها
      globals: {
        // DOM
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        prompt: 'readonly',

        // Web APIs
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        DOMException: 'readonly',
        Intl: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        matchMedia: 'readonly',
        getComputedStyle: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        isSecureContext: 'readonly',

        // Service Worker APIs
        self: 'readonly',
        caches: 'readonly',

        // Firebase (from compat CDN scripts in index.html)
        firebase: 'readonly',

        // PWA install prompt globals (used in index.html + pwa.js)
        __iarInstallPrompt: 'writable',
        __iarPWAReady: 'writable',

        // Debug handle exposed on window
        __IAR: 'writable'
      }
    },

    // ============================================================
    // 3. القواعد (Rules)
    // ============================================================
    rules: {
      // ─── Errors: أخطاء حقيقية ────────────────────────────
      'no-undef': 'error',              // استخدام متغير غير معرّف
      'no-unused-vars': ['warn', {       // متغيرات مستوردة/معرّفة ولم تُستخدم
        args: 'after-used',              // تجاهل args في نهاية الدالة
        argsIgnorePattern: '^_',          // تجاهل args تبدأ بـ _
        varsIgnorePattern: '^_',          // تجاهل vars تبدأ بـ _
        caughtErrors: 'none',             // لا تفحص catch(e)
        ignoreRestSiblings: true          // تجاهل { a, ...rest }
      }],
      'no-redeclare': 'error',          // تعريف نفس المتغير مرتين
      'no-unreachable': 'error',         // كود لن يُنفَّذ أبدًا
      'no-dupe-keys': 'error',           // مفاتيح مكررة في object
      'no-dupe-args': 'error',           // args مكررة في دالة
      'no-constant-condition': 'warn',   // if (true) أو while (1)
      'no-empty': ['warn', { allowEmptyCatch: true }],  // بلوك فارغ
      'no-fallthrough': 'error',         // switch بدون break
      'no-cond-assign': ['error', 'except-parens'],  // if (x = 5)
      'use-isnan': 'error',              // x === NaN (بدل Number.isNaN)
      'valid-typeof': 'error',           // typeof x === 'strng' (خطأ كتابي)
      'no-self-assign': 'error',         // x = x
      'no-self-compare': 'error',        // x === x
      'no-unmodified-loop-condition': 'warn',  // while (x < 5) بدون تعديل x

      // ─── Best Practices: ممارسات جيدة ──────────────────────
      'eqeqeq': ['warn', 'smart'],       // استخدم === بدل ==
      'no-var': 'error',                 // استخدم let/const بدل var
      'prefer-const': ['warn', {         // استخدم const إذا لم تُعدّل
        destructuring: 'all'
      }],
      'no-eval': 'error',                // eval() خطر أمني
      'no-implied-eval': 'error',        // setTimeout('code', ...) خطر
      'no-new-func': 'error',            // new Function() خطر
      'no-return-assign': ['error', 'except-parens'],
      'no-sequences': 'warn',            // (a, b) commas
      'no-throw-literal': 'warn',        // throw 'error' (استخدم Error)
      'no-useless-catch': 'warn',        // try/catch يرمي نفس الخطأ
      'no-useless-concat': 'warn',       // 'a' + 'b' بدل 'ab'
      'no-useless-escape': 'warn',       // \. في regex حيث . كافٍ

      // ─── Style: تنسيق (أخف من Prettier لكن مفيد) ────────────
      'no-trailing-spaces': 'warn',      // مسافات في نهاية السطر
      'no-multiple-empty-lines': ['warn', { max: 2 }],
      'no-tabs': 'warn'                   // استخدم مسافات لا tabs
    }
  },

  // ============================================================
  // 4. استثناءات: ملفات لا نخضعها للقواعد الصارمة
  // ============================================================
  {
    files: ['sw.js'],
    languageOptions: {
      globals: {
        // Service Worker scope
        self: 'readonly',
        clients: 'readonly'
      }
    }
  }
];
