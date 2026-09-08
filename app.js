// التغليف بواسطة IIFE لمنع تلوث النطاق العام (Global Namespace Pollution)
(function () {
  'use strict';

  // ===== Firebase Configuration =====
  const firebaseConfig = {
    apiKey: "AIzaSyAug0yFzjQ4ud6zX2ugK_T7Lj7LfuO04tw",
    authDomain: "iar-archive-328bc.firebaseapp.com",
    projectId: "iar-archive-328bc",
    storageBucket: "iar-archive-328bc.firebasestorage.app",
    messagingSenderId: "81911492650",
    appId: "1:81911492650:web:c6ac2f89d52bdd7065d353",
    measurementId: "G-PYZEY63LTR"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();

  // ===== Storage Helper =====
  const storage = {
    get(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} },
    remove(key) { try { localStorage.removeItem(key); } catch (_) {} }
  };

  // ===== DOM Safe Helper =====
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  }
  function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }
  function setAttribute(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  }
  function showEl(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('d-none');
  }
  function hideEl(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('d-none');
  }

  // ===== State Variables =====
  let booksData = [];
  let selectedBundleIds = new Set();
  let favoriteIds = new Set(JSON.parse(storage.get('iar_favorites', '[]')));
  let currentLang = storage.get('iar_lang', 'ar') === 'en' ? 'en' : 'ar';
  let currentViewMode = storage.get('iar_view_mode', 'grid') === 'list' ? 'list' : 'grid';
  let selectedCategory = 'all';
  let booksLoaded = false;
  let currentUser = null;
  let currentOpenBookId = null;
  let isSingleView = false;

  // ===== Firebase Auth =====
  async function initAuth() {
    try {
      const userCredential = await Promise.race([
        auth.signInAnonymously(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout after 5s')), 5000))
      ]);
      currentUser = userCredential.user;
      console.log('Anonymous auth successful:', currentUser.uid);
    } catch (error) {
      console.error('Anonymous auth failed or timed out:', error);
    }
  }

  // ===== Modal Instances =====
  const pdfModal = new bootstrap.Modal(document.getElementById('pdfReaderModal'));
  const summaryModal = new bootstrap.Modal(document.getElementById('summaryModal'));
  const coverModal = new bootstrap.Modal(document.getElementById('coverImageModal'));

  // ===== i18n Dictionary =====
  const i18n = {
    ar: {
      announcement: "IAR Archive - المستودع الرقمي التفاعلي لربط المراجع الإدارية بالتحليل والمفاهيم",
      subtitle: "الأرشيف الإداري العراقي",
      aboutTitle: "الأرشيف الرقمي لعلوم الإدارة",
      aboutDesc: "منصة معرفية مخصصة لأرشفة وربط المراجع الإدارية، توفر ملخصات 3 دقائق، التوثيق الأكاديمي المباشر، وإنشاء حزم البحوث.",
      statBooks: "مرجع إداري", statCats: "تصنيف إداري", statYear: "سنة الأرشفة", statVisits: "زائر فريد",
      searchPlaceholder: "ابحث بعنوان الكتاب، اسم المؤلف، الناشر، أو الكلمات المفتاحية...",
      allCategories: "جميع التصنيفات", sortDefault: "الترتيب الافتراضي", sortTitle: "حسب العنوان (أبجدي)",
      sortYear: "حسب السنة", sortPages: "حسب عدد الصفحات", sortDownloads: "حسب التحميلات",
      sortFavorites: "حسب المفضلة", sortRating: "حسب التقييم",
      readBtn: "قراءة", downloadBtn: "تحميل", shareBtn: "مشاركة", citeBtn: "توثيق APA", summaryBtn: "ملخص 3 دقائق",
      favoriteBtn: "أضف إلى المفضلة", unfavoriteBtn: "إزالة من المفضلة", rateBtn: "تقييم الكتاب",
      noBooks: "لم يتم العثور على كتب مطابقة لخيارات البحث.", errorMsg: "تعذر تحميل قائمة الكتب.",
      footerText: "الأرشيف الإداري العراقي - المستودع الرقمي المتخصص في العلوم الإدارية",
      toastCopied: "تم النسخ إلى الحافظة بنجاح.",
      toastCiteCopied: "تم نسخ التوثيق الأكاديمي (APA) إلى الحافظة.",
      toastBundleCopied: "تم نسخ رابط الحزمة البحثية المجمعة بنجاح.",
      toastFavoriteAdded: "تمت إضافة الكتاب إلى المفضلة.", toastFavoriteRemoved: "تمت إزالة الكتاب من المفضلة.",
      toastRated: "تم حفظ تقييمك بنجاح.", generalCat: "عام", defaultPublisher: "الأرشيف الإداري العراقي", defaultType: "مرجع منهجي", themeTooltip: "تبديل المظهر",
      loading: "جارٍ تحميل المراجع…", fileUnavailable: "ملف المرجع غير متاح حاليًا.", searchLabel: "البحث في المراجع", clearSearch: "مسح البحث",
      gridView: "عرض شبكي", listView: "عرض قائمة", selectBundle: "تحديد المرجع لإضافته إلى الحزمة البحثية",
      bundleText: "تم تحديد <strong id='bundleCount'>0</strong> مراجع لإنشاء حزمة بحثية",
      bundleBtn: "نسخ رابط الحزمة المجمعة", modalTitle: "ملخص المرجع الإداري (3 دقائق)",
      modalIdeasTitle: "<i class='bi bi-lightbulb me-1'></i> أهم الأفكار الرئيسية في هذا المرجع:",
      modalAudienceTitle: "<i class='bi bi-award me-1'></i> الفئة الأكثر استفادة:",
      defaultAudience: "المدراء التنفيذيون، الباحثون في العلوم الإدارية، وطلاب الدراسات العليا.",
      modalAPATitle: "<i class='bi bi-quote me-1'></i> التوثيق الأكاديمي المباشر (APA):", modalClose: "إغلاق",
      defaultPoints: ["التحليل الهيكلي والتنظيمي للمؤسسات الحديثة.", "طرق صياغة القرارات الإدارية وتوزيع الصلاحيات.", "آليات التقييم والتطوير المؤسسي المستمر."],
      pagesSuffix: "صفحة", toastCopyFailed: "تعذّر النسخ تلقائيًا. انسخ الرابط من شريط العنوان.",
      viewCover: "عرض الغلاف", shareTitle: "مشاركة الكتاب", shareText: "ألق نظرة على هذا الكتاب:",
      shareModalBtn: "مشاركة",
      backToList: "العودة إلى جميع المراجع",
      descLabel: "الوصف",
      keyPointsLabel: "الأفكار الرئيسية",
      audienceLabel: "الفئة المستهدفة",
      readLabel: "قراءة",
      downloadLabel: "تحميل",
      citeLabel: "توثيق APA",
      shareLabel: "مشاركة"
    },
    en: {
      announcement: "IAR Archive - Interactive Digital Repository for Management & Reference Sciences",
      subtitle: "Iraqi Administrative Reference", aboutTitle: "Digital Repository for Management Sciences",
      aboutDesc: "A knowledge platform dedicated to archiving administrative references, providing 3-minute summaries, direct APA citations, and research bundle creation.",
      statBooks: "References Available", statCats: "Categories", statYear: "Archived Year", statVisits: "Unique Visitors",
      searchPlaceholder: "Search by title, author, publisher, or keywords...",
      allCategories: "All Categories", sortDefault: "Default Sorting", sortTitle: "Sort by Title (Alphabetical)",
      sortYear: "Sort by Year", sortPages: "Sort by Pages", sortDownloads: "Sort by Downloads",
      sortFavorites: "Sort by Favorites", sortRating: "Sort by Rating",
      readBtn: "Read", downloadBtn: "Download", shareBtn: "Share", citeBtn: "Cite APA", summaryBtn: "3-Min Summary",
      favoriteBtn: "Add to Favorites", unfavoriteBtn: "Remove from Favorites", rateBtn: "Rate this book",
      noBooks: "No matching references found.", errorMsg: "Failed to load repository data.",
      footerText: "Iraqi Administrative Reference - Digital Repository for Management Sciences",
      toastCopied: "Copied to clipboard.", toastCiteCopied: "APA Citation copied to clipboard.",
      toastBundleCopied: "Research bundle link copied successfully.",
      toastFavoriteAdded: "Book added to favorites.", toastFavoriteRemoved: "Book removed from favorites.",
      toastRated: "Your rating has been saved.", generalCat: "General", defaultPublisher: "IAR Archive", defaultType: "Methodological Reference", themeTooltip: "Toggle Theme",
      loading: "Loading references…", fileUnavailable: "This reference file is currently unavailable.", searchLabel: "Search references", clearSearch: "Clear search",
      gridView: "Grid view", listView: "List view", selectBundle: "Select this reference for the research bundle",
      bundleText: "Selected <strong id='bundleCount'>0</strong> references for research bundle",
      bundleBtn: "Copy Bundle Share Link", modalTitle: "Administrative Reference Summary (3 Minutes)",
      modalIdeasTitle: "<i class='bi bi-lightbulb me-1'></i> Key Concepts in This Reference:",
      modalAudienceTitle: "<i class='bi bi-award me-1'></i> Target Audience:",
      defaultAudience: "Executive managers, administrative researchers, and postgraduate students.",
      modalAPATitle: "<i class='bi bi-quote me-1'></i> Direct Academic Citation (APA):", modalClose: "Close",
      defaultPoints: ["Structural and organizational analysis of modern institutions.", "Methods of administrative decision-making and delegation of authority.", "Continuous institutional assessment and development mechanisms."],
      pagesSuffix: "Pages", toastCopyFailed: "Automatic copy failed. Please copy the link from the address bar.",
      viewCover: "View cover", shareTitle: "Share this book", shareText: "Check out this book:",
      shareModalBtn: "Share",
      backToList: "Back to all references",
      descLabel: "Description",
      keyPointsLabel: "Key Concepts",
      audienceLabel: "Target Audience",
      readLabel: "Read",
      downloadLabel: "Download",
      citeLabel: "Cite APA",
      shareLabel: "Share"
    }
  };

  // ===== Helper Functions =====
  function translateDynamicText(text, enField) {
    if (currentLang !== 'en') return text || '';
    if (enField && enField.trim() !== '') return enField;
    return text || '';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function asText(value) { return value === null || value === undefined ? '' : String(value).trim(); }

  function safeAssetUrl(value, allowedExtensions) {
    const source = asText(value);
    if (!source) return '';
    try {
      const url = new URL(source, new URL('./books.json', window.location.href));
      if (url.origin !== window.location.origin || !allowedExtensions.test(url.pathname)) return '';
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_) { return ''; }
  }

  function textArray(value) { return Array.isArray(value) ? value.map(asText).filter(Boolean) : []; }

  function normalizeBook(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = Number(raw.id);
    if (!Number.isSafeInteger(id) || id < 0) return null;
    const title = asText(raw.title);
    if (!title) return null;
    return {
      id, title, title_en: asText(raw.title_en),
      author: asText(raw.author), author_en: asText(raw.author_en),
      category: asText(raw.category), category_en: asText(raw.category_en),
      description: asText(raw.description), description_en: asText(raw.description_en),
      publisher: asText(raw.publisher), publisher_en: asText(raw.publisher_en),
      type: asText(raw.type), type_en: asText(raw.type_en),
      target_audience: asText(raw.target_audience), target_audience_en: asText(raw.target_audience_en),
      year: asText(raw.year), pages: asText(raw.pages), file_size: asText(raw.file_size),
      keywords: textArray(raw.keywords), keywords_en: textArray(raw.keywords_en),
      key_points: textArray(raw.key_points), key_points_en: textArray(raw.key_points_en),
      file_path: safeAssetUrl(raw.file_path, /\.pdf$/i),
      file_name: asText(raw.file_name) || (raw.file_path ? decodeURIComponent(asText(raw.file_path).split('/').pop() || '') : ''),
      cover_image: safeAssetUrl(raw.cover_image, /\.(avif|gif|jpe?g|png|webp)$/i),
      downloadCount: 0, publicRating: 0, ratingCount: 0, ratingSum: 0, voters: []
    };
  }

  function setMetadataChip(elementId, iconClass, text) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const icon = document.createElement('i');
    icon.className = `bi ${iconClass} me-1`;
    element.replaceChildren(icon, document.createTextNode(` ${text}`));
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
  }

  function getCategoryKey(book) {
    const raw = (book.category || '').trim();
    return raw !== '' ? raw : '__general__';
  }

  function getCategoryLabel(book) {
    const label = translateDynamicText(book.category, book.category_en);
    return label && label.trim() !== '' ? label : i18n[currentLang].generalCat;
  }

  // ===== URL Parameter Handling =====
  function getBookIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const bookParam = params.get('book');
    if (bookParam !== null) {
      const id = Number(bookParam);
      if (Number.isSafeInteger(id) && id >= 0) return id;
    }
    return null;
  }

  function generateBookUrl(bookId) {
    const url = new URL(window.location.href);
    url.searchParams.set('book', bookId);
    return url.toString();
  }

  function updatePageTitle(book) {
    if (book) {
      const title = translateDynamicText(book.title, book.title_en);
      setText('pageTitle', `${title} | IAR Archive`);
      const desc = translateDynamicText(book.description, book.description_en);
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', desc.substring(0, 160));
    } else {
      setText('pageTitle', 'IAR Archive | Iraqi Administrative Reference');
    }
  }

  // ===== Firebase Functions =====
  async function getSiteVisits() {
    try {
      const doc = await db.collection('stats').doc('visits').get();
      return doc.exists ? doc.data().count || 0 : 0;
    } catch (error) {
      console.error('Error fetching site visits:', error);
      return parseInt(storage.get('iar_site_visits', '0')) || 0;
    }
  }

  async function incrementUniqueVisit() {
    const visitsRef = db.collection('stats').doc('visits');
    try {
      const newCount = await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(visitsRef);
        const currentCount = doc.exists ? doc.data().count || 0 : 0;
        const nextCount = currentCount + 1;
        transaction.set(visitsRef, { count: nextCount });
        return nextCount;
      });
      storage.set('iar_site_visits', newCount);
      return newCount;
    } catch (error) {
      console.error('Unique visit increment failed:', error);
      const local = parseInt(storage.get('iar_site_visits', '0')) || 0;
      return local + 1;
    }
  }

  async function incrementDownloadCount(bookId) {
    try {
      const docRef = db.collection('downloads').doc(String(bookId));
      await docRef.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true });
      const doc = await docRef.get();
      return doc.exists ? doc.data().count || 0 : 0;
    } catch (error) {
      console.error('Error incrementing download count:', error);
      return null;
    }
  }

  async function loadPublicRatings() {
    try {
      const snapshot = await db.collection('ratings').get();
      snapshot.forEach(doc => {
        const book = booksData.find(b => b.id === Number(doc.id));
        if (book) {
          const data = doc.data();
          book.publicRating = data.average || 0;
          book.ratingCount = data.ratingCount || 0;
          book.ratingSum = data.ratingSum || 0;
          book.voters = data.voters || [];
        }
      });
    } catch (error) {
      console.error('Error loading public ratings from Firebase:', error);
    }
  }

  async function loadDownloadCounts() {
    try {
      const snapshot = await db.collection('downloads').get();
      snapshot.forEach(doc => {
        const book = booksData.find(b => b.id === Number(doc.id));
        if (book) book.downloadCount = doc.data().count || 0;
      });
    } catch (error) {
      console.error('Error loading download counts from Firebase:', error);
    }
  }

  async function updateSiteVisits() {
    try {
      if (isNewVisit()) {
        storage.set('iar_last_visit', Date.now());
        const count = await incrementUniqueVisit();
        setText('siteVisitsCounter', count);
      } else {
        const count = await getSiteVisits();
        setText('siteVisitsCounter', count);
      }
    } catch (error) {
      console.error('Error updating site visits:', error);
      const local = parseInt(storage.get('iar_site_visits', '0')) || 0;
      setText('siteVisitsCounter', local);
    }
  }

  function isNewVisit() {
    const lastVisit = parseInt(storage.get('iar_last_visit', '0')) || 0;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return (now - lastVisit > oneDay);
  }

  // ===== دالة التقييم المحسّنة للتعامل الآمن مع القواعد =====
  async function submitPublicRating(bookId, newRating) {
    if (typeof newRating !== 'number' || newRating < 1 || newRating > 5) {
      showToast(currentLang === 'ar' ? 'قيمة التقييم غير صحيحة' : 'Invalid rating value', 'danger');
      return false;
    }

    if (!auth.currentUser) {
      showToast(currentLang === 'ar' ? 'لم يتم تسجيل الدخول بعد' : 'Not logged in yet', 'danger');
      return false;
    }

    const uid = auth.currentUser.uid;
    const book = booksData.find(b => b.id === bookId);
    if (!book) return false;

    // فحص سريع محلي لمنع الإرسال المزدوج
    if (book.voters && book.voters.includes(uid)) {
      showToast(currentLang === 'ar' ? 'لقد قمت بتقييم هذا الكتاب مسبقاً.' : 'You have already rated this book.', 'danger');
      return false;
    }

    try {
      const docRef = db.collection('ratings').doc(String(bookId));
      const doc = await docRef.get();
      
      let newSum = newRating;
      let newCount = 1;
      
      if (doc.exists) {
          const data = doc.data();
          const existingVoters = Array.isArray(data.voters) ? data.voters : [];
          
          if (existingVoters.includes(uid)) {
              showToast(currentLang === 'ar' ? 'لقد قمت بتقييم هذا الكتاب مسبقاً.' : 'You have already rated this book.', 'danger');
              return false;
          }
          newSum = (data.ratingSum || 0) + newRating;
          newCount = (data.ratingCount || 0) + 1;
      }

      await docRef.set({
        ratingSum: newSum,
        ratingCount: newCount,
        average: newSum / newCount,
        voters: firebase.firestore.FieldValue.arrayUnion(uid)
      }, { merge: true });

      book.ratingSum = newSum;
      book.ratingCount = newCount;
      book.publicRating = newSum / newCount;
      if (!book.voters) book.voters = [];
      book.voters.push(uid);

      return true;

    } catch (error) {
      console.error('Error submitting rating:', error);
      showToast(currentLang === 'ar' ? 'حدث خطأ أثناء حفظ التقييم.' : 'Error saving rating.', 'danger');
      return false;
    }
  }

  function renderStars(bookId, container) {
    if (!container) return;
    const book = booksData.find(b => b.id === bookId);
    const currentRating = book ? Math.round(book.publicRating || 0) : 0;
    
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('i');
      star.className = `bi ${i <= currentRating ? 'bi-star-fill active' : 'bi-star'}`;
      star.setAttribute('role', 'button');
      star.setAttribute('aria-label', `${i} ${i18n[currentLang].rateBtn}`);
      
      star.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // إصلاح مشكلة النقرات المتكررة (Race Condition Fix)
        if (container.style.pointerEvents === 'none') return; 
        container.style.pointerEvents = 'none'; // قفل الواجهة مؤقتاً
        
        const success = await submitPublicRating(bookId, i);
        
        if (success) {
          renderStars(bookId, container);
          showToast(i18n[currentLang].toastRated);
          if (document.getElementById('sortOrder')?.value === 'rating') {
            applyFilters();
          }
        } else {
          // فتح الواجهة مرة أخرى في حالة الفشل
          container.style.pointerEvents = 'auto'; 
        }
      });
      container.appendChild(star);
    }
    if (book && book.ratingCount) {
      const countSpan = document.createElement('small');
      countSpan.className = 'text-muted ms-2';
      countSpan.textContent = `(${book.ratingCount})`;
      container.appendChild(countSpan);
    }
  }

  // ===== Theme & Language =====
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  let currentTheme = storage.get('iar_theme', 'light') === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-bs-theme', currentTheme);
  updateThemeIcon(currentTheme);

  themeToggleBtn?.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', currentTheme);
    storage.set('iar_theme', currentTheme);
    updateThemeIcon(currentTheme);
  });

  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = theme === 'dark' ? 'bi bi-sun fs-6' : 'bi bi-moon fs-6';
  }

  const langToggleBtn = document.getElementById('langToggleBtn');
  function applyLanguage(lang) {
    currentLang = i18n[lang] ? lang : 'ar';
    storage.set('iar_lang', currentLang);
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');

    const bootstrapCSS = document.getElementById('bootstrapCSS');
    if (bootstrapCSS) {
      bootstrapCSS.href = currentLang === 'ar' 
        ? "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.rtl.min.css" 
        : "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
    }
    
    setText('langLabel', currentLang === 'ar' ? "EN" : "عربي");

    const t = i18n[currentLang];
    
    setText('txt-announcement', t.announcement);
    setText('txt-subtitle', t.subtitle);
    setText('txt-about-title', t.aboutTitle);
    setText('txt-about-desc', t.aboutDesc);
    setText('txt-stat-books', t.statBooks);
    setText('txt-stat-cats', t.statCats);
    setText('txt-stat-year', t.statYear);
    setText('txt-stat-visits', t.statVisits);
    setText('searchLabel', t.searchLabel);
    setText('opt-sort-default', t.sortDefault);
    setText('opt-sort-title', t.sortTitle);
    setText('opt-sort-year', t.sortYear);
    setText('opt-sort-pages', t.sortPages);
    setText('opt-sort-downloads', t.sortDownloads);
    setText('opt-sort-favorites', t.sortFavorites);
    setText('opt-sort-rating', t.sortRating);
    setHTML('txt-bundle-text', t.bundleText);
    setText('txt-bundle-btn', t.bundleBtn);
    setText('summaryModalTitle', t.modalTitle);
    setHTML('txt-modal-ideas-title', t.modalIdeasTitle);
    setHTML('txt-modal-audience-title', t.modalAudienceTitle);
    setHTML('txt-modal-apa-title', t.modalAPATitle);
    setText('txt-modal-close', t.modalClose);
    setAttribute('summaryDismissBtn', 'aria-label', t.modalClose);
    setAttribute('pdfDismissBtn', 'aria-label', t.modalClose);
    setText('txt-loading', t.loading);
    setAttribute('searchInput', 'placeholder', t.searchPlaceholder);
    setAttribute('btnClearSearch', 'aria-label', t.clearSearch);
    setAttribute('themeToggleBtn', 'aria-label', t.themeTooltip);
    setAttribute('themeToggleBtn', 'title', t.themeTooltip);
    setText('txt-share-modal-btn', t.shareModalBtn);
    setText('txt-back-to-list', t.backToList);
    setText('singleDescLabel', t.descLabel);
    setText('singleKeyPointsLabel', t.keyPointsLabel);
    setText('singleAudienceLabel', t.audienceLabel);
    setText('singleReadLabel', t.readLabel);
    setText('singleDownloadLabel', t.downloadLabel);
    setText('singleCiteLabel', t.citeLabel);
    setText('singleShareLabel', t.shareLabel);
    
    updateViewControls();
    syncBundleUI();
    if (booksLoaded && booksData.length > 0) { setupChipsCategories(); applyFilters(); }
  }

  langToggleBtn?.addEventListener('click', () => {
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    storage.set('iar_lang', newLang);
    window.location.reload();
  });

  // ===== View Mode =====
  const btnViewGrid = document.getElementById('btnViewGrid');
  const btnViewList = document.getElementById('btnViewList');
  function updateViewControls() {
    const isGrid = currentViewMode === 'grid';
    if (btnViewGrid) {
      btnViewGrid.classList.toggle('active', isGrid);
      btnViewGrid.setAttribute('aria-pressed', String(isGrid));
      btnViewGrid.setAttribute('aria-label', i18n[currentLang].gridView);
    }
    if (btnViewList) {
      btnViewList.classList.toggle('active', !isGrid);
      btnViewList.setAttribute('aria-pressed', String(!isGrid));
      btnViewList.setAttribute('aria-label', i18n[currentLang].listView);
    }
  }
  btnViewGrid?.addEventListener('click', () => { currentViewMode = 'grid'; storage.set('iar_view_mode', 'grid'); updateViewControls(); applyFilters(); });
  btnViewList?.addEventListener('click', () => { currentViewMode = 'list'; storage.set('iar_view_mode', 'list'); updateViewControls(); applyFilters(); });

  // ===== Device Detection =====
  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  // ===== Single Book View =====
  function showSingleBookView(book) {
    isSingleView = true;
    hideEl('booksDisplayContainer');
    hideEl('controlsRow');
    hideEl('categoryChips');
    hideEl('bundleBar');
    showEl('singleBookView');
    
    const t = i18n[currentLang];
    setAttribute('singleBookCover', 'src', book.cover_image || '');
    setAttribute('singleBookCover', 'alt', translateDynamicText(book.title, book.title_en));
    setText('singleBookTitle', translateDynamicText(book.title, book.title_en));
    setText('singleBookAuthor', translateDynamicText(book.author, book.author_en));
    setText('singleBookCategory', translateDynamicText(book.category, book.category_en) || t.generalCat);
    setText('singleBookType', translateDynamicText(book.type || t.defaultType, book.type_en));
    setText('singleBookDescription', translateDynamicText(book.description, book.description_en));
    setText('singleBookAudience', translateDynamicText(book.target_audience || t.defaultAudience, book.target_audience_en));
    
    const keyPointsList = document.getElementById('singleBookKeyPoints');
    if (keyPointsList) {
      const points = (currentLang === 'en' && book.key_points_en && book.key_points_en.length > 0)
        ? book.key_points_en
        : (book.key_points && book.key_points.length > 0 ? book.key_points : t.defaultPoints);
      keyPointsList.innerHTML = points.map(pt => `<li>${escapeHtml(pt)}</li>`).join('');
    }
    
    setText('singleDownloadCount', book.downloadCount || 0);
    
    const starsContainer = document.getElementById('singleBookStars');
    if (starsContainer) renderStars(book.id, starsContainer);
    
    const readBtn = document.getElementById('singleReadBtn');
    if (readBtn) readBtn.onclick = () => openPdfReader(book.file_path, translateDynamicText(book.title, book.title_en));
    const downloadBtn = document.getElementById('singleDownloadBtn');
    if (downloadBtn) downloadBtn.onclick = () => handleDownload(book.id, book.file_path, book.file_name);
    const citeBtn = document.getElementById('singleCiteBtn');
    if (citeBtn) citeBtn.onclick = () => copyText(`${translateDynamicText(book.author, book.author_en)} (${book.year || '2026'}). ${translateDynamicText(book.title, book.title_en)}. ${translateDynamicText(book.publisher, book.publisher_en) || 'IAR Archive'}.`, t.toastCiteCopied);
    const shareBtn = document.getElementById('singleShareBtn');
    if (shareBtn) shareBtn.onclick = () => shareBook(book);
    
    updatePageTitle(book);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hideSingleBookView() {
    isSingleView = false;
    hideEl('singleBookView');
    showEl('booksDisplayContainer');
    showEl('controlsRow');
    showEl('categoryChips');
    updatePageTitle(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('book');
    window.history.replaceState({}, '', url);
  }

  // ===== Deep Linking Handler =====
  function handleDeepLinking() {
    const bookId = getBookIdFromUrl();
    if (bookId === null) return;
    const book = booksData.find(b => b.id === bookId);
    if (!book) {
      console.warn('Book ID not found:', bookId);
      hideSingleBookView();
      return;
    }
    showSingleBookView(book);
  }

  // ===== Share Function =====
  function shareBook(book) {
    if (!book) return;
    const title = translateDynamicText(book.title, book.title_en);
    const author = translateDynamicText(book.author, book.author_en);
    const url = generateBookUrl(book.id);
    const shareText = `${i18n[currentLang].shareText} "${title}" - ${author}\n${url}`;
    if (navigator.share) {
      navigator.share({ title, text: shareText, url: url }).catch(() => {});
    } else {
      copyText(shareText, i18n[currentLang].toastCopied);
    }
  }

  async function handleDownload(bookId, filePath, fileName) {
    if (!filePath) return showToast(i18n[currentLang].fileUnavailable, 'danger');
    
    const newCount = await incrementDownloadCount(bookId);
    const book = booksData.find(b => b.id === bookId);
    if (book && newCount !== null) {
      book.downloadCount = newCount;
      const countEl = document.getElementById(`downloadCount-${bookId}`);
      if (countEl) countEl.innerText = book.downloadCount;
      const singleCount = document.getElementById('singleDownloadCount');
      if (singleCount && isSingleView && currentOpenBookId === bookId) singleCount.innerText = book.downloadCount;
    }
    
    try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || `book-${bookId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const link = document.createElement('a');
      link.href = filePath;
      link.download = fileName || `book-${bookId}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  document.getElementById('modalShareBtn')?.addEventListener('click', () => {
    if (currentOpenBookId !== null) {
      const book = booksData.find(b => b.id === currentOpenBookId);
      if (book) shareBook(book);
    }
  });

  function toggleFavorite(bookId) {
    favoriteIds.has(bookId) ? favoriteIds.delete(bookId) : favoriteIds.add(bookId);
    showToast(favoriteIds.has(bookId) ? i18n[currentLang].toastFavoriteAdded : i18n[currentLang].toastFavoriteRemoved);
    storage.set('iar_favorites', JSON.stringify(Array.from(favoriteIds)));
    applyFilters();
  }
  const isFavorite = (bookId) => favoriteIds.has(bookId);

  function setupChipsCategories() {
    const container = document.getElementById('categoryChips');
    if (!container) return;
    const labelsByKey = new Map();
    booksData.forEach(book => labelsByKey.set(getCategoryKey(book), getCategoryLabel(book)));
    const keys = ['all', ...labelsByKey.keys()];
    const catCounter = document.getElementById('catCounter');
    if (catCounter) catCounter.innerText = keys.length - 1;

    container.innerHTML = keys.map(key => `
      <button type="button" class="chip-item ${key === selectedCategory ? 'active' : ''}" 
              data-category="${escapeHtml(key)}" aria-pressed="${key === selectedCategory}">
        ${escapeHtml(key === 'all' ? i18n[currentLang].allCategories : labelsByKey.get(key))}
      </button>`).join('');

    container.querySelectorAll('.chip-item').forEach(chip => {
      chip.addEventListener('click', (e) => {
        container.querySelectorAll('.chip-item').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
        e.currentTarget.classList.add('active');
        e.currentTarget.setAttribute('aria-pressed', 'true');
        selectedCategory = e.currentTarget.getAttribute('data-category');
        applyFilters();
      });
    });
  }

  function openPdfReader(filePath, title) {
    if (!filePath) return showToast(i18n[currentLang].fileUnavailable, 'danger');
    setText('modalBookTitle', title);
    const iframe = document.getElementById('pdfFrame');
    const fallbackContainer = document.getElementById('pdfFallbackContainer');
    const fallbackLink = document.getElementById('pdfFallbackLink');
    if (!iframe || !fallbackContainer || !fallbackLink) return;
    
    fallbackLink.href = filePath;
    
    if (isMobileDevice()) {
      fallbackContainer.style.display = 'block';
      iframe.src = `https://docs.google.com/viewer?url=${encodeURIComponent(new URL(filePath, window.location.href).href)}&embedded=true`;
    } else {
      fallbackContainer.style.display = 'none';
      iframe.src = filePath;
    }
    
    iframe.onerror = () => { fallbackContainer.style.display = 'block'; };
    pdfModal.show();
  }
  document.getElementById('pdfReaderModal')?.addEventListener('hidden.bs.modal', () => {
    const iframe = document.getElementById('pdfFrame');
    if (iframe) iframe.src = '';
  });

  function openCoverImage(imageSrc, title) {
    const img = document.getElementById('coverImageLarge');
    if (img) { img.src = imageSrc; img.alt = title; }
    coverModal.show();
  }

  function openSummaryModal(id) {
    const book = booksData.find(b => b.id === id);
    if (!book) return;
    currentOpenBookId = id;
    const t = i18n[currentLang];
    const title = translateDynamicText(book.title, book.title_en);
    const author = translateDynamicText(book.author, book.author_en);
    const publisher = translateDynamicText(book.publisher || t.defaultPublisher, book.publisher_en);

    setText('summaryBookTitle', title);
    setText('summaryBookAuthor', author);
    setText('summaryCategory', translateDynamicText(book.category, book.category_en) || t.generalCat);
    setText('summaryType', translateDynamicText(book.type || t.defaultType, book.type_en));
    setMetadataChip('summaryPages', 'bi-file-earmark-text', `${book.pages || '-'} ${t.pagesSuffix}`);
    setMetadataChip('summarySize', 'bi-hdd', book.file_size || '-');
    setText('summaryAudience', translateDynamicText(book.target_audience || t.defaultAudience, book.target_audience_en));
    setText('summaryAPA', `${author} (${book.year || '2026'}). ${title}. ${publisher}.`);

    const pointsList = document.getElementById('summaryKeyPoints');
    if (pointsList) {
      let points = (currentLang === 'en' && book.key_points_en && book.key_points_en.length > 0) ? book.key_points_en : (book.key_points && book.key_points.length > 0 ? book.key_points : t.defaultPoints);
      pointsList.innerHTML = points.map(pt => `<li>${escapeHtml(pt)}</li>`).join('');
    }
    summaryModal.show();
  }

  function toggleBundleSelection(id) {
    if (selectedBundleIds.has(id)) selectedBundleIds.delete(id); else selectedBundleIds.add(id);
    syncBundleUI();
  }
  function syncBundleUI() {
    const countEl = document.getElementById('bundleCount');
    if (countEl) countEl.innerText = selectedBundleIds.size;
    const bundleBar = document.getElementById('bundleBar');
    if (bundleBar) bundleBar.classList.toggle('d-none', selectedBundleIds.size === 0);
    const copyBtn = document.getElementById('copyBundleBtn');
    if (copyBtn) copyBtn.disabled = selectedBundleIds.size === 0;
  }
  function hydrateBundleFromUrl() {
    const rawIds = new URL(window.location.href).searchParams.get('bundle');
    if (!rawIds) return;
    const availableIds = new Set(booksData.map(b => b.id));
    selectedBundleIds = new Set(rawIds.split(',').map(Number).filter(id => Number.isSafeInteger(id) && availableIds.has(id)));
  }
  
  document.getElementById('copyBundleBtn')?.addEventListener('click', async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('bundle', Array.from(selectedBundleIds).join(','));
    copyText(url.toString(), i18n[currentLang].toastBundleCopied);
  });

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const helper = document.createElement('textarea');
        helper.value = text;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        const copied = document.execCommand('copy');
        helper.remove();
        if (!copied) throw new Error('Copy command failed');
      }
      showToast(successMessage);
    } catch (_) {
      showToast(i18n[currentLang].toastCopyFailed, 'danger');
    }
  }

  function showToast(message, variant = 'primary') {
    const host = document.createElement('div');
    host.className = 'position-fixed bottom-0 start-50 translate-middle-x p-3';
    host.style.zIndex = '99999';

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${variant} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const row = document.createElement('div');
    row.className = 'd-flex';

    const body = document.createElement('div');
    body.className = 'toast-body';

    const icon = document.createElement('i');
    icon.className = `bi ${variant === 'danger' ? 'bi-exclamation-circle' : 'bi-check-circle'} me-2`;

    body.append(icon, document.createTextNode(message));

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', i18n[currentLang].modalClose);

    row.append(body, closeButton);
    toast.appendChild(row);
    host.appendChild(toast);
    document.body.appendChild(host);

    toast.addEventListener('hidden.bs.toast', () => host.remove());
    bootstrap.Toast.getOrCreateInstance(toast, { delay: 4000 }).show();
  }

  document.getElementById('booksDisplayContainer')?.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action]');
    if (!trigger) return;
    const book = booksData.find(b => b.id === Number(trigger.getAttribute('data-id')));
    if (!book) return;
    const t = i18n[currentLang];
    const title = translateDynamicText(book.title, book.title_en);
    const author = translateDynamicText(book.author, book.author_en);
    const publisher = translateDynamicText(book.publisher || t.defaultPublisher, book.publisher_en);
    
    switch (trigger.getAttribute('data-action')) {
      case 'read': openPdfReader(book.file_path, title); break;
      case 'summary': openSummaryModal(book.id); break;
      case 'cite': 
        copyText(`${author} (${book.year || '2026'}). ${title}. ${publisher}.`, t.toastCiteCopied);
        break;
      case 'cover-zoom': if (book.cover_image) openCoverImage(book.cover_image, title); break;
      case 'favorite': toggleFavorite(book.id); break;
      case 'share': shareBook(book); break;
      case 'download': handleDownload(book.id, book.file_path, book.file_name); break;
    }
  });

  document.getElementById('booksDisplayContainer')?.addEventListener('change', (e) => {
    const trigger = e.target.closest('[data-action="bundle"]');
    if (trigger) toggleBundleSelection(Number(trigger.getAttribute('data-id')));
  });

  function renderBooks(books) {
    const container = document.getElementById('booksDisplayContainer');
    if (!container) return;
    const t = i18n[currentLang];
    if (books.length === 0) return container.innerHTML = `<p class="text-center text-muted py-5">${t.noBooks}</p>`;

    if (currentViewMode === 'grid') {
      container.innerHTML = `<div class="row g-4">${books.map(book => {
        let title = escapeHtml(translateDynamicText(book.title, book.title_en));
        let author = escapeHtml(translateDynamicText(book.author, book.author_en));
        let category = escapeHtml(translateDynamicText(book.category, book.category_en) || t.generalCat);
        let publisher = escapeHtml(translateDynamicText(book.publisher || t.defaultPublisher, book.publisher_en));
        let type = escapeHtml(translateDynamicText(book.type || t.defaultType, book.type_en));
        const isFav = isFavorite(book.id);
        
        const coverHtml = book.cover_image 
          ? `<div class="cover-img-wrapper" data-action="cover-zoom" data-id="${book.id}">
               <img src="${escapeHtml(book.cover_image)}" class="cover-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="cover-placeholder" style="display:none;"><i class="bi bi-journal-x"></i></div>
             </div>`
          : `<div class="cover-placeholder"><i class="bi bi-book"></i></div>`;

        const downloadControl = book.file_path
          ? `<button type="button" data-action="download" data-id="${book.id}" class="btn btn-iar-primary w-100 text-center d-flex align-items-center justify-content-center">
               <i class="bi bi-download me-1" aria-hidden="true"></i>
               <span>${t.downloadBtn}</span>
               <span class="badge bg-light text-dark ms-2 px-2 py-1" id="downloadCount-${book.id}">${book.downloadCount || 0}</span>
             </button>`
          : `<button type="button" class="btn btn-iar-primary w-100" disabled aria-disabled="true"><i class="bi bi-download me-1"></i>${t.downloadBtn}</button>`;

        return `
          <div class="col-lg-6">
            <div class="card h-100 book-card d-flex flex-column justify-content-between">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge-type"><i class="bi bi-journal-check me-1"></i>${type}</span>
                <input class="form-check-input" type="checkbox" ${selectedBundleIds.has(book.id) ? 'checked' : ''} data-action="bundle" data-id="${book.id}" aria-label="${escapeHtml(t.selectBundle)}">
              </div>
              <div class="d-flex gap-3 mb-3">
                <div class="cover-container shadow-sm">${coverHtml}</div>
                <div class="d-flex flex-column flex-grow-1">
                  <span class="badge-tag align-self-start">${category}</span>
                  <h3 class="book-title">${title}</h3>
                  <p class="book-author mb-2"><i class="bi bi-person me-1"></i>${author}</p>
                  <div class="rating-stars" id="stars-${book.id}"></div>
                  <div class="d-flex flex-wrap gap-2 mt-auto">
                    <span class="meta-spec-chip"><i class="bi bi-building me-1"></i>${publisher} (${escapeHtml(book.year || '2026')})</span>
                  </div>
                </div>
              </div>
              <p class="book-desc mb-3 pt-2 border-top border-light-subtle">${escapeHtml(translateDynamicText(book.description, book.description_en))}</p>
              <div class="row g-2 mt-auto">
                <div class="col-6 col-md-3"><button data-action="read" data-id="${book.id}" class="btn btn-iar-action w-100"><i class="bi bi-eye me-1"></i> ${t.readBtn}</button></div>
                <div class="col-6 col-md-3">${downloadControl}</div>
                <div class="col-6 col-md-3"><button data-action="summary" data-id="${book.id}" class="btn btn-iar-action w-100"><i class="bi bi-card-text me-1"></i> ${t.summaryBtn}</button></div>
                <div class="col-6 col-md-3"><button data-action="cite" data-id="${book.id}" class="btn btn-iar-action w-100" title="${t.citeBtn}" aria-label="${t.citeBtn}"><i class="bi bi-quote"></i></button></div>
                <div class="col-6"><button data-action="favorite" data-id="${book.id}" class="btn btn-iar-action w-100" title="${isFav ? t.unfavoriteBtn : t.favoriteBtn}" aria-label="${isFav ? t.unfavoriteBtn : t.favoriteBtn}"><i class="bi ${isFav ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i></button></div>
                <div class="col-6"><button data-action="share" data-id="${book.id}" class="btn btn-iar-action w-100" title="${t.shareBtn}" aria-label="${t.shareBtn}"><i class="bi bi-share"></i></button></div>
              </div>
            </div>
          </div>`;
      }).join('')}</div>`;
    } else {
      container.innerHTML = `
        <div class="table-responsive bg-body rounded-3 border p-2">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 40px;"></th>
                <th>${currentLang==='en'?'Book Title':'عنوان الكتاب'}</th>
                <th>${currentLang==='en'?'Author':'المؤلف'}</th>
                <th>${currentLang==='en'?'Category':'التصنيف'}</th>
                <th class="text-end">${currentLang==='en'?'Actions':'الإجراءات'}</th>
              </tr>
            </thead>
            <tbody>${books.map(book => {
              const isFav = isFavorite(book.id);
              const downloadControl = book.file_path
                ? `<button type="button" data-action="download" data-id="${book.id}" class="btn btn-primary btn-sm d-inline-flex align-items-center" aria-label="${t.downloadBtn}">
                     <i class="bi bi-download"></i>
                     <span class="badge bg-light text-dark ms-1 px-1" id="downloadCount-${book.id}">${book.downloadCount || 0}</span>
                   </button>`
                : `<button type="button" class="btn btn-primary btn-sm" disabled aria-disabled="true" aria-label="${t.downloadBtn}"><i class="bi bi-download"></i></button>`;

              return `
              <tr>
                <td><input class="form-check-input" type="checkbox" ${selectedBundleIds.has(book.id) ? 'checked' : ''} data-action="bundle" data-id="${book.id}" aria-label="${escapeHtml(t.selectBundle)}"></td>
                <td class="fw-bold">${escapeHtml(translateDynamicText(book.title, book.title_en))}</td>
                <td class="small text-muted">${escapeHtml(translateDynamicText(book.author, book.author_en))}</td>
                <td><span class="badge-tag">${escapeHtml(translateDynamicText(book.category, book.category_en) || t.generalCat)}</span></td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm flex-wrap gap-1">
                    <button data-action="read" data-id="${book.id}" class="btn btn-outline-primary" aria-label="${t.readBtn}"><i class="bi bi-eye"></i></button>
                    ${downloadControl}
                    <button data-action="summary" data-id="${book.id}" class="btn btn-outline-secondary" aria-label="${t.summaryBtn}"><i class="bi bi-card-text"></i></button>
                    <button data-action="cite" data-id="${book.id}" class="btn btn-outline-secondary" title="${t.citeBtn}" aria-label="${t.citeBtn}"><i class="bi bi-quote"></i></button>
                    <button data-action="favorite" data-id="${book.id}" class="btn btn-outline-secondary" title="${isFav ? t.unfavoriteBtn : t.favoriteBtn}" aria-label="${isFav ? t.unfavoriteBtn : t.favoriteBtn}"><i class="bi ${isFav ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i></button>
                    <button data-action="share" data-id="${book.id}" class="btn btn-outline-secondary" title="${t.shareBtn}" aria-label="${t.shareBtn}"><i class="bi bi-share"></i></button>
                  </div>
                  <div class="mt-1 rating-stars" id="stars-${book.id}"></div>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;
    }
    books.forEach(b => {
      const starsEl = document.getElementById(`stars-${b.id}`);
      if (starsEl) renderStars(b.id, starsEl);
    });
  }

  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  
  function applyFilters() {
    if (!booksData.length || isSingleView) return;
    const query = searchInput?.value.trim().toLocaleLowerCase(currentLang) || '';
    const sortValue = document.getElementById('sortOrder')?.value || 'default';

    let filtered = booksData.filter(book => {
      const keywords = currentLang === 'en' && book.keywords_en.length > 0 ? book.keywords_en.join(' ') : book.keywords.join(' ');
      const searchableText = `${translateDynamicText(book.title, book.title_en)} ${translateDynamicText(book.author, book.author_en)} ${translateDynamicText(book.publisher, book.publisher_en)} ${translateDynamicText(book.description, book.description_en)} ${keywords}`.toLocaleLowerCase(currentLang);
      return (query === '' || searchableText.includes(query)) && (selectedCategory === 'all' || getCategoryKey(book) === selectedCategory);
    });

    const sortMap = {
      'title': (a, b) => translateDynamicText(a.title, a.title_en).localeCompare(translateDynamicText(b.title, b.title_en), currentLang),
      'year': (a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0),
      'pages': (a, b) => (parseInt(a.pages) || 0) - (parseInt(b.pages) || 0),
      'downloads': (a, b) => (b.downloadCount || 0) - (a.downloadCount || 0),
      'rating': (a, b) => (b.publicRating || 0) - (a.publicRating || 0),
      'favorites': (a, b) => {
        const aFav = isFavorite(a.id) ? 1 : 0;
        const bFav = isFavorite(b.id) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
        return translateDynamicText(a.title, a.title_en).localeCompare(translateDynamicText(b.title, b.title_en), currentLang);
      }
    };
    filtered.sort(sortMap[sortValue] || ((a, b) => a.id - b.id));
    renderBooks(filtered);
  }

  searchInput?.addEventListener('input', () => {
    if (btnClearSearch) btnClearSearch.classList.toggle('d-none', searchInput.value.trim() === '');
    debounce(applyFilters, 200)();
  });
  btnClearSearch?.addEventListener('click', () => { 
    if (searchInput) searchInput.value = '';
    if (btnClearSearch) btnClearSearch.classList.add('d-none');
    applyFilters(); 
  });
  document.getElementById('sortOrder')?.addEventListener('change', applyFilters);

  // ===== زر العودة للقائمة =====
  document.getElementById('btnBackToList')?.addEventListener('click', hideSingleBookView);

  // ===== Fetch and Process Books (إصلاح الكاش) =====
  async function fetchBooks() {
    const loadingEl = document.getElementById('booksLoading');
    const container = document.getElementById('booksDisplayContainer');

    if (loadingEl) loadingEl.style.display = 'none';

    try {
      // إصلاح مشكلة الكاش (Cache Busting) بجلب التحديثات الجديدة دائماً
      const timestamp = new Date().getTime();
      const response = await fetch(`./books.json?v=${timestamp}`, { 
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      });
      if (!response.ok) throw new Error(`books.json request failed (${response.status})`);

      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('books.json must contain an array');

      const usedIds = new Set();
      booksData = payload.map(normalizeBook).filter(Boolean).filter(book => {
        if (usedIds.has(book.id)) return false;
        usedIds.add(book.id);
        return true;
      });

      booksLoaded = true;

      hydrateBundleFromUrl();
      syncBundleUI();
      setupChipsCategories();
      setText('booksCounter', booksData.length);

      applyFilters();

      if (loadingEl) loadingEl.style.display = 'none';

      const firebaseTasks = [
        loadPublicRatings(),
        loadDownloadCounts(),
        updateSiteVisits()
      ];

      Promise.allSettled(firebaseTasks).then(results => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Firebase task ${index} failed:`, result.reason);
          }
        });
        if (booksLoaded) {
          applyFilters();
        }
      });

      handleDeepLinking();

    } catch (error) {
      console.error('Critical error loading books.json:', error);
      if (container) {
        container.innerHTML = `<div class="alert alert-danger text-center py-5">
          <i class="bi bi-exclamation-triangle me-2"></i> 
          ${i18n[currentLang].errorMsg || 'تعذر تحميل البيانات المحلية'}
        </div>`;
      }
      if (loadingEl) loadingEl.style.display = 'none';
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  // ===== Initialize =====
  initAuth(); // في الخلفية
  applyLanguage(currentLang);
  fetchBooks(); // تشغيل مباشر دون انتظار

})(); // نهاية التغليف IIFE
