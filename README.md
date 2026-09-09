# IAR Archive | Iraqi Administrative Reference Repository

[![Cloudflare Pages](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-orange?style=flat&logo=cloudflare)](https://iar-archive.pages.dev)
[![Firebase](https://img.shields.io/badge/Database-Firebase-yellow?style=flat&logo=firebase)](https://firebase.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**IAR Archive** is an interactive digital repository dedicated to archiving and connecting administrative references. It is specifically designed to provide 3-minute summaries, direct APA academic citations, and customized research bundles for researchers, postgraduate students, and executive managers.

---

## 🚀 Key Features

* **3-Minute Summaries:** Quick insights into the core concepts and target audience of each administrative reference.
* **Direct APA Citations:** Instantly copy official academic citations with a single click.
* **Custom Research Bundles:** Select multiple references and share a custom link grouping them together as an integrated research package.
* **Bilingual Support (Arabic / English):** Fully integrated interface supporting smooth switching between languages with automatic text direction adjustment (RTL/LTR).
* **Dark & Light Mode:** Seamless theme switching based on user preference, with settings saved locally.
* **Community Interaction & Ratings:** Public book rating system, download metrics, and unique visitor analytics powered by Firebase.

---

## 🛠️ Architecture & Technical Stack

The repository is built for high performance and fully free-tier hosting using the following stack:

* **Frontend:** HTML5, CSS3, Vanilla JavaScript, styled with Bootstrap 5.
* **Hosting & Deployment:** Hosted on **Cloudflare Pages** for lightning-fast global delivery via a CDN.
* **Large Asset Management:** To bypass the 25 MB static hosting asset size limit, large PDF files are served directly via GitHub Raw (`raw.githubusercontent.com`), with complete support for URL encoding of spaces and special characters.
* **Backend / Database:** **Firebase Firestore** and **Firebase Auth** for tracking download counts, book ratings, and unique site visits.
* **Automation:** Integrated with **GitHub Actions** to automatically update the `books.json` database and trigger instant redeployments whenever a new reference is added.

---

## 🌐 Live Demo
Explore the live version of the repository here:
👉 [iar-archive.pages.dev](https://iar-archive.pages.dev)

---

## 📁 Project Structure
```text
IAR-Archive/
├── index.html       # Main entry point for the interactive frontend
├── style.css        # Custom styles, theme rules, and responsive design
├── app.js           # Core logic, data fetching, and Firebase integration
├── books.json       # Administrative reference database (auto-updated via automation)
└── pdf/             # Repository for source PDF files and attachments


---

🤝 Contributing
Contributions, suggestions, and new administrative references are always welcome! Feel free to open a Pull Request or submit an issue.

© 2026 IAR Archive - All Rights Reserved.
