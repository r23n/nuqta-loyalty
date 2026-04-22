/* ============================================================
   i18n.js
   ------------------------------------------------------------
   نظام دعم اللغات (Internationalization).
   المهام:
   1. قراءة اللغة المحفوظة من localStorage (أو استخدام العربية كافتراضي)
   2. تطبيق الترجمات على كل عنصر يحمل data-i18n
   3. تبديل اللغة عند النقر على زر اللغة
   4. تحديث dir و lang على <html> حسب اللغة

   يعتمد على: translations.js (يجب تحميله قبل هذا الملف)
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'nuqta_lang';
  const DEFAULT_LANG = 'en';

  /* ---------- قراءة/حفظ اللغة ---------- */
  function getSavedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch (e) {
      return DEFAULT_LANG;
    }
  }

  function saveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // تجاهل خطأ localStorage في حالة الـ private mode
    }
  }

  /* ---------- تحويل الأرقام ---------- */
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const EN_DIGITS = '0123456789';

  function toArDigits(str) {
    return String(str).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);
  }

  function toEnDigits(str) {
    return String(str).replace(/[٠-٩]/g, (d) => EN_DIGITS[AR_DIGITS.indexOf(d)]);
  }

  /*
   * يمشي على كل النصوص في الصفحة ويحوّل الأرقام للغة الهدف.
   * نتجاوز العناصر التي لا تحتاج تحويل (script، style، inputs).
   */
  // حفظ آخر لغة تم التحويل إليها — لتجنّب العمل المكرّر
  let _lastConvertedLang = null;

  function convertAllNumbers(lang) {
    // تحسين: لو نفس اللغة اللي حوّلنا إليها سابقاً، ما نعيد العمل
    if (_lastConvertedLang === lang) return;
    _lastConvertedLang = lang;

    const convert = (lang === 'ar') ? toArDigits : toEnDigits;
    // regex سريع للتحقّق أولاً: لو ما فيه أرقام، ما نحوّل
    const hasDigits = (lang === 'ar') ? /[0-9]/ : /[٠-٩]/;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.parentElement) return NodeFilter.FILTER_REJECT;
          const tag = node.parentElement.tagName;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement.closest('[data-no-translate]')) {
            return NodeFilter.FILTER_REJECT;
          }
          // تسريع: لو النص ما فيه أرقام أصلاً، تخطاه
          if (!hasDigits.test(node.textContent)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      node.textContent = convert(node.textContent);
    }

    // كما نحدّث placeholder للحقول (لكن نتجاهل المستثنى)
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
      if (el.closest('[data-no-translate]')) return;
      if (hasDigits.test(el.placeholder)) {
        el.placeholder = convert(el.placeholder);
      }
    });
  }


  /* ---------- تطبيق الترجمة ---------- */
  function applyTranslations(lang) {
    const dict = translations[lang];
    if (!dict) return;

    // تعديل اتجاه واتجاهية الـ HTML
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

    // تحديث كل العناصر التي تحمل data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = dict[key];

      if (value !== undefined) {
        if (value.includes('<')) {
          el.innerHTML = value;
        } else {
          el.textContent = value;
        }
      }
    });

    // تحديث placeholders عبر data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = dict[key];
      if (value !== undefined) el.placeholder = value;
    });

    // تحديث نص عنوان التبويب (title)
    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      const key = titleEl.getAttribute('data-i18n');
      if (dict[key]) document.title = dict[key];
    }

    // تحديث زر اللغة ليعرض اللغة الأخرى
    const switchBtn = document.querySelector('.lang-switch__current');
    if (switchBtn) {
      switchBtn.textContent = (lang === 'ar') ? 'EN' : 'ع';
    }

    // تحويل كل الأرقام في الصفحة للغة الهدف
    convertAllNumbers(lang);
  }

  /* ---------- تبديل اللغة ---------- */
  function toggleLang() {
    const current = getSavedLang();
    const next = (current === 'ar') ? 'en' : 'ar';
    saveLang(next);
    applyTranslations(next);
  }

  /* ---------- تهيئة ---------- */
  function init() {
    // تطبيق اللغة المحفوظة عند فتح الصفحة
    applyTranslations(getSavedLang());

    // ربط زر التبديل
    const langBtn = document.getElementById('langSwitch');
    if (langBtn) {
      langBtn.addEventListener('click', toggleLang);
    }
  }

  // تشغيل عند جاهزية DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // تصدير للاستخدام من سكربتات أخرى (مثل الحاسبة)
  window.Nuqta = window.Nuqta || {};
  window.Nuqta.getCurrentLang = getSavedLang;
  window.Nuqta.applyTranslations = applyTranslations;
  window.Nuqta.toArDigits = toArDigits;
  window.Nuqta.toEnDigits = toEnDigits;
  window.Nuqta.toLangDigits = function (str, lang) {
    lang = lang || getSavedLang();
    return (lang === 'ar') ? toArDigits(str) : toEnDigits(str);
  };
})();
