# 📐 Design Tokens Specification
## 🏛️ Modern Bayt al-Hikma Editorial (دار الحكمة المعاصرة)

This document specifies the design tokens, typography scale, spacing system, and component design patterns implemented across the IAR Archive.

---

### 1. Color Palette Tokens

```css
:root {
  /* Archival Paper & Stone Canvas */
  --paper: #f8f6f0;               /* Warm alabaster stone & archival paper background */
  --paper-deep: #efe9db;          /* Deeper layered parchment surface */
  --paper-card: #ffffff;          /* Crisp card surface */
  --paper-border: #e3dac9;        /* Tactile parchment border */

  /* Archival Inks */
  --ink: #152238;                 /* Deep indigo/lapis archival ink (primary text) */
  --ink-soft: #3e4a5d;            /* Secondary ink for metadata & subtitles */
  --ink-muted: #6b778a;           /* Muted caption ink */

  /* Gilded Accents (Gold Leaf & Illumination) */
  --gold: #b8924a;                /* Primary antique gold */
  --gold-bright: #d4b48a;         /* Soft luminous gold */
  --gold-deep: #8a6a2e;           /* Gilded card border & dark gold */
  --gold-glow: rgba(184, 146, 74, 0.2);

  /* Academic & Diplomatic Navy */
  --navy-primary: #152238;        /* Sovereign navy for buttons, badges, & headers */
  --navy-surface: #1e3150;        /* Hover surface for navy elements */

  /* Functional Accents */
  --accent-warm: #a8442c;         /* Warm terracotta for alert states */
  --accent-cool: #2a5a82;         /* Cool academic lapis for links */
}
```

---

### 2. Typography Scale

| Token | Size | Line Height | Letter Spacing | Font Family | Usage |
|---|---|---|---|---|---|
| **Display XL** | 64px / 4rem | 1.10 | -0.02em | Amiri / Cairo | Cover Title / Hero |
| **Display L** | 44px / 2.75rem | 1.15 | -0.015em | Amiri | Section Titles |
| **Display M** | 32px / 2rem | 1.25 | -0.01em | Amiri | Subheadings & Tome Title |
| **Heading L** | 24px / 1.5rem | 1.30 | normal | IBM Plex Sans Arabic | Featured Story Card Header |
| **Heading M** | 18px / 1.15rem | 1.40 | normal | IBM Plex Sans Arabic | Catalog Book Cards |
| **Body L** | 18px / 1.125rem | 1.70 | normal | IBM Plex Sans Arabic | Editorial Summaries |
| **Body M** | 15px / 0.95rem | 1.60 | normal | IBM Plex Sans Arabic | Regular Body & Metadata |
| **Caption** | 13px / 0.8125rem | 1.45 | normal | IBM Plex Sans Arabic | Authors, Years, Badges |
| **Overline** | 11px / 0.7rem | 1.40 | +0.08em | IBM Plex Mono | Masthead & Tracking Labels |

#### Font Stacks:
- **Display & Architectural**: `'Amiri', 'Aref Ruqaa', serif`
- **Kufic & Medallions**: `'Cairo', 'Amiri', sans-serif`
- **Body & Editorial Reading**: `'IBM Plex Sans Arabic', sans-serif`
- **Mono / Numeric / Citations**: `'IBM Plex Mono', monospace`
- **Ancient Mesopotamian Seals**: `'Noto Sans Cuneiform', serif`

---

### 3. Spacing Scale

Tokens are defined in strict multiples of 4px / 8px:

| Token | Value | Visual Purpose |
|---|---|---|
| `--s-1` | 4px | Micro spacing, icon gaps |
| `--s-2` | 8px | Button padding, tag gaps |
| `--s-3` | 12px | Compact item margins |
| `--s-4` | 16px | Standard card padding |
| `--s-5` | 24px | Grid gutters, desktop card padding |
| `--s-6` | 32px | Component internal separation |
| `--s-7` | 48px | Section sub-headers spacing |
| `--s-8` | 64px | Editorial feature margins |
| `--s-9` | 96px | Section breaks |
| `--s-10` | 128px | Major chapter dividers |
| `--s-11` | 192px | Architectural section gaps |

---

### 4. Elevation & Surface Tokens

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-pill: 9999px;

  --shadow-sm: 0 2px 4px rgba(21, 34, 56, 0.05);
  --shadow-md: 0 8px 24px rgba(21, 34, 56, 0.08);
  --shadow-lg: 0 16px 40px rgba(21, 34, 56, 0.12);
  --shadow-tome: 0 24px 60px rgba(21, 34, 56, 0.25), 0 0 20px rgba(184, 146, 74, 0.2);
}
```

---

### 5. Architectural Component Patterns

1. **Header Portal (`HeaderPortal.astro`)**:
   - Classical marble arch banner (`/icons/arch_portal.png`) rendered with responsive aspect ratios.
   - Gilded Republican Medallion (`/icons/golden_seal.png`) floating centrally above the arch.
   - Master Kufic typography banner (`مستودع المراجع الإدارية العراقية`) with bilingual Latin subtitle.

2. **Featured Tome Showcase**:
   - Realistic 3D leather-bound volume (`/covers/featured_tome.png`) set on a subtle Carrara plinth.
   - Interactive gold carousel pagination dots.
   - Gilded metadata badges, 5-star rating display, and quick actions.

3. **3-Column Reference Cards**:
   - High-contrast white parchment card on warm alabaster canvas.
   - Navy category tag and APA citation badge.
   - Bold Arabic title with author and year metadata.
   - 5 interactive gold rating stars (synced to Firestore with local optimistic fallback).
   - Solid navy download button with direct PDF path resolution.

4. **Floating Research Bundle Dock (`حزمة الأبحاث`)**:
   - Bottom-right fixed floating island dock.
   - Active book counter badge with gold pulse ring.
   - Click to open selected bundle list with one-click multi-download and collective APA bibliography copy.
