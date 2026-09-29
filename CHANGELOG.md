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

[Unreleased]: https://github.com/zruuzr/IAR-Archive/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/zruuzr/IAR-Archive/releases/tag/v1.0.0
