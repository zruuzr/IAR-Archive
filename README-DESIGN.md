# 🏛️ IAR Archive — Modern Bayt al-Hikma Editorial
## مستودع المراجع الإدارية العراقية · دار الحكمة المعاصرة

> **"من ألواح سومر إلى أوراق الحاضر"**  
> *From Sumer's tablets to today's pages.*  
> An ancient library with the soul of a 21st-century contemporary cultural magazine.

---

### 1. الفلسفة المعمارية والتصميمية (Design Philosophy)

يقوم نظام تصميم **دار الحكمة المعاصرة (Modern Bayt al-Hikma Editorial)** على محاكاة الروح العلمية لبيت الحكمة العباسي في بغداد من خلال لغة تحريرية ورقمية معاصرة رفيعة المستوى:

1. **الأصالة الرافدينية والتراث الجمهوري**:
   - بوابة الصرح المعماري الرخامية الكلاسيكية تعلو واجهة المستودع.
   - وسام النسر الجمهوري الذهبي كختم سيادي مركزي.
   - الرموز المسمارية التاريخية (`Noto Sans Cuneiform`) والأختام الطينية التحريرية.
2. **الوقار الأكاديمي والتحريري (Editorial Luxury)**:
   - خلفية حجر المرمر والأوراق الأرشيفية المعتقة (`#f8f6f0` / `#efe9db`).
   - حبر اللازورد النيلي العميق (`#152238` / `#22334d`) بدلاً من السواد الحاد لتجربة قراءة مريحة.
   - لمسات الذهب المعتق (`#b8924a` / `#d4b48a`) للمخطوطات والوسوم وحواف التجليد.
3. **الدقة الوظيفية وتجربة المستخدم**:
   - شبكة كبسولات التصنيف السريعة مع حالة التحديد الذهبية (`القيادة الاستراتيجية`).
   - منصة المجلد ثلاثي الأبعاد المميز على قاعدة رخامية.
   - بطاقات مرجعية بثلاثة أعمدة تشمل وسام التوثيق المرجعي المباشر (APA)، تقييم النجوم، وأزرار التحميل المباشر.

---

### 2. هندسة البرمجيات: Astro 5 + Svelte 5 Islands

تم ترحيل الواجهة إلى معمارية التوليد الثابت (SSG) الخالية من الجافاسكريبت افتراضياً (**Zero-JS by Default**)، مع حصر التفاعلية في جزر Svelte 5:

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
│  │ (Static Dynamic Pages)  │  │ (Manifesto & Seals) │  │
│  └─────────────────────────┘  └─────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### الميزات التقنية الرئيسية:
1. **سرعة وأداء استثنائي (Zero JS Baseline)**: بناء جميع هياكل HTML وتنسيقات CSS مسبقاً أثناء البناء.
2. **عزل التفاعلية (Astro Islands)**: لا يُحمّل المتصفح كود الجافاسكريبت إلا للأجزاء التفاعلية الحيوية عبر الجزيرة `BaytAlHikmaArchive.svelte`.
3. **توليد ثابت لكل كتاب (`/book/[id]`)**: صفحات ثابتة مستقلة لكل مرجع إداري لتعزيز الأرشفة ومحركات البحث (SEO).
4. **تطبيق الويب التقدمي (PWA)**: عمل كامل دون اتصال عبر `@vite-pwa/astro` وتخزين الخطوط والأغلفة مؤقتاً عبر Workbox.
5. **سلامة وتكامل البيانات**: الحفاظ التام على بنية `books.json` وسكربتات البايثون وقواعد أمان Firestore.

---

### 3. بنية الملفات (File Structure)

```
├── astro.config.mjs            # إعدادات Astro 5 مع تكامل Svelte 5 و PWA
├── books.json                  # قاعدة بيانات المراجع الإدارية العراقية
├── dist/                       # مخرجات البناء الجاهزة للاستضافة على Firebase Hosting
├── e2e/                        # اختبارات Playwright الشاملة للواجهة
├── public/                     # الأصول الثابتة
│   ├── covers/                 # أغلفة الكتب وتصاميم المجلدات الثلاثية الأبعاد
│   ├── icons/                  # بوابة الصرح الكلاسيكية، وميدالية النسر الذهبي
│   └── favicon.svg             # أيقونة الموقع
├── src/
│   ├── components/
│   │   ├── bayt-al-hikma/      # مكونات الصرح (HeaderPortal، إلخ)
│   │   ├── editorial/          # مكونات التحرير (Colophon، الأختام السومرية)
│   │   └── islands/            # جزر Svelte التفاعلية (BaytAlHikmaArchive)
│   ├── layouts/
│   │   └── BaseLayout.astro    # المخطط العام، الخطوط، والوسوم الوصفية
│   ├── pages/
│   │   ├── index.astro         # غلاف المجلة الأرشيفية والكتالوج الرئيسي
│   │   └── book/[id].astro     # الصفحة الثابتة المخصصة لكل مرجع
│   └── styles/
│       └── tokens.css          # متغيرات الألوان والطباعة لدار الحكمة المعاصرة
└── tests/                      # اختبارات Python المؤتمتة (Pytest)
```

---

### 4. التشغيل والبناء محلياً (Running & Building Locally)

#### خادم التطوير:
```bash
ASTRO_TELEMETRY_DISABLED=1 npm run dev
```

#### بناء الإنتاج (Production Build):
```bash
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

#### التحقق والاختبارات:
```bash
# اختبارات بايثون
source .venv/bin/activate
pytest tests/ -q

# فحص جودة وتنسيق الكود
npm run lint
npm run format:check

# اختبارات Playwright E2E
npx playwright test
```

---

### 5. النشر (Deployment)

تُرفع مخرجات المجلد الثابت `dist/` مباشرة إلى استضافة Firebase:
```bash
firebase deploy --only hosting
```
