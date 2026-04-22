/* ============================================================
   theme.js
   ------------------------------------------------------------
   تبديل الوضع الفاتح/الداكن.
   - الحالة محفوظة في localStorage تحت المفتاح: nuqta_theme
   - القيم المقبولة: "dark" (افتراضي) أو "light"
   - نضع السمة على <html> كـ data-theme="..."

   CSS يتفاعل مع هذه السمة في variables.css لتبديل الألوان.
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'nuqta_theme';
  const DEFAULT_THEME = 'dark';

  /* ---------- قراءة/حفظ ---------- */
  function getTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    } catch (e) {
      return DEFAULT_THEME;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) { /* ignore */ }
  }

  /* ---------- تطبيق الوضع ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // تحديث أيقونة الزر (شمس في الوضع الداكن، قمر في الفاتح)
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.innerHTML = (theme === 'dark')
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  /* ---------- تبديل ---------- */
  function toggle() {
    const current = getTheme();
    const next = (current === 'dark') ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
  }

  /* ---------- تهيئة ---------- */
  // نطبّق الوضع فوراً قبل DOM ready لتجنّب الوميض (FOUC)
  applyTheme(getTheme());

  function init() {
    applyTheme(getTheme()); // إعادة تطبيق بعد وجود الزر
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // تصدير للمطوّرين
  window.Nuqta = window.Nuqta || {};
  window.Nuqta.getTheme = getTheme;
})();
