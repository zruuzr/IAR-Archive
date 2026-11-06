<div align="center">

<img src="assets/logo.svg" alt="IAR Archive Logo" width="120" height="120">

# 📚 IAR Archive

### Iraqi Administrative Reference Repository

**مستودع رقمي لأرشفة وتنظيم المراجع الإدارية العراقية**

[![Hosted on Firebase](https://img.shields.io/badge/Hosted%20on-Firebase%20Hosting-orange?style=flat&logo=firebase)](https://iararchive.web.app/)
[![React](https://img.shields.io/badge/React-19.3-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646cff?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38b2ac?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-SW%20v36-blueviolet?style=flat&logo=pwa)](https://web.dev/progressive-web-apps/)
[![References](https://img.shields.io/badge/References-247%20Indexed-gold?style=flat&logo=bookmeter)](books.json)
[![Tests](https://img.shields.io/badge/Tests-531%20Passed-brightgreen?style=flat)](tests/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Auto Process](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml/badge.svg)](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml)

A digital repository dedicated to archiving, organizing, and presenting Iraqi administrative references.

IAR Archive provides structured reference metadata, concise summaries, APA-style citations, searchable categories, document bundles, and direct access to administrative materials.

**Arabic RTL and English LTR support • Progressive Web App • Automated document indexing**

</div>

---

## 🏛️ About IAR Archive

**IAR Archive — Iraqi Administrative Reference Repository** is a digital repository designed to organize Iraqi administrative, academic, and professional references in a structured and searchable environment.

The project aims to make administrative references easier to discover, understand, cite, and use by researchers, university students, administrative professionals, and executive managers.

The repository currently indexes **247 administrative and academic references** (covering 1968–2026) organized across **14 core thematic pathways** (the foundational administrative domains), navigated through **115+ specific granular categories**, a **Sovereign Archival Index sidebar** (filtering orthogonally by discipline, historical era, and reference type), and a **13-volume interactive cloth-bound bookshelf**, combining:

* Structured bilingual bibliographic metadata (`books.json`).
* Interactive 13-volume cloth bookshelf with instant hover cover preview and museum placard.
* Concise 3-minute reference summaries and key points.
* Multi-facet administrative and academic categorization.
* Diacritic-insensitive Arabic & English search and `⌘K` Spotlight command palette.
* APA-style citation generation.
* Custom shareable research bundles.
* In-app PDF reader and direct streamed downloads with progress tracking.
* Community ratings and live download/visit statistics.
* Automated AI document processing and metadata extraction with strict completeness validation.
* Arabic (RTL) and English (LTR) interfaces with light parchment and dark obsidian themes.

> **من ألواح سومر إلى أوراق الحاضر.**

---

## ✨ Features

### 📖 Interactive 13-Volume Cloth Bookshelf (`HeroAcademic`)

* Displays 13 curated flagship volumes bound in **9 archival book-cloth pigments** (`prussian`, `linen`, `terracotta`, `cypress`, `oatmeal`, `oxblood`, `petrol`, `ochre`, `slate`).
* **Hover & Click Unfolding**: Hovering over any spine smoothly unfolds the volume face-out to display its **original book cover** alongside its catalog number and publication year.
* **Live Museum Placard**: Dynamically updates beneath the shelf with the active book's full title, author, category, and direct actions to inspect the reference monograph or read the PDF.
* **Segmented Discipline Tabs**: Filter the shelf across All Selections, Administration, Accounting & Finance, Law & Contracts, and Archive & Research.
* **Tactile Paper Acoustics & Magnetic Cursor**: Subtle Web Audio bandpass-filtered paper rustle sound effects (with header mute toggle) and a desktop magnetic preview cursor badge.

### 🗂️ Sovereign Archival Index & Reference Library

* **Orthogonal Multi-Facet Sidebar (`SovereignSidebar`)**: Filter references simultaneously by **Discipline** (Administration, Finance, Law, Research), **Historical Era** (1968–2005, 2006–2016, 2017–2026), and **Reference Type** (Academic Textbooks, Legal & Regulatory, Practical Guides) without overwriting the active search input.
* **14 Core Pathways & Granular Category Directory (`CategoryPathways`)**: Quick-filter chips with live volume counts and a full searchable category directory.
* **3D Hardcover Monograph Spread (`BookDetailsView`)**: Dedicated `?book=ID` view featuring a 3D hardcover book pedestal with layered cream paper-block edges, a 4-column specification grid, numbered key points, and full-resolution cover zoom.
* **Grid & List Viewing Modes**: Responsive card grid and compact editorial list view with high-contrast cloth spine ribbons.
* **Favorites**: Save favorite references locally in the browser.

### 📝 3-Minute Summaries

Each reference includes a concise overview covering its main subject, core key points, and intended audience, helping researchers determine relevance before opening or downloading the full document.

### 📑 APA-Style Citations

Generate and copy structured APA-style citations in Arabic or English with a single click from any book card, summary dialog, or monograph details view.

### 📦 Custom Research Bundles

Group selected references into custom research bundles (`?bundle=1,2,3`) and share them through a generated link to prepare focused collections around specific administrative or legal topics.

### 🌐 Bilingual Interface & Editorial Typography

* **Arabic — RTL** and **English — LTR** with automatic layout and direction switching.
* Engineered typography pairing **Amiri** (display serif), **IBM Plex Sans Arabic / IBM Plex Sans** (UI & body copy with explicit OpenType ligature suppression to preserve crisp Arabic letterforms), and **IBM Plex Mono** (tabular numerals and catalog codes).

### 🌙 Warm Parchment & Dark Obsidian Themes

Persistent light (`#f2ede2` cotton-rag parchment) and dark (`#131519` obsidian slate) themes meeting WCAG AA contrast ratios.

### 📥 Download System & Externalized Asset CDN

* Real-time download progress dialog with percentage completed, transferred/total byte size, cancellation support, and timeout handling.
* Both **PDF documents (`pdf/*.pdf`)** and **book covers (`covers/*.webp`)** are served directly via **GitHub Raw CDN** rather than bundled into Firebase Hosting, keeping the hosted web app ultra-lightweight (~1.3 MB) and preventing Firebase Hosting storage quota limits.

### 📊 Community Metrics & Official Channels

* Firebase Firestore and Anonymous Authentication power live download counts, user star ratings, and visit statistics.
* Official community channels showcase in the footer for **Telegram (`@iarArchive`)** and **TikTok (`@iar.archive`)**.

---

## 🏗️ Technology Stack

IAR Archive uses a modern, type-safe, and highly optimized frontend architecture powered by React 19, TypeScript, and Vite.

| Layer                | Technology                                                  |
| -------------------- | ----------------------------------------------------------- |
| Frontend Framework   | React 19 (`react` + `react-dom` 19.3)                       |
| Language & Tooling   | TypeScript 6.0.3 with strict type checking                  |
| Build & Bundler      | Vite 8.3 (`@vitejs/plugin-react`, ES modules, chunking)     |
| Styling & UI Tokens  | Tailwind CSS v4 (`@tailwindcss/vite`, modern `@theme`)      |
| UI Primitives        | Radix UI / shadcn-inspired components + Lucide Icons        |
| Database             | Firebase Firestore (Modular SDK v13.0.0)                    |
| Authentication       | Firebase Anonymous Authentication (Modular SDK v13.0.0)     |
| Web Hosting          | Firebase Hosting (`iararchive` on `iar-archive-328bc`)      |
| Asset & PDF Delivery | GitHub Raw CDN (streamed PDFs & WebP covers)                |
| PDF Viewer           | In-app Modal PDF reader & direct reading fallback           |
| PWA & Offline        | Web App Manifest + Service Worker v36 (`sw.js`)             |
| Document Extraction  | `firecrawl-anydoc` + `pypdf`                                |
| Primary AI           | Google Gemini (`gemini-2.5-flash` / `gemini-2.5-pro`)       |
| AI Fallback          | Groq (`llama-3.3-70b-versatile`)                            |
| Unit & Integration   | Vitest (82 unit/component tests)                            |
| E2E Browser Testing  | Playwright (23 browser tests on Chromium)                   |
| Python Pipeline      | Pytest (426 unit/integration tests)                         |
| CI/CD & Automation   | GitHub Actions (typecheck, lint, test, e2e, deploy)         |
| Code Quality         | ESLint 9 + Prettier 3 + Husky                               |
| Dependency Updates   | Dependabot                                                  |

---

## 🧩 Architecture

The application is structured around a modular, reactive architecture that decouples UI components, catalog state, service layers, and background processing pipelines:

```text
                           IAR Archive (React 19 + TypeScript)
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  React Application              Firebase Services                 GitHub Actions
  (Vite Bundled)             (Modular Web SDK v13)               (Continuous Delivery)
        │                                │                                │
  ┌─────┴──────────────────┐      ┌──────┴──────┐                  ┌──────┴──────┐
  │ Components & UI        │      │  Firestore  │                  │  Workflows  │
  │ • SiteHeader & TopBar  │      │  (Ratings,  │                  │ • lint.yml  │
  │ • HeroAcademic (Shelf) │      │   Metrics)  │                  │ • e2e.yml   │
  │ • SovereignSidebar     │      ├─────────────┤                  │ • test.yml  │
  │ • CategoryPathways     │      │  Anonymous  │                  │ • hosting   │
  │ • SearchAndControls    │      │    Auth     │                  └──────┬──────┘
  │ • BookGrid & BookCard  │      └─────────────┘                         │
  │ • BookDetailsView (3D) │                                              ▼
  │ • Dialogs (Summary,    │                                       process_books.py
  │   CoverZoom, PdfReader,│                                              │
  │   Spotlight, Progress) │                                       ┌──────┴──────┐
  │ • SiteFooter           │                                       ▼             ▼
  └─────┬──────────────────┘                                    Gemini          Groq
        │                                                          │             │
  ┌─────┴──────────────────┐                                       └──────┬──────┘
  │ Hooks, Lib & Services  │                                              │
  │ • useCatalog           │                                              ▼
  │ • useLibraryState      │                                          books.json
  │ • editorial-cloth.tsx  │                                              │
  │ • sovereign-facets.ts  │                                              ▼
  │ • catalog-query.ts     │                                      GitHub Repository
  │ • arabic-search.ts     │                                              │
  └─────┬──────────────────┘                                              ▼
        ▼                                                          GitHub Raw CDN
   books.json (247 Indexed References) ──────────────────────► (PDFs & WebP Covers)
```

### Component Hierarchy & Clean Separation

- **`src/components/`**: Cleanly divided into functional domains:
  - **`layout/`**: `TopAnnouncement`, `SiteHeader`, `HeroAcademic` (13-volume interactive cloth bookshelf with original cover previews), and `SiteFooter` (official Telegram & TikTok showcase cards).
  - **`library/`**: `SovereignSidebar` (discipline, era, and reference type facets), `SearchAndControls`, `CategoryPathways`, `FeaturedSpotlight`, `BookGrid`, `BookCard`, `BookCover`, `BookDetailsView` (3D hardcover monograph spread), `BundleBar`, `RatingStars`, and `PaginationNav`.
  - **`features/`**: `SummaryDialog` (3-minute executive brief), `CoverZoomDialog`, `PdfReaderDialog`, `SpotlightSearchDialog` (`⌘K`), and `DownloadProgressDialog`.
  - **`ui/`**: Atomic UI primitives (`button`).
- **`src/hooks/`**: Stateful hooks (`useCatalog`, `useLibraryState`, `useBookDownload`, `useBundle`, `useFavorites`, `usePWAInstall`, `useTheme`, `useAccessibleDialog`).
- **`src/services/`**: Pure async clients for the catalog (`catalog.ts`), Firebase initialization (`firebase.ts`), Firestore metrics (`firebase-metrics.ts`), ratings (`firebase-ratings.ts`), and streaming PDF downloads (`download.ts`).
- **`src/lib/`**: Deterministic utilities including diacritic-insensitive Arabic search (`arabic-search.ts`), catalog query/sort/filter engine (`catalog-query.ts`), multi-facet matchers (`sovereign-facets.ts`), and cloth binding specs & paper acoustics (`editorial-cloth.tsx`).
- **`src/i18n/`**: Bilingual dictionary (`ar.ts` & `en.ts`) with `I18nProvider` context and instant RTL/LTR synchronization.

---

## 📱 Progressive Web App

IAR Archive is installable as a Progressive Web App on all modern browsers (Desktop and Mobile).

### PWA Components

* `manifest.json` — application metadata, theme colors, display mode `standalone`, and bilingual descriptors.
* `sw.js` — Service Worker (version **`v36`**) with intelligent caching, auto-precaching of Vite production bundles, and instant offline availability.
* Standard (`192x192`, `512x512`) and maskable icons, plus Apple touch icon (`/icons/apple-touch-icon.png`).
* Custom bilingual `404.html` fallback page matching the archival parchment/obsidian theme.

### Service Worker v36 Strategy

The Service Worker operates with an optimized multi-tier caching model:

| Resource Type                        | Strategy      | Purpose                                                  |
| ------------------------------------ | ------------- | -------------------------------------------------------- |
| App Shell (`/`, `/index.html`)       | Network First | Delivers the latest code with instant offline fallback   |
| Catalog Metadata (`books.json`)      | Network First | Ensures newly indexed references appear without delay    |
| Manifest (`manifest.json`)           | Network First | Keeps PWA metadata synchronized                          |
| Fingerprinted Bundles (`/bundles/*`) | Cache First   | Immutable fingerprinted JS/CSS chunks cached permanently |
| App Icons (`/icons/*`, logo)         | Cache First   | Fast offline icon loading                                |
| Firebase Auth & Firestore APIs       | Network Only  | Bypassed to prevent stale ratings and telemetry          |
| GitHub Raw PDFs & Book Covers        | Network Only  | Streamed directly from GitHub Raw CDN                    |
| External CDNs & Google Fonts         | Network Only  | Bypassed to avoid cache bloat                            |

> **Note on Upgrades:** On activation, Service Worker `v36` automatically purges legacy caches from previous versions, preventing cache collision or reload loops.

---

## 🤖 Automated Document Processing

New documents added to the `pdf/` directory are processed automatically through GitHub Actions (`auto_process.yml`).

### Supported Input

The processing pipeline handles formats including:

* PDF, DOCX, XLSX, PPTX, ODT, RTF, EPUB, CSV, and ZIP.

### Processing Flow

```text
New Document
     │
     ▼
GitHub Actions (auto_process.yml)
     │
     ▼
process_books.py
     │
     ▼
AnyDoc Extraction + WebP Cover Generation
     │
     ├───────────────┐
     │               │
     ▼               ▼
Text Extracted   Needs OCR
     │               │
     ▼               ▼
   Gemini        Gemini File Upload
     │
     ├───────────────┐
     │               │
   Success         Failure
     │               │
     │               ▼
     │             Groq
     │               │
     └───────┬───────┘
             │
             ▼
   Strict Completeness Check
             │
             ▼
        books.json
             │
             ▼
     Git Commit / Push
             │
             ▼
     Firebase Deployment
```

### Metadata Extraction & Strict Completeness Policy

The AI processing stage extracts structured bilingual metadata (`title`, `title_en`, `author`, `author_en`, `publisher`, `publisher_en`, `year`, `isbn`, `category`, `category_en`, `type`, `type_en`, `keywords`, `keywords_en`, `key_points`, `key_points_en`, `description`, `description_en`, `target_audience`, `target_audience_en`).

By default, `process_books.py` enforces `ALLOW_PARTIAL_RECORDS = False`: if all AI providers are temporarily unavailable or return an incomplete record, the book is skipped rather than saving a partial stub, and is automatically retried on the next scheduled workflow run.

---

## ⚙️ Configuration

The automated processing workflow uses GitHub Actions secrets:

| Secret           | Required | Purpose                                  |
| ---------------- | -------- | ---------------------------------------- |
| `GEMINI_API_KEY` | Yes      | Gemini API key for primary AI processing |
| `GROQ_API_KEY`   | No       | Groq API key for fallback processing     |

Optional environment variables include:

| Variable                | Default                   | Purpose                                        |
| ----------------------- | ------------------------- | ---------------------------------------------- |
| `GEMINI_MODEL`          | `gemini-2.5-flash`        | Primary Gemini model                           |
| `GROQ_MODEL`            | `llama-3.3-70b-versatile` | Groq fallback model                            |
| `ALLOW_PARTIAL_RECORDS` | `false`                   | Whether to persist partial fallback records    |
| `MAX_UPLOAD_SIZE_MB`    | `50`                      | Maximum direct-upload size                     |
| `LOG_LEVEL`             | `INFO`                    | Python logging level                           |

---

## 📦 Storage & Deployment Architecture

The project uses GitHub as the source repository and external asset CDN, while Firebase Hosting serves the compiled web application shell:

```text
GitHub Repository
├── Source Code (React 19 + TypeScript)
├── books.json (247 Indexed Records)
├── covers/ (247 WebP Covers)
└── pdf/ (247 PDF Documents)
       │
       ▼
GitHub Raw CDN (raw.githubusercontent.com)
       │
       ▼
IAR Archive Web Application (Firebase Hosting ~1.3 MB)
```

* Both `pdf/**` and `covers/**` are excluded from the Vite `dist/` output (`copyPublicAssetsPlugin` in `vite.config.ts`) and from Firebase Hosting uploads (`firebase.json`).
* `.firebaserc` configures `"ReleaseStorage": 3` on the `iararchive` site target so Firebase Hosting retains only the 3 most recent releases and never exhausts Spark plan storage quotas.

---

## 📁 Directory Structure

```text
IAR-Archive/
├── .github/
│   ├── workflows/
│   │   ├── auto_process.yml                  # Document OCR & AI metadata pipeline
│   │   ├── e2e.yml                           # Playwright E2E browser tests
│   │   ├── firebase-hosting-merge.yml        # Live production deployment on merge to main
│   │   ├── firebase-hosting-pull-request.yml # Preview channel deployment on PR
│   │   ├── lint.yml                          # TypeScript check, ESLint, Prettier & unit tests
│   │   └── test.yml                          # Python pytest suite (3.12 & 3.13)
│   └── dependabot.yml
│
├── assets/
│   └── logo.svg                              # Official IAR Archive logo
├── covers/                                   # Reference covers (1.webp – 247.webp, served via GitHub Raw)
├── icons/                                    # PWA app icons and favicons
├── pdf/                                      # 247 Reference PDF documents (served via GitHub Raw)
│
├── src/                                      # React 19 + TypeScript Application
│   ├── components/                           # Modular UI components
│   │   ├── features/                         # PDF reader, summary, cover zoom, spotlight & download dialogs
│   │   ├── layout/                           # TopAnnouncement, SiteHeader, HeroAcademic, SiteFooter
│   │   ├── library/                          # SovereignSidebar, SearchAndControls, CategoryPathways,
│   │   │                                     # FeaturedSpotlight, BookGrid, BookCard, BookCover,
│   │   │                                     # BookDetailsView, BundleBar, RatingStars, PaginationNav
│   │   └── ui/                               # Atomic UI primitives (button)
│   ├── hooks/                                # Custom React hooks (useCatalog, useLibraryState, etc.)
│   ├── i18n/                                 # Bilingual provider (Arabic RTL / English LTR) & locales
│   ├── lib/                                  # Pure business algorithms (arabic-search, catalog-query,
│   │                                         # editorial-cloth, sovereign-facets, clipboard, utils)
│   ├── services/                             # Service layer (catalog, firebase, firebase-metrics,
│   │                                         # firebase-ratings, download)
│   ├── types/                                # TypeScript domain models (book.ts)
│   ├── App.tsx                               # Root React component
│   ├── main.tsx                              # Client entry point
│   └── index.css                             # Tailwind CSS v4 directives, cloth palettes & design tokens
│
├── tests/                                    # Python test suite (426 tests)
│   ├── test_ai_helpers.py
│   ├── test_book_model.py
│   ├── test_generic_helpers.py
│   ├── test_json_io.py
│   ├── test_metadata.py
│   ├── test_migrate.py
│   ├── test_resilience.py
│   ├── test_validate.py
│   ├── test_validate_partial.py
│   └── test_zip_safety.py
│
├── e2e/                                      # Playwright E2E browser tests (23 tests)
│   ├── home.spec.js
│   ├── i18n.spec.js
│   ├── routing.spec.js
│   └── search.spec.js
│
├── js/                                       # Preserved legacy Vanilla JS modules (reference & regression checks)
├── index.html                                # Application entry point (Vite mounts src/main.tsx)
├── 404.html                                  # Bilingual archival 404 page
├── migration.html                            # Migration test entry point (preserved)
├── books.json                                # Indexed reference catalog (247 records)
├── manifest.json                             # PWA web app manifest
├── sw.js                                     # Service Worker v36 (App shell & bundle caching)
├── _headers                                  # Security headers & cache control
│
├── vite.config.ts                            # Vite 8 configuration & bundle precache plugin
├── tsconfig.json                             # TypeScript strict configuration
├── package.json                              # Dependencies & scripts
├── playwright.config.js                      # Playwright test configuration
├── eslint.config.mjs                         # ESLint 9 configuration
├── .prettierrc.json                          # Prettier formatting rules
│
├── process_books.py                          # Document processing & AI extraction
├── validate_books.py                         # Catalog schema validation
├── requirements.txt                          # Python dependencies
│
├── LICENSE                                   # Proprietary license terms
├── SECURITY.md                               # Security & vulnerability reporting policy
├── AUDIT.md                                  # Audit log & architectural evolution
├── CHANGELOG.md                              # Release history & version notes
├── firebase.json                             # Firebase Hosting & Firestore configuration
└── .firebaserc                               # Firebase project target (`iar-archive-328bc`) & ReleaseStorage
```

---

## 🛠️ Developer Commands & Scripts

### Frontend (Node.js & Vite)

| Command                   | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `npm run dev`             | Starts Vite local development server with instant HMR                |
| `npm run build`           | Typechecks with `tsc -b` and builds production bundle to `dist/`     |
| `npm run preview`         | Previews production build locally with Vite preview server           |
| `npm run typecheck`       | Executes TypeScript compiler check without emitting files            |
| `npm run test:unit`       | Runs Vitest unit & component test suite (82 tests)                   |
| `npm run test:unit:watch` | Runs Vitest in interactive watch mode                                |
| `npm run test:e2e`        | Executes Playwright E2E browser tests on Chromium (23 tests)         |
| `npm run test:e2e:ui`     | Launches Playwright interactive UI test runner                       |
| `npm run lint`            | Runs ESLint 9 across `src/`, `js/`, and config files                 |
| `npm run lint:fix`        | Automatically fixes fixable ESLint warnings and errors               |
| `npm run format:check`    | Validates formatting using Prettier                                  |
| `npm run format`          | Formats codebase using Prettier                                      |
| `npm run check`           | Complete pre-commit verification (`typecheck + lint + format:check`) |

### Catalog & Document Ingestion (Python)

| Command                    | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| `pytest tests/ -v`         | Runs full Python test suite (426 unit & integration tests) |
| `python validate_books.py` | Validates `books.json` schema, covers, and references      |
| `python process_books.py`  | Runs document extraction & AI metadata generation pipeline |

---

## 🌐 Live Demo

👉 **[iararchive.web.app](https://iararchive.web.app/)**

---

## 📜 License

**Copyright © 2026 Zenvex. All Rights Reserved.**

This repository is **proprietary**. It is made publicly viewable for technical and transparency reasons — specifically because GitHub Raw is used to serve large PDF documents and book covers, and because the source code serves as a technical reference for the deployed application.

Public visibility does **not** constitute an open-source license, nor does it grant permission to copy, modify, reproduce, distribute, sublicense, sell, or otherwise use the source code, in whole or in part.

For the full terms — including the distinct treatment of source code, reference documents, and design assets — see the [LICENSE](LICENSE) file.

---

## 🏺 IAR Archive

**من ألواح سومر إلى أوراق الحاضر.**

An evolving digital reference repository for Iraqi administrative knowledge.
