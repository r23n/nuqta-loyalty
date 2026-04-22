/* ============================================================
   signup.js — نسخة Supabase
   ------------------------------------------------------------
   إدارة نموذج التسجيل متعدد الخطوات مع Supabase.

   الخطوة ١: اسم + بريد + كلمة سر + جوال
   الخطوة ٢: اختيار ٣+ اهتمامات
   الخطوة ٣: مراجعة + قبول الشروط → ينشئ الحساب في Supabase
   شاشة نجاح: يحفظ الجلسة تلقائياً (عبر NuqtaUser.signUp)
   ============================================================ */

(function () {
  'use strict';

  const state = {
    step: 1,
    data: {
      name: '',
      email: '',
      password: '',
      phone: '',
      interests: []
    }
  };

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'ar';
    return (translations[lang] && translations[lang][key]) || key;
  }

  /* ---------- Validation ---------- */
  function validateEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function validatePhone(s) {
    const digits = s.replace(/[^0-9]/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }

  function showError(fieldId, msg) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const err = field.parentElement.querySelector('.form-error');
    if (err) err.textContent = msg;
    field.classList.add('has-error');
  }

  function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const err = field.parentElement.querySelector('.form-error');
    if (err) err.textContent = '';
    field.classList.remove('has-error');
  }

  function validateStep1() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const phone = document.getElementById('signupPhone').value.trim();
    let ok = true;

    ['signupName','signupEmail','signupPassword','signupPhone'].forEach(clearError);

    if (!name) { showError('signupName', t('signup.err.required')); ok = false; }

    if (!email) {
      showError('signupEmail', t('signup.err.required')); ok = false;
    } else if (!validateEmail(email)) {
      showError('signupEmail', t('signup.err.email')); ok = false;
    }

    if (!password) {
      showError('signupPassword', t('signup.err.required')); ok = false;
    } else if (password.length < 6) {
      showError('signupPassword', t('signup.err.password.short')); ok = false;
    }

    if (!phone) {
      showError('signupPhone', t('signup.err.required')); ok = false;
    } else if (!validatePhone(phone)) {
      showError('signupPhone', t('signup.err.phone')); ok = false;
    }

    if (ok) {
      state.data.name = name;
      state.data.email = email;
      state.data.password = password;
      state.data.phone = phone;
    }
    return ok;
  }

  function validateStep2() {
    const checked = document.querySelectorAll('.interest-tag.is-selected');
    const errorBox = document.getElementById('step2Error');
    if (checked.length < 3) {
      if (errorBox) errorBox.textContent = t('signup.err.tags');
      return false;
    }
    if (errorBox) errorBox.textContent = '';
    state.data.interests = Array.from(checked).map((el) => el.textContent.trim());
    return true;
  }

  /* ---------- التنقل بين الخطوات ---------- */
  function goToStep(num) {
    state.step = num;
    document.querySelectorAll('.signup-step').forEach((el) => el.classList.remove('is-active'));
    const current = document.querySelector(`.signup-step[data-step="${num}"]`);
    if (current) current.classList.add('is-active');
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgress() {
    const total = 3;
    const fill = document.getElementById('signupProgressFill');
    const label = document.getElementById('signupStepLabel');
    if (fill) fill.style.width = `${(state.step / total) * 100}%`;
    if (label) label.textContent = `${t('signup.step')} ${state.step} ${t('signup.of')} ${total}`;
  }

  /* ---------- ملخص الخطوة ٣ ---------- */
  function renderSummary() {
    document.getElementById('summaryName').textContent = state.data.name;
    document.getElementById('summaryEmail').textContent = state.data.email;
    document.getElementById('summaryPhone').textContent = state.data.phone;
    document.getElementById('summaryInterests').textContent =
      state.data.interests.join(' • ');
  }

  /* ---------- الإرسال (async) ---------- */
  async function handleSubmit() {
    const errBox = document.getElementById('submitError');
    const submitBtn = document.getElementById('btnSubmit');
    if (errBox) errBox.textContent = '';

    const terms = document.getElementById('signupTerms');
    if (terms && !terms.checked) {
      terms.parentElement.classList.add('has-error');
      return;
    }
    terms.parentElement.classList.remove('has-error');

    // حالة تحميل
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = t('signup.creating');

    try {
      // كود الدعوة (لو موجود)
      const pendingRef = window.NuqtaReferral
        ? window.NuqtaReferral.getPending()
        : null;

      const authData = await window.NuqtaUser.signUp({
        name: state.data.name,
        email: state.data.email,
        password: state.data.password,
        phone: state.data.phone,
        interests: state.data.interests,
        referredBy: pendingRef   // يُمرر للـ SQL trigger
      });

      // تنظيف الكود من localStorage بعد الاستخدام
      if (pendingRef && window.NuqtaReferral) {
        window.NuqtaReferral.clearPending();
      }

      // نجاح → شاشة الترحيب
      document.querySelector('.signup-card').style.display = 'none';
      document.querySelector('.signup-success').classList.add('is-visible');

    } catch (err) {
      console.error('Signup error:', err);

      // رسائل خطأ بشرية
      let msg = t('signup.err.generic');
      const raw = (err.message || '').toLowerCase();

      if (raw.includes('already registered') ||
          raw.includes('user already') ||
          raw.includes('email exists') ||
          raw.includes('duplicate')) {
        msg = t('signup.err.email.taken');
      } else if (raw.includes('password')) {
        msg = t('signup.err.password.weak');
      } else if (raw.includes('network') || raw.includes('failed to fetch')) {
        msg = t('signup.err.network');
      }

      if (errBox) errBox.textContent = msg;

      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  /* ---------- تهيئة ---------- */
  async function init() {
    if (!document.querySelector('.signup-wrap')) return;

    // لو المستخدم مسجّل دخول مسبقاً → للوحة التحكم مباشرة
    if (window.NuqtaUser && await window.NuqtaUser.isRegistered()) {
      window.location.href = 'dashboard.html';
      return;
    }

    // بنر الدعوة لو فتح الرابط بكود
    if (window.NuqtaReferral) {
      const ref = window.NuqtaReferral.getPending();
      if (ref) {
        const banner = document.getElementById('inviteBanner');
        if (banner) banner.style.display = '';
      }
    }

    updateProgress();

    // الخطوة ١ → التالي
    const next1 = document.getElementById('btnNext1');
    if (next1) next1.addEventListener('click', () => {
      if (validateStep1()) goToStep(2);
    });

    // الخطوة ٢ → رجوع/تالي
    document.querySelectorAll('.interest-tag').forEach((tag) => {
      tag.addEventListener('click', () => tag.classList.toggle('is-selected'));
    });

    const back2 = document.getElementById('btnBack2');
    if (back2) back2.addEventListener('click', () => goToStep(1));

    const next2 = document.getElementById('btnNext2');
    if (next2) next2.addEventListener('click', () => {
      if (validateStep2()) { renderSummary(); goToStep(3); }
    });

    // الخطوة ٣ → رجوع/إرسال
    const back3 = document.getElementById('btnBack3');
    if (back3) back3.addEventListener('click', () => goToStep(2));

    const submit = document.getElementById('btnSubmit');
    if (submit) submit.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubmit();
    });

    // إعادة تحديث progress عند تغيير اللغة
    const observer = new MutationObserver(updateProgress);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });

    // إزالة الأخطاء عند الكتابة
    ['signupName','signupEmail','signupPassword','signupPhone'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => clearError(id));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
