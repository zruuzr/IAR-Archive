# دليل دمج التصميم العراقي/الإسلامي (Heritage) في IAR Archive

هذه الحزمة **طبقة عرض (presentation layer)** جاهزة، مكتوبة بـ React 19 + TypeScript، وتتبع المستودع الحالي (Vite + Tailwind v4 + shadcn).
لا تحتوي أي منطق أعمال: كل المكوّنات تستقبل بياناتها ودوالها عبر props، فيبقى `App.tsx` والـ hooks والخدمات كما هي.

> **المصدر المعتمد بصرياً:** صفحة العرض `heritage-demo.html` (تُفتح بـ `npx vite` ثم `/heritage-demo.html`). أي تعديل يُقارَن بها.

---

## 1) محتويات الحزمة

| المسار | الوظيفة |
|---|---|
| `src/styles/heritage.css` | كل أنماط التصميم. جميع الأصناف بالبادئة `hx-` وكل المتغيرات `--hx-*`، فلا تتعارض مع Tailwind/shadcn. يتبع المظهر الداكن عبر `[data-theme='dark']` أو `.dark` (مطابق لـ `useTheme`). خط الكتابة المسمارية مضمّن داخله. |
| `src/components/heritage/GateArt.tsx` | بوابة عشتار + المحراب بالمقرنصات (SVG) وتستقبل `children` = رفّ الأجلاد. |
| `.../HeritageHero.tsx` | الهيرو كاملاً: عنوان، وصف، وسوم، أزرار، إحصاءات، البوابة، الأجلاد، لوحة المتحف (placard). |
| `.../CuneiformSeal.tsx` + `seal-signs.ts` | شريطا الختم الأسطواني المتحركان (علامات سومرية حقيقية). `AN_SIGN` و`SUMER_SIGNS` متاحان للشريط العلوي. |
| `.../PathwayGrid.tsx` | بوابات المسارات المعرفية. |
| `.../HeritageBookCard.tsx` (+ `HeritageGrid`) | بطاقة المرجع، وشبكة تدعم وضع القائمة `list`. |
| `.../HeritageBookCover.tsx` | غلاف قماشي مذهّب مولَّد (بديل/تكملة لصورة الغلاف). |
| `.../SpotlightPlaque.tsx` | بطاقة «في دائرة الضوء» بشكل لوحة متحف. |
| `.../JourneyTimeline.tsx` | «من الطين إلى الورق» (سومر ← بابل ← نينوى ← بغداد ← اليوم). |
| `.../ornaments.tsx` | `HeritageLogo`, `HeritageFrieze`, `HeritageSteps`, `HeritageOrnament`, `HeritageSectionHead`, `HeritageButton`, `HeritageFavButton`. |
| `.../heritage-data.ts` | `HERITAGE_CLOTHS`, `pickCloth(category)`, `starPoints`, `defaultJourneyAr/En`. |
| `.../heritage-demo-data.ts`, `HeritageDemo.tsx` | بيانات عيّنة وصفحة تجميع للمقارنة فقط (لا تُستورد في التطبيق). |
| `heritage-demo.html`, `src/heritage-demo-main.tsx` | نقطة دخول صفحة العرض (تطوير فقط). |

## 2) خطوات التفعيل

1. انسخ الملفات إلى المستودع بنفس المسارات.
2. في `src/main.tsx` أضف **بعد** `./index.css`:
   ```ts
   import './styles/heritage.css';
   ```
