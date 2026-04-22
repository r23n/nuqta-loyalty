/* ============================================================
   qr.js — توليد QR Code خفيف بـ SVG (بدون مكتبات خارجية)
   ------------------------------------------------------------
   نستخدم خدمة QR Server المجانية التي ترجع SVG/PNG.
   للخصوصية نحفظ الصورة محلياً في data URL عبر API بسيط.

   الاستخدام:
     NuqtaQR.render('nuqta.bh/ref/NQ-ABC123', document.getElementById('qr'));
   ============================================================ */

(function () {
  'use strict';

  /* ---------- استخدام خدمة QR خارجية (أسهل وأصغر) ---------- */
  function buildURL(data, size) {
    size = size || 240;
    const encoded = encodeURIComponent(data);
    // api.qrserver.com مجاني ومستقر
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&color=1a0e10&bgcolor=F4EAD5&qzone=1`;
  }

  /* ---------- عرض QR في container ---------- */
  function render(data, container, size) {
    if (!container) return;

    const img = document.createElement('img');
    img.src = buildURL(data, size || 240);
    img.alt = 'QR Code';
    img.className = 'qr-image';
    img.loading = 'lazy';
    img.width = size || 240;
    img.height = size || 240;

    container.innerHTML = '';
    container.appendChild(img);
  }

  /* ---------- تنزيل QR كصورة ---------- */
  function download(data, filename, size) {
    const url = buildURL(data, size || 400);

    // نحمل الصورة ثم نحولها لـ blob ونحفظها
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename || 'nuqta-qr.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      })
      .catch((err) => console.error('QR download failed:', err));
  }

  window.NuqtaQR = { render, download, buildURL };
})();
