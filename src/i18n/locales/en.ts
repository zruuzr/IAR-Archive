/* ============================================================
   IAR Archive — English Locale Dictionary (en)
   Complete translation table matching src/i18n/locales/ar.ts 1:1.
   ============================================================ */

import type { TranslationDictionary } from './ar';

export const en: TranslationDictionary = {
  // Header & Navigation
  langLabel: 'عربي',
  txtInstall: 'Install',
  txtAnnouncement: 'IAR ARCHIVE · A space for management knowledge',
  txtSubtitle: 'Iraqi Administrative Reference',
  txtFavoritesOnly: 'My favorites',
  langToggleAria: 'التبديل إلى العربية',
  themeToggleAria: 'Toggle theme',

  // Hero & Stats
  txtKicker: '𒆠𒂗𒂠 · The Iraqi Digital Library · 2026',
  txtAboutTitle: "From Sumer's tablets to today's pages.",
  txtAboutDesc:
    'A curated collection of administrative references — indexed with care, accompanied by focused summaries and direct academic citation — so it becomes your first stop for research and reading.',
  txtTagSummary: '3-minute summaries',
  txtTagCite: 'Direct APA citations',
  txtTagBundle: 'Curated research bundles',
  txtLibraryTitle: 'The knowledge shelves',
  txtStatBooks: 'Archived references',
  txtStatCats: 'Knowledge paths',
  txtStatVisits: 'Daily visits',
  txtStatYear: 'Archive year',

  // Search, Sort & View Controls
  searchLabel: 'Search references',
  searchPlaceholder: 'Search a title, author or idea…',
  clearSearchAria: 'Clear search',
  spotlightSearch: 'Spotlight Search',
  spotlightPlaceholder: 'Search titles, authors, ideas, or categories…',
  spotlightNoResults: 'No matching results found',
  spotlightBooks: 'References & Books',
  spotlightCategories: 'Pathways & Categories',
  spotlightHint: 'Use arrows to navigate, Enter to select, Esc to close',
  trendingTopics: 'Trending:',
  searchShortcut: 'Quick Search',
  sortOrderAria: 'Sort references',
  optSortDefault: 'Archive selection',
  optSortTitle: 'Title: A — Z',
  optSortYear: 'Newest first',
  optSortPages: 'Fewest pages first',
  optSortDownloads: 'Most downloaded',
  optSortFavorites: 'Favorites first',
  optSortRating: 'Highest rated',
  viewGridAria: 'Grid view',
  viewListAria: 'List view',
  categoryChipsAria: 'Categories',
  paginationAria: 'Reference pages',
  allReferences: 'All references',
  generalCategory: 'General',
  previous: 'Previous',
  next: 'Next',

  // Book Cards & Actions
  read: 'Read',
  download: 'Download',
  summary: '3-minute summary',
  cite: 'Cite APA',
  share: 'Share',
  favorite: 'Favorite',
  unknown: 'Not provided',
  view: 'View',
  defaultBookType: 'Reference',
  inTheSpotlight: 'In the spotlight',
  pagesUnit: 'pages',
  noDate: 'n.d.',
  addFavorite: 'Add favorite',
  removeFavorite: 'Remove favorite',
  addedToFavoritesToast: 'Added to favorites.',
  removedFromFavoritesToast: 'Removed from favorites.',

  // Research Bundle
  bundleCheckboxLabel: 'Bundle',
  addToBundlePrefix: 'Add to bundle: ',
  bundleSelectedPrefix: 'Selected',
  bundleSelectedSuffix: 'references for your bundle',
  txtBundleBtn: 'Copy bundle link',
  txtClearBundle: 'Clear bundle',
  sharedResearchBundle: 'Shared research bundle',
  backToLibraryShort: 'Back to library',

  // Single Book View & Modals
  txtBackToList: 'Back to the library',
  singleDescLabel: 'About this reference',
  singleKeyPointsLabel: 'Key concepts',
  singleAudienceLabel: 'Target audience',
  singleReadLabel: 'Read',
  singleDownloadLabel: 'Download',
  singleCiteLabel: 'Cite APA',
  singleShareLabel: 'Share',
  summaryModalTitle: 'Reference summary · 3 minutes',
  txtModalIdeasTitle: 'Key ideas',
  txtModalAudienceTitle: 'Target audience',
  txtModalApaTitle: 'Academic citation · APA',
  txtModalClose: 'Close',
  txtShareModalBtn: 'Share',
  noSummaryProvided: 'No summary has been provided for this reference yet.',

  // Loading, Empty States & Errors
  txtLoading: 'Loading references…',
  errorLoadTitle: 'Could not load references',
  errorLoadBody: 'Ensure books.json is available next to index.html, then retry.',
  retry: 'Retry',
  noMatchingReferencesTitle: 'No matching references',
  noMatchingReferencesBody: 'Try another search or reset your filters.',
  resetFilters: 'Reset filters',
  fileUnavailable: 'Reference file unavailable.',

  // Clipboard, Share & Metadata
  defaultMetaDescription:
    'A knowledge space for management references, summaries and academic citations.',
  copiedToClipboard: 'Copied to clipboard.',
  copyPrompt: 'Copy the following text:',

  // Download Overlay & Status
  dlTitle: 'Preparing file…',
  dlCancelLabel: 'Cancel',
  dlCancelAria: 'Cancel download',
  fileSentToBrowser: 'File sent to your browser.',
  downloadCancelled: 'Download cancelled.',
  downloadFailed:
    'Download failed. Try opening the file with Read; the source may restrict direct downloads.',

  // Ratings
  beFirstToRate: 'Be the first to rate',
  rateReference: 'Rate reference',
  ratingSaved: 'Your rating was saved.',
  alreadyRated: 'You already rated this reference.',
  ratingFailed: 'Rating failed. Check connectivity and Firebase permissions.',

  // PWA
  pwaInstallInstructions:
    'To install:\n' +
    '• Android/Chrome: open browser menu (⋮) → "Install app".\n' +
    '• iPhone/Safari: tap Share → "Add to Home Screen".'
};
