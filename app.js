/* ============================================================
   IAR Archive — application entry point
   Vanilla JS. ES Modules. No frameworks, no bundler.
   ============================================================ */

import { state } from './js/core/state.js';
import { fetchBooks } from './js/data/data-fetch.js';
import { initEvents } from './js/features/events.js';
import { initAmbient, theme, language } from './js/ui/ui-init.js';
import { initPWA } from './js/features/pwa.js';

// Debug handle — inspect via browser console: window.__IAR.state
window.__IAR = { state };

// Boot sequence
initAmbient();
theme();
language();
initEvents();
initPWA();

fetchBooks();
