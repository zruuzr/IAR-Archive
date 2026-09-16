<div align="center">

<img src="assets/logo.svg" alt="IAR Archive Logo" width="120" height="120" />

# 📚 IAR Archive

### Iraqi Administrative Reference Repository

**مستودع رقمي لأرشفة وتنظيم المراجع الإدارية العراقية**

[![Cloudflare Pages](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-orange?style=flat\&logo=cloudflare)](https://iar-archive.pages.dev)
[![Firebase](https://img.shields.io/badge/Database-Firebase-yellow?style=flat\&logo=firebase)](https://firebase.google.com)
[![All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](#-copyright-and-usage)
[![Auto Extract Book Info](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml/badge.svg)](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml)

A digital repository built to archive and organize Iraqi administrative references.
It provides quick summaries, APA citations, and custom document bundles to help
researchers and executive managers access official materials efficiently.

</div>

---

## ✨ Features

* **3-Minute Summaries:** Quick overviews of core concepts and target audiences for each reference.
* **One-Click APA Citations:** Direct copying for academic and official use.
* **Custom Bundles:** Group multiple references together and share them via a single link.
* **Bilingual UI:** Native Arabic (RTL) and English (LTR) support.
* **Dark Mode:** Built-in theme switching with local storage memory.
* **Community Metrics:** Basic analytics for downloads, ratings, and unique visits via Firebase.

---

## 🏗️ Stack & Architecture

Built using lightweight and widely available technologies, with a focus on simplicity and performance:

* **Frontend:** Vanilla JavaScript, HTML5, CSS3, Bootstrap 5.
* **Hosting:** Cloudflare Pages.
* **Asset Management:** Heavy PDF files are served directly via GitHub Raw (`raw.githubusercontent.com`) to bypass standard static hosting limits.
* **Database:** Firebase Firestore & Auth, handling dynamic data such as ratings and view counts.
* **CI/CD:** GitHub Actions automatically update the `books.json` database and trigger Cloudflare deployments when new references are processed.

---

## 🤖 Automation Pipeline

The repository uses an automated indexing pipeline that runs when new files are added to the `pdf/` directory:

1. **Trigger** — A push event adds a new `.pdf` or `.zip` file to `pdf/`.
2. **Extract** — ZIP archives are automatically expanded; unsafe paths are rejected.
3. **Analyze** — Each PDF is processed by **Gemini 3.6 Flash** to extract metadata:

   * Title (Arabic + English), author, publisher, year, ISBN
   * Category, type, keywords, and key points
   * Descriptions and target audience in both languages
4. **Fallback Strategy** — If local text extraction fails, the full PDF is uploaded to Gemini. If that also fails, the filename is used as a temporary title.
5. **Persist** — Results are appended to `books.json` and committed back to the repository.
6. **Deploy** — Cloudflare Pages detects the update and rebuilds the site automatically.

The pipeline is idempotent: already-processed files (by path) are skipped on subsequent runs.

---

## ⚙️ Configuration

The automated workflow requires one repository secret:

| Secret           | Purpose                                |
| ---------------- | -------------------------------------- |
| `GEMINI_API_KEY` | Google Gemini API key for PDF analysis |

The secret is configured through the repository's GitHub Actions settings.

Optional environment overrides defined in the workflow:

| Variable             | Default            | Purpose                        |
| -------------------- | ------------------ | ------------------------------ |
| `GEMINI_MODEL`       | `gemini-3.6-flash` | Gemini model to use            |
| `MAX_UPLOAD_SIZE_MB` | `50`               | Max PDF size for direct upload |
| `LOG_LEVEL`          | `INFO`             | Python logging level           |

---

## 🔒 Security Practices

This repository follows several supply-chain and CI/CD hardening practices:

* **Pinned Actions** — All GitHub Actions are pinned by full commit SHA, not by mutable tags. This helps prevent supply-chain attacks involving compromised action tags.
* **Automated Updates** — Dependabot opens weekly PRs to update GitHub Actions SHAs and Python dependencies.
* **Scoped Commits** — The workflow commits only `books.json` and `covers/`, rather than using unrestricted staging commands.
* **Explicit Error Handling** — The pipeline uses `set -euo pipefail` and aborts on rebase conflicts instead of silently swallowing errors.
* **Push Retries** — Up to 3 retry attempts handle transient network failures during `git push`.
* **Path Validation** — ZIP archive members are validated to prevent path traversal attacks.
* **Secret Verification** — The workflow fails fast if `GEMINI_API_KEY` is missing.

---

## 🌐 Live Demo

👉 **[iar-archive.pages.dev](https://iar-archive.pages.dev)**

---

## 📁 Directory Structure

```text
IAR-Archive/
├── .github/
│   ├── workflows/
│   │   └── auto_process.yml    # Auto-indexing workflow
│   └── dependabot.yml          # Automated dependency updates
├── assets/
│   ├── logo.svg                # Project logo
│   └── logo-mark.svg           # Monochrome project mark
├── covers/                     # Generated book cover images
├── pdf/                        # Source PDF files
├── index.html                  # Main application entry
├── style.css                   # Styling and theme rules
├── app.js                      # Core logic and Firebase integration
├── books.json                  # Administrative references database
├── process_books.py            # PDF indexing script
├── requirements.txt            # Python dependencies
├── .gitignore                  # Ignored files and artifacts
├── COPYRIGHT.md                # Copyright and usage terms
└── README.md
```

---

## 📄 Copyright and Usage

**Copyright © 2026 Zenvex. All Rights Reserved.**

This repository is publicly available for viewing and reference purposes.

Public access to this repository **does not constitute a license or grant permission** to copy, modify, reproduce, distribute, publish, sublicense, sell, or otherwise use the source code, in whole or in part.

No permission is granted to create derivative works, redistribute the source code, incorporate the source code into another project, or use the project for commercial purposes without prior written permission from the copyright holder.

The following are also protected independently where applicable:

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

Being able to view the source code on GitHub does not mean that the source code is open source or freely licensed for reuse.

Unauthorized copying, modification, redistribution, republication, or commercial use of protected project materials is not permitted.
