<script lang="ts">
  import type { Book } from '../../lib/books';

  interface Props {
    initialBooks: Book[];
    categories: { name: string; count: number }[];
    featuredBook?: Book;
  }

  let { initialBooks, categories, featuredBook }: Props = $props();

  // Search & Filter state
  let searchQuery = $state('');
  let selectedCategory = $state('القيادة الاستراتيجية');

  // Modal & Drawer state
  let activeBook = $state<Book | null>(null);
  let showModal = $state(false);

  // Bundle state
  let bundle = $state<number[]>([]);
  let toastMessage = $state<string | null>(null);
  let toastTimeout: any = null;

  // Rating state
  let ratings = $state<Record<number, number>>({});

  // Pagination state
  let visibleCount = $state(18);

  function showToast(msg: string) {
    toastMessage = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastMessage = null;
    }, 3200);
  }

  function toggleBundle(id: number) {
    if (bundle.includes(id)) {
      bundle = bundle.filter((item) => item !== id);
      showToast('تمت إزالة المرجع من حزمة الأبحاث');
    } else {
      bundle = [...bundle, id];
      showToast('تمت إضافة المرجع إلى حزمة الأبحاث الخاصة بك ✓');
    }
  }

  function copyCitation(b: Book, e?: Event) {
    if (e) e.stopPropagation();
    const year = b.year || '2024';
    const publisher = b.publisher || 'مستودع المراجع الإدارية العراقية';
    const apa = `${b.author}. (${year}). ${b.title}. ${publisher}.`;
    navigator.clipboard.writeText(apa);
    showToast('تم نسخ التوثيق الأكاديمي (APA) إلى الحافظة بنجاح ✓');
  }

  function openBookDetails(b: Book) {
    activeBook = b;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    activeBook = null;
  }

  function setRating(bookId: number, star: number, e?: Event) {
    if (e) e.stopPropagation();
    ratings[bookId] = star;
    showToast(`شكراً لتقييمك (${star} من 5 نجوم) ★`);
  }

  // Filtered books
  let filteredBooks = $derived(
    initialBooks.filter((book) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.description && book.description.toLowerCase().includes(q)) ||
        (book.keywords && book.keywords.some((k) => k.toLowerCase().includes(q)));

      const matchesCat =
        selectedCategory === 'الكل' ||
        (selectedCategory === 'القيادة الاستراتيجية' && (book.category?.includes('القياد') || book.category?.includes('الإدارية') || book.title.includes('إدار'))) ||
        (selectedCategory === 'الحوكمة المؤسسية' && (book.category?.includes('العامة') || book.category?.includes('الحوكمة'))) ||
        (selectedCategory === 'إدارة الجودة' && book.category?.includes('الجودة')) ||
        (selectedCategory === 'إدارة المهام' && (book.category?.includes('المهارات') || book.category?.includes('التنظيم'))) ||
        (selectedCategory === 'الموارد البشرية' && (book.category?.includes('الموارد') || book.category?.includes('السلوك')));

      return matchesSearch && matchesCat;
    })
  );

  let displayedBooks = $derived(filteredBooks.slice(0, visibleCount));

  // Curated category filter list matching mockup
  const filterList = [
    'القيادة الاستراتيجية',
    'الحوكمة المؤسسية',
    'إدارة الجودة',
    'إدارة المهام',
    'الموارد البشرية',
    'الكل'
  ];
</script>

