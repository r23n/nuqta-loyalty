/* ============================================================
   referral.js — نظام الدعوة
   ------------------------------------------------------------
   - يستخرج كود الدعوة من الـ URL (?ref=NQ-XXXXXX)
   - يحفظه محلياً للاستخدام في signup
   - يطبّق الـ credit بعد التسجيل
   ============================================================ */

(function () {
  'use strict';

  const REF_KEY = 'nuqta_pending_ref';

  /* ---------- استخراج كود الدعوة من URL ---------- */
  function captureFromURL() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && /^NQ-[A-Z0-9]+$/.test(ref)) {
      try { localStorage.setItem(REF_KEY, ref); } catch (e) {}
      return ref;
    }
    return null;
  }

  /* ---------- قراءة كود الدعوة المحفوظ ---------- */
  function getPending() {
    try { return localStorage.getItem(REF_KEY); } catch (e) { return null; }
  }

  /* ---------- حذف كود الدعوة بعد الاستخدام ---------- */
  function clearPending() {
    try { localStorage.removeItem(REF_KEY); } catch (e) {}
  }

  /* ---------- بناء رابط الدعوة الكامل ---------- */
  function buildShareURL(code) {
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    return base + 'index.html?ref=' + code;
  }

  /* ---------- نسخ للحافظة ---------- */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(el);
        return true;
      } catch (e2) {
        document.body.removeChild(el);
        return false;
      }
    }
  }

  /* ---------- مشاركة عبر Web Share API (لو متاحة) ---------- */
  async function share(url, text) {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Nuqta', text: text, url: url });
        return true;
      } catch (e) { return false; }
    }
    return false;
  }

  /* ---------- WhatsApp link ---------- */
  function whatsappLink(url, text) {
    const msg = encodeURIComponent((text || '') + ' ' + url);
    return `https://wa.me/?text=${msg}`;
  }

  /* ---------- تسجيل استخدام الكود (بعد تسجيل العميل) ---------- */
  async function applyReferral(code, newUserId) {
    if (!window.sb || !code || !newUserId) return false;

    try {
      // نحدّث الـ referred_by في profile المستخدم الجديد
      const { error } = await window.sb()
        .from('profiles')
        .update({ referred_by: code })
        .eq('id', newUserId);

      if (error) {
        console.warn('Could not apply referral:', error);
        return false;
      }

      // (اختياري في المستقبل): نجد صاحب الكود ونعطيه نقاط مكافأة
      // هذا يحتاج RLS policy إضافية أو RPC function في Supabase
      // للآن فقط نسجّل الـ referred_by

      return true;
    } catch (e) {
      console.error('Referral apply error:', e);
      return false;
    }
  }

  window.NuqtaReferral = {
    captureFromURL,
    getPending,
    clearPending,
    buildShareURL,
    copyToClipboard,
    share,
    whatsappLink,
    applyReferral
  };

  // نلتقط الكود تلقائياً من URL لو موجود
  captureFromURL();
})();
