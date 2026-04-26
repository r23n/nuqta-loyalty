/* ============================================================
   login.js
   ------------------------------------------------------------
   صفحة تسجيل الدخول.
   - لو المستخدم مسجّل دخول مسبقاً → يوجّهه لـ dashboard فوراً
   - يدير إرسال النموذج (async) ويعرض أخطاء بشرية
   ============================================================ */

(function () {
  'use strict';

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    return (translations[lang] && translations[lang][key]) || key;
  }

  function validateEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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

  /* ---------- إرسال النموذج ---------- */
  async function handleLogin() {
    const emailEl = document.getElementById('loginEmail');
    const pwdEl = document.getElementById('loginPassword');
    const btn = document.getElementById('btnLogin');
    const errBox = document.getElementById('loginError');

    const email = emailEl.value.trim();
    const password = pwdEl.value;

    // Validation
    clearErr('loginEmail'); clearErr('loginPassword');
    if (errBox) errBox.textContent = '';

    let ok = true;
    if (!email) { showErr('loginEmail', t('signup.err.required')); ok = false; }
    else if (!validateEmail(email)) { showErr('loginEmail', t('signup.err.email')); ok = false; }
    if (!password) { showErr('loginPassword', t('signup.err.required')); ok = false; }
    if (!ok) return;

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = t('login.submitting');

    try {
      await window.NuqtaUser.signIn(email, password);
      // نجاح → يلا للوحة التحكم
      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error('Login error:', err);
      const raw = (err.message || '').toLowerCase();

      let msg = t('login.err.generic');

      // ⚠️ Email not confirmed
      if (raw.includes('email not confirmed') || raw.includes('not confirmed')) {
        // نحفظ الإيميل ونوجّه لـ verify
        try {
          sessionStorage.setItem('nuqta_verify_email', email);
        } catch (e) {}
        window.location.href = 'verify.html?from=login';
        return;
      }

      if (raw.includes('invalid') || raw.includes('credentials')) {
        msg = t('login.err.invalid');
      } else if (raw.includes('not found') || raw.includes('user')) {
        msg = t('login.err.notfound');
      } else if (raw.includes('network') || raw.includes('failed to fetch')) {
        msg = t('signup.err.network');
      }

      if (errBox) errBox.textContent = msg;
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  /* ---------- تهيئة ---------- */
  async function init() {
    if (!document.getElementById('btnLogin')) return;

    // لو مسجّل دخول مسبقاً → للـ dashboard مباشرة
    if (window.NuqtaUser && await window.NuqtaUser.isRegistered()) {
      window.location.href = 'dashboard.html';
      return;
    }

    const btn = document.getElementById('btnLogin');
    btn.addEventListener('click', (e) => { e.preventDefault(); handleLogin(); });

    // رابط "نسيت كلمة السر"
    const forgot = document.getElementById('forgotLink');
    if (forgot) forgot.addEventListener('click', async (e) => {
      e.preventDefault();
      const emailEl = document.getElementById('loginEmail');
      const email = emailEl.value.trim();

      if (!email || !validateEmail(email)) {
        showErr('loginEmail', t('login.forgot.enter.email'));
        emailEl.focus();
        return;
      }

      try {
        await window.NuqtaUser.requestPasswordReset(email);
        Toast.success(t('login.forgot.sent'), { duration: 6000 });
      } catch (err) {
        console.error('Reset error:', err);
        Toast.error(t('login.err.generic'));
      }
    });

    // إرسال بالـ Enter
    [document.getElementById('loginEmail'), document.getElementById('loginPassword')].forEach((el) => {
      if (el) {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
        });
        el.addEventListener('input', () => clearErr(el.id));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
