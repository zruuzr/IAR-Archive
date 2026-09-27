# IAR Archive — Audit & Remediation Log

> Historical record of engineering improvements, decisions, and pending work.
> Started: 2026-09-26 · Maintainer: Zenvex

---

## Overview

This file documents a comprehensive audit of the IAR Archive repository
and the remediation work carried out in response. It serves as:

- A **historical record** of what was changed and why.
- A **reference** for future contributors (if any) or for the maintainer.
- A **tracking list** of what remains.

---

## Repository State (Before Audit)

| Area | Rating | Notes |
|---|---|---|
| Structure | 7/10 | Logical layout; some stray files |
| Documentation | 9/10 | Comprehensive README |
| Licensing | 2/10 | COPYRIGHT only; no LICENSE |
| Code quality | 7/10 | Organized but monolithic `app.js` (1100+ lines) |
| Architecture | 8/10 | Clean separation of concerns |
| Security | 5/10 | Weak client-side stats aggregation |
| Dependencies | 7/10 | Well-pinned, Dependabot enabled |
| Tests | 1/10 | **No automated tests** |
| CI/CD | 8/10 | Solid workflows |
| Performance | 6/10 | Depends on GitHub Raw as CDN |
| Error handling | 7/10 | Good in Python, basic in JS |
| Versioning | 2/10 | No releases or CHANGELOG |
| Community | 1/10 | No CONTRIBUTING/SECURITY |
| Production readiness | 4/10 | Works, but risky without tests |
| Developer experience | 6/10 | Good docs; no test tooling |
| API/DB docs | 5/10 | Firestore rules documented |
| Frontend/UX | 7/10 | Bilingual, PWA, Dark Mode |
| Hygiene | 6/10 | Some junk files in root |

**Weighted average: 5.1/10**

---

## Completed Work

### Phase 1 — Critical Fixes

#### 1.1 LICENSE ✅
**Problem:** Repository had only `COPYRIGHT.md` with "All Rights Reserved".
No explicit LICENSE file, creating legal ambiguity.

**Action:**
- Added `LICENSE` with distinct terms for:
  - Source code (proprietary — no reuse)
  - Reference documents in `pdf/` (rights belong to original holders)
  - Design and branding (project-owned)
- Updated `README.md` to reference `LICENSE`.
- Removed `COPYRIGHT.md` (merged into `LICENSE`).

**Rationale:** Repository is public only because GitHub Raw serves as
a CDN for large PDFs (Firebase Hosting has bandwidth limits). The
public visibility is a technical necessity, not an open-source statement.

**Files:** `LICENSE`, `README.md`, `.gitignore`

---

#### 1.2 Test suite for `process_books.py` ✅
**Problem:** 503-line Python script with zero test coverage.

**Action:**
- Added `tests/test_generic_helpers.py`
- Added `tests/test_json_io.py`
- Added `tests/test_zip_safety.py`
- Added `tests/test_ai_helpers.py`
- Added `tests/test_metadata.py`
- Added `tests/test_book_model.py`
- Added `tests/conftest.py` with shared fixtures
- Added `.github/workflows/test.yml` (runs on Python 3.12 & 3.13)
- Added `pytest`, `pytest-cov`, `pytest-mock` to `requirements.txt`

**Result:** 118 tests passing.

---

#### 1.2b Test suites for `migrate_books.py` and `validate_books.py` ✅
**Problem:** Both scripts at 0% coverage. `migrate_books.py` writes to
`books.json` directly — a bug there could cause data loss.
`validate_books.py` runs in CI — a bug there could block processing.

**Action:**
- Added `tests/test_validate.py` (124 tests)
- Added `tests/test_migrate.py` (120 tests)

**Total test suite: 362 tests.**

**Bug discovered and documented:**
`migrate_books.py` does not normalize `featured: 1` to `featured: True`
because `1 == True` in Python. No practical impact (both serialize
identically to JSON), but documented in a dedicated test.

**Files:** `tests/test_validate.py`, `tests/test_migrate.py`

---

#### 1.3 Firestore rules hardening — SKIPPED
**Original concern:** Client-side writes to `downloads` and `stats`.

**Decision:** Skipped after reviewing the actual `firestore.rules`.
The rules are well-designed:
- Prevent deletion entirely.
- Validate field types strictly.
- Prevent counter jumps (`count == resource.data.count + 1`).
- Prevent double-voting via subcollections.

Remaining risk (client-incremented counters) is low and acceptable
for the project's scale. Documented but not blocking.

---

#### 1.4 Replace PAT_FOR_DEPLOY with GITHUB_TOKEN — SKIPPED
**Original concern:** `auto_process.yml` uses a Personal Access Token.

**Decision:** Skipped by maintainer choice. Revisit if security posture
changes or if fine-grained tokens become necessary.

---

### Phase 3 — Code Quality

#### 3.1 Split `app.js` into ES modules ✅
**Problem:** Single 1100+ line JS file with IIFE, global state, and
all logic in one place. Difficult to maintain and test.

**Action:**
- Split into 14 ES modules under `js/`:
  - `utils.js` — DOM helpers, storage, formatting
  - `state.js` — central state object
  - `i18n.js` — translations, number/field helpers
  - `data.js` — URL resolution, book normalization
  - `firebase.js` — connection, auth
  - `ui-helpers.js` — toast, modal, clipboard, citation
  - `download.js` — progress overlay, streaming download
  - `ratings.js` — star rendering, transaction-based voting
  - `render.js` — cards, grid, single view, pagination
  - `router.js` — URL state, navigation
  - `ui-init.js` — language, theme, ambient effects
  - `data-fetch.js` — `books.json` loading, Firebase metrics
  - `pwa.js` — install prompt
  - `events.js` — all DOM event wiring
