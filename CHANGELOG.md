# Changelog

All notable changes to **IAR Archive** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Migration of PDF storage from GitHub Raw to object storage
  (Cloudflare R2) — see `AUDIT.md` for details.
- Possible ESLint rule refinements if new patterns emerge.

---

## [2.0.0] - 2026-10-17

Major architecture modernization release. Migrates the frontend from legacy Vanilla
JavaScript to a high-performance, type-safe architecture using React 19, TypeScript,
and Vite, achieving 100% feature parity, complete catalog preservation, and zero regressions.

### Added

- **React 19 & TypeScript Core Architecture**:
  - Full TypeScript implementation with strict type checking across the entire frontend.
  - Component-driven modular architecture under `src/components/`, `src/hooks/`, `src/services/`, and `src/lib/`.
  - Reactive central state management via custom hooks (`useLibraryState`, `useBookRatings`, `usePwaInstall`).
  - Bilingual Context Provider (`I18nProvider`) supporting seamless, real-time Arabic (RTL) and English (LTR) transitions.
- **Vite 6 & Tailwind CSS v4 Build System**:
  - Lightning-fast dev server with Hot Module Replacement (HMR).
  - Modern CSS configuration using `@tailwindcss/vite` and CSS-first `@theme` design tokens.
  - Fingerprinted production bundling with automated asset hashing, code splitting, and sub-second build times.
  - `iarRootAssetsPlugin` Vite plugin to automatically copy static root assets and inject fingerprinted bundle paths into the Service Worker precache.
- **Enhanced Catalog Navigation & Dual Classification**:
  - Clear taxonomy separating **14 core thematic pathways** from **114 specific granular categories**.
  - `CategoryPathways` component providing top density pathways, active category indicator with 1-click reset, and a searchable modal directory indexing all 114 categories with live counts.
  - Diacritic-insensitive Arabic and English search engine (`src/lib/arabic-search.ts`).
  - Deep linking and URL query synchronization for single-book views (`?book=1`), custom bundles (`?bundle=1,2`), category filters (`?category=...`), and search queries (`?q=...`).
- **Research Tools & Interactive Modals**:
  - **3-Minute Summary Modal**: Rapid executive brief highlighting key findings, target audience, and 1-click citation copy.
  - **Cover Zoom Modal**: High-fidelity cover inspection with keyboard navigation and aspect-ratio preservation.
  - **Research Bundle Builder**: Custom selection of references with shareable bundle link generation.
  - **APA Citation Generator**: Bilingual academic and administrative citation generation.
  - **Integrated PDF Reader**: In-app modal PDF viewing with direct download fallback.
  - **Firebase Community Ratings & Telemetry**: 5-star rating system with duplicate prevention and download counter synchronization via Firebase Modular SDK v11.
- **Service Worker v33**:
  - Upgraded to Service Worker `v33` with intelligent multi-tier caching.
  - Network-first strategy for root navigations (`/`, `/index.html`) and catalog metadata (`books.json`).
  - Cache-first strategy for immutable Vite bundles (`/bundles/*`), book covers (`/covers/*.png`), and icons.
  - Automated activation cleanup purging obsolete legacy caches (including `v28` and `v32` Vanilla JS caches).
- **Comprehensive Vitest Suite**:
  - Added 81 unit and component tests across 8 test suites covering services, catalog query engine, hooks, i18n, modals, and library UI.
  - Total automated tests across the repository increased to **518 tests** (81 Vitest + 19 Playwright + 418 Pytest).

### Changed

- **`index.html`**: Converted to modern Vite HTML entry point mounting `src/main.tsx`.
- **`firebase.json`**: Updated hosting configuration to deploy from `dist/` with explicit security and cache-control headers.
- **`README.md`**, **`AUDIT.md`**: Fully updated to document the React 19 architecture, test commands, and deployment verification.

### Preserved

- Complete 173-book catalog (`books.json`) and corresponding cover images (`covers/1.png` – `173.png`).
- Legacy ES modules in `js/` and `app.js` preserved for regression auditing.
- `migration.html` preserved as an isolated testbed entry point.
- Zero breaking changes to public URLs, routing parameters, or citation formats.

---

## [1.0.0] - 2026-09-29

First stable release. Consolidates all remediation work carried out
during the September 2026 engineering audit (see `AUDIT.md`).

### Added

- **LICENSE** — proprietary license with distinct terms for source
  code, reference documents in `pdf/`, and design assets.