3. في `index.html` أضف داخل `<head>` (الخطوط الثلاثة الحاملة للهوية؛ خط المسماري مضمّن):
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;700&family=Reem+Kufi:wght@500;700&display=swap" />
   ```
   (إن كان المشروع يحمّل الخطوط ذاتياً أو عبر service worker فأضفها هناك بدل الرابط.)
4. استورد من `@/components/heritage` (يوجد `index.ts` يصدّر كل شيء).

## 3) جدول الربط مع مكوّنات المستودع

**القاعدة:** لا تغيّر توقيع props لأي مكوّن حالي ولا `App.tsx`. أعد كتابة **داخل** كل مكوّن حالي ليستخدم مكوّنات Heritage، أو أنشئ غلافاً (adapter) بنفس الـ props.

| مكوّن حالي | يُبنى بـ | ملاحظات الربط |
|---|---|---|
| `layout/TopAnnouncement` | `.hx-announce` + `AN_SIGN` | يبقى النص من i18n. |
| `layout/SiteHeader` | `HeritageLogo`, `.hx-site-header`, `HeritageFrieze`, `HeritageButton` | أبقِ كل props (`favoritesOnly`, `onOpenSpotlight`, `pwa`, الصوت…) والروابط والتنقل كما هي. |
| `layout/HeroAcademic` | `HeritageHero` + `CuneiformSeal` + `HeritageSteps` | الأجلاد `spines` تُبنى من `books` بنفس منطق اختيار الـ13 مجلداً الحالي؛ `stats` من `booksCount`/`categoriesCount`/`visitsCount`؛ `secondaryAction.onClick = onOpenSpotlight`؛ `onSpineSelect` ← `onOpenBook`. حالة `compact` = إخفاء البوابة/الأجلاد وإبقاء العنوان فقط. إن احتجتَ حقل البحث وتبويبات التخصص (`query`, `onQueryChange`, `category`…) فأبقِها كما هي أسفل الهيرو ولا تحذفها. |
| `library/CategoryPathways` | `PathwayGrid` (+ يبقى دليل «كل التصنيفات» القابل للبحث كما هو) | `items` من أعلى `quickPathwaysLimit` تصنيفاً مع العدد؛ `activeKey = activeCategory`؛ `onSelect = onSelectCategory`. |
| `library/FeaturedSpotlight` | `SpotlightPlaque` | `cover` = `HeritageBookCover` (أو `BookCover` الحالي إن وُجدت صورة غلاف)؛ `points` من `key_points` أو `key_points_en` حسب اللغة؛ `actions` = أزرار الإجراءات الحالية كلها (قراءة، تحميل، مفضلة، حزمة، اقتباس، ملخص، تكبير، مشاركة، تقييم) بصيغة `HeritageButton`. |
| `library/BookCover` | `HeritageBookCover` | الصورة الحقيقية `cover_image` لها الأولوية؛ الغلاف المولَّد هو البديل عند غيابها/فشل تحميلها (السلوك الحالي نفسه). اللون: `pickCloth(category)`. |
| `library/BookCard` | `HeritageBookCard` | أبقِ `RatingStars`، زر الحزمة، الاقتباس، وكل الإجراءات؛ `HeritageFavButton` للمفضلة. |
| `library/BookGrid` | `HeritageGrid list={viewMode === 'list'}` | أبقِ حالات التحميل (skeleton) والخطأ والفراغ. |
| `layout/SiteFooter` | `HeritageFrieze` + `.hx-foot` | أبقِ `OFFICIAL_TELEGRAM_URL` و`OFFICIAL_TIKTOK_URL` و`booksCount`/`loaded`. |
| (جديد، اختياري) | `JourneyTimeline items={defaultJourneyAr}` | قسم بعد الشبكة؛ أضف نصوصه إلى `i18n/locales/ar.ts` و`en.ts` بدل الحروف الثابتة. |

## 4) قيود غير قابلة للتفاوض

- **لا تلمس** `hooks/`, `services/`, `lib/` (المنطق), `types/`, ولا `books.json` أو سكربتات Python.
- **اللغتان:** أي نص مرئي جديد يمرّ عبر `i18n/locales/ar.ts` و`en.ts` (لا نصوص عربية ثابتة في المكوّنات النهائية؛ صفحة العرض وحدها استثناء).
- **الاختبارات:** قبل تغيير أي markup نفّذ `grep -rn "data-testid\|getByRole\|getByTestId" src e2e` وأبقِ كل المعرّفات والأدوار والـ `aria-label` كما هي. اختبارات `e2e/` تعتمد عليها.
- **إمكانية الوصول:** أبقِ `focus-visible` الظاهر، وتباين الألوان، و`prefers-reduced-motion` (الشريط المسماري يتوقف تلقائياً)، وروابط «تخطي إلى المحتوى».
- **الاتجاه:** RTL أولاً؛ استخدم الخصائص المنطقية (`inline-start/end`, `ms-/me-`) لا `left/right`.
- **الأداء:** لا تُضِف مكتبات. الزخارف SVG/CSS مضمّنة.
- **المظهر:** لا تُنشئ آلية ثيم جديدة؛ `useTheme` يكتب `data-theme` و`.dark` على `<html>` وهذا ما يقرؤه `heritage.css`.

## 5) التحقق (يجب أن ينجح كله قبل الاعتماد)

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:e2e          # يتطلب: npm run install:browsers
npx vite                  # ثم افتح /heritage-demo.html وقارن بصرياً
```

قارن عند عرضي 1440 و390 بكسل، بالمظهرين الفاتح والداكن، ولا تقبل أي تمرير أفقي للصفحة.

## 6) ملاحظات

- حُمّلت هذه الحزمة وفُحصت على نسخة المستودع بتاريخ 2026-11-08: `tsc` و`eslint` و`prettier` نجحت، والعرض سليم بلا أخطاء في وحدة التحكم (عدا تعذّر خطوط Google في بيئة الفحص المعزولة).
- في تلك البيئة فشل اختبار واحد قائم مسبقاً لا علاقة له بالحزمة: `src/services/__tests__/catalog.test.ts` (لا يجد `/js/utils.js` المستورد من الوحدة القديمة). الاختبارات الأخرى (7 ملفات) نجحت.
- الأرقام والعناوين في صفحة العرض مأخوذة من `books.json` الفعلي؛ أما التطبيق فيمرّرها من `useCatalog`.

---

## نص جاهز للصق في Gemini

```
أنت تعمل على مستودع IAR-Archive (React 19 + Vite + TypeScript + Tailwind v4 + shadcn، RTL).
أضيفت للمستودع طبقة تصميم جاهزة: src/components/heritage/* و src/styles/heritage.css و heritage-demo.html.
اقرأ HERITAGE_INTEGRATION.md كاملاً أولاً، ثم نفّذ الدمج وفق جدول الربط فيه.

الهدف: أن يظهر الموقع بنفس التصميم المعروض في heritage-demo.html (هوية عراقية/إسلامية: لازورد بوابة عشتار، ذهب، فيروزي، زخارف هندسية، ختم مسماري).

شروط صارمة:
- لا تغيّر توقيع props أي مكوّن حالي ولا App.tsx ولا hooks/services/types ولا books.json.
- أبقِ كل data-testid و aria-label وأدوار الوصول، واجعل اختبارات الوحدة و e2e تنجح.
- كل نص جديد عبر i18n (ar.ts و en.ts).
- استخدم الخصائص المنطقية للـ RTL، ولا تضف مكتبات.
- اعمل على مكوّن واحد في كل خطوة بهذا الترتيب: TopAnnouncement ← SiteHeader ← HeroAcademic ← CategoryPathways ← FeaturedSpotlight ← BookCover/BookCard/BookGrid ← SiteFooter ← JourneyTimeline (اختياري)، ونفّذ npm run typecheck && npm run lint && npm run test:unit بعد كل خطوة.
- في النهاية قارن بصرياً مع heritage-demo.html عند 1440 و390 بكسل، فاتحاً وداكناً.
```
