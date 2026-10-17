import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Approved root static assets to copy into dist/ during build.
 * Explicitly excludes pdf/ (served via GitHub Raw), src/, tests/, e2e/,
 * Python scripts, migration.html, and secrets.
 */
const APPROVED_STATIC_ASSETS = [
  'books.json',
  'manifest.json',
  'favicon.ico',
  '404.html',
  'googlea493ed01f21d992e.html',
  'assets',
  'icons',
  'covers'
] as const;

function copyFileFastSync(src: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }
  try {
    fs.linkSync(src, dest);
  } catch {
    fs.copyFileSync(src, dest);
  }
}

function copyRecursiveSync(src: string, dest: string): void {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry.endsWith('.md')) continue;
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    copyFileFastSync(src, dest);
  }
}

function normalizeDistIndexHtmlAndBundles(outDir: string, bundlesDirName: string): void {
  const bundlesDir = path.join(outDir, bundlesDirName);
  if (fs.existsSync(bundlesDir)) {
    for (const entry of fs.readdirSync(bundlesDir)) {
      if (!entry.endsWith('.js') && !entry.endsWith('.css')) {
        fs.unlinkSync(path.join(bundlesDir, entry));
      }
    }
  }

  const indexHtmlPath = path.join(outDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) return;

  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  const normalizedHtml = html
    .replace(
      /<link rel="manifest" href="\/bundles\/manifest-[^"]+\.json"\s*\/?>/,
      '<link rel="manifest" href="/manifest.json" />'
    )
    .replace(
      /<link rel="icon" href="\/bundles\/favicon-[^"]+\.ico" sizes="any"\s*\/?>/,
      '<link rel="icon" href="/favicon.ico" sizes="any" />'
    )
    .replace(
      /<link rel="icon" type="image\/png" sizes="32x32" href="\/bundles\/icon-192x192-[^"]+\.png"\s*\/?>/,
      '<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192x192.png" />'
    )
    .replace(
      /<link rel="apple-touch-icon" sizes="180x180" href="\/bundles\/apple-touch-icon-[^"]+\.png"\s*\/?>/,
      '<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />'
    );

  fs.writeFileSync(indexHtmlPath, normalizedHtml, 'utf8');
}

function collectBuiltBundleUrls(outDir: string, bundlesDirName: string): string[] {
  const bundlesDir = path.join(outDir, bundlesDirName);
  if (!fs.existsSync(bundlesDir)) return [];

  const urls: string[] = [];
  for (const entry of fs.readdirSync(bundlesDir)) {
    if (entry.endsWith('.js') || entry.endsWith('.css')) {
      urls.push(`/${bundlesDirName}/${entry}`);
    }
  }
  return urls.sort();
}

function writeServiceWorkerWithBundles(outDir: string, bundleUrls: string[]): void {
  const swSrcPath = path.resolve(__dirname, 'sw.js');
  if (!fs.existsSync(swSrcPath)) return;

  const rawSw = fs.readFileSync(swSrcPath, 'utf8');
  const serializedBundles = JSON.stringify(bundleUrls, null, 2);
  const injectedSw = rawSw.replace(
    '/* __IAR_PRECACHE_BUNDLES__ */ []',
    serializedBundles
  );

  fs.writeFileSync(path.join(outDir, 'sw.js'), injectedSw, 'utf8');
}

function iarRootAssetsPlugin(): Plugin {
  return {
    name: 'iar-root-assets',
    writeBundle(options) {
      const outDir = options.dir
        ? path.resolve(__dirname, options.dir)
        : path.resolve(__dirname, 'dist');

      normalizeDistIndexHtmlAndBundles(outDir, 'bundles');

      for (const item of APPROVED_STATIC_ASSETS) {
        const srcPath = path.resolve(__dirname, item);
        if (!fs.existsSync(srcPath)) continue;
        const destPath = path.resolve(outDir, item);
        copyRecursiveSync(srcPath, destPath);
      }

      const bundleUrls = collectBuiltBundleUrls(outDir, 'bundles');
      writeServiceWorkerWithBundles(outDir, bundleUrls);
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), iarRootAssetsPlugin()],
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    open: '/'
  },
  preview: {
    open: '/'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'bundles',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/@firebase/firestore') ||
            id.includes('node_modules/firebase/firestore')
          ) {
            return 'firebase-firestore';
          }
          if (
            id.includes('node_modules/@firebase/auth') ||
            id.includes('node_modules/firebase/auth')
          ) {
            return 'firebase-auth';
          }
          if (
            id.includes('node_modules/firebase') ||
            id.includes('node_modules/@firebase')
          ) {
            return 'firebase-app';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'react-vendor';
          }
          return undefined;
        }
      }
    }
  }
});
