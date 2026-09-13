# IAR Archive | Iraqi Administrative Reference Repository

[![Cloudflare Pages](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-orange?style=flat&logo=cloudflare)](https://iar-archive.pages.dev)
[![Firebase](https://img.shields.io/badge/Database-Firebase-yellow?style=flat&logo=firebase)](https://firebase.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Auto Extract Book Info](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml/badge.svg)](https://github.com/zruuzr/IAR-Archive/actions/workflows/auto_process.yml)

A digital repository built to archive and organize Iraqi administrative references. It provides quick summaries, APA citations, and custom document bundles to help researchers and executive managers access official materials efficiently.

---

## Features

* **3-Minute Summaries:** Quick overviews of core concepts and target audiences for each reference.
* **One-Click APA Citations:** Direct copying for academic and official use.
* **Custom Bundles:** Group multiple references together and share them via a single link.
* **Bilingual UI:** Native Arabic (RTL) and English (LTR) support.
* **Dark Mode:** Built-in theme switching with local storage memory.
* **Community Metrics:** Basic analytics for downloads, ratings, and unique visits via Firebase.

---

## Stack & Architecture

Built entirely on free-tier services, focusing on simplicity and performance:

* **Frontend:** Vanilla JavaScript, HTML5, CSS3, Bootstrap 5.
* **Hosting:** Cloudflare Pages.
* **Asset Management:** Heavy PDF files are served directly via GitHub Raw (`raw.githubusercontent.com`) to bypass standard static hosting limits.
* **Database:** Firebase Firestore & Auth (handles dynamic data like ratings and view counts).
* **CI/CD:** GitHub Actions automatically update the `books.json` database and trigger Cloudflare deployments when new references are pushed.

---

## Automation Pipeline

The repository uses a fully automated indexing pipeline that runs on every push to the `pdf/` directory:

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

## Configuration

The workflow requires one repository secret:

| Secret | Purpose |
|--------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for PDF analysis |

Set it in **Settings → Secrets and variables → Actions → New repository secret**.

Optional environment overrides (defined in the workflow file):

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_MODEL` | `gemini-3.6-flash` | Gemini model to use |
| `MAX_UPLOAD_SIZE_MB` | `50` | Max PDF size for direct upload |
| `LOG_LEVEL` | `INFO` | Python logging level |

---

## Local Development

### Prerequisites

* Python 3.10 or newer
* A valid Gemini API key

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/zruuzr/IAR-Archive.git
cd IAR-Archive

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate    # Linux/macOS
# .venv\Scripts\activate     # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Export your API key
export GEMINI_API_KEY="your_api_key_here"

# 5. Run the indexing script
python process_books.py
The script will:

Extract any .zip archives found in pdf/.

Process new PDFs and append results to books.json.

Skip files already present in the index.

Exit cleanly if the API becomes unavailable (progress is preserved).

Dependencies
Managed via requirements.txt:

Package	Version Constraint	Purpose
google-genai	>=1.0.0,<2.0.0	Gemini API client
pypdf	>=4.0.0,<6.0.0	PDF text extraction
Automated weekly updates are handled by Dependabot (see .github/dependabot.yml).

Security Practices
This repository follows several supply-chain and CI/CD hardening practices:

Pinned Actions — All GitHub Actions are pinned by full commit SHA, not by mutable tags. This prevents supply-chain attacks where a compromised action tag could execute malicious code.

Automated Updates — Dependabot opens weekly PRs to bump both GitHub Actions SHAs and Python dependencies, ensuring security patches are not missed.

Scoped Commits — The workflow commits only books.json and covers/, never git add -A, preventing accidental inclusion of secrets or large binaries.

Explicit Error Handling — The pipeline uses set -euo pipefail and aborts on rebase conflicts instead of silently swallowing errors.

Push Retries — Up to 3 retry attempts handle transient network failures during git push.

Path Validation — ZIP archive members are validated to prevent path traversal attacks.

Secret Verification — The workflow fails fast if GEMINI_API_KEY is missing.

Live Demo
iar-archive.pages.dev

Directory Structure
text
IAR-Archive/
├── .github/
│   ├── workflows/
│   │   └── auto_process.yml    # Auto-indexing workflow
│   └── dependabot.yml          # Automated dependency updates
├── covers/                     # Generated book cover images
├── pdf/                        # Source PDF files (and temporary ZIPs)
├── index.html                  # Main application entry
├── style.css                   # Styling and theme rules
├── app.js                      # Core logic and Firebase integration
├── books.json                  # Administrative references database (auto-generated)
├── process_books.py            # PDF indexing script
├── requirements.txt            # Python dependencies
├── .gitignore                  # Ignored files and artifacts
├── LICENSE                     # MIT License
└── README.md
Contributing
If you'd like to suggest new administrative references or improve the repository, feel free to open an issue or submit a pull request.

To add a new reference:

Place the PDF (or a ZIP containing PDFs) in pdf/.

Commit and push.

The workflow will automatically process it and update books.json.

Cloudflare Pages will redeploy the site within a few minutes.

License
This project is licensed under the MIT License — see the LICENSE file for details.

text

---

## 🔍 ملخص التغييرات والإضافات

| # | القسم | نوع التغيير |
|---|-------|------------|
| 1 | شارة GitHub Actions | إضافة جديدة |
| 2 | Stack & Architecture | تحديث بسيط لقسم CI/CD |
| 3 | **Automation Pipeline** | قسم جديد كامل |
| 4 | **Configuration** | قسم جديد (متغيرات البيئة والسر) |
| 5 | **Local Development** | قسم جديد (تشغيل محلي) |
| 6 | **Dependencies** | قسم جديد (المكتبات) |
| 7 | **Security Practices** | قسم جديد (الممارسات الأمنية) |
| 8 | Directory Structure | مُحدَّث ليعكس `.github/`, `process_books.py`, `requirements.txt` |
| 9 | Contributing | إضافة خطوات عملية للإضافة |
| 10 | License | قسم منفصل وواضح |

---

## 💡 نصائح إضافية

### 1. تحقق من صحة شارة الـ Actions
الرابط في الشارة يفترض أن اسم المستودع هو `zruuzr/IAR-Archive`. إذا كان مختلفًا، عدّله في السطر الأول.

### 2. لا تضع رابط الـ API key في README
لا تكتب مفتاح Gemini أبدًا في README أو أي ملف مُتعقَّب. هو موجود فقط في:
- **GitHub Secrets** (للـ CI).
- **متغير بيئي محلي** (`export GEMINI_API_KEY=...`).

### 3. يمكنك إضافة لقطة شاشة
إذا أردت، أضف صورة للواجهة:
```markdown
## Screenshot
![IAR Archive Screenshot](docs/screenshot.png)
4. خطوات الـ commit
bash
cd ~/Documents/GitHub/IAR-Archive
git add README.md
git commit -m "docs: update README with automation, security, and dev sections"
git push origin main
بعد الـ push، افتح:

text
https://github.com/zruuzr/IAR-Archive
