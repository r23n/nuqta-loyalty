/* ============================================================
   checkout.js
   ------------------------------------------------------------
   يدير صفحة الدفع:
   - يقرأ الباقة المختارة من URL (?plan=pro&billing=monthly)
   - يعرض ملخص الطلب
   - يتحقق من بيانات البطاقة
   - عند النجاح: يحفظ الباقة في user ويعرض شاشة نجاح
   - للباقة المجانية: يتخطّى الدفع مباشرة
   ============================================================ */

(function () {
  'use strict';

  /* ---------- بيانات الباقات ---------- */
  const PLANS = {
    free: {
      key: 'free',
      nameKey: 'pricing.free.name',
      tagKey: 'pricing.free.tag',
      monthly: 0,
      yearly: 0
    },
    pro: {
      key: 'pro',
      nameKey: 'pricing.pro.name',
      tagKey: 'pricing.pro.tag',
      monthly: 5,    // د.ب شهرياً
      yearly: 48     // د.ب سنوياً (٤ × ١٢)
    },
    vip: {
      key: 'vip',
      nameKey: 'pricing.vip.name',
      tagKey: 'pricing.vip.tag',
      monthly: 15,   // د.ب شهرياً
      yearly: 144    // د.ب سنوياً (١٢ × ١٢)
    }
  };

  /* ---------- قراءة query string ---------- */
  function getParam(name) {
    const qs = new URLSearchParams(window.location.search);
    return qs.get(name);
  }

  /* ---------- ترجمة ---------- */
  function t(key) {
    const lang = window.Nuqta ? window.Nuqta.getCurrentLang() : 'ar';
    return (translations[lang] && translations[lang][key]) || key;
  }

  /* ---------- تنسيق رقم حسب اللغة الحالية ---------- */
  function fmt(num) {
    const s = String(num);
    return window.Nuqta ? window.Nuqta.toLangDigits(s) : s;
  }

  /* ---------- عرض ملخص الطلب ---------- */
  function renderSummary(plan, billing) {
    const nameEl = document.getElementById('summaryPlanName');
    const tagEl = document.getElementById('summaryPlanTag');
    const billingEl = document.getElementById('summaryBilling');
    const totalEl = document.getElementById('summaryTotal');

    if (nameEl) nameEl.textContent = t(plan.nameKey);
    if (tagEl) tagEl.textContent = t(plan.tagKey);

    const price = (billing === 'yearly') ? plan.yearly : plan.monthly;
    const billingLabel = (billing === 'yearly')
      ? t('checkout.billing.yearly')
      : t('checkout.billing.monthly');

    if (billingEl) billingEl.textContent = billingLabel;
    if (totalEl) {
      totalEl.textContent = fmt(price) + ' ' + t('pricing.currency');
    }
  }

  /* ---------- Validation للبطاقة ---------- */
  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    const errBox = el.parentElement.querySelector('.form-error');
    if (errBox) errBox.textContent = msg;
    el.classList.add('has-error');
  }

  function clearErr(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const errBox = el.parentElement.querySelector('.form-error');
    if (errBox) errBox.textContent = '';
    el.classList.remove('has-error');
  }

  function onlyDigits(s) {
    // نحوّل الأرقام العربية للإنجليزية ثم نستخرج الأرقام
    const en = window.Nuqta ? window.Nuqta.toEnDigits(s) : s;
    return en.replace(/[^0-9]/g, '');
  }

  function validatePayment() {
    let ok = true;
    const fields = ['cardName', 'cardNumber', 'cardExpiry', 'cardCvv'];
    fields.forEach(clearErr);

    const name = document.getElementById('cardName').value.trim();
    const number = onlyDigits(document.getElementById('cardNumber').value);
    const expiry = document.getElementById('cardExpiry').value.trim();
    const cvv = onlyDigits(document.getElementById('cardCvv').value);

    if (!name) {
      showErr('cardName', t('signup.err.required'));
      ok = false;
    }
    if (number.length < 13 || number.length > 19) {
      showErr('cardNumber', t('signup.err.required'));
      ok = false;
    }
    if (!/^\d{2}\/\d{2}$/.test(window.Nuqta ? window.Nuqta.toEnDigits(expiry) : expiry)) {
      showErr('cardExpiry', t('signup.err.required'));
      ok = false;
    }
    if (cvv.length < 3 || cvv.length > 4) {
      showErr('cardCvv', t('signup.err.required'));
      ok = false;
    }

    return ok;
  }

  /* ---------- تفعيل الباقة عبر Supabase (async) ---------- */
  async function activatePlan(planKey, billing) {
    if (!window.NuqtaUser) return false;
    try {
      return await window.NuqtaUser.activatePlan(planKey, billing);
    } catch (err) {
      console.error('activatePlan error:', err);
      return false;
    }
  }

  /* ---------- تهيئة ---------- */
  async function init() {
    // تأكد أن المستخدم سجّل دخول (async الآن)
    if (window.NuqtaUser && !(await window.NuqtaUser.isRegistered())) {
      window.location.href = 'signup.html';
      return;
    }

    // قراءة الباقة المختارة
    const planKey = getParam('plan') || 'free';
    const billing = getParam('billing') || 'monthly';
    const plan = PLANS[planKey];

    if (!plan) {
      window.location.href = 'pricing.html';
      return;
    }

    // المجانية: شاشة تفعيل مباشر
    if (plan.key === 'free') {
      document.getElementById('checkoutPaid').style.display = 'none';
      document.getElementById('checkoutFree').style.display = 'block';

      const btn = document.getElementById('btnActivateFree');
      if (btn) btn.addEventListener('click', async () => {
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = t('checkout.processing');

        const ok = await activatePlan('free', 'monthly');
        if (ok) {
          window.location.href = 'dashboard.html';
        } else {
          btn.textContent = originalText;
          btn.disabled = false;
          Toast.error(t('checkout.err.generic'));
        }
      });
      return;
    }

    // الباقات المدفوعة: نعرض الدفع
    renderSummary(plan, billing);

    // إعادة الرسم عند تغيير اللغة
    const observer = new MutationObserver(() => renderSummary(plan, billing));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });

    // زر الدفع (async)
    const payBtn = document.getElementById('btnPay');
    if (payBtn) payBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!validatePayment()) return;

      payBtn.textContent = t('checkout.processing');
      payBtn.disabled = true;

      // محاكاة معالجة الدفع (~١.٢ ثانية)
      await new Promise((r) => setTimeout(r, 1200));

      // تفعيل الباقة في Supabase
      const ok = await activatePlan(planKey, billing);
      if (ok) {
        document.getElementById('checkoutPaid').style.display = 'none';
        document.getElementById('checkoutSuccess').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        payBtn.textContent = t('checkout.submit');
        payBtn.disabled = false;
        Toast.error(t('checkout.err.generic'));
      }
    });

    // إزالة الأخطاء عند الكتابة
    ['cardName', 'cardNumber', 'cardExpiry', 'cardCvv'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => clearErr(id));
    });

    // تنسيق تلقائي لرقم البطاقة (مجموعات من ٤)
    const numEl = document.getElementById('cardNumber');
    if (numEl) numEl.addEventListener('input', (e) => {
      const digits = onlyDigits(e.target.value).slice(0, 16);
      e.target.value = digits.replace(/(.{4})/g, '$1 ').trim();
    });

    // تنسيق تلقائي للتاريخ MM/YY
    const expEl = document.getElementById('cardExpiry');
    if (expEl) expEl.addEventListener('input', (e) => {
      let digits = onlyDigits(e.target.value).slice(0, 4);
      if (digits.length >= 3) {
        digits = digits.slice(0, 2) + '/' + digits.slice(2);
      }
      e.target.value = digits;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
