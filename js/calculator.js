/* ============================================================
   calculator.js
   ------------------------------------------------------------
   الحاسبة التفاعلية لحساب عدد النقاط المتوقعة.

   المكونات:
   - شريط تمرير (slider) يمثل الإنفاق الشهري
   - أزرار اختيار المستوى (تُحدّد المضاعف)
   - نتائج حيّة: نقاط شهرية، سنوية، وقيمة الخصم

   قواعد الحساب:
   - نقاط شهرية = الإنفاق × المضاعف
   - نقاط سنوية = الشهرية × ١٢
   - قيمة الخصم = نقاط سنوية × ٠.٠١ (كل ١٠٠ نقطة = دينار)
   ============================================================ */

(function () {
  'use strict';

  // ثابت: قيمة النقطة (نقطة واحدة = 0.01 دينار)
  const POINT_VALUE = 0.01;

  /* ---------- تحويل لأرقام عربية ---------- */
  function toArabicNumerals(str) {
    const map = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
                  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
    return String(str).replace(/[0-9]/g, (d) => map[d]);
  }

  /* ---------- تنسيق الرقم حسب اللغة ---------- */
  function formatNumber(num) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'ar';

    const formatted = Math.round(num).toLocaleString(
      lang === 'ar' ? 'ar-EG' : 'en-US'
    );

    return lang === 'ar' ? toArabicNumerals(formatted) : formatted;
  }

  /* ---------- تهيئة الحاسبة ---------- */
  function init() {
    const slider = document.getElementById('spendSlider');
    const spendValue = document.getElementById('spendValue');
    const monthlyPoints = document.getElementById('monthlyPoints');
    const yearlyPoints = document.getElementById('yearlyPoints');
    const discountValue = document.getElementById('discountValue');
    const tierPills = document.getElementById('tierPills');

    // لو الحاسبة غير موجودة في الصفحة، نتجاوز بهدوء
    if (!slider || !tierPills) return;

    let currentMultiplier = 2; // افتراضي: المستوى الذهبي

    /* ---- تحديث النتائج ---- */
    function updateResults() {
      const spend = parseInt(slider.value, 10);
      const monthly = spend * currentMultiplier;
      const yearly = monthly * 12;
      const discount = yearly * POINT_VALUE;

      spendValue.textContent = formatNumber(spend);
      monthlyPoints.textContent = formatNumber(monthly);
      yearlyPoints.textContent = formatNumber(yearly);
      discountValue.textContent = formatNumber(discount);
    }

    /* ---- ربط شريط التمرير ---- */
    slider.addEventListener('input', updateResults);

    /* ---- ربط أزرار المستويات ---- */
    tierPills.querySelectorAll('.tier-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        // إزالة الـ active من الكل
        tierPills.querySelectorAll('.tier-pill').forEach((p) => {
          p.classList.remove('active');
        });
        // تفعيل الزر المنقور
        pill.classList.add('active');
        // تحديث المضاعف
        currentMultiplier = parseFloat(pill.dataset.tier);
        updateResults();
      });
    });

    /* ---- تحديث عند تغيير اللغة ---- */
    // نراقب تغيير اتجاه HTML كدلالة على تغيير اللغة
    const observer = new MutationObserver(updateResults);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });

    // تشغيل أولي
    updateResults();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
