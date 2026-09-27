/* ============================================================
   IAR Archive — utility helpers
   Pure functions, no state, no dependencies.
   ============================================================ */

export const $ = id => document.getElementById(id);
export const $$ = sel => document.querySelectorAll(sel);

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, String(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  }
};

export const motion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

export const esc = v =>
  String(v ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

export const text = (id, v) => { const el = $(id); if (el) el.textContent = v; };
export const attr = (id, k, v) => { const el = $(id); if (el) el.setAttribute(k, v); };
export const visible = (id, show) => { const el = $(id); if (el) el.classList.toggle('d-none', !show); };

export const clean = v => (v == null ? '' : String(v).trim());
export const finite = v => Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0;
export const words = v => Array.isArray(v) ? v.map(clean).filter(Boolean) : [];
