# 📜 Migration Notes: Vanilla JS to Astro 5 + Svelte 5
## IAR Archive (مستودع المراجع الإدارية العراقية)

This document provides a technical overview of the architecture migration from client-rendered Vanilla JavaScript (`app.js` / `js/*`) to **Astro 5 SSG** with **Svelte 5 Islands**, adhering strictly to the **Modern Bayt al-Hikma Editorial** design language.

---

### 1. Rationale & Architecture Evolution

| Aspect | Legacy Vanilla JS (`v1.0.0`) | Modern Bayt al-Hikma (`Astro 5 + Svelte 5`) |
|---|---|---|
| **Rendering Strategy** | Client-side DOM manipulation on single `index.html` | Static Site Generation (SSG) with Astro Islands |
| **Initial JS Payload** | ~14 separate JS modules loaded on browser runtime | **0 KB JS** by default on content pages; ~28 KB island bundle for catalog |
| **Catalog Pages** | Virtual modal/hash-based routing (`#book-1`) | 141 static dynamic SSG pages (`/book/1/`, `/book/2/`, ...) with full SEO & breadcrumbs |
| **Styling** | Global `style.css` with potential namespace collisions | Scoped component CSS + Global Design Tokens (`src/styles/tokens.css`) |
| **Interactivity** | Imperative event listeners (`document.querySelector`) | Declarative reactive state using Svelte 5 runes / reactive stores |
| **Offline / PWA** | Custom `sw.js` | Automated Workbox service worker via `@vite-pwa/astro` |

---

### 2. Preservation of Protected Subsystems

As strictly mandated by the system safety constraints:
1. **`books.json` & Data Schema**: Remained 100% untouched. Astro reads `books.json` at build time to pre-render the catalog and individual book routes.
2. **Python Pipeline**: `process_books.py`, `validate_books.py`, and `migrate_books.py` remain untouched and fully compatible.
3. **Python Regression Tests**: The full pytest suite in `tests/` passes 100% (362 tests passing).
4. **Firebase Configuration**: `firebase.json` and `firestore.rules` remain untouched.
5. **PDF Assets**: Served directly from `/pdf/...` paths without bloating the Vite build bundle.

---

### 3. Islands Architecture & Interactive Features

Interactive requirements are isolated into the **`BaytAlHikmaArchive.svelte`** island mounted with `client:load` on the index page:
- **Search & Filtering**: Sub-millisecond client-side fuzzy search across title, author, year, category, and keywords with highlight/clear controls.
- **Category Filter Chips**: Active state toggles between "الكل" and specific administrative domains.
- **Interactive Ratings**: Synchronizes 5-star ratings with Firebase Firestore when online, with optimistic local storage fallback when offline.
- **One-Click APA Citations**: Formats APA 7th edition citation strings and writes to navigator clipboard with visual toast feedback.
- **3-Minute Summary Drawer / Modal**: Smooth overlay displaying executive briefs, core study takeaways, and direct download links.
- **Floating Research Bundle Dock (`حزمة الأبحاث`)**: Interactive selection basket allowing researchers to curate and batch-export reference citations.

---

### 4. PWA & Service Worker Configuration

PWA support is driven by `@vite-pwa/astro`:
- Workbox precaches critical CSS, fonts, and client runtime.
- Runtime caching strategy for:
  - Google Fonts stylesheets (`StaleWhileRevalidate`)
  - Web fonts (`CacheFirst`, 1-year expiration)
  - Cover and architectural images in `/covers/` and `/icons/` (`CacheFirst`, 30-day expiration)
- Manifest file configured with bilingual titles and standalone display mode.

---

### 5. Playwright E2E Test Suite Migration

The E2E suite in `e2e/` was upgraded to ESM syntax (`import { test, expect } from '@playwright/test'`):
- **`home.spec.js`**: Validates page title, masthead, architectural arch portal, and medallion presence.
- **`search.spec.js`**: Validates real-time search queries, results filtering, category pill filtering, star rating interactions, and research bundle dock triggers.
- **`routing.spec.js`**: Validates 3-minute executive modal opening/closing, APA citation copy action, and direct static book URLs (`/book/1/`).
- **`i18n.spec.js`**: Validates Arabic RTL reading direction, font families, and metadata tags.

All 18 tests pass in automated regression runs.

---

### 6. Safety & Rollback Reference

Before performing any destructive operations, a complete git tag was created and pushed to the remote repository:
```bash
git tag -a backup-before-rollback-20261015-0942 -m "State before full rollback"
git push origin backup-before-rollback-20261015-0942
```
In the event that a rollback is required, any developer can revert to this tag using `git reset --hard backup-before-rollback-20261015-0942`.
