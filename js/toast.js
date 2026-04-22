/* ============================================================
   toast.js
   ------------------------------------------------------------
   إشعارات صغيرة أنيقة في زاوية الشاشة (بديل أنظف لـ alert).

   الاستخدام:
   Toast.success('تم التسجيل بنجاح');
   Toast.error('فشل الاتصال');
   Toast.info('جاري التحميل...');
   Toast.warning('تأكد من بياناتك');

   الخيارات:
   Toast.show({
     message: 'نص',
     type: 'success' | 'error' | 'info' | 'warning',
     duration: 4000,   // ms (0 = لا يختفي)
     closable: true
   });
   ============================================================ */

(function () {
  'use strict';

  /* ---------- حاوي الـ Toasts ---------- */
  function ensureContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  /* ---------- أيقونة حسب النوع ---------- */
  const ICONS = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  /* ---------- عرض toast ---------- */
  function show(opts) {
    const container = ensureContainer();

    const type = opts.type || 'info';
    const duration = (opts.duration !== undefined) ? opts.duration : 4000;
    const closable = (opts.closable !== undefined) ? opts.closable : true;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
      <span class="toast-msg"></span>
      ${closable ? '<button class="toast-close" aria-label="Close">&times;</button>' : ''}
    `;
    toast.querySelector('.toast-msg').textContent = opts.message || '';

    container.appendChild(toast);

    // انيميشن دخول
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    // إغلاق يدوي
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => dismiss(toast));
    }

    // إغلاق تلقائي
    if (duration > 0) {
      setTimeout(() => dismiss(toast), duration);
    }

    return toast;
  }

  function dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('is-visible');
    toast.classList.add('is-leaving');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  /* ---------- اختصارات ---------- */
  window.Toast = {
    show: show,
    success: (msg, opts) => show({ ...opts, message: msg, type: 'success' }),
    error:   (msg, opts) => show({ ...opts, message: msg, type: 'error' }),
    info:    (msg, opts) => show({ ...opts, message: msg, type: 'info' }),
    warning: (msg, opts) => show({ ...opts, message: msg, type: 'warning' }),
    dismiss: dismiss
  };
})();
