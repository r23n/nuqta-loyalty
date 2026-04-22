/* ============================================================
   reset-password.js
   ------------------------------------------------------------
   يُستخدم بعد ما يضغط المستخدم على رابط إعادة التعيين من البريد.
   Supabase يضع الـ access token في الـ URL hash، ثم نستخدمه
   لتحديث كلمة السر.
   ============================================================ */

(function () {
  'use strict';

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    return (translations[lang] && translations[lang][key]) || key;
  }

  function showErr(fieldId, msg) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const err = field.parentElement.querySelector('.form-error');
    if (err) err.textContent = msg;
    field.classList.add('has-error');
  }

  function clearErr(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const err = field.parentElement.querySelector('.form-error');
    if (err) err.textContent = '';
    field.classList.remove('has-error');
  }

  async function handleReset() {
    const pwdEl = document.getElementById('newPassword');
    const confirmEl = document.getElementById('confirmPassword');
    const btn = document.getElementById('btnReset');
    const errBox = document.getElementById('resetError');

    const pwd = pwdEl.value;
    const confirm = confirmEl.value;

    clearErr('newPassword'); clearErr('confirmPassword');
    if (errBox) errBox.textContent = '';

    let ok = true;
    if (!pwd) { showErr('newPassword', t('signup.err.required')); ok = false; }
    else if (pwd.length < 6) { showErr('newPassword', t('signup.err.password.short')); ok = false; }
    if (!confirm) { showErr('confirmPassword', t('signup.err.required')); ok = false; }
    else if (pwd !== confirm) { showErr('confirmPassword', t('reset.err.mismatch')); ok = false; }
    if (!ok) return;

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = t('reset.submitting');

    try {
      await window.NuqtaUser.updatePassword(pwd);
      Toast.success(t('reset.success'), { duration: 4000 });
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } catch (err) {
      console.error('Reset error:', err);
      if (errBox) errBox.textContent = t('reset.err.generic');
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  function init() {
    if (!document.getElementById('btnReset')) return;

    document.getElementById('btnReset').addEventListener('click', (e) => {
      e.preventDefault();
      handleReset();
    });

    ['newPassword', 'confirmPassword'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => clearErr(id));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleReset(); }
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
