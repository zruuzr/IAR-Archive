# IAR Archive | Iraqi Administrative Reference Repository

[![Cloudflare Pages](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-orange?style=flat&logo=cloudflare)](https://iar-archive.pages.dev)
[![Firebase](https://img.shields.io/badge/Database-Firebase-yellow?style=flat&logo=firebase)](https://firebase.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

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

## Live Demo
[iar-archive.pages.dev](https://iar-archive.pages.dev)

---

## Directory Structure
```text
IAR-Archive/
├── index.html       # Main application entry
├── style.css        # Styling and theme rules
├── app.js           # Core logic and Firebase integration
├── books.json       # Administrative references database (auto-generated)
└── pdf/             # Source PDF files

Contributing
If you'd like to suggest new administrative references or improve the repository, feel free to open an issue or submit a pull request.
