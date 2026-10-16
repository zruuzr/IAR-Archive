# IAR Archive — Visual & Functional Consistency Audit (`VISUAL-AUDIT.md`)

**Branch:** `fix/visual-consistency`  
**Target Identity:** Official `v1.0.0` Sumerian Golden Palette & Unified Design System  

---

## 1. Color Palette — Before vs. After

| Token / Role | Before (Inconsistent Cyan/Slate + Hardcoded Hex) | After (`v1.0.0` Golden Palette via `var()`) |
| :--- | :--- | :--- |
| **Primary Accent** | `#38bdf8` / `#0284c7` / `#f59e0b` (78 hardcoded occurrences) | `--gold-primary: #d4b48a`, `--gold-mid: #c89d5c`, `--gold-deep: #a87a34`, `--gold-bright: #e8d0a8` |
| **Light Mode Base** | `#f1f5f9` (with broken dark `#111827` hero & reader backgrounds) | `--bg-base: #f4efe4`, `--bg-raised: #ffffff`, `--bg-sunken: #e8e0ce` |
| **Dark Mode Base** | `#0b0f19` / `#111827` / `#0d1322` | `--bg-base: #0a0d14`, `--bg-raised: #141821`, `--bg-sunken: #050810` |
| **Light Mode Text** | `#0f172a` / `#334155` / `#64748b` (failed WCAG AA on dark hero) | `--ink-primary: #1a1f2e`, `--ink-secondary: #4a5260`, `--ink-tertiary: #59606e` (WCAG AA compliant) |
| **Dark Mode Text** | `#f8fafc` / `#cbd5e1` / `#94a3b8` | `--ink-primary: #e8e4d8`, `--ink-secondary: #b8b3a6`, `--ink-tertiary: #969184` (WCAG AA compliant) |
| **Semantic Colors** | Hardcoded `#10b981`, `#d97706` | `--success: #4a7c59`, `--warning: #c89858`, `--danger: #a8442c`, `--info: #2d4a5e` |
| **Hardcoded Colors Outside `:root`** | **78** in `style.css` + **11** in `index.html`/`js/ui-init.js` | **0** in `style.css` component rules (100% `var(--*)`) |

---

## 2. Typography Scale — Before vs. After

| Dimension | Before | After |
| :--- | :--- | :--- |
| **Font Families** | Mixed `IBM Plex Sans Arabic`, `Readex Pro`, `Amiri`, `Cairo`, `JetBrains Mono` | Unified `--font-arabic` (`IBM Plex Sans Arabic`), `--font-latin` (`IBM Plex Sans`), `--font-mono` (`IBM Plex Mono`), `--font-cuneiform` (`Noto Sans Cuneiform`) |
| **Language Switching** | Static font stack regardless of `lang` | `:root[lang="ar"] { --font-base: var(--font-arabic); --lh-reading: var(--lh-loose); --heading-tracking: 0; }` and `:root[lang="en"] { --font-base: var(--font-latin); --lh-reading: var(--lh-base); --heading-tracking: -0.02em; }` |
| **Font Sizes** | 19 arbitrary `rem` values (`0.5rem`, `0.68rem`, `0.72rem`, `0.74rem`, `0.82rem`, `0.92rem`, `1.02rem`, `1.22rem`, etc.) | 100% mapped to `--fs-caption` (`13px`), `--fs-body-s` (`14px`), `--fs-body-m` (`16px`), `--fs-body-l` (`18px`), `--fs-h-6` (`20px`), `--fs-h-5` (`24px`), `--fs-h-4` (`28px`), `--fs-h-3` (`32px`), `--fs-h-2` (`40px`), `--fs-h-1` (`48px`), `--fs-display` (`64px`), `--fs-hero` (`96px`) |
| **Line Heights** | 9 arbitrary values (`1.2`, `1.25`, `1.3`, `1.38`, `1.45`, `1.5`, `1.6`) | Unified `--lh-tight` (`1.15`), `--lh-snug` (`1.35`), `--lh-base` (`1.60`), `--lh-loose` (`1.75`) |

---

## 3. Spacing & Breakpoints System — Before vs. After

