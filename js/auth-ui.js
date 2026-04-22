/* ============================================================
   auth-ui.js
   ------------------------------------------------------------
   يدير حالة أزرار الـ navbar حسب تسجيل الدخول:

   - لو المستخدم مسجّل:  يعرض "Dashboard + Sign out"
   - لو زائر:           يعرض "Sign in + Join now"

   كيف يعمل؟
   - العناصر التي تحمل data-auth="anon"   تظهر للزوار
   - العناصر التي تحمل data-auth="authed" تظهر للمسجّلين
   - أزرار tsجيل الخروج تحمل data-action="signout"

   يعمل على كل الصفحات التي تحمّل هذا السكربت.
   ============================================================ */

(function () {
  'use strict';

  async function getSession() {
    if (!window.NuqtaUser) return null;
    try { return await window.NuqtaUser.getSession(); }
    catch (e) { return null; }
  }

  /* ---------- تحديث واجهة الـ navbar ---------- */
  async function updateAuthUI() {
    const session = await getSession();
    const isAuthed = !!session;

    document.querySelectorAll('[data-auth="anon"]').forEach((el) => {
      el.style.display = isAuthed ? 'none' : '';
    });
    document.querySelectorAll('[data-auth="authed"]').forEach((el) => {
      el.style.display = isAuthed ? '' : 'none';
    });
  }

  /* ---------- تسجيل خروج ---------- */
  async function handleSignout(e) {
    e.preventDefault();
    if (!window.NuqtaUser) return;
    try { await window.NuqtaUser.signOut(); } catch (err) {}
    window.location.href = 'index.html';
  }

  /* ---------- تهيئة ---------- */
  function init() {
    updateAuthUI();

    // ربط أزرار تسجيل الخروج
    document.querySelectorAll('[data-action="signout"]').forEach((btn) => {
      btn.addEventListener('click', handleSignout);
    });

    // تحديث الـ UI لو تغيّرت الجلسة في تبويب آخر
    if (window.NuqtaUser && window.NuqtaUser.onAuthChange) {
      window.NuqtaUser.onAuthChange(() => updateAuthUI());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
