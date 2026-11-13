#!/usr/bin/env node
/**
 * IAR Archive — share pages (Open Graph).
 *
 * The site is a single page: `https://iararchive.web.app/?book=12` always serves the same
 * `index.html`, so Telegram / WhatsApp / X / Facebook show the generic card for every book.
 * This script writes one tiny static page per book, `dist/b/<id>/index.html`, that carries
 * that book's title, description and cover card in its <head>, and sends people on to the
 * app (`/?book=<id>`) the moment it loads. Share `https://iararchive.web.app/b/<id>/`.
 *
 * Runs after the build (npm runs `postbuild` automatically after `build`). No dependencies.
 *
 *   node scripts/generate-og-pages.mjs
 *   node scripts/generate-og-pages.mjs --out dist --books books.json --copy-images
 *
 * Image: `covers/og/<id>.jpg` (made by scripts/optimize_covers.py) is referenced from the
 * same GitHub raw base the site already uses for covers; `--copy-images` copies the cards
 * into `dist/og/` instead, so they are served from the site itself. A book without a card
 * falls back to the site icon.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')
    ? args[index + 1]
    : fallback;
};

const SITE = option('site', 'https://iararchive.web.app').replace(/\/+$/, '');
const OUT = path.resolve(option('out', 'dist'));
const BOOKS = path.resolve(option('books', 'books.json'));
const COVERS = path.resolve(option('covers', 'covers'));
const IMAGE_BASE = option('image-base', 'https://raw.githubusercontent.com/zruuzr/IAR-Archive/main/')
  .replace(/\/*$/, '/');
const COPY_IMAGES = args.includes('--copy-images');
const FALLBACK_IMAGE = `${SITE}/icons/icon-512x512.png`;
const DESCRIPTION_LIMIT = 200;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Collapse whitespace and cut at a word boundary. */
function excerpt(text, limit = DESCRIPTION_LIMIT) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > limit * 0.6 ? space : limit).replace(/[\s،,.؛:-]+$/, '')}…`;
}

function renderPage(book, imageUrl) {
  const id = encodeURIComponent(String(book.id));
  const pageUrl = `${SITE}/b/${id}/`;
  const appUrl = `/?book=${id}`;
  const title = String(book.title ?? '').trim();
  const description =
    excerpt(book.description) ||
    'مساحة معرفية للمراجع الإدارية، والملخصات، والتوثيق الأكاديمي.';
  const pageTitle = `${title} | IAR Archive`;
  const author = String(book.author ?? '').trim();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: title,
    ...(author ? { author: { '@type': 'Organization', name: author } } : {}),
    ...(book.title_en ? { alternateName: book.title_en } : {}),
    inLanguage: 'ar',
    ...(Number(book.pages) > 0 ? { numberOfPages: Number(book.pages) } : {}),
    ...(/^\d{4}$/.test(String(book.year ?? '')) ? { datePublished: String(book.year) } : {}),
    image: imageUrl,
    url: pageUrl
  };

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${pageUrl}" />
    <meta name="theme-color" content="#0b1a45" />

    <meta property="og:site_name" content="IAR Archive" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ar_IQ" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
    <script>
      location.replace(${JSON.stringify(appUrl).replace(/</g, '\\u003c')} + location.hash);
    </script>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
        background: #0b1a45; color: #f1e6c8; font: 18px/1.7 system-ui, 'Segoe UI', Tahoma, sans-serif; text-align: center; }
      main { max-width: 34rem; }
      h1 { font-size: 1.5rem; line-height: 1.5; margin: 0 0 8px; }
      p { margin: 0 0 18px; color: #d7cba3; }
      a { color: #0b1a45; background: #e2b84e; padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      ${author ? `<p>${escapeHtml(author)}</p>` : ''}
      <a href="${appUrl}">فتح المرجع في الأرشيف</a>
    </main>
  </body>
</html>
`;
}

function main() {
  let books;
  try {
    const parsed = JSON.parse(fs.readFileSync(BOOKS, 'utf8'));
    books = Array.isArray(parsed) ? parsed : parsed.books;
  } catch (error) {
    console.error(`generate-og-pages: cannot read ${BOOKS}: ${error.message}`);
    process.exit(1);
  }
  if (!Array.isArray(books)) {
    console.error('generate-og-pages: books.json has no book list');
    process.exit(1);
  }
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  let written = 0;
  let withCard = 0;
  const skipped = [];
  for (const book of books) {
    const id = String(book?.id ?? '').trim();
    if (!/^\d+$/.test(id) || !String(book.title ?? '').trim()) {
      skipped.push(id || '(no id)');
      continue;
    }
    const card = path.join(COVERS, 'og', `${id}.jpg`);
    let imageUrl = FALLBACK_IMAGE;
    if (fs.existsSync(card)) {
      withCard += 1;
      if (COPY_IMAGES) {
        fs.mkdirSync(path.join(OUT, 'og'), { recursive: true });
        fs.copyFileSync(card, path.join(OUT, 'og', `${id}.jpg`));
        imageUrl = `${SITE}/og/${id}.jpg`;
      } else {
        imageUrl = `${IMAGE_BASE}covers/og/${id}.jpg`;
      }
    }
    const dir = path.join(OUT, 'b', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPage(book, imageUrl), 'utf8');
    written += 1;
  }

  console.log(
    `generate-og-pages: ${written} pages in ${path.relative(process.cwd(), OUT) || '.'}/b/` +
      ` (${withCard} with a cover card${COPY_IMAGES ? ', copied to /og/' : ''})` +
      (skipped.length ? `; skipped ${skipped.length}: ${skipped.slice(0, 5).join(', ')}` : '')
  );
}

main();
