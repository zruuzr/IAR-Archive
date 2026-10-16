/* ============================================================
   IAR Archive — application entry point
   Vanilla JS. ES Modules. No frameworks, no bundler.
   ============================================================ */

import { state } from './js/state.js';
import { fetchBooks } from './js/data-fetch.js';
import { initEvents } from './js/events.js';
import { initAmbient, theme, language } from './js/ui-init.js';
import { initPWA } from './js/pwa.js';

// Debug handle — inspect via browser console: window.__IAR.state
window.__IAR = { state };

// Boot sequence
initAmbient();
theme();
language();
initEvents();
initPWA();

fetchBooks();