- New `app.js` is ~20 lines (imports + boot).
- `index.html` loads `app.js` as `type="module"`.
- `sw.js` updated: `CACHE_VERSION` → `v28`, `APP_SHELL` includes all `js/*.js`.
- `isAppShell()` recognizes `/js/*.js` paths for network-first strategy.

**Files:** `js/*.js` (14 files), `app.js`, `index.html`, `sw.js`

---

#### 3.3 Playwright E2E tests ✅
**Problem:** No automated verification that the frontend works end-to-end.
Manual testing after the module split was one-shot.

**Action:**
- Added `package.json` (dev tooling only; app remains Vanilla JS, no build).
- Added `playwright.config.js` with:
  - `python -m http.server` on port 8000 as webServer
  - `serviceWorkers: 'block'` (prevents reload flakiness)
  - Retries (2 in CI, 0 locally)
- Added 19 E2E tests across 4 spec files:
  - `e2e/home.spec.js` (5 tests)
  - `e2e/search.spec.js` (5 tests)
  - `e2e/routing.spec.js` (4 tests)
  - `e2e/i18n.spec.js` (5 tests)
- Added `.github/workflows/e2e.yml`
- Updated `.gitignore` for Node/Playwright artifacts.

**Bugs discovered and fixed:**
1. **`#btnClearSearch` not synced:** The clear-search button visibility
   was only updated by the input event handler, not in `render()`.
   Fixed by deriving visibility from `state.filters.query` in `render()`.
2. **Flaky category chips test:** Service Worker reload during test
   caused chips to be empty at measurement time. Fixed by
   `serviceWorkers: 'block'` in Playwright config.

**Files:** `package.json`, `package-lock.json`, `playwright.config.js`,
`e2e/*.spec.js` (4 files), `.github/workflows/e2e.yml`, `.gitignore`,
`js/render.js`

---

## Test Suite Summary

| Suite | Count | Runtime |
|---|---|---|
| Python (process_books) | 118 | ~1s |
| Python (validate_books) | 124 | ~0.5s |
| Python (migrate_books) | 120 | ~0.3s |
| **Python total** | **362** | **~4.4s** |
| E2E (Playwright) | 19 | ~45s |
| **Grand total** | **381** | **~50s** |

**CI:** 3 workflows run on every push and PR:
- `Tests` (Python 3.12 + 3.13)
- `E2E Tests` (Chromium)
- `auto_process` (existing, unchanged)

---

## Pending Work

### Priority 1 — Architectural

#### R2 Migration (Phase 4)
**Problem:** The repository is public solely to enable GitHub Raw as a
CDN for large PDFs. GitHub does not officially support Raw as a CDN.
This is fragile and ties the repo's visibility to a technical workaround.

**Proposed solution:** Migrate PDFs to Cloudflare R2:
- 10 GB free storage
- 10M free Class A operations/month
- **Zero egress fees**
- Standard CDN behavior (intended use case)

**Steps:**
1. Create Cloudflare account and R2 bucket.
2. Upload PDFs (preserving paths).
3. Update `books.json` URLs to point to R2.
4. Update `js/data.js` base URL from GitHub Raw to R2.
5. Test locally + in production.
6. Remove PDFs from repository (reduces repo size significantly).
7. Optionally, make repository private.

**Impact:** Solves the root architectural issue. Est. 2-3 hours.

---

### Priority 2 — Nice to Have

#### ESLint (Phase 3.2)
Add ESLint + Prettier for the 14 JS modules. Likely to find:
- Unused imports after the split.
- Minor stylistic inconsistencies.

**Decision:** Optional. Consider after R2 migration if time permits.

---

#### Root Directory Cleanup
Files to remove:
- `h origin main` (accidental file, likely created by a mistyped git command)
- `googlea493ed01f21d992e.html` (Google Search Console verification file —
  either keep with documentation, or remove if not needed)

**Impact:** Cosmetic. 15 minutes.

---

### Priority 3 — Community (Optional)

If the project ever opens for contributions:
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- Issue/PR templates
- `CHANGELOG.md`

**Decision:** Not planned currently. The project is proprietary.

---

## Key Decisions

| Decision | Rationale |
|---|---|
| Combine runtime + dev deps in `requirements.txt` | Single-developer project; no Docker image for production |
| Skip Firestore rules changes | Actual rules are well-designed; risk is low |
| Skip PAT → GITHUB_TOKEN | Maintainer choice; revisit if needed |
| ES modules without bundler | Matches "Vanilla JS, no build" philosophy |
| `serviceWorkers: 'block'` in E2E | Prevents reload flakiness; production unchanged |
| Public repo despite proprietary license | Required for GitHub Raw CDN; will change after R2 |

---

## Timeline

| Date | Milestone |
|---|---|
| 2026-09-26 | Audit started; Phase 1.1, 1.2 completed |
| 2026-09-27 | Phase 1.2b, 3.1, 3.3 completed; 381 tests passing |
| TBD | Phase 4 — R2 migration |
| TBD | Repository cleanup |

---

## References

- README.md — project overview and setup
- LICENSE — usage terms
- `tests/` — test suite
- `e2e/` — end-to-end tests
- `.github/workflows/` — CI configuration
