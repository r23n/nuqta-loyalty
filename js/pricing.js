/* ============================================================
   pricing.js
   ------------------------------------------------------------
   إدارة صفحة الأسعار:
   1. مبدّل الفوترة (شهري/سنوي) — يحدّث الأسعار ونصوص التوفير
   2. كشف وضع onboarding (عند القدوم من signup) — يُظهر banner علوي
   3. ربط أزرار "اشترك/اختر" بصفحة checkout مع تمرير الباقة والفوترة
   4. إذا كان المستخدم مسجّل، تمييز باقته الحالية
   ============================================================ */

(function () {
  'use strict';

  /* ---------- قراءة query ---------- */
  function isOnboarding() {
    return new URLSearchParams(window.location.search).get('onboarding') === '1';
  }

  /* ---------- ترجمة ---------- */
  function t(key) {
    const lang = window.Nuqta ? window.Nuqta.getCurrentLang() : 'ar';
    return (translations[lang] && translations[lang][key]) || key;
  }

  /* ---------- مبدّل الفوترة ---------- */
  function initBillingToggle() {
    const billingBtns = document.querySelectorAll('.billing-btn');
    if (!billingBtns.length) return;

    const priceElements = document.querySelectorAll('[data-price-monthly]');
    const yearlyNotes = document.querySelectorAll('[data-billing-only="yearly"]');

    yearlyNotes.forEach((el) => el.style.display = 'none');

    function setBilling(billing) {
      billingBtns.forEach((b) => {
        b.classList.toggle('active', b.dataset.billing === billing);
      });

      priceElements.forEach((el) => {
        const monthly = el.dataset.priceMonthly;
        const yearly = el.dataset.priceYearly;
        el.textContent = (billing === 'yearly') ? yearly : monthly;
        el.dataset.current = billing;
      });

      yearlyNotes.forEach((el) => {
        el.style.display = (billing === 'yearly') ? 'block' : 'none';
      });

      // حفظ الاختيار لاستخدامه في أزرار الـ CTA
      document.body.dataset.billing = billing;
    }

    billingBtns.forEach((btn) => {
      btn.addEventListener('click', () => setBilling(btn.dataset.billing));
    });

    setBilling('monthly');
  }


  /* ---------- Banner الـ onboarding ---------- */
  function showOnboardingBanner() {
    if (!isOnboarding()) return;

    const banner = document.createElement('div');
    banner.className = 'onboarding-banner';
    banner.innerHTML = `
      <div class="container">
        <div class="onboarding-banner-inner">
          <div class="onboarding-icon">◆</div>
          <div>
            <div class="onboarding-title" data-i18n="onboarding.title">اختر باقتك لإكمال التسجيل</div>
            <div class="onboarding-sub" data-i18n="onboarding.sub">خطوة أخيرة قبل تفعيل حسابك</div>
          </div>
        </div>
      </div>
    `;

    const firstSection = document.querySelector('.page-hero');
    if (firstSection) {
      firstSection.parentNode.insertBefore(banner, firstSection);
    }

    // أعد تطبيق الترجمات على المحتوى الجديد
    if (window.Nuqta && window.Nuqta.applyTranslations) {
      window.Nuqta.applyTranslations(window.Nuqta.getCurrentLang());
    }
  }


  /* ---------- ربط أزرار الاختيار بـ checkout ---------- */
  function wirePlanButtons() {
    // كل بطاقة باقة تحتوي data-plan على زر الـ CTA (نضيفها من HTML)
    document.querySelectorAll('.pricing-cta[data-plan]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const plan = btn.dataset.plan;
        const billing = document.body.dataset.billing || 'monthly';
        const onboarding = isOnboarding() ? '&onboarding=1' : '';
        window.location.href = `checkout.html?plan=${plan}&billing=${billing}${onboarding}`;
      });
    });
  }


  /* ---------- تمييز الباقة الحالية لو المستخدم مسجّل ومشترك ---------- */
  async function markCurrentPlan() {
    if (!window.NuqtaUser) return;
    const profile = await window.NuqtaUser.getProfile();
    if (!profile || !profile.plan_active || !profile.plan) return;

    document.querySelectorAll('.pricing-cta[data-plan]').forEach((btn) => {
      if (btn.dataset.plan === profile.plan) {
        btn.classList.add('is-current');
        btn.innerHTML = '✓ ' + t('pricing.chosen');
        btn.style.pointerEvents = 'none';
      }
    });
  }


  /* ---------- تهيئة ---------- */
  function init() {
    initBillingToggle();
    showOnboardingBanner();
    wirePlanButtons();
    markCurrentPlan();

    // إعادة تطبيق الترجمات عند تغيير اللغة (banner diconnected)
    const observer = new MutationObserver(() => {
      markCurrentPlan();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
