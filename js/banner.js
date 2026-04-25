/* ============================================================
   banner.js — شريط التنبيهات في أعلى الصفحة
   ------------------------------------------------------------
   - يعرض رسالة (إعلان/عرض/تنبيه) في أعلى الصفحة
   - قابل للإغلاق ويتذكّر تفضيل المستخدم
   - تتحكّم بالمحتوى من هنا فقط
   ============================================================ */

(function () {
  'use strict';

  // ⚙️ إعدادات الـ Banner — عدّلها متى تشاء
  const CONFIG = {
    // اجعلها false لإخفاء الـ banner كلياً
    enabled: true,

    // معرّف للرسالة — لو تغيّر، الـ banner يظهر مرة ثانية حتى لو أغلقه المستخدم
    id: 'launch-2026',

    // الرسائل (ar/en)
    messages: {
      ar: '🎉 نُقطة الآن متاحة! انضم اليوم واحصل على ١٠٠ نقطة ترحيبية مجاناً.',
      en: '🎉 Nuqta is now live! Join today and get 100 free welcome points.'
    },

    // رابط الإجراء (اختياري — اجعلها null لإلغاء الزر)
    cta: {
      ar: 'سجّل الآن →',
      en: 'Sign up now →',
      url: '/signup.html'
    }
  };

  function getLang() {
    return (window.Nuqta && window.Nuqta.getCurrentLang)
           ? window.Nuqta.getCurrentLang() : 'en';
  }

  function isDismissed() {
    try {
      return localStorage.getItem('nuqta_banner_' + CONFIG.id) === 'dismissed';
    } catch (e) { return false; }
  }

  function dismiss() {
    try { localStorage.setItem('nuqta_banner_' + CONFIG.id, 'dismissed'); } catch (e) {}
  }

  function render() {
    if (!CONFIG.enabled || isDismissed()) return;

    const lang = getLang();
    const msg = CONFIG.messages[lang] || CONFIG.messages.en;
    const ctaText = CONFIG.cta ? (CONFIG.cta[lang] || CONFIG.cta.en) : null;
    const ctaUrl = CONFIG.cta ? CONFIG.cta.url : null;

    const banner = document.createElement('div');
    banner.className = 'top-banner';
    banner.innerHTML = `
      <div class="top-banner-inner">
        <span class="top-banner-text">${msg}</span>
        ${ctaUrl ? `<a href="${ctaUrl}" class="top-banner-cta">${ctaText}</a>` : ''}
        <button class="top-banner-close" aria-label="Close">×</button>
      </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);
    document.body.classList.add('has-banner');

    // زر الإغلاق
    banner.querySelector('.top-banner-close').addEventListener('click', () => {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        banner.remove();
        document.body.classList.remove('has-banner');
      }, 300);
      dismiss();
    });

    // تحديث عند تغيير اللغة
    const observer = new MutationObserver(() => {
      const newLang = getLang();
      const newMsg = CONFIG.messages[newLang] || CONFIG.messages.en;
      const newCtaText = CONFIG.cta ? (CONFIG.cta[newLang] || CONFIG.cta.en) : null;

      const textEl = banner.querySelector('.top-banner-text');
      const ctaEl = banner.querySelector('.top-banner-cta');
      if (textEl) textEl.textContent = newMsg;
      if (ctaEl && newCtaText) ctaEl.textContent = newCtaText;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
