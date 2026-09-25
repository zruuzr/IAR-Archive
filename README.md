<div align="center">

<img src="assets/logo.svg" alt="IAR Archive Logo" width="120" height="120" />

# 📚 IAR Archive

### Iraqi Administrative Reference Repository

**مستودع رقمي لأرشفة وتنظيم المراجع الإدارية العراقية**

[![Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase%20Hosting-orange?style=flat&logo=firebase)](https://iararchive.web.app)
[![Firebase](https://img.shields.io/badge/Database-Firebase-yellow?style=flat&logo=firebase)](https://firebase.google.com)
[![PWA](https://img.shields.io/badge/PWA-Installable-blueviolet?style=flat&logo=pwa)](https://iararchive.web.app/manifest.json)
[![All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](#-copyright-and-usage)
[![Auto Extract Book Info](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml/badge.svg)](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml)

A digital repository built to archive and organize Iraqi administrative references.
It provides quick summaries, APA citations, and custom document bundles to help
researchers and executive managers access official materials efficiently.

Installable as a Progressive Web App (PWA) on desktop and mobile.

</div>

---

## ✨ Features

* **3-Minute Summaries:** Quick overviews of core concepts and target audiences for each reference.
* **One-Click APA Citations:** Direct copying for academic and official use.
* **Custom Bundles:** Group multiple references together and share them via a single link.
* **Bilingual UI:** Native Arabic (RTL) and English (LTR) support.
* **Dark Mode:** Built-in theme switching with local storage memory.
* **Cuneiform Hero:** Babylonian cylinder-seal marquee with authentic Sumerian cuneiform glyphs (Unicode U+12000–U+123FF).
* **Download Progress Overlay:** Large circular progress ring with real percentage, transferred/total size, and cancel button.
* **Community Metrics:** Basic analytics for downloads, ratings, and unique visits via Firebase.
* **Installable PWA:** Can be installed on desktop and mobile devices with offline support for core assets.

---

## 🏗️ Stack & Architecture

Built using lightweight and widely available technologies, with a focus on simplicity and performance:

* **Frontend:** Vanilla JavaScript, HTML5, CSS3 (no framework).
* **Typography:** IBM Plex Sans Arabic for UI + Noto Sans Cuneiform for Babylonian seal marquee.
* **Hosting:** Firebase Hosting (primary) + Cloudflare Pages (secondary).
* **Asset Management:** Heavy PDF files are served directly via GitHub Raw (`raw.githubusercontent.com`) to bypass standard static hosting limits.
* **Database:** Firebase Firestore & Auth, handling dynamic data such as ratings and view counts.
* **PWA:** Web App Manifest + Service Worker for installability, offline access, and asset caching.
* **Document Extraction:** `firecrawl-anydoc` (Rust-based) for high-quality Markdown extraction across 22 document formats, with `pypdf` as fallback.
* **AI Providers:** Gemini 3.6 Flash (primary) with automatic fallback to Groq (secondary) for text-based documents.
* **CI/CD:** GitHub Actions automatically update the `books.json` database and deploy the site to Firebase Hosting when new references are processed.

---

## 📱 Progressive Web App (PWA)

The site is installable as a PWA on supported browsers (Chrome, Edge, Safari, Android Chrome).

* **Manifest:** `manifest.json` — provides app name, icons, theme color, and display mode.
* **Service Worker:** `sw.js` — implements a mixed caching strategy:
  * **Cache First** for static assets (HTML, CSS, JS, icons, covers).
  * **Network First** for `books.json` (dynamic data updated by CI).
  * **Bypass** for Firebase API calls, GitHub Raw, and CDN requests.
* **Icons:** Standard and Maskable icons at 192×192 and 512×512, plus `apple-touch-icon` for iOS.
* **Cache Version:** Bump `CACHE_VERSION` in `sw.js` to invalidate old caches after significant updates.

### Installation

* **Desktop (Chrome/Edge):** Use the install icon in the address bar, or the in-app "Install" button.
* **Android (Chrome):** Tap "Add to Home screen".
* **iOS (Safari):** Share menu → "Add to Home Screen".

---

## 🤖 Automation Pipeline

The repository uses an automated indexing pipeline that runs when new files are added to the `pdf/` directory:

1. **Trigger** — A push event adds a new document (PDF, DOCX, XLSX, PPTX, ODT, RTF, EPUB, CSV, or ZIP) to `pdf/`.
2. **Extract** — ZIP archives are automatically expanded; unsafe paths are rejected.
3. **AnyDoc Extraction** — Each document is converted to clean, structured Markdown via `firecrawl-anydoc`. If anydoc fails on a PDF, `pypdf` is used as a fallback.
4. **Scanned PDF Detection** — anydoc flags fully-scanned PDFs via `NeedsOcrError`; these are uploaded directly to Gemini (Groq cannot process them).
5. **AI Analysis** — Extracted text is sent to **Gemini 3.6 Flash** to extract metadata:

   * Title (Arabic + English), author, publisher, year, ISBN
   * Category, type, keywords, and key points
   * Descriptions and target audience in both languages
6. **Fallback Strategy** — If Gemini fails (429 rate limit, 503 unavailable, network error), the request is automatically retried via **Groq** (`llama-3.3-70b-versatile`). If both fail, the file is skipped and retried on the next run.
7. **Persist** — Results are appended to `books.json` and committed back to the repository.
8. **Deploy** — GitHub Actions triggers a Firebase Hosting deploy automatically, publishing the updated site to production.

The pipeline is idempotent: already-processed files (by path) are skipped on subsequent runs.

---

## ⚙️ Configuration

The automated workflow requires one repository secret:

| Secret           | Status       | Purpose                                       |
| ---------------- | ------------ | --------------------------------------------- |
| `GEMINI_API_KEY` | **Required** | Google Gemini API key for primary AI analysis |
| `GROQ_API_KEY`   | Optional     | Groq API key for AI fallback (recommended)    |

Both secrets are configured through the repository's GitHub Actions settings.

Optional environment overrides defined in the workflow:

| Variable             | Default                     | Purpose                          |
| -------------------- | --------------------------- | -------------------------------- |
| `GEMINI_MODEL`       | `gemini-3.6-flash`          | Gemini model to use              |
| `GROQ_MODEL`         | `llama-3.3-70b-versatile`   | Groq model to use                |
| `MAX_UPLOAD_SIZE_MB` | `50`                        | Max PDF size for direct upload   |
| `LOG_LEVEL`          | `INFO`                      | Python logging level             |

If `GROQ_API_KEY` is not set, the workflow continues with Gemini only (fallback disabled).

---

## 🔒 Security Practices

This repository follows several supply-chain and CI/CD hardening practices:

* **Pinned Actions** — All GitHub Actions are pinned by full commit SHA, not by mutable tags. This helps prevent supply-chain attacks involving compromised action tags.
* **Automated Updates** — Dependabot opens weekly PRs to update GitHub Actions SHAs and Python dependencies.
* **Scoped Commits** — The workflow commits only `books.json` and `covers/`, rather than using unrestricted staging commands.
* **Explicit Error Handling** — The pipeline uses `set -euo pipefail` and aborts on rebase conflicts instead of silently swallowing errors.
* **Push Retries** — Up to 3 retry attempts handle transient network failures during `git push`.
* **Path Validation** — ZIP archive members are validated to prevent path traversal attacks.
* **Secret Verification** — The workflow fails fast if `GEMINI_API_KEY` is missing; warns if `GROQ_API_KEY` is absent but does not fail.
* **Content Security** — Service Worker bypasses all external and Firebase requests to avoid caching sensitive data.
* **Extraction Safety** — `anydoc` enforces built-in limits on decompression size and document nesting; 7 explicit exception types are handled individually.

---

## 🌐 Live Demo

👉 **[iararchive.web.app](https://iararchive.web.app)**

---

## 📁 Directory Structure

```text
IAR-Archive/
├── .github/
│   ├── workflows/
│   │   ├── auto_process.yml              # Auto-indexing workflow
│   │   ├── firebase-hosting-merge.yml    # Firebase Hosting deploy (main)
│   │   └── firebase-hosting-pull-request.yml  # Firebase Hosting preview (PR)
│   └── dependabot.yml                    # Automated dependency updates
├── assets/
│   ├── logo.svg                          # Primary project logo (128×128)
│   ├── logo-mark.svg                     # Compact mark for favicon (64×64)
│   ├── logo-full.svg                     # Horizontal logo with text
│   └── logo-mono.svg                     # Monochrome logo (uses currentColor)
├── covers/                               # Generated book cover images
├── icons/                                # PWA icons (192, 512, maskable, apple-touch)
├── pdf/                                  # Source documents (PDF, DOCX, XLSX, ...)
├── index.html                            # Main application entry
├── style.css                             # Styling and theme rules
├── app.js                                # Core logic, Firebase, download overlay
├── manifest.json                         # PWA manifest
├── sw.js                                 # Service Worker
├── _headers                              # Cloudflare Pages custom headers
├── books.json                            # Administrative references database
├── process_books.py                      # Document indexing script (anydoc + Gemini + Groq)
├── requirements.txt                      # Python dependencies
├── .gitignore                            # Ignored files and artifacts
├── COPYRIGHT.md                          # Copyright and usage terms
├── firebase.json                         # Firebase Hosting configuration
├── .firebaserc                           # Firebase project alias
└── README.md
🔧 Document Processing Pipeline (Technical Detail)
The indexing script (process_books.py) follows this decision tree per file:

text
┌─────────────────────────────────────────────┐
│  1. Extract text with anydoc                │
│     (22 formats, ~4.4ms median)             │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
     Success               NeedsOcrError
        │                     │
        ▼                     ▼
  ┌───────────┐         ┌─────────────┐
  │ Text OK   │         │ Scanned PDF │
  └─────┬─────┘         └──────┬──────┘
        │                      │
        ▼                      ▼
  ┌─────────────┐        ┌──────────────┐
  │ Try Gemini  │        │ Upload to    │
  └──────┬──────┘        │ Gemini only  │
         │               │ (file upload)│
    ┌────┴────┐          └──────┬───────┘
    │         │                 │
  Success   Failure             │
    │         │                 │
    │         ▼                 │
    │   ┌──────────┐            │
    │   │ Try Groq │            │
    │   └────┬─────┘            │
    │        │                  │
    │   ┌────┴────┐             │
    │   │         │             │
    │ Success   Failure         │
    │   │         │             │
    ▼   ▼         ▼             ▼
  ┌─────────┐  ┌──────────┐  ┌────────┐
  │  Save   │  │  Skip +  │  │  Save  │
  │  Book   │  │  Retry   │  │  Book  │
  └─────────┘  │  Later   │  └────────┘
               └──────────┘

📄 Copyright and Usage
Copyright © 2026 Zenvex. All Rights Reserved.

This repository is publicly available for viewing and reference purposes.

Public access to this repository does not constitute a license or grant permission to copy, modify, reproduce, distribute, publish, sublicense, sell, or otherwise use the source code, in whole or in part.

No permission is granted to create derivative works, redistribute the source code, incorporate the source code into another project, or use the project for commercial purposes without prior written permission from the copyright holder.

The following are also protected independently where applicable:

Source code and software architecture.

Project name, logo, visual identity, and associated graphical assets.

Original documentation and written materials.

Database structure and original database content.

Generated metadata and organizational structures created specifically for this project.

The presence of third-party libraries, frameworks, services, or publicly available reference materials within or in connection with this project does not transfer ownership of those materials to Zenvex. Such third-party materials remain subject to their respective terms, licenses, and copyrights.

For permission to use, reproduce, modify, distribute, or otherwise utilize any protected part of this project, contact the copyright holder.

All Rights Reserved.

ℹ️ Repository Notice
This repository is intentionally public to support project visibility, deployment infrastructure, technical reference, and transparency.

Being able to view the source code on GitHub does not mean that the source code is open source or freely licensed for reuse.

Unauthorized copying, modification, redistribution, republication, or commercial use of protected project materials is not permitted.