- **Comprehensive test suite** — 362 Python tests covering
  `process_books.py`, `migrate_books.py`, and `validate_books.py`.
  - `tests/test_generic_helpers.py` — helper functions
  - `tests/test_json_io.py` — JSON I/O and atomic writes
  - `tests/test_zip_safety.py` — ZIP extraction safety
  - `tests/test_ai_helpers.py` — AI response parsing
  - `tests/test_metadata.py` — metadata validation
  - `tests/test_book_model.py` — Book dataclass
  - `tests/test_validate.py` — catalog validation (124 tests)
  - `tests/test_migrate.py` — catalog migration (120 tests)
- **ES modules architecture** — split monolithic `app.js` (1100+ lines)
  into 14 focused ES modules under `js/`:
  - `js/utils.js`, `js/state.js`, `js/i18n.js`, `js/data.js`
  - `js/firebase.js`, `js/ui-helpers.js`, `js/download.js`, `js/ratings.js`
  - `js/render.js`, `js/router.js`, `js/ui-init.js`, `js/data-fetch.js`
  - `js/pwa.js`, `js/events.js`
- **E2E test suite** — 19 Playwright tests covering:
  - Homepage loading (`e2e/home.spec.js`)
  - Search and filtering (`e2e/search.spec.js`)
  - Book routing and navigation (`e2e/routing.spec.js`)
  - Language and theme (`e2e/i18n.spec.js`)
- **ESLint + Prettier** — automated code quality and formatting checks.
- **husky pre-commit hook** — runs lint and format checks locally
  before each commit.
- **CI workflows** — expanded GitHub Actions coverage:
  - `test.yml` — Python tests on Python 3.12 and 3.13
  - `e2e.yml` — Playwright tests on Chromium
  - `lint.yml` — ESLint + Prettier checks
- **`SECURITY.md`** — responsible disclosure policy with GitHub Private
  Vulnerability Reporting.
- **`AUDIT.md`** — historical record of the engineering audit and
  all remediation work.
- **`package.json`** — Node dev tooling for ESLint, Prettier, and
  Playwright (the application itself remains Vanilla JS with no build step).

### Changed

- **`app.js`** — reduced from 1100+ lines to ~20 lines (entry point
  that imports and boots the modules).
- **`index.html`** — `app.js` now loads as `type="module"`.
- **`sw.js`** — bumped `CACHE_VERSION` to `v28`; `APP_SHELL` now
  includes all 14 JS modules; `isAppShell()` recognizes `/js/*.js`.
- **`README.md`** — updated license section and added reference to
  `AUDIT.md`; consolidated duplicated content.
- **`firebase.json`** — cleaned up ignore list.
- **`.gitignore`** — added coverage artifacts, Node modules, and
  Playwright output directories.
- **`requirements.txt`** — added `pytest`, `pytest-cov`, `pytest-mock`.

### Fixed

- **`js/render.js`** — search-clear button visibility now synced
  from `state.filters.query` on every render, making it idempotent
  and fixing a race condition discovered by E2E tests.
- **`migrate_books.py`** — documented known limitation where
  `featured: 1` is not normalized to `featured: True` due to Python's
  `1 == True` equality. No practical impact (identical JSON output);
  documented in `tests/test_migrate.py`.

### Removed

- **`COPYRIGHT.md`** — content merged into `LICENSE` for clarity.
- **Unused imports** — removed 5 unused imports identified by ESLint:
  `js/ratings.js` (`$`, `timeout`), `js/render.js` (`$$`, `motion`),
  `js/ui-helpers.js` (`clean`).

### Security

- **`firestore.rules`** — reviewed during audit; confirmed to
  prevent deletion, enforce type validation, and limit counter
  increments to +1 per operation. No changes required.

---

## Notes on Versioning

- **MAJOR** version changes will only happen if the URL structure
  or public API changes in a way that breaks existing links.
- **MINOR** version changes will add features (new sections,
  new reference metadata fields, new languages).
- **PATCH** version changes will fix bugs without changing behavior.

---

## Links

- **Live site:** [iararchive.web.app](https://iararchive.web.app/)
- **Repository:** [github.com/zruuzr/IAR-Archive](https://github.com/zruuzr/IAR-Archive)
- **Audit log:** [AUDIT.md](AUDIT.md)
- **License:** [LICENSE](LICENSE)
- **Security policy:** [SECURITY.md](SECURITY.md)

---

[Unreleased]: https://github.com/zruuzr/IAR-Archive/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/zruuzr/IAR-Archive/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/zruuzr/IAR-Archive/releases/tag/v1.0.0