<div class="bayt-archive-wrapper">
  <!-- 1. Central Search Bar (Mockup exact design) -->
  <div class="search-section">
    <div class="search-input-box">
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="...استكشف في المجموعة"
        class="search-input"
        aria-label="البحث في المراجع الإدارية"
      />
      <span class="search-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </span>
      {#if searchQuery}
        <button
          type="button"
          class="search-clear-btn"
          onclick={() => (searchQuery = '')}
          aria-label="مسح البحث"
        >
          ✕
        </button>
      {/if}
    </div>
  </div>

  <!-- 2. Category Filter Pills Row (Mockup exact design) -->
  <div class="categories-section" role="tablist" aria-label="أقسام المراجع">
    <div class="category-pills">
      {#each filterList as cat}
        <button
          type="button"
          class="cat-pill {selectedCategory === cat ? 'active' : ''}"
          onclick={() => {
            selectedCategory = cat;
            visibleCount = 18;
          }}
          role="tab"
          aria-selected={selectedCategory === cat}
        >
          {cat}
        </button>
      {/each}
    </div>
  </div>

  <!-- 3. Featured Spotlight Card (Mockup exact design: Tome on Left, Info on Right) -->
  {#if featuredBook && !searchQuery}
    <section class="featured-spotlight-card" aria-label="المجلد المرجعي الترويجي">
      <div class="spotlight-inner">
        <!-- Left: 3D Leather Tome on Marble Plinth -->
        <div class="spotlight-media-left">
          <div class="tome-marble-plinth">
            <img
              src="/covers/featured_tome.png"
              alt={featuredBook.title}
              class="tome-img"
              loading="eager"
            />
          </div>
        </div>

        <!-- Right: Featured Info & Tags -->
        <div class="spotlight-content-right">
          <h2 class="spotlight-title">
            حوكمة الاستدامة الإدارية العراقية
          </h2>
          <p class="spotlight-subtitle font-caption">
            Gilded embossed edition · مساحبة تحريرية خاصة
          </p>

          <!-- Attribute Tags -->
          <div class="spotlight-tags">
            <span class="spotlight-tag">القيادة الاستراتيجية الإدارية</span>
            <span class="spotlight-tag">الحوكمة المؤسسية</span>
            <span class="spotlight-tag">القيادة الاستراتيجية</span>
            <span class="spotlight-tag">إدارة المؤسسة</span>
            <span class="spotlight-tag">الموارد البشرية</span>
          </div>

          <!-- Star Rating -->
          <div class="spotlight-rating" aria-label="تقييم المجلد 5 من 5 نجوم">
            {#each [1, 2, 3, 4, 5] as star}
              <span class="star active">★</span>
            {/each}
          </div>

          <!-- Carousel Pagination Dots -->
          <div class="spotlight-dots" aria-hidden="true">
            <span class="dot active"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- 4. Reference Books Grid (Mockup exact design: 3 columns, APA badges, star ratings, navy download buttons) -->
  <section class="catalog-grid-section" aria-label="شبكة المراجع الإدارية">
    {#if displayedBooks.length === 0}
      <div class="empty-state">
        <p class="empty-text font-body-l">لم نعثر على مراجع تطابق معايير البحث.</p>
        <button
          type="button"
          class="btn-reset font-body-m"
          onclick={() => {
            searchQuery = '';
            selectedCategory = 'الكل';
          }}
        >
          إعادة تعيين التصفية
        </button>
      </div>
    {:else}
      <div class="cards-grid">
        {#each displayedBooks as book (book.id)}
          <article
            class="reference-card"
            onclick={() => openBookDetails(book)}
            tabindex="0"
            role="button"
            onkeydown={(e) => e.key === 'Enter' && openBookDetails(book)}
          >
            <!-- Card Header: APA Badges (Left: APA Citation, Right: APA) -->
            <div class="card-top-badges">
              <button
                type="button"
                class="badge-apa-citation font-caption"
                onclick={(e) => copyCitation(book, e)}
                title="نسخ توثيق APA المعتمد"
              >
                APA Citation
              </button>

              <span class="badge-apa-tag font-caption">
                APA
              </span>
            </div>

            <!-- Card Body: Title, Author, Year -->
            <div class="card-body">
              <h3 class="card-title">
                {book.title}
              </h3>

              <div class="card-meta font-caption">
                <span class="card-author">{book.author}</span>
                <span class="card-year">{book.year || '2024'}</span>
              </div>

              <!-- Star Rating -->
              <div
                class="card-rating"
                role="group"
                aria-label="تقييم الكتاب"
              >
                {#each [1, 2, 3, 4, 5] as star}
                  <button
                    type="button"
                    class="star-btn { (ratings[book.id] || 4) >= star ? 'active' : '' }"
                    onclick={(e) => setRating(book.id, star, e)}
                    title={`تقييم ${star} نجوم`}
                  >
                    ★
                  </button>
                {/each}
              </div>
            </div>

            <!-- Card Footer: Bookmark Icon on Left, Navy Download Button on Right -->
            <div class="card-footer">
              <!-- Bookmark / Bundle Button on Left -->
              <button
                type="button"
                class="btn-bookmark {bundle.includes(book.id) ? 'bookmarked' : ''}"
                onclick={(e) => {
                  e.stopPropagation();
                  toggleBundle(book.id);
                }}
                title={bundle.includes(book.id) ? 'إزالة من حزمة الأبحاث' : 'إضافة إلى حزمة الأبحاث'}
                aria-label="إضافة لحزمة الأبحاث"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={bundle.includes(book.id) ? '#b8924a' : 'none'} stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>

              <!-- Navy Download Button on Right -->
              {#if book.file_path}
                <a
                  href="/{book.file_path}"
                  class="btn-download-navy font-caption"
                  download
                  onclick={(e) => e.stopPropagation()}
                  title={`تحميل ملف PDF (${book.file_size || 'نسخة أصلية'})`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="download-icon" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>download</span>
                </a>
              {:else}
                <button
                  type="button"
                  class="btn-download-navy font-caption"
                  onclick={(e) => {
                    e.stopPropagation();
                    openBookDetails(book);
                  }}
                >
                  <span>download</span>
                </button>
              {/if}
            </div>
          </article>
        {/each}
      </div>

      <!-- Pagination / Load More -->
      {#if visibleCount < filteredBooks.length}
        <div class="load-more-section">
          <button
            type="button"
            class="btn-load-more font-body-m"
            onclick={() => (visibleCount += 18)}
          >
            عرض المزيد من المراجع الإدارية ({filteredBooks.length - visibleCount} متبقية)
          </button>
        </div>
      {/if}
    {/if}
  </section>

  <!-- 5. Floating Research Bundle Dock (Bottom Left Pill) -->
  {#if bundle.length > 0}
    <aside class="floating-bundle-dock" aria-label="حزمة الأبحاث الأكاديمية">
      <div class="bundle-dock-inner">
        <span class="bundle-badge font-mono">{bundle.length}</span>
        <span class="bundle-label font-caption">مراجع مختارة في حزمتك</span>
        <button
          type="button"
          class="btn-dock-action font-caption"
          onclick={() => {
            const list = bundle
              .map((id) => initialBooks.find((b) => b.id === id))
              .filter(Boolean)
              .map((b) => `${b!.author}. (${b!.year || '2024'}). ${b!.title}.`)
              .join('\n\n');
            navigator.clipboard.writeText(list);
            showToast('تم نسخ قائمة المراجع كاملة (APA) إلى الحافظة ✓');
          }}
        >
          نسخ التوثيق
        </button>
      </div>
    </aside>
  {/if}

  <!-- 6. Book Detail Drawer / Modal -->
  {#if showModal && activeBook}
    <div
      class="modal-backdrop"
      onclick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-book-title"
    >
      <div
        class="modal-sheet"
        onclick={(e) => e.stopPropagation()}
        tabindex="-1"
      >
        <button
          type="button"
          class="modal-close-btn"
          onclick={closeModal}
          aria-label="إغلاق النافذة"
        >
          ✕
        </button>

        <div class="modal-header">
          <div class="modal-badge font-overline">{activeBook.category} · {activeBook.year || '2024'}</div>
          <h2 id="modal-book-title" class="modal-title font-display-l">
            {activeBook.title}
          </h2>
          <div class="modal-author font-heading-m">
            تأليف: <strong>{activeBook.author}</strong> {activeBook.publisher ? `(${activeBook.publisher})` : ''}
          </div>
        </div>

        <div class="modal-body">
          <!-- 3-Minute Summary Section -->
          <div class="modal-section-box">
            <h3 class="box-heading font-overline">ملخص الأثر التنفيذي (في 3 دقائق)</h3>
            <p class="box-text font-body-l">
              {activeBook.description}
            </p>
          </div>

          <!-- Key Points -->
          {#if activeBook.key_points && activeBook.key_points.length > 0}
            <div class="modal-section-box">
              <h3 class="box-heading font-overline">أبرز محاور وأطروحات الدراسة</h3>
              <ul class="key-points-list font-body-m">
                {#each activeBook.key_points as pt}
                  <li>{pt}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- APA Citation Box -->
          <div class="modal-citation-box font-caption">
            <div class="citation-head">
              <span class="font-overline">التوثيق الأكاديمي الدولي (APA):</span>
              <button
                type="button"
                class="btn-copy-citation font-caption"
                onclick={() => copyCitation(activeBook!)}
              >
                نسخ التوثيق
              </button>
            </div>
            <p class="citation-code font-mono">
              {activeBook.author}. ({activeBook.year || '2024'}). {activeBook.title}. {activeBook.publisher || 'مستودع المراجع الإدارية العراقية'}.
            </p>
          </div>

          <!-- Specs -->
          <div class="modal-specs font-caption">
            <span>الصفحات: {activeBook.pages || '—'}</span>
            <span>الحجم: {activeBook.file_size || '—'}</span>
            <span>النوع: {activeBook.type || 'دليل معتمد'}</span>
          </div>
        </div>

        <div class="modal-footer">
          {#if activeBook.file_path}
            <a
              href="/{activeBook.file_path}"
              class="btn-modal-download font-body-m"
              download
            >
              تحميل المرجع الكامل (PDF)
            </a>
          {/if}
          <button
            type="button"
            class="btn-modal-bundle font-body-m"
            onclick={() => toggleBundle(activeBook!.id)}
          >
            {bundle.includes(activeBook.id) ? 'إزالة من حزمة الأبحاث' : 'إضافة إلى حزمة الأبحاث'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- 7. Toast Notification -->
  {#if toastMessage}
    <div class="toast-alert font-body-m animate-fade-in" role="status">
      {toastMessage}
    </div>
  {/if}
</div>

<style>
  .bayt-archive-wrapper {
    width: 100%;
    max-width: 1140px;
    margin-inline: auto;
    padding-inline: var(--s-5);
    display: flex;
    flex-direction: column;
    gap: var(--s-5);
  }

  /* --------------------------------------------------------------------------
     1. Search Bar (Exact Mockup Match: Centered rounded pill)
     -------------------------------------------------------------------------- */
  .search-section {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .search-input-box {
    position: relative;
    width: 100%;
    max-width: 580px;
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border: 1px solid rgba(184, 146, 74, 0.45);
    border-radius: var(--radius-full);
    box-shadow: 0 2px 8px rgba(21, 34, 56, 0.04);
    padding: 6px 18px;
    direction: ltr; /* so magnifying glass is on left */
    transition: all var(--transition-fast);
  }

  .search-input-box:focus-within {
    border-color: var(--gold);
    box-shadow: 0 4px 16px rgba(184, 146, 74, 0.15);
  }

  .search-icon {
    display: flex;
    align-items: center;
    color: #8c7b64;
    order: 1;
    margin-inline-end: 10px;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--ink);
    padding: 8px 4px;
    order: 2;
    direction: rtl;
    text-align: right;
  }

  .search-input::placeholder {
    color: #9aa5b4;
    font-size: 14px;
  }

  .search-clear-btn {
    border: none;
    background: transparent;
    color: var(--ink-faint);
    cursor: pointer;
    font-size: 14px;
    order: 3;
    padding: 4px;
  }

  /* --------------------------------------------------------------------------
     2. Category Filter Pills Row (Exact Mockup Match)
     -------------------------------------------------------------------------- */
  .categories-section {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-top: 2px;
  }

  .category-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }

  .cat-pill {
    padding: 7px 18px;
    border-radius: var(--radius-full);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    background-color: #ffffff;
    color: var(--ink);
    border: 1px solid rgba(184, 146, 74, 0.35);
    box-shadow: 0 2px 4px rgba(21, 34, 56, 0.02);
  }

  .cat-pill:hover {
    border-color: var(--gold);
    color: var(--gold-deep);
  }

  .cat-pill.active {
    background-color: #b8924a;
    color: #ffffff;
    border-color: #b8924a;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(184, 146, 74, 0.25);
  }

  /* --------------------------------------------------------------------------
     3. Featured Spotlight Card (Tome on Left, Info on Right)
     -------------------------------------------------------------------------- */
  .featured-spotlight-card {
    background-color: #f7f4ec;
    border: 1px solid rgba(184, 146, 74, 0.35);
    border-radius: 12px;
    padding: 24px 32px;
    box-shadow: 0 4px 16px rgba(21, 34, 56, 0.04);
    margin-top: 6px;
  }

  .spotlight-inner {
    display: flex;
    flex-direction: row; /* In LTR mode, Tome on Left, Info on Right */
    direction: ltr;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
  }

  .spotlight-media-left {
    flex: 0 0 280px;
    display: flex;
    justify-content: center;
  }

  .tome-marble-plinth {
    max-width: 270px;
    border-radius: 4px;
    overflow: hidden;
    filter: drop-shadow(0 8px 18px rgba(21, 34, 56, 0.12));
  }

  .tome-img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: contain;
  }

  .spotlight-content-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    direction: rtl;
    text-align: right;
    gap: 8px;
  }

  .spotlight-title {
    font-family: 'Cairo', var(--font-body);
    font-size: clamp(20px, 2.2vw, 25px);
    font-weight: 700;
    color: var(--ink);
    margin: 0;
    line-height: 1.35;
  }

  .spotlight-subtitle {
    color: #9a886d;
    margin: 0;
    font-size: 13px;
  }

  .spotlight-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
    justify-content: flex-start;
  }

  .spotlight-tag {
    font-size: 11px;
    padding: 3px 8px;
    background-color: #fcfbf8;
    border: 1px solid rgba(184, 146, 74, 0.3);
    border-radius: 3px;
    color: var(--ink-soft);
  }

  .spotlight-rating {
    display: flex;
    gap: 2px;
    color: #b8924a;
    font-size: 16px;
    margin-top: 2px;
  }

  .spotlight-dots {
    display: flex;
    gap: 5px;
    margin-top: 6px;
  }

  .spotlight-dots .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: rgba(184, 146, 74, 0.3);
  }

  .spotlight-dots .dot.active {
    background-color: var(--gold);
    width: 12px;
    border-radius: 3px;
  }

  /* --------------------------------------------------------------------------
     4. Reference Books Grid (Exact Mockup Match: 3 columns, clean cards)
     -------------------------------------------------------------------------- */
  .catalog-grid-section {
    margin-top: var(--s-3);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .reference-card {
    background-color: #ffffff;
    border: 1px solid rgba(184, 146, 74, 0.28);
    border-radius: 8px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 190px;
    box-shadow: 0 2px 8px rgba(21, 34, 56, 0.03);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
    cursor: pointer;
    text-align: right;
  }

  .reference-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(21, 34, 56, 0.07);
    border-color: var(--gold);
  }

  /* Card Header: APA Badges (Left: APA Citation, Right: APA) */
  .card-top-badges {
    display: flex;
    flex-direction: row;
    direction: ltr; /* so APA Citation is on LEFT and APA is on RIGHT */
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .badge-apa-citation {
    background-color: #152238;
    color: #ffffff;
    border: none;
    border-radius: 3px;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .badge-apa-citation:hover {
    background-color: var(--gold-deep);
  }

  .badge-apa-tag {
    background-color: #f7f4ed;
    color: var(--ink-soft);
    border: 1px solid rgba(184, 146, 74, 0.25);
    border-radius: 3px;
    padding: 2px 7px;
    font-size: 10px;
  }

  /* Card Body */
  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 6px;
    flex: 1;
    direction: rtl;
  }

  .card-title {
    font-family: 'Cairo', var(--font-body);
    font-weight: 700;
    font-size: 15px;
    line-height: 1.4;
    color: #152238;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 42px;
  }

  .card-meta {
    display: flex;
    gap: 6px;
    justify-content: center;
    color: var(--ink-faint);
    font-size: 12px;
  }

  .card-author {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 190px;
  }

  .card-rating {
    display: flex;
    gap: 1px;
    margin-top: 2px;
  }

  .star-btn {
    border: none;
    background: transparent;
    padding: 0;
    font-size: 14px;
    color: #ded9cd;
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .star-btn.active {
    color: #b8924a;
  }

  /* Card Footer: Action Buttons (Left: Bookmark, Right: Navy Download) */
  .card-footer {
    display: flex;
    flex-direction: row;
    direction: ltr; /* Bookmark on LEFT, Download on RIGHT */
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(184, 146, 74, 0.12);
  }

  .btn-bookmark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: #faf8f4;
    border: 1px solid rgba(184, 146, 74, 0.35);
    border-radius: 4px;
    color: #152238;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-bookmark:hover {
    border-color: var(--gold);
    color: var(--gold-deep);
  }

  .btn-bookmark.bookmarked {
    background-color: var(--gold-subtle);
    border-color: var(--gold);
    color: var(--gold-deep);
  }

  .btn-download-navy {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background-color: #152238;
    color: #ffffff;
    text-decoration: none;
    padding: 6px 20px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 13px;
    border: none;
    cursor: pointer;
    transition: background-color var(--transition-fast), transform var(--transition-fast);
  }

  .btn-download-navy:hover {
    background-color: #213554;
    transform: translateY(-1px);
  }

  .download-icon {
    transform: translateY(1px);
  }

  /* Load More */
  .load-more-section {
    display: flex;
    justify-content: center;
    margin-top: var(--s-7);
  }

  .btn-load-more {
    padding: 10px 28px;
    background-color: #ffffff;
    border: 1px solid var(--gold);
    color: var(--ink);
    border-radius: var(--radius-full);
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-fast);
    box-shadow: 0 2px 8px rgba(21, 34, 56, 0.04);
  }

  .btn-load-more:hover {
    background-color: #152238;
    color: #ffffff;
    border-color: #152238;
  }

  /* --------------------------------------------------------------------------
     5. Floating Research Bundle Dock
     -------------------------------------------------------------------------- */
  .floating-bundle-dock {
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 100;
  }

  .bundle-dock-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: #152238;
    color: #ffffff;
    padding: 10px 18px;
    border-radius: var(--radius-full);
    box-shadow: 0 8px 24px rgba(21, 34, 56, 0.3);
    border: 1px solid var(--gold);
  }

  .bundle-badge {
    background-color: var(--gold);
    color: #ffffff;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
  }

  .btn-dock-action {
    background-color: transparent;
    border: 1px solid var(--gold-bright);
    color: #ffffff;
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .btn-dock-action:hover {
    background-color: var(--gold);
  }

  /* --------------------------------------------------------------------------
     6. Modal Sheet
     -------------------------------------------------------------------------- */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(21, 34, 56, 0.6);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--s-4);
  }

  .modal-sheet {
    background-color: #ffffff;
    border-radius: 12px;
    width: 100%;
    max-width: 680px;
    max-height: 90vh;
    overflow-y: auto;
    padding: var(--s-7);
    position: relative;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--gold-line);
    text-align: right;
  }

  .modal-close-btn {
    position: absolute;
    top: var(--s-4);
    left: var(--s-4);
    background: transparent;
    border: none;
    font-size: 20px;
    color: var(--ink-faint);
    cursor: pointer;
  }

  .modal-header {
    border-bottom: 1px solid rgba(184, 146, 74, 0.2);
    padding-bottom: var(--s-4);
    margin-bottom: var(--s-5);
  }

  .modal-badge {
    color: var(--gold-deep);
    margin-bottom: var(--s-1);
  }

  .modal-title {
    color: var(--ink);
    margin: 0 0 var(--s-2) 0;
    font-size: 26px;
  }

  .modal-author {
    color: var(--ink-soft);
  }

  .modal-section-box {
    background-color: #faf7f0;
    border: 1px solid rgba(184, 146, 74, 0.25);
    border-radius: 6px;
    padding: var(--s-4);
    margin-bottom: var(--s-4);
  }

  .box-heading {
    color: var(--gold-deep);
    margin: 0 0 var(--s-2) 0;
  }

  .box-text {
    margin: 0;
    color: var(--ink);
    line-height: 1.65;
  }

  .key-points-list {
    margin: 0;
    padding-inline-start: var(--s-5);
    color: var(--ink-soft);
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
  }

  .modal-citation-box {
    background-color: var(--gold-subtle);
    border: 1px dashed var(--gold);
    border-radius: 6px;
    padding: var(--s-3) var(--s-4);
    margin-bottom: var(--s-4);
  }

  .citation-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--gold-deep);
    font-weight: 700;
  }

  .btn-copy-citation {
    background-color: #ffffff;
    border: 1px solid var(--gold);
    color: var(--ink);
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
  }

  .citation-code {
    margin: var(--s-2) 0 0 0;
    direction: ltr;
    text-align: left;
    color: var(--ink);
  }

  .modal-specs {
    display: flex;
    gap: var(--s-4);
    color: var(--ink-faint);
  }

  .modal-footer {
    display: flex;
    gap: var(--s-3);
    margin-top: var(--s-6);
    padding-top: var(--s-4);
    border-top: 1px solid rgba(184, 146, 74, 0.2);
  }

  .btn-modal-download {
    flex: 1;
    text-align: center;
    background-color: #152238;
    color: #ffffff;
    padding: 10px;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 600;
  }

  .btn-modal-bundle {
    flex: 1;
    background-color: #ffffff;
    border: 1px solid var(--gold);
    color: var(--ink);
    padding: 10px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  /* --------------------------------------------------------------------------
     7. Toast Alert
     -------------------------------------------------------------------------- */
  .toast-alert {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background-color: #152238;
    color: #ffffff;
    padding: 12px 22px;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(21, 34, 56, 0.35);
    border: 1px solid var(--gold);
    z-index: 300;
  }

  /* Responsive */
  @media (max-width: 960px) {
    .cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .spotlight-inner {
      flex-direction: column-reverse;
      text-align: center;
    }

    .spotlight-content-right {
      align-items: center;
      text-align: center;
    }
  }

  @media (max-width: 640px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }

    .category-pills {
      gap: 6px;
    }

    .cat-pill {
      font-size: 12px;
      padding: 6px 14px;
    }
  }
</style>
