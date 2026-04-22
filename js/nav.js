/* ============================================================
   nav.js
   ------------------------------------------------------------
   إدارة قائمة الهامبرغر في الهواتف.
   عند النقر على الزر تنفتح/تنغلق قائمة الروابط.
   ============================================================ */

(function () {
  'use strict';

  function init() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (!hamburger || !navLinks) return;

    // فتح/إغلاق القائمة عند النقر على الزر
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('is-open');
      navLinks.classList.toggle('is-open');
    });

    // إغلاق القائمة عند النقر على أي رابط
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('is-open');
        navLinks.classList.remove('is-open');
      });
    });

    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove('is-open');
        navLinks.classList.remove('is-open');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
