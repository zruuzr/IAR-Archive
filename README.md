<div align="center">

<img src="assets/logo.svg" alt="IAR Archive Logo" width="120" height="120">

# 📚 IAR Archive

### Iraqi Administrative Reference Repository

**مستودع رقمي لأرشفة وتنظيم المراجع الإدارية العراقية**

[![Hosted on Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase%20Hosting-orange?style=flat\&logo=firebase)](https://iararchive.web.app/)
[![Database](https://img.shields.io/badge/Database-Firebase-yellow?style=flat\&logo=firebase)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-blueviolet?style=flat\&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](COPYRIGHT.md)
[![Auto Process](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml/badge.svg)](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml)

A digital repository built to archive and organize Iraqi administrative references.

It provides quick summaries, APA citations, and custom document bundles to help researchers and executive managers access official materials efficiently.

Installable as a Progressive Web App (PWA) on desktop and mobile devices.

</div>

---

## ✨ Features

* **3-Minute Summaries:** Quick overviews of core concepts and target audiences for each reference.
* **One-Click APA Citations:** Direct copying for academic and official use.
* **Custom Bundles:** Group multiple references together and share them through a single link.
* **Bilingual UI:** Native Arabic (RTL) and English (LTR) support.
* **Dark Mode:** Built-in theme switching with local storage persistence.
* **Cuneiform Hero:** Babylonian cylinder-seal marquee featuring Sumerian cuneiform glyphs (Unicode U+12000–U+123FF).
* **Download Progress Overlay:** Large circular progress ring showing real-time percentage, transferred/total size, and a cancel button.
* **Community Metrics:** Basic analytics for downloads, ratings, and unique visits through Firebase.
* **Installable PWA:** Installable on desktop and mobile devices, with offline support for core assets.

---

## 🏗️ Stack & Architecture

Built using lightweight and widely available technologies, with a focus on simplicity, maintainability, and performance.

* **Frontend:** Vanilla JavaScript, HTML5, and CSS3 (no framework).
* **Typography:** IBM Plex Sans Arabic for the UI and Noto Sans Cuneiform for the Babylonian seal marquee.
* **Hosting:** Firebase Hosting (primary) + Cloudflare Pages (secondary).
* **Asset Management:** Large PDF files are served directly through GitHub Raw (`raw.githubusercontent.com`) to avoid standard static-hosting size limitations.
* **Database:** Firebase Firestore and Firebase Authentication for dynamic data such as ratings and visit/download statistics.
* **PWA:** Web App Manifest + Service Worker for installability, offline access, and asset caching.
* **Document Extraction:** `firecrawl-anydoc` (Rust-based) for Markdown extraction across 22 document formats, with `pypdf` as a fallback for PDFs.
* **AI Providers:** Gemini 3.6 Flash as the primary provider, with automatic fallback to Groq for text-based documents.
* **CI/CD:** GitHub Actions automatically processes new references, updates `books.json`, and deploys the site to Firebase Hosting.

---

## 📱 Progressive Web App (PWA)

The site is installable as a PWA on supported browsers, including Chrome, Edge, Safari, and Android Chrome.

### Components

* **Manifest:** `manifest.json` — defines the application name, icons, theme color, and display mode.
* **Service Worker:** `sw.js` — implements a mixed caching strategy:

  * **Cache First** for static assets such as HTML, CSS, JavaScript, icons, and covers.
  * **Network First** for `books.json`, allowing dynamically updated reference data to be retrieved from the network.
  * **Bypass** for Firebase API calls, GitHub Raw, and external CDN requests.
* **Icons:** Standard and maskable icons at 192×192 and 512×512, plus an `apple-touch-icon` for iOS.
* **Cache Version:** Update `CACHE_VERSION` in `sw.js` to invalidate existing caches after significant application updates.

### Installation

* **Desktop (Chrome/Edge):** Use the install icon in the address bar or the in-app **Install** button.
* **Android (Chrome):** Select **Add to Home screen**.
* **iOS (Safari):** Open the Share menu and select **Add to Home Screen**.

---

## 🤖 Automation Pipeline

The repository uses an automated indexing pipeline that runs when new supported documents are added to the `pdf/` directory.

### Processing Flow

1. **Trigger** — A push event adds a new document such as PDF, DOCX, XLSX, PPTX, ODT, RTF, EPUB, CSV, or ZIP to `pdf/`.
2. **Extract** — ZIP archives are automatically expanded, while unsafe archive paths are rejected.
3. **AnyDoc Extraction** — Each document is converted into clean, structured Markdown using `firecrawl-anydoc`. If AnyDoc fails on a PDF, `pypdf` is used as a fallback.
4. **Scanned PDF Detection** — AnyDoc can identify fully scanned PDFs through `NeedsOcrError`. Such files are uploaded directly to Gemini because Groq is not used for this processing path.
5. **AI Analysis** — Extracted text is sent to **Gemini 3.6 Flash** to extract structured metadata, including:

   * Title in Arabic and English
   * Author
   * Publisher
   * Year
   * ISBN
   * Category
   * Type
   * Keywords
   * Key points
   * Description
   * Target audience in Arabic and English
6. **Fallback Strategy** — If Gemini fails because of a rate limit, temporary service unavailability, network error, or another handled failure, the request is retried through **Groq** using `llama-3.3-70b-versatile`.
7. **Persist** — Successfully processed metadata is appended to `books.json` and committed back to the repository.
8. **Deploy** — GitHub Actions triggers a Firebase Hosting deployment, publishing the updated site.

The pipeline is designed to be **idempotent**: files that have already been processed, identified by their path, are skipped during subsequent runs.

---

## ⚙️ Configuration

The automated workflow requires the following GitHub Actions secrets:

| Secret           | Status       | Purpose                                            |
| ---------------- | ------------ | -------------------------------------------------- |
| `GEMINI_API_KEY` | **Required** | Google Gemini API key used for primary AI analysis |
| `GROQ_API_KEY`   | **Optional** | Groq API key used as an AI fallback                |

Both secrets are configured through the repository's **GitHub Actions settings**.

### Optional Environment Variables

The workflow also supports the following optional environment variables:

| Variable             | Default                   | Purpose                                |
| -------------------- | ------------------------- | -------------------------------------- |
| `GEMINI_MODEL`       | `gemini-3.6-flash`        | Gemini model used for primary analysis |
| `GROQ_MODEL`         | `llama-3.3-70b-versatile` | Groq model used for fallback analysis  |
| `MAX_UPLOAD_SIZE_MB` | `50`                      | Maximum PDF size for direct upload     |
| `LOG_LEVEL`          | `INFO`                    | Python logging level                   |

If `GROQ_API_KEY` is not configured, the workflow continues using Gemini only and the fallback provider is disabled.

---

## 🔒 Security Practices

The repository follows several supply-chain and CI/CD hardening practices:

* **Pinned Actions** — GitHub Actions are pinned to full commit SHAs rather than mutable tags to reduce supply-chain risks associated with compromised action tags.
* **Automated Updates** — Dependabot opens weekly pull requests for GitHub Actions SHAs and Python dependency updates.
* **Scoped Commits** — The workflow commits only the intended generated files, primarily `books.json` and `covers/`, instead of using unrestricted staging commands.
* **Explicit Error Handling** — The workflow uses `set -euo pipefail` and aborts on rebase conflicts rather than silently ignoring failures.
* **Push Retries** — Up to three retry attempts are used to handle transient network failures during `git push`.
* **Path Validation** — ZIP archive members are validated to prevent path traversal attacks.
* **Secret Verification** — The workflow fails fast when `GEMINI_API_KEY` is missing and warns when `GROQ_API_KEY` is unavailable.
* **Content Security** — The Service Worker bypasses Firebase, GitHub Raw, and other external requests to avoid caching sensitive or dynamic data.
* **Extraction Safety** — `anydoc` applies built-in limits for decompression size and document nesting, while the workflow handles supported exception types explicitly.

---

## 🌐 Live Demo

👉 **[iararchive.web.app](https://iararchive.web.app/)**

---

## 📁 Directory Structure

```text
IAR-Archive/
├── .github/
│   ├── workflows/
│   │   ├── auto_process.yml                   # Automatic indexing workflow
│   │   ├── firebase-hosting-merge.yml         # Firebase Hosting deployment
│   │   └── firebase-hosting-pull-request.yml  # Firebase Hosting preview
│   └── dependabot.yml                          # Automated dependency updates
│
├── assets/
│   ├── logo.svg                                # Primary project logo (128×128)
│   ├── logo-mark.svg                           # Compact mark for favicon (64×64)
│   ├── logo-full.svg                            # Horizontal logo with text
│   └── logo-mono.svg                            # Monochrome logo using currentColor
│
├── covers/                                     # Generated book cover images
├── icons/                                      # PWA icons (192, 512, maskable, Apple)
├── pdf/                                        # Source documents (PDF, DOCX, XLSX, ...)
│
├── index.html                                  # Main application entry
├── style.css                                   # Styling and theme rules
├── app.js                                      # Core application logic
├── manifest.json                               # PWA manifest
├── sw.js                                       # Service Worker
├── _headers                                    # Cloudflare Pages custom headers
├── books.json                                  # Administrative references database
│
├── process_books.py                            # Document indexing script
├── requirements.txt                            # Python dependencies
├── .gitignore                                  # Ignored files and artifacts
│
├── COPYRIGHT.md                                # Copyright and usage terms
├── firebase.json                               # Firebase Hosting configuration
├── .firebaserc                                 # Firebase project alias
└── README.md                                   # Project documentation
```

---

## 🔧 Document Processing Pipeline — Technical Detail

The indexing script (`process_books.py`) follows the following decision tree for each file:

```text
┌─────────────────────────────────────────────┐
│ 1. Extract text with AnyDoc                 │
│    (22 formats)                             │
└──────────────────────┬──────────────────────┘
                       │
             ┌─────────┴─────────┐
             │                   │
          Success          NeedsOcrError
             │                   │
             ▼                   ▼
      ┌────────────┐      ┌──────────────┐
      │  Text OK   │      │ Scanned PDF  │
      └─────┬──────┘      └──────┬───────┘
            │                    │
            ▼                    ▼
      ┌────────────┐      ┌──────────────┐
      │ Try Gemini │      │ Upload to    │
      └─────┬──────┘      │ Gemini only  │
            │             │ (file upload)│
       ┌────┴────┐        └──────┬───────┘
       │         │               │
    Success   Failure            │
       │         │               │
       │         ▼               │
       │   ┌────────────┐        │
       │   │ Try Groq   │        │
       │   └─────┬──────┘        │
       │         │               │
       │    ┌────┴────┐          │
       │    │         │          │
       │ Success   Failure       │
       │    │         │          │
       ▼    ▼         ▼          ▼
   ┌───────────┐  ┌──────────┐  ┌───────────┐
   │ Save Book │  │ Skip +   │  │ Save Book │
   │           │  │ Retry    │  │           │
   │           │  │ Later    │  │           │
   └───────────┘  └──────────┘  └───────────┘
```

---

## 📄 Copyright and Usage

**Copyright © 2026 Zenvex. All Rights Reserved.**

This repository is publicly available for viewing and reference purposes.

Public access to this repository **does not constitute a license or grant permission** to copy, modify, reproduce, distribute, publish, sublicense, sell, or otherwise use the source code, in whole or in part.

No permission is granted to create derivative works, redistribute the source code, incorporate the source code into another project, or use the project for commercial purposes without prior written permission from the copyright holder.

The following are also protected independently, where applicable:

* Source code and software architecture.
* Project name, logo, visual identity, and associated graphical assets.
* Original documentation and written materials.
* Database structure and original database content.
* Generated metadata and organizational structures created specifically for this project.

The presence of third-party libraries, frameworks, services, or publicly available reference materials within or in connection with this project does not transfer ownership of those materials to Zenvex. Such third-party materials remain subject to their respective terms, licenses, and copyrights.

For permission to use, reproduce, modify, distribute, or otherwise utilize any protected part of this project, contact the copyright holder.

**All Rights Reserved.**

---

## ℹ️ Repository Notice

This repository is intentionally public to support project visibility, deployment infrastructure, technical reference, and transparency.

Being able to view the source code on GitHub does **not** mean that the source code is open source or freely licensed for reuse.

Unauthorized copying, modification, redistribution, republication, or commercial use of protected project materials is not permitted.
