<div align="center">

<img src="assets/logo.svg" alt="IAR Archive Logo" width="120" height="120">

# 📚 IAR Archive

### Iraqi Administrative Reference Repository — v3.0.0

**مستودع رقمي لأرشفة وتنظيم المراجع الإدارية العراقية**

[![Release](https://img.shields.io/badge/Release-v3.0.0-d4af37?style=flat&logo=github)](https://github.com/zruuzr/IAR-Archive/releases/tag/v3.0.0)
[![Hosted on Firebase](https://img.shields.io/badge/Hosted%20on-Firebase%20Hosting-orange?style=flat&logo=firebase)](https://iararchive.web.app/)
[![React](https://img.shields.io/badge/React-19.3-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646cff?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38b2ac?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-SW%20v39-blueviolet?style=flat&logo=pwa)](https://web.dev/progressive-web-apps/)
[![References](https://img.shields.io/badge/References-370%20Indexed-gold?style=flat&logo=bookmeter)](books.json)
[![Tests](https://img.shields.io/badge/Tests-533%20Passed-brightgreen?style=flat)](tests/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Auto Process](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml/badge.svg)](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml)

A digital repository dedicated to archiving, organizing, and presenting Iraqi administrative, legal, and economic references within an authentic Mesopotamian & Abbasid heritage design system.

IAR Archive provides structured bilingual metadata, concise 3-minute summaries, APA-style citations, multi-facet sovereign indexing, custom research bundles, and a self-hosted Iraqi-Heritage PDF.js manuscript reader.

**Arabic RTL and English LTR support • Iraqi Heritage Design v3 • Self-Hosted PDF.js Reader • Progressive Web App**

</div>

---

## 🏛️ About IAR Archive

**IAR Archive — Iraqi Administrative Reference Repository (`الأرشيف الإداري العراقي`)** is a digital archival platform designed to preserve, organize, and present Iraqi administrative, academic, legal, and economic references in a structured, searchable, and culturally authentic environment.

The repository currently indexes **370 administrative and academic references** (spanning **1968–2026**) organized across **14 core thematic pathways** and **195 specific granular categories**, unified under the **Iraqi Heritage Design System v3** (Babylonian Ishtar glazed lapis-lazuli, Abbasid gilt ornament, and archival parchment), combining:

* **370 Indexed Bilingual References (`books.json`)** with full bibliographic records, WebP covers, and 370 pre-rendered OpenGraph social share pages (`dist/b/<id>/`).
* **Abbasid Muqarnas Mihrab & Colonnette Interactive Bookshelf (`GateArt` & `HeritageHero`)**: A two-tier Mesopotamian/Abbasid monument crowning a 12-volume interactive cloth-bound bookshelf with grounded spine elevation and a live museum placard.
* **Custom Self-Hosted Heritage PDF.js Reader (`PdfReaderDialog`)**: Built on `pdfjs-dist` with crisp Arabic glyph isolation, 3 reading paper modes (`Original`, `Parchment`, `Night`), 3 layout modes (`Continuous Scroll`, `Single Page`, `Two-Page Book Spread`), 3-tab sidebar (Table of Contents, Thumbnails, Bibliographic Card), full-text search with match stepping, and a WCAG AA 5-breakpoint responsive toolbar (`44×44px` mobile, `40×40px` tablet, `32×32px` desktop) with an Overflow Menu (`⋮`) and iOS Safari Theater Mode fallback.
* **Site-Wide Heritage Cohesion Layer (`heritage-system.css`)**: Unified panels (`.hx-panel`), gilt-framed modals (`.hx-modal*`), facet controls (`.hx-facets`), pagination (`.hx-pg`), toasts (`.hx-toast`), states (`.hx-state`), and a bilingual heritage `404.html` page.
* **Sovereign Archival Index Sidebar (`SovereignSidebar`)**: Orthogonal filtering by Discipline, Historical Era, and Reference Type.
* **Concise 3-Minute Summaries (`SummaryDialog`)**, **1-Click APA Citations**, and **Shareable Research Bundles (`?bundle=1,2,3`)**.
* **Diacritic-Insensitive Arabic & English Search** and `⌘K` / `Ctrl+K` **Spotlight Command Palette**.
* **Community Ratings & Live Telemetry** powered by Firebase Firestore and Anonymous Authentication.
* **Automated AI Document Ingestion (`process_books.py`)** with Gemini & Groq fallback and strict completeness validation.

> **من ألواح سومر إلى أوراق الحاضر**

---

## ✨ Features

### 🏛️ Abbasid Muqarnas Mihrab & Interactive Cloth Bookshelf (`HeroAcademic` & `GateArt`)

* **Monumental Iraqi Architecture**: Features a stepped Babylonian Ishtar ziggurat crown with merlon crenellations, an 11-rosette glazed frieze, spandrel medallions, a smooth 6-row muqarnas vault, a suspended Abbasid Khatim sanctuary lamp, sculpted gilt colonnettes, and a star-studded entablature.
* **12-Volume Interactive Cloth Bookshelf**: Curated flagship volumes bound in **9 archival book-cloth pigments** (`prussian`, `linen`, `terracotta`, `cypress`, `oatmeal`, `oxblood`, `petrol`, `ochre`, `slate`) resting on an aged cedar ledge above a rosette plinth.
* **Grounded Spine Elevation & Live Museum Placard**: Hovering or focusing any spine elevates it smoothly from its base (`transform-origin: bottom center; scaleY(1.06)`) with a gilt crown glow and updates the museum placard (`hx-placard`) with title, author, publication year, and page count; clicking opens the reference monograph.
* **Tactile Paper Acoustics**: Subtle Web Audio bandpass-filtered paper rustle sound effects (with a header mute toggle).

### 📜 Custom Self-Hosted Heritage PDF.js Reader (`PdfReaderDialog`)

* **Self-Hosted Canvas + TextLayer Engine (`pdf-engine.ts`)**: Powered by `pdfjs-dist` (`5.6.205`) with zero dependency on external Mozilla or Google iframe viewers.
* **Crisp Arabic BiDi & Glyph Isolation**: Isolates `<canvas>` and text layers with `direction: ltr; unicode-bidi: isolate; font-variant-ligatures: normal; letter-spacing: 0;` so Arabic words render with intact cursive joining across Chromium, Firefox, and Safari.
* **3 Reading Paper Filters**: Switch instantaneously between **Original (`أصلي`)**, **Heritage Parchment (`رقّ`)**, and **Nocturnal Night (`ليلي`)**.
* **3 Page Layout Modes & Rotation**: **Continuous Scroll (`متصل`)**, **Single Page (`صفحة`)**, and **Two-Page Book Spread (`كتاب`)**, plus `90°` clockwise rotation and zoom presets (`40%`–`300%`, Fit Width, Fit Page).
* **3-Tab Archival Sidebar (`PdfReaderSidebar`)**: Navigate via **Table of Contents (`الفهرس`)**, **Page Thumbnails (`الصفحات`)**, or **Bibliographic Card (`البطاقة`)** with full keyboard arrow navigation (`ArrowLeft`/`ArrowRight`/`Home`/`End`) and 1-click APA citation copy.
* **Full-Text Search**: In-document search bar with live match highlighting and previous/next match stepping.
* **Unified Responsive Button & Accessibility Spec (`heritage-pdf.css`)**:
  * Mathematical touch targets: **`44×44px`** on mobile (`320px–767px`), **`40×40px`** on tablet (`768px–1023px` and coarse pointers), and **`32×32px`** on fine-pointer desktop (`≥1024px`) over a `4px/8px` spacing scale.
  * Single-row masthead and command toolbar across all 5 breakpoints (`320px`, `480px`, `768px`, `1024px`, `1280px+`) with secondary controls progressively housed in an accessible **Overflow Menu (`⋮`)** below `1024px`.
  * Dual-ring `:focus-visible` indicators, WCAG 2.1 AA verified contrast (`12.47:1` light / `7.19:1` dark on active+hover), layered `Escape` dismissal, and iOS Safari CSS Theater Mode (`100dvh` + `safe-area-inset-*`) fallback.

### 🗂️ Sovereign Archival Index & Reference Library

* **Orthogonal Multi-Facet Sidebar (`SovereignSidebar`)**: Filter references simultaneously by **Discipline** (Administration, Finance, Law, Research), **Historical Era** (1968–2005, 2006–2016, 2017–2026), and **Reference Type** (Academic Textbooks, Legal & Regulatory, Practical Guides) using gilt-accented `.hx-facets` controls.
* **14 Core Pathways & 195 Granular Categories (`CategoryPathways`)**: Quick-filter pathway cards with cuneiform & heritage emblems and live volume counts.
* **Mihrab Monograph Spread (`BookDetailsView` & `HeritageBookDetails`)**: Dedicated `?book=ID` view featuring a pointed mihrab cover niche (`NicheArt`), specification strip, numbered key points, clickable keywords, APA citation card, interactive 5-star rating, Baghdadi Square Kufic verification seal, prev/next book navigation, and related references.
* **Grid & List Viewing Modes**: Responsive card grid and compact editorial list view with `.hx-panel--dock` toolbar and `.hx-pg` pagination.
* **Static OpenGraph Share Cards (`scripts/generate-og-pages.mjs`)**: Every reference has a pre-rendered static share page at `/b/<id>/` with a tailored OG image (`/covers/og/<id>.jpg`) for rich previews on Telegram, X/Twitter, WhatsApp, and Facebook.

### 📝 3-Minute Summaries, APA Citations & Research Bundles

* **3-Minute Summaries (`SummaryDialog`)**: Executive brief covering main subject, numbered key points, and target audience in a gilt-frieze `.hx-modal` dialog.
* **APA-Style Citations**: Copy structured APA citations in Arabic or English with a single click.
* **Custom Research Bundles (`BundleBar`)**: Group selected references into custom bundles (`?bundle=1,2,3`) and share them via a single URL.

### 🌐 Bilingual Interface, Kufi Legibility Rule & Heritage Themes

* **Arabic — RTL** and **English — LTR** with logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline`) and selective directional icon mirroring.
* **Typography**: **Amiri** (display serif), **Reem Kufi** (display headings and badges at `≥ 0.95rem` per the Kufi legibility rule), **IBM Plex Sans Arabic / IBM Plex Sans** (UI & body copy), and **IBM Plex Mono** (tabular numerals).
* **Light Parchment (`#F9F6EF`) & Nocturnal Lapis (`#071026`) Themes**: Persistent themes synchronized with browser `theme-color` meta tags and meeting WCAG AA contrast standards (`--hx-gold-ink` `≥ 5.7:1`).

---

## 🏗️ Technology Stack

| Layer                | Technology                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| Frontend Framework   | React 19 (`react` + `react-dom` 19.3)                                          |
| Language & Tooling   | TypeScript 6.0.3 with strict type checking                                     |
| Build & Bundler      | Vite 8.3 (`@vitejs/plugin-react`, ES modules, chunking, OG page postbuild)     |
| Styling & Design     | Tailwind CSS v4 + Heritage CSS layers (`heritage`, `books`, `system`, `pdf`)   |
| PDF Engine           | Self-hosted `pdfjs-dist` (`5.6.205`) Canvas + TextLayer + Outline + Search     |
| UI Primitives        | Heritage Design System v3 components + Lucide Icons                            |
| Database & Auth      | Firebase Firestore & Anonymous Authentication (Modular SDK v13.0.0)            |
| Web Hosting          | Firebase Hosting (`iararchive` on `iar-archive-328bc`)                         |
| Asset & PDF Delivery | GitHub Raw CDN (370 streamed PDFs, WebP covers & OG social cards)              |
| PWA & Offline        | Web App Manifest + Service Worker v39 (`sw.js`)                                |
| Document Extraction  | `firecrawl-anydoc` + `pypdf` + `Pillow` (WebP & OG cover generation)           |
| AI Metadata Pipeline | Google Gemini (`gemini-2.5-flash` / `gemini-2.5-pro`) + Groq (`llama-3.3-70b`) |
| Unit & Integration   | Vitest (**84 unit/component tests** across 8 suites)                           |
| E2E Browser Testing  | Playwright (**23 browser tests** + 5-breakpoint PDF spec verification)         |
| Python Pipeline      | Pytest (**426 unit/integration tests**)                                        |
| Code Quality         | ESLint 9 + Prettier 3 + Husky pre-commit hooks                                 |

---

## 🧩 Architecture

```text
                            IAR Archive v3.0.0 (React 19 + TypeScript)
                                                │
        ┌───────────────────────────────────────┼───────────────────────────────────────┐
        ▼                                       ▼                                       ▼
  React Application                     Firebase Services                        GitHub Actions
  (Vite 8 Bundled)                    (Modular Web SDK v13)                   (Continuous Delivery)
        │                                       │                                       │
  ┌─────┴────────────────────────┐       ┌──────┴──────┐                         ┌──────┴──────┐
  │ Heritage UI & Components     │       │  Firestore  │                         │  Workflows  │
  │ • SiteHeader (Frieze & Seal) │       │  (Ratings,  │                         │ • lint.yml  │
  │ • HeroAcademic & GateArt     │       │   Metrics)  │                         │ • e2e.yml   │
  │   (Abbasid Mihrab & Shelf)   │       ├─────────────┤                         │ • test.yml  │
  │ • SovereignSidebar (.hx-*)   │       │  Anonymous  │                         │ • hosting   │
  │ • CategoryPathways (14/195)  │       │    Auth     │                         └──────┬──────┘
  │ • FeaturedSpotlight          │       └─────────────┘                                │
  │ • BookGrid & HeritageBookCard│                                                      ▼
  │ • BookDetailsView (Mihrab)   │                                               process_books.py
  │ • PdfReaderDialog (PDF.js    │                                               optimize_covers.py
  │   Toolbar, Sidebar, PageView)│                                                      │
  │ • Summary, Spotlight, Zoom   │                                               ┌──────┴──────┐
  │ • SiteFooter                 │                                               ▼             ▼
  └─────┬────────────────────────┘                                            Gemini          Groq
        │                                                                        │             │
        ▼                                                                        └──────┬──────┘
   books.json (370 Indexed References / 195 Categories) ◄───────────────────────────────┘
        │
        ▼
   GitHub Raw CDN (370 PDFs, WebP Covers & OG Cards) + 370 Static /b/<id>/ Share Pages
```

### Style Architecture (`src/styles/`)

1. **`src/index.css`**: Tailwind CSS v4 base, theme variables, and Arabic typography rules.
2. **`src/styles/heritage.css`**: Core Babylonian & Abbasid design tokens, header, hero, Abbasid Muqarnas Mihrab & colonnette bookshelf, spotlight plaque, pathways, journey timeline, and footer.
3. **`src/styles/heritage-books.css`**: 5:7 woven-cloth book covers, mihrab niche details view, cover lightbox, and skeleton cards.
4. **`src/styles/heritage-system.css`**: Site-wide cohesion layer (`.hx-panel`, `.hx-ctl`, `.hx-seg`, `.hx-facets`, `.hx-pg`, `.hx-modal*`, `.hx-toast`, `.hx-state`, Kufi legibility enforcement, and `--hx-gold-ink` WCAG AA tokens).
5. **`src/styles/heritage-pdf.css`**: Self-hosted PDF reader stylesheet with `--pdf-*` custom properties, 5 responsive breakpoints (`320px`–`1280px+`), overflow popover menu, RTL/LTR logical rules, and canvas glyph isolation.

---

## 📱 Progressive Web App (Service Worker v39)

IAR Archive is installable as a standalone Progressive Web App on Desktop, Android, and iOS.

| Resource Type                        | Strategy      | Purpose                                                  |
| ------------------------------------ | ------------- | -------------------------------------------------------- |
| App Shell (`/`, `/index.html`)       | Network First | Delivers the latest release with instant offline fallback|
| Catalog Metadata (`books.json`)      | Network First | Ensures all 370 indexed references stay synchronized     |
| Manifest (`manifest.json`)           | Network First | Keeps PWA theme colors (`#071026` / `#F9F6EF`) synced    |
| Fingerprinted Bundles (`/bundles/*`) | Cache First   | Immutable fingerprinted JS/CSS/PDF.js worker chunks      |
| App Icons (`/icons/*`, `favicon.ico`)| Cache First   | Fast offline icon delivery                               |
| Firebase Auth & Firestore APIs       | Network Only  | Bypassed for live ratings and download telemetry         |
| GitHub Raw PDFs & Book Covers        | Network Only  | Streamed directly from GitHub Raw CDN                    |

---

## 📁 Directory Structure

```text
IAR-Archive/
├── .github/workflows/                        # CI/CD (auto_process, e2e, firebase-hosting, lint, test)
├── assets/logo.svg                           # Official IAR Archive octagram emblem
├── covers/                                   # 370 Reference covers (WebP/JPG + covers/og/*.jpg)
├── icons/                                    # PWA app icons and Apple touch icon
├── pdf/                                      # 370 Reference PDF documents (served via GitHub Raw)
├── scripts/
│   ├── generate-og-pages.mjs                 # Postbuild generator for 370 static /b/<id>/ OG pages
│   └── optimize_covers.py                    # WebP & OpenGraph cover image optimizer
├── src/
│   ├── components/
│   │   ├── features/                         # PdfReaderDialog (+ pdf-reader/), SummaryDialog,
│   │   │                                     # SpotlightSearchDialog, CoverZoomDialog, DownloadProgressDialog
│   │   ├── heritage/                         # GateArt, NicheArt, HeritageHero, HeritageBookCard,
│   │   │                                     # HeritageBookCover, HeritageBookDetails, PathwayGrid,
│   │   │                                     # SpotlightPlaque, JourneyTimeline, CuneiformSeal, ornaments
│   │   ├── layout/                           # SiteHeader, HeroAcademic, SiteFooter, HeritageOrnaments
│   │   ├── library/                          # SovereignSidebar, SearchAndControls, CategoryPathways,
│   │   │                                     # FeaturedSpotlight, BookGrid, BookCard, BookCover,
│   │   │                                     # BookDetailsView, BundleBar, RatingStars, PaginationNav
│   │   └── ui/                               # Shared button primitive (button.tsx)
│   ├── hooks/                                # useCatalog, useLibraryState, useAccessibleDialog, useTheme, etc.
│   ├── i18n/                                 # Bilingual Arabic (RTL) & English (LTR) dictionaries
│   ├── lib/                                  # arabic-search, catalog-query, sovereign-facets, editorial-cloth
│   ├── services/                             # catalog, firebase, firebase-metrics, firebase-ratings, download
│   ├── styles/                               # heritage.css, heritage-books.css, heritage-system.css, heritage-pdf.css
│   ├── App.tsx                               # Root application component
│   └── main.tsx                              # Client entry point
├── tests/                                    # Python pytest suite (426 tests)
├── e2e/                                      # Playwright E2E suite (23 tests)
├── books.json                                # Indexed reference catalog (370 records / 195 categories)
├── index.html                                # Main Vite entry point
├── 404.html                                  # Bilingual Iraqi Heritage 404 page
├── manifest.json                             # PWA Web App Manifest
├── sw.js                                     # Service Worker v39
├── CHANGELOG.md                              # Version history (v1.0.0 -> v2.0.0 -> v3.0.0)
└── package.json                              # v3.0.0 scripts & dependencies
```

---

## 🛠️ Developer Commands & Scripts

| Command                    | Description                                                                   |
| -------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`              | Starts Vite local development server with instant HMR                         |
| `npm run build`            | Typechecks (`tsc -b`), builds `dist/`, and generates 370 OG pages (`dist/b/`) |
| `npm run check`            | Complete verification (`typecheck` + `lint` + `format:check`)                 |
| `npm run test:unit`        | Runs Vitest unit & component test suite (**84 tests** across 8 files)         |
| `npm run test:e2e`         | Runs Playwright E2E browser tests on Chromium (**23 tests**)                  |
| `pytest tests/ -v`         | Runs Python ingestion & validation test suite (**426 tests**)                 |
| `python validate_books.py` | Validates `books.json` schema, covers, and reference integrity                |

---

## 🌐 Live Demo & Release

* **Live Application:** **[iararchive.web.app](https://iararchive.web.app/)**
* **Latest Release:** **[IAR Archive v3.0.0](https://github.com/zruuzr/IAR-Archive/releases/tag/v3.0.0)**

---

## 📜 License

**Copyright © 2026 Zenvex. All Rights Reserved.**

This repository is **proprietary**. Public visibility is maintained for technical delivery of reference assets via GitHub Raw CDN and architectural transparency. See [LICENSE](LICENSE) for full terms.

---

## 🏺 IAR Archive

**من ألواح سومر إلى أوراق الحاضر**
