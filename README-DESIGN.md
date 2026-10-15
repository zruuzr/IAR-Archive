# 🏛️ Modern Bayt al-Hikma Editorial — دار الحكمة المعاصرة
## مستودع المراجع الإدارية العراقية (IAR Archive)

> **"من ألواح سومر إلى أوراق الحاضر"**  
> An ancient library with the soul of a 21st-century contemporary cultural magazine.

---

### 1. Vision & Design Philosophy

The **Modern Bayt al-Hikma Editorial** design language translates the scholarly spirit of Baghdad's historic Abbasid *House of Wisdom* (Bayt al-Hikma) into a world-class, contemporary digital reading experience.

- **Warm Alabaster Canvas (`#f8f6f0` / `#efe9db`)**: Soft, tactile archival paper tones replace harsh clinical whites.
- **Deep Lapis & Indigo Ink (`#152238` / `#22334d`)**: Archival ink tones provide high-contrast, fatigue-free reading.
- **Gilded Accents (`#b8924a` / `#d4b48a`)**: Antique gold accents evoke illuminated manuscripts, seals, and embossed bindings.
- **Classical Mesopotamian & Republican Heritage**: Arched entrance portals, Republican Golden Eagle medallions, and Mesopotamian cuneiform seal motifs.

---

### 2. Architecture: Astro 5 + Svelte 5 Islands

The platform is migrated from legacy client-side Vanilla JS to a **Zero-JS by Default** Static Site Generator architecture:

```
┌────────────────────────────────────────────────────────┐
│                   Astro 5 (SSG)                        │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │ BaseLayout.astro        │  │ HeaderPortal.astro  │  │
│  │ (Typography, Tokens)    │  │ (Arch & Medallion)  │  │
│  └─────────────────────────┘  └─────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Svelte 5 Island: BaytAlHikmaArchive.svelte       │  │
│  │ - Real-time client-side search & filtering       │  │
│  │ - 3D Tome Spotlight with carousel                │  │
│  │ - 3-column reference catalog cards               │  │
│  │ - Interactive 5-star rating (Firestore synced)   │  │
│  │ - One-click APA Citation generator & clipboard   │  │
│  │ - 3-minute Executive Summary Drawer              │  │
│  │ - Floating Research Bundle Dock (حزمة الأبحاث)   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │ book/[id].astro         │  │ Colophon.astro      │  │
│  │ (141 Static Book Pages) │  │ (Manifesto & Seals) │  │
│  └─────────────────────────┘  └─────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### Key Architecture Benefits:
1. **Zero-JS Baseline**: All structural HTML and CSS render at build time. JavaScript is isolated strictly to interactive islands (`client:load`).
2. **Deterministic Build**: 141 static book pages generated at build time with perfect SEO meta tags and schema markup.
3. **PWA Offline Resilience**: Built-in Service Worker caching static assets, covers, and offline reads using `@vite-pwa/astro` and Workbox.
4. **Data Integrity**: Uses `books.json` directly as single source of truth without altering backend schema or Python pipelines.

---

### 3. File Structure

```
├── astro.config.mjs            # Astro 5 configuration with Svelte & PWA integrations
├── books.json                  # Source of truth (141 curated administrative books)
├── dist/                       # Production build output ready for Firebase Hosting
├── e2e/                        # Playwright end-to-end test suite
├── public/                     # Static public assets
│   ├── covers/                 # Book covers and 3D tome artwork
│   ├── icons/                  # Classical architectural arches and medallions
│   └── favicon.svg             # Vector favicon
├── src/
│   ├── components/
│   │   ├── bayt-al-hikma/      # Visual components (HeaderPortal, etc.)
│   │   ├── editorial/          # Colophon, manifesto, archival seals
│   │   └── islands/            # Interactive Svelte 5 components (BaytAlHikmaArchive)
│   ├── layouts/
│   │   └── BaseLayout.astro    # Master layout with Google Fonts, metadata, and tokens
│   ├── pages/
│   │   ├── index.astro         # Main archival magazine cover & catalog
│   │   └── book/[id].astro     # Dynamic SSG page for every catalog book
│   └── styles/
│       └── tokens.css          # Modern Bayt al-Hikma CSS variables & typography tokens
└── tests/                      # Python automated test suite (362 unit & regression tests)
```

---

### 4. Running & Building Locally

#### Development:
```bash
# Start Astro dev server
ASTRO_TELEMETRY_DISABLED=1 npm run dev
```

#### Production Build:
```bash
# Compile SSG pages and PWA service worker into dist/
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

#### Testing:
```bash
# Python regression tests (362 tests)
source .venv/bin/activate
pytest tests/ -q

# Code hygiene
npm run lint
npm run format:check

# Playwright E2E verification
npx playwright test
```

---

### 5. Deployment

Static assets in `dist/` can be served directly by Firebase Hosting:
```bash
firebase deploy --only hosting
```
