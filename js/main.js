/* ============================================================
   main.js — النسخة المحسّنة للأداء
   ------------------------------------------------------------
   المسؤوليات:
   1. Scroll Reveal (IntersectionObserver — كفء جداً)
   2. Reading Progress (مع throttle لتقليل استهلاك CPU)
   3. إيقاف الأنيميشنات لما التبويب مخفي (توفير بطارية)
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     Scroll Reveal
     ============================================================ */
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach((el) => observer.observe(el));
  }


  /* ============================================================
     Reading Progress - مع requestAnimationFrame (أداء أفضل)
     ------------------------------------------------------------
     بدل تحديث style.width على كل scroll event (قد يكون ٦٠×/ث)،
     نستخدم rAF لضمان مزامنة مع رسم الإطار فقط.
     ============================================================ */
  function initReadingProgress() {
    const fill = document.querySelector('.reading-progress-fill');
    if (!fill) return;

    let ticking = false;
    let lastPercent = -1;

    function update() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const percent = total > 0 ? Math.round((scrolled / total) * 100) : 0;

      // نحدّث فقط لو تغيرت النسبة (بالرقم الصحيح)
      if (percent !== lastPercent) {
        fill.style.transform = `scaleX(${percent / 100})`;
        lastPercent = percent;
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    // استخدام transform بدل width (GPU-accelerated)
    fill.style.transformOrigin = 'left';
    fill.style.width = '100%';

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }


  /* ============================================================
     إيقاف الأنيميشنات عند إخفاء التبويب (توفير CPU/بطارية)
     ============================================================ */
  function initVisibilityOptimization() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        document.body.classList.add('page-hidden');
      } else {
        document.body.classList.remove('page-hidden');
      }
    });
  }


  /* ---------- التشغيل ---------- */
  function init() {
    initScrollReveal();
    initReadingProgress();
    initVisibilityOptimization();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