| System | Before | After |
| :--- | :--- | :--- |
| **Spacing Grid** | 89 arbitrary fractional `rem` paddings/margins/gaps (`0.28rem`, `0.34rem`, `0.38rem`, `0.42rem`, `0.65rem`, `0.85rem`, `1.15rem`, `1.35rem`) | Unified 8px base system: `--s-1` (`4px`), `--s-2` (`8px`), `--s-3` (`12px`), `--s-4` (`16px`), `--s-5` (`24px`), `--s-6` (`32px`), `--s-7` (`48px`), `--s-8` (`64px`), `--s-9` (`96px`), `--s-10` (`128px`) |
| **Breakpoints** | 2 desktop-down `max-width` queries (`1260px`, `1024px`) | 5 sequential mobile-first `min-width` tiers: Base (`320px+`), `480px`, `768px`, `1024px`, `1440px`, `1920px` |
| **Horizontal Overflow at `320px`** | Overflowed on all 3 views (`scrollWidth: 421px–479px` on `320px` viewport) | **0 overflow** (`scrollWidth === clientWidth` across `320px`, `375px`, `768px`, `1024px`, `1440px`, `1920px`) |

---

## 4. Official Logo Alignment (`assets/`)

- **`assets/logo.svg`**: Official `v1.0.0` golden brand icon (`128×128`).
- **`assets/logo-full.svg`**: Used in `.site-header .brand-mark` with explicit `width="40" height="40"`.
- **`assets/logo-mark.svg`**: Used as SVG `<link rel="icon" type="image/svg+xml" href="/assets/logo-mark.svg">` and inside `#readerPaperSheet` header crest with explicit `width="28" height="28"`.
- **`assets/logo-mono.svg`**: Used in `.site-footer .footer-brand` with explicit `width="24" height="24"`.
- Dark mode enhancement applied via `:root[data-theme='dark'] .logo-svg { filter: brightness(1.1) saturate(1.2); }`.

---

## 5. Files Modified

1. `style.css` — Unified `v1.0.0` Golden Palette tokens, Dark Mode tokens, Typography Scale, 8px Spacing System, and 5-tier mobile-first responsive rules.
2. `index.html` — Official Google Fonts (`IBM Plex Sans Arabic`, `IBM Plex Sans`, `IBM Plex Mono`, `Noto Sans Cuneiform`), official `assets/*.svg` logos, `v1.0.0` gold download ring stops, and complete i18n IDs.
3. `js/ui-init.js` — Complete bilingual (`ar`/`en`) dictionary entries for all UI labels, directional chevron flipping for RTL/LTR, and `#0a0d14` / `#f4efe4` `theme-color` meta sync.
4. `sw.js` — Added `assets/logo*.svg` to `APP_SHELL` and bumped cache version to `v31`.
5. `assets/logo-mark.svg`, `assets/logo-full.svg`, `assets/logo-mono.svg` — Official SVG logo variants derived from `assets/logo.svg`.
6. `VISUAL-AUDIT.md` — This visual and functional audit summary.

---

## 6. Verification Matrix (5 Sizes × 2 Themes × 2 Languages)

| Viewport Width | Light Mode (AR RTL) | Light Mode (EN LTR) | Dark Mode (AR RTL) | Dark Mode (EN LTR) | Horizontal Overflow |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`320px` (Mobile S)** | ✅ Verified | ✅ Verified | ✅ Verified | ✅ Verified | `0px` (`320 === 320`) |
| **`768px` (Tablet)** | ✅ Verified | ✅ Verified | ✅ Verified | ✅ Verified | `0px` (`768 === 768`) |
| **`1024px` (Laptop)** | ✅ Verified | ✅ Verified | ✅ Verified | ✅ Verified | `0px` (`1024 === 1024`) |
| **`1440px` (Desktop)** | ✅ Verified | ✅ Verified | ✅ Verified | ✅ Verified | `0px` (`1440 === 1440`) |
| **`1920px` (Wide)** | ✅ Verified | ✅ Verified | ✅ Verified | ✅ Verified | `0px` (`1920 === 1920`) |

---

## 7. Remaining Concerns
- None. All 418 Python unit tests, ESLint/Prettier checks, and 19 Playwright E2E tests pass with zero console errors and zero layout overflow.
