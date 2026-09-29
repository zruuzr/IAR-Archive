# Security Policy

## Supported Versions

IAR Archive is a continuously deployed web application. Only the
latest version — currently served at [iararchive.web.app](https://iararchive.web.app)
and reflected in the `main` branch — receives security updates.

| Version | Supported |
| ------- | --------- |
| main (latest) | ✅ |
| Older commits | ❌ |

If you are running a fork or a self-hosted copy, please ensure you
are up to date with `main` before reporting an issue.

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub
issues, pull requests, or social media.**

If you believe you have found a security vulnerability in IAR Archive,
please report it privately using one of the following methods:

### Preferred method — GitHub Private Vulnerability Reporting

1. Go to the [Security tab](https://github.com/zruuzr/IAR-Archive/security)
   of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the details of the issue.

This creates a private security advisory visible only to the
maintainer. It is the fastest and most secure channel.

---

## What to Include in Your Report

To help me understand and reproduce the issue, please include:

- **Description** — a clear explanation of the vulnerability.
- **Impact** — what an attacker could do with it.
- **Steps to reproduce** — the exact steps, if applicable.
- **Affected component** — for example:
  - Frontend (`index.html`, `js/*.js`)
  - Firebase configuration or Firestore rules (`firestore.rules`)
  - Python pipeline (`process_books.py`, `migrate_books.py`, `validate_books.py`)
  - GitHub Actions workflows (`.github/workflows/*`)
  - Deployment configuration (`firebase.json`, `sw.js`)
- **Suggested fix** — optional, but appreciated.
- **Your contact info** — so I can follow up with questions.

If possible, please encrypt sensitive details using my PGP key
*(see below — or just use the GitHub advisory form, which is already
private).*

---

## What to Expect

After you submit a report, here is the general timeline:

| Timeframe | Action |
| --------- | ------ |
| Within 48 hours | I acknowledge receipt of your report. |
| Within 5 days | I provide an initial assessment: valid, needs more info, or out of scope. |
| Within 14 days | For valid issues, I aim to have a fix in progress or deployed. |
| After fix | I will credit you in the advisory (unless you prefer to stay anonymous). |

**Please note:** IAR Archive is maintained by a single developer on a
volunteer basis. Response times are best-effort. If a report is
critical, please mark it clearly and I will prioritize it.

---

## Scope

The following components are **in scope** for security reports:

### In Scope

- **Web application** — `index.html`, `js/*.js`, `style.css`, `sw.js`
- **Firebase configuration** — `firebase.json`, `firestore.rules`,
  client-side Firebase config, authentication flows
- **Python pipeline** — `process_books.py`, `migrate_books.py`,
  `validate_books.py`, and their handling of untrusted input
  (PDFs, ZIP files, filenames)
- **GitHub Actions** — `.github/workflows/*.yml`, secret handling,
  action pinning, token scopes
- **Data integrity** — manipulation of `books.json`, ratings,
  download counts, or visit statistics
- **Service Worker** — cache poisoning, scope abuse, injection
- **Content Security Policy** — bypasses or weaknesses in any
  CSP or security headers
- **Authentication & Authorization** — anonymous Firebase auth flows,
  rating and voting integrity

### Out of Scope

The following are **not** considered security vulnerabilities for
this project:

- **Denial of Service (DoS/DDoS)** — including resource exhaustion,
  volumetric attacks, or flooding. IAR Archive is a static site with
  Firebase backend; DoS mitigation is handled by the platform
  providers (Google Firebase, GitHub).
- **Spam or abuse of publicly writable endpoints** — the anonymous
  rating system intentionally allows any visitor to rate once.
  Abuse beyond "rate once" would be in scope, but general spam
  is not.
- **Client-side only issues without security impact** — e.g., a
  button that doesn't work, or a CSS bug.
- **Social engineering** — including phishing against the maintainer
  or users.
- **Physical attacks** — against the maintainer's device.
- **Third-party services** — issues in Firebase, GitHub, Google Fonts,
  Mozilla PDF.js, or any external dependency should be reported to
  those projects directly.
- **Self-XSS** — XSS that requires the user to paste code into
  their own browser console.
- **Content of reference PDFs** — the documents in `pdf/` are
  third-party materials. Issues with their content (copyright,
  accuracy, offensiveness) are not security issues.
- **AI-generated content accuracy** — the AI metadata extraction
  may occasionally produce incorrect information. This is a data
  quality concern, not a security issue.
- **Missing security headers** — reported as informational unless
  a specific exploit is demonstrated.
- **Outdated dependency versions** — Dependabot already monitors
  these; reports of "X has an update available" are not needed
  unless there is a proven exploit path.

---

## Safe Harbor

IAR Archive considers security research conducted in good faith to
be authorized and welcome. If you make a good-faith effort to comply
with this policy during your research, I will:

- Consider your research authorized.
- Work with you to understand and resolve the issue quickly.
- Not pursue or support legal action against you.
- Recognize your contribution publicly (if you wish).

**In return, I ask that you:**

- Do not access, modify, or delete data that does not belong to you.
- Do not degrade the service for other users.
- Do not exploit a vulnerability beyond what is necessary to
  demonstrate it.
- Do not disclose the vulnerability publicly until it has been
  fixed and a reasonable period (typically 90 days) has passed.
- Report any vulnerability involving user data or credentials
  immediately, and do not exfiltrate it.

---

## Security Practices in This Repository

For transparency, these are the current security measures in place:

- **Firestore rules** — prevent deletion, enforce type validation,
  limit counter increments to +1 per operation (`firestore.rules`).
- **ZIP extraction** — path traversal and unsafe member names are
  rejected (`process_books.py`).
- **Atomic writes** — `books.json` is written via temporary file
  and atomic rename to prevent corruption.
- **Secrets** — API keys are stored in GitHub Actions Secrets, never
  committed to the repository.
- **Anonymous Auth** — Firebase anonymous authentication is used
  for ratings and metrics; no personal data is collected.
- **Service Worker** — Firebase, GitHub Raw, and external CDN
  requests bypass the cache to prevent poisoning.
- **Content Security** — the app loads scripts only from trusted
  origins (Google Firebase CDN, Mozilla PDF.js).

For a full technical audit, see [`AUDIT.md`](AUDIT.md).

---

## Known Limitations

The following are **known and accepted** limitations, documented
for transparency:

- **Client-incremented counters** — `downloads` and `stats.visits`
  counters are incremented from the client. A malicious client could
  inflate these numbers. This is a known trade-off (see `AUDIT.md`,
  Phase 1.3). The impact is limited to statistics, not data integrity.
- **AI metadata accuracy** — extracted metadata from documents is
  not 100% accurate. This is a content quality issue, not a
  security vulnerability.
- **Public repository** — the repository is public because GitHub
  Raw is used as a CDN for large PDFs. This is documented in
  `LICENSE`.

---

## Acknowledgments

Researchers who responsibly disclose valid security issues will be
credited here (with their permission).

*No acknowledgments yet.*

---

**Last updated:** 2026-09-29
