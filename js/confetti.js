/* ============================================================
   confetti.js — احتفال بصري خفيف (بدون مكتبات)
   ------------------------------------------------------------
   ينشئ قطع ورق ملوّنة تسقط مع الجاذبية لمدة ~3 ثواني
   ثم تختفي تلقائياً.

   محسّن للأداء:
   - CSS transforms فقط (GPU)
   - requestAnimationFrame
   - ينظّف نفسه بعد الانتهاء
   ============================================================ */

(function () {
  'use strict';

  const COLORS = [
    '#C9A961',  // gold
    '#E6C681',  // gold-bright
    '#D2691E',  // copper
    '#6B1F2E',  // wine
    '#F4EAD5',  // cream
    '#e8b54c'   // amber
  ];

  function burst(opts) {
    opts = opts || {};
    const count = opts.count || 50;
    const duration = opts.duration || 3000;

    // تحقّق أن المستخدم لا يفضّل تقليل الحركة
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';

      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const x = Math.random() * 100;           // 0-100% من العرض
      const xEnd = (Math.random() - 0.5) * 200; // انحراف نهائي
      const rotation = Math.random() * 720;     // دوران
      const delay = Math.random() * 300;        // تأخير عشوائي
      const dur = duration + Math.random() * 500;
      const size = 6 + Math.random() * 6;       // 6-12px

      piece.style.cssText = `
        left: ${x}%;
        width: ${size}px;
        height: ${size * 0.4}px;
        background: ${color};
        animation-delay: ${delay}ms;
        animation-duration: ${dur}ms;
        --x-end: ${xEnd}px;
        --rot-end: ${rotation}deg;
      `;

      container.appendChild(piece);
    }

    // تنظيف بعد انتهاء الأنيميشن
    setTimeout(() => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, duration + 1000);
  }

  window.NuqtaConfetti = { burst };
})();
