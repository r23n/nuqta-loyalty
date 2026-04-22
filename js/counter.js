/* ============================================================
   counter.js
   ------------------------------------------------------------
   تحريك الأرقام في قسم الإحصائيات من ٠ إلى القيمة النهائية
   عندما يظهر العنصر في نطاق الرؤية.

   الاستخدام في HTML:
   <div data-counter="2500000" data-suffix="+" data-format="short">٠</div>
   <div data-counter="87" data-suffix="٪">٠</div>
   <div data-counter="4.9" data-decimals="1">٠</div>

   السمات المدعومة:
   - data-counter     : القيمة النهائية (رقم)
   - data-suffix      : لاحقة تُضاف بعد الرقم (+ أو ٪ ...)
   - data-decimals    : عدد الخانات العشرية (للأرقام مثل 4.9)
   - data-format      : "short" لاختصار الأرقام الكبيرة (2.5M)
   ============================================================ */

(function () {
  'use strict';

  const DURATION = 2000; // مدة التحريك بالميلي ثانية

  /* ---------- تنسيق الرقم ---------- */
  function formatNumber(num, options, lang) {
    const { decimals = 0, format } = options;
    let formatted;

    // صيغة مختصرة للأرقام الكبيرة
    if (format === 'short') {
      if (num >= 1_000_000) {
        formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, '') +
                    (lang === 'ar' ? 'م' : 'M');
      } else if (num >= 1_000) {
        formatted = (num / 1_000).toFixed(1).replace(/\.0$/, '') +
                    (lang === 'ar' ? 'ك' : 'K');
      } else {
        formatted = num.toFixed(decimals);
      }
    } else {
      formatted = num.toFixed(decimals);
      // إضافة فواصل الآلاف
      if (decimals === 0) {
        formatted = Math.floor(num).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
      }
    }

    // تحويل الأرقام للعربية لو اللغة عربية
    if (lang === 'ar') {
      formatted = convertToArabicNumerals(formatted);
    }

    return formatted;
  }

  /* ---------- تحويل الأرقام اللاتينية إلى عربية ---------- */
  function convertToArabicNumerals(str) {
    const map = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
                  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
    return String(str).replace(/[0-9]/g, (d) => map[d]);
  }

  /* ---------- تحريك عدّاد واحد ---------- */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const format = el.dataset.format;

    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'ar';

    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / DURATION, 1);

      // easing cubic-out لنعومة الحركة
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      el.textContent = formatNumber(current, { decimals, format }, lang) + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // التأكد من عرض القيمة النهائية بدقة
        el.textContent = formatNumber(target, { decimals, format }, lang) + suffix;
      }
    }

    requestAnimationFrame(tick);
  }

  /* ---------- تهيئة المراقب ---------- */
  function init() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target); // التحريك مرة واحدة فقط
        }
      });
    }, { threshold: 0.5 });

    counters.forEach((c) => observer.observe(c));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
