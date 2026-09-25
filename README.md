<div align="center">

<img src="assets/logo.svg" alt="IAR Archive Logo" width="120" height="120">

# 📚 IAR Archive

### Iraqi Administrative Reference Repository

**مستودع رقمي لأرشفة وتنظيم المراجع الإدارية العراقية**

[![Hosted on Firebase](https://img.shields.io/badge/Hosted%20on-Firebase%20Hosting-orange?style=flat\&logo=firebase)](https://iararchive.web.app/)
[![Database](https://img.shields.io/badge/Database-Firebase%20Firestore-yellow?style=flat\&logo=firebase)](https://firebase.google.com/docs/firestore)
[![PWA](https://img.shields.io/badge/PWA-Installable-blueviolet?style=flat\&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](COPYRIGHT.md)
[![Auto Process](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml/badge.svg)](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml)

A digital repository dedicated to archiving, organizing, and presenting Iraqi administrative references.

IAR Archive provides structured reference metadata, concise summaries, APA-style citations, searchable categories, document bundles, and direct access to administrative materials.

**Arabic RTL and English LTR support • Progressive Web App • Automated document indexing**

</div>

---

## 🏛️ About IAR Archive

**IAR Archive — Iraqi Administrative Reference Repository** is a digital repository designed to organize Iraqi administrative, academic, and professional references in a structured and searchable environment.

The project aims to make administrative references easier to discover, understand, cite, and use by researchers, university students, administrative professionals, and executive managers.

The repository combines:

* Structured bibliographic metadata.
* Concise reference summaries.
* Administrative and academic categorization.
* Keyword-based discovery.
* APA-style citation generation.
* Custom research bundles.
* PDF document access.
* Community ratings and download statistics.
* Automated document processing and metadata extraction.
* Arabic and English interfaces.

> **من ألواح سومر إلى أوراق الحاضر.**

---

## ✨ Features

### 📚 Reference Library

* Search references by title, author, publisher, keywords, and other metadata.
* Browse references by category and year.
* Grid and list viewing modes.
* Featured references and highlighted resources.
* Favorite references stored locally in the browser.
* Bilingual metadata where available.

### 📝 3-Minute Summaries

Each reference can include a concise overview covering its main subject, concepts, and intended audience.

The goal is to help users determine the relevance of a reference before opening or downloading the complete document.

### 📑 APA-Style Citations

The application can generate and copy structured APA-style citations for references.

The generated citation is intended for practical academic and administrative use; formatting may vary depending on the metadata available for each reference.

### 📦 Custom Research Bundles

Users can group selected references into custom bundles and share them through a generated link.

This makes it possible to prepare focused collections around a particular administrative, academic, or research topic.

### 🌐 Bilingual Interface

The interface supports:

* Arabic — RTL
* English — LTR

Language and text direction are updated dynamically according to the selected interface language.

### 🌙 Dark Mode

The application includes a persistent light/dark theme preference using browser local storage.

### 🏺 Cuneiform Visual Identity

The interface incorporates Babylonian/Sumerian-inspired visual elements, including a cuneiform marquee using Unicode Cuneiform characters from the U+12000–U+123FF range.

The visual identity connects the digital archive with the historical heritage of Mesopotamian writing.

### 📥 Download System

The application provides a download interface with:

* Download progress.
* Percentage completed.
* Transferred and total size where available.
* Cancellation support.
* Error and timeout handling.

Large PDF documents are delivered directly from GitHub Raw rather than Firebase Hosting.

### 📊 Community Metrics

Firebase is used to maintain application metrics such as:

* Reference download counts.
* User ratings.
* Visit statistics.

The application uses Firebase Anonymous Authentication so visitors can interact with supported Firebase features without creating a traditional account.

---

## 🏗️ Technology Stack

IAR Archive intentionally uses a lightweight architecture without a frontend framework.

| Layer               | Technology                        |
| ------------------- | --------------------------------- |
| Frontend            | HTML5, CSS3, Vanilla JavaScript   |
| Database            | Firebase Firestore                |
| Authentication      | Firebase Anonymous Authentication |
| Hosting             | Firebase Hosting                  |
| Document Delivery   | GitHub Raw                        |
| PDF Viewer          | Mozilla PDF.js                    |
| PWA                 | Web App Manifest + Service Worker |
| Document Extraction | `firecrawl-anydoc` + `pypdf`      |
| Primary AI          | Google Gemini                     |
| AI Fallback         | Groq                              |
| Automation          | GitHub Actions                    |
| Dependency Updates  | Dependabot                        |

---

## 🧩 Architecture

The project separates the presentation layer, reference metadata, document storage, and automated processing.

```text
                         IAR Archive
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
      Frontend             Firebase          GitHub Actions
          │                   │                   │
          │             ┌─────┴─────┐             │
          │             │           │             │
          │         Firestore     Auth            │
          │             │           │             │
          │             └─────┬─────┘             │
          │                   │                   │
          │                   │              process_books.py
          │                   │                   │
          │                   │          ┌────────┴────────┐
          │                   │          │                 │
          ▼                   ▼        AnyDoc          AI Providers
     books.json           Metrics       │           ┌──────┴──────┐
          │                              │           │             │
          │                              ▼        Gemini         Groq
          │                           pypdf          │             │
          │                                           └──────┬──────┘
          │                                                  │
          │                                             books.json
          │
          ▼
     GitHub Raw
          │
          ▼
      PDF Files
          │
          ▼
       PDF.js
```

---

## 📱 Progressive Web App

IAR Archive is installable as a Progressive Web App on supported browsers.

### PWA Components

* `manifest.json` — application metadata, icons, theme, and display mode.
* `sw.js` — service worker responsible for caching and network strategies.
* Standard and maskable icons.
* Apple touch icon.
* Offline availability for selected core assets.

### Service Worker Strategy

The Service Worker uses different strategies according to resource type:

| Resource              | Strategy      |
| --------------------- | ------------- |
| HTML/CSS/JS           | Cache First   |
| Icons and covers      | Cache First   |
| `books.json`          | Network First |
| Firebase requests     | Bypass        |
| GitHub Raw            | Bypass        |
| External CDN requests | Bypass        |

The cache version is controlled through `CACHE_VERSION` in `sw.js`.

---

## 🤖 Automated Document Processing

New documents added to the `pdf/` directory can be processed automatically through GitHub Actions.

### Supported Input

The processing pipeline is designed to handle formats including:

* PDF
* DOCX
* XLSX
* PPTX
* ODT
* RTF
* EPUB
* CSV
* ZIP

### Processing Flow

```text
New Document
     │
     ▼
GitHub Actions
     │
     ▼
process_books.py
     │
     ▼
AnyDoc Extraction
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
        Metadata
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

### Metadata Extraction

The AI processing stage can extract structured information such as:

* Title
* English title
* Author
* Publisher
* Publication year
* ISBN
* Category
* Type
* Keywords
* Key points
* Description
* Target audience

The pipeline is designed to skip files that have already been processed based on their path.

---

## 🧠 AI Processing Strategy

The current processing architecture uses two AI providers.

### Primary Provider

**Google Gemini**

Used as the primary provider for metadata extraction and for processing document files that require direct file upload.

### Fallback Provider

**Groq**

Used as a fallback for supported text-based documents when the primary Gemini request fails under handled failure conditions.

The fallback mechanism is intended to improve processing reliability without requiring manual intervention for every transient API failure.

---

## ⚙️ Configuration

The automated processing workflow uses GitHub Actions secrets.

| Secret           | Required | Purpose                                  |
| ---------------- | -------- | ---------------------------------------- |
| `GEMINI_API_KEY` | Yes      | Gemini API key for primary AI processing |
| `GROQ_API_KEY`   | No       | Groq API key for fallback processing     |

Optional environment variables include:

| Variable             | Default                   | Purpose                    |
| -------------------- | ------------------------- | -------------------------- |
| `GEMINI_MODEL`       | `gemini-3.6-flash`        | Gemini model               |
| `GROQ_MODEL`         | `llama-3.3-70b-versatile` | Groq fallback model        |
| `MAX_UPLOAD_SIZE_MB` | `50`                      | Maximum direct-upload size |
| `LOG_LEVEL`          | `INFO`                    | Python logging level       |

If `GROQ_API_KEY` is not configured, the pipeline continues without the Groq fallback.

---

## 🔐 Firebase & Data Security

Firebase Authentication uses **Anonymous Authentication** for user interactions that require an authenticated Firebase session.

Current Firestore rules provide:

* Public read access to Firestore documents.
* Authenticated writes for ratings.
* Authenticated writes for download statistics.
* Authenticated writes for visit statistics.
* Deletion disabled for the main statistics collections.

The current rules also perform basic type validation for rating aggregate fields.

### Important Implementation Note

The current Firestore rules do not fully enforce the mathematical integrity of rating and statistics values at the security-rule level.

For example, the rules currently verify that fields such as:

```text
ratingSum
ratingCount
average
voters
```

have the expected data types, but do not fully enforce all relationships between those values.

Similarly, download and visit counters are writable by authenticated clients.

The application currently relies on its client-side logic for the intended increment and aggregation behavior.

**Future security hardening may move sensitive aggregation logic to trusted server-side operations and use more restrictive Firestore validation rules.**

---

## 🔒 Security Practices

The project incorporates several security-oriented practices:

* Firebase Anonymous Authentication for authenticated client interactions.
* Firestore rules that disable deletion of the primary statistics documents.
* Basic Firestore data-type validation.
* ZIP path validation to reduce path traversal risks.
* Document extraction limits provided by the extraction tooling.
* Explicit exception handling in the document-processing pipeline.
* Controlled Git commits for generated data.
* Retry handling for transient Git push failures.
* Service Worker bypass for Firebase and external document requests.
* Secrets stored through GitHub Actions Secrets rather than committed to the repository.

### GitHub Actions

Some GitHub Actions are pinned to commit SHAs.

Other workflows currently use action version tags.

The project therefore does **not** currently claim that every GitHub Action is pinned to a full commit SHA.

---

## 📦 Storage Architecture

The project currently uses GitHub as the repository and document source.

```text
GitHub Repository
├── Source Code
├── books.json
├── Covers
└── PDF Documents
       │
       ▼
GitHub Raw
       │
       ▼
IAR Archive Web Application
```

Firebase Hosting is used for the web application itself.

Large PDF documents are excluded from Firebase Hosting deployment through `firebase.json` and are served directly through GitHub Raw.

### Current Storage Model

This architecture keeps infrastructure costs low and is suitable for the current stage of the project.

As the document collection grows significantly, object storage such as Firebase Storage, Cloudflare R2, or another dedicated storage service may become more appropriate.

---

## 📁 Directory Structure

```text
IAR-Archive/
├── .github/
│   ├── workflows/
│   │   ├── auto_process.yml
│   │   ├── firebase-hosting-merge.yml
│   │   └── firebase-hosting-pull-request.yml
│   └── dependabot.yml
│
├── assets/
│   ├── logo.svg
│   ├── logo-mark.svg
│   ├── logo-full.svg
│   └── logo-mono.svg
│
├── covers/
├── icons/
├── pdf/
│
├── index.html
├── style.css
├── app.js
├── books.json
├── manifest.json
├── sw.js
├── _headers
│
├── process_books.py
├── requirements.txt
├── .gitignore
│
├── COPYRIGHT.md
├── firebase.json
├── .firebaserc
└── README.md
```

---

## 📄 Document Processing Details

`process_books.py` performs document extraction and metadata generation.

The processing strategy distinguishes between text-based and scanned documents.

### Text-Based Documents

```text
Document
   ↓
AnyDoc
   ↓
Structured Markdown
   ↓
Gemini
   ↓
Groq fallback if required
   ↓
Metadata
```

### Scanned PDFs

```text
Scanned PDF
     ↓
AnyDoc
     ↓
NeedsOcrError
     ↓
Gemini File Upload
     ↓
Metadata
```

The processing script also handles supported extraction and resource-related errors explicitly.

---

## 🌐 Live Demo

👉 **[iararchive.web.app](https://iararchive.web.app/)**

---

## 🔄 CI/CD

The project uses GitHub Actions for automated processing and deployment.

The general workflow is:

```text
New document
      ↓
GitHub push
      ↓
Automatic processing
      ↓
Metadata extraction
      ↓
books.json update
      ↓
Git commit
      ↓
Firebase Hosting deployment
```

The Firebase deployment workflows also provide preview deployments for pull requests where configured.

---

## 📈 Current Limitations & Future Improvements

The current architecture is intentionally lightweight, but several areas can be improved as the repository grows.

### Firestore

The current rating architecture stores voter information in the rating document.

For a significantly larger user base, individual vote records or a dedicated vote subcollection would provide better scalability.

### Statistics Integrity

Download and visit counters are currently updated from the client.

A future implementation may move aggregation to trusted server-side functions and enforce stricter Firestore validation.

### Document Storage

Keeping large PDFs inside the Git repository is practical for the current stage but is not ideal for a very large archive.

Dedicated object storage can be introduced when repository size or document traffic becomes significant.

### Catalog Scalability

The current reference catalog is maintained through `books.json`.

For a very large number of references, a queryable backend or segmented catalog may eventually provide better performance.

### Frontend Modularity

The application currently uses a single main `app.js` file.

As functionality expands, individual concerns such as Firebase operations, downloads, ratings, routing, PWA behavior, and UI rendering can be separated into dedicated modules.

---

## 📜 Copyright and Usage

**Copyright © 2026 Zenvex. All Rights Reserved.**

This repository is publicly available for viewing and reference purposes.

Public visibility of this repository does **not** constitute an open-source license or grant permission to copy, modify, reproduce, distribute, publish, sublicense, sell, or otherwise use the source code, in whole or in part.

No permission is granted to create derivative works, redistribute the source code, incorporate the source code into another project, or use the project for commercial purposes without prior written permission from the copyright holder.

The following are also protected independently where applicable:

* Source code and software architecture.
* Project name.
* Logo and visual identity.
* Original graphical assets.
* Original documentation and written materials.
* Database structure.
* Original database content.
* Generated metadata and organizational structures created specifically for this project.

Third-party libraries, services, APIs, frameworks, fonts, and reference materials remain subject to their respective licenses and terms.

Nothing in this repository transfers ownership of third-party materials to Zenvex.

For permission to use, reproduce, modify, distribute, or otherwise utilize protected project materials, contact the copyright holder.

**All Rights Reserved.**

---

## ℹ️ Repository Notice

This repository is intentionally public to support:

* Project visibility.
* Deployment infrastructure.
* Technical reference.
* Documentation.
* Transparency.

Being able to view the source code on GitHub does **not** mean that the source code is open source or freely licensed for reuse.

Unauthorized copying, modification, redistribution, republication, or commercial use of protected project materials is not permitted.

---

## 🏺 IAR Archive

**من ألواح سومر إلى أوراق الحاضر.**

An evolving digital reference repository for Iraqi administrative knowledge.
