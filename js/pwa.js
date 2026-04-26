/* ============================================================
   pwa.js — تسجيل Service Worker + Install Prompt
   ------------------------------------------------------------
   - يسجّل sw.js لتفعيل ميزات PWA
   - يعرض زر "Install" لما المتصفح يكون جاهز للتثبيت
   - يعرض رسالة لمستخدم iOS مع تعليمات التثبيت
   ============================================================ */

(function () {
  'use strict';

  // ==========================================
  // 1. تسجيل Service Worker
  // ==========================================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ Service Worker registered:', reg.scope);

          // فحص دوري للتحديثات (كل ساعة)
          setInterval(() => reg.update(), 60 * 60 * 1000);

          // لو في تحديث جديد، نخبر المستخدم
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateNotice();
              }
            });
          });
        })
        .catch((err) => {
          console.warn('SW registration failed:', err);
        });
    });
  }

  // ==========================================
  // 2. Install Prompt (Android/Desktop Chrome)
  // ==========================================
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // نمنع الـ prompt الافتراضي
    e.preventDefault();
    deferredPrompt = e;

    // نعرض زر التثبيت بعد ٥ ثواني (لما المستخدم يبدأ يتفاعل)
    setTimeout(() => {
      if (deferredPrompt && !isDismissed()) {
        showInstallPrompt();
      }
    }, 5000);
  });

  // لما العميل يثبّت التطبيق
  window.addEventListener('appinstalled', () => {
    console.log('✅ Nuqta installed!');
    deferredPrompt = null;
    hideInstallPrompt();
    dismissForever();
  });

  // ==========================================
  // 3. iOS Install Hint (Safari مالها prompt)
  // ==========================================
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
           !window.MSStream;
  }

  function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // ==========================================
  // 4. UI Helpers
  // ==========================================
  function isDismissed() {
    try {
      const dismissed = localStorage.getItem('nuqta_install_dismissed');
      if (!dismissed) return false;
      // نُظهر الرسالة من جديد بعد ٧ أيام من الإغلاق
      const days = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      return days < 7;
    } catch (e) { return false; }
  }

  function dismiss() {
    try { localStorage.setItem('nuqta_install_dismissed', Date.now().toString()); } catch (e) {}
  }

  function dismissForever() {
    try { localStorage.setItem('nuqta_install_dismissed', '99999999999999'); } catch (e) {}
  }

  function getLang() {
    return (window.Nuqta && window.Nuqta.getCurrentLang)
           ? window.Nuqta.getCurrentLang() : 'en';
  }

  function showInstallPrompt() {
    if (document.getElementById('pwaInstallPrompt')) return;

    const lang = getLang();
    const isAr = lang === 'ar';

    const prompt = document.createElement('div');
    prompt.id = 'pwaInstallPrompt';
    prompt.className = 'pwa-prompt';
    prompt.innerHTML = `
      <div class="pwa-prompt-icon">
        <img src="/icons/icon-192.png" alt="Nuqta" width="48" height="48">
      </div>
      <div class="pwa-prompt-content">
        <strong>${isAr ? 'ثبّت نُقطة' : 'Install Nuqta'}</strong>
        <p>${isAr ? 'احصل على تجربة أسرع — مع أيقونة على شاشتك' : 'Faster experience with an icon on your home screen'}</p>
      </div>
      <div class="pwa-prompt-actions">
        <button class="pwa-prompt-install">${isAr ? 'ثبّت' : 'Install'}</button>
        <button class="pwa-prompt-close" aria-label="Close">×</button>
      </div>
    `;

    document.body.appendChild(prompt);

    // animate in
    requestAnimationFrame(() => prompt.classList.add('is-visible'));

    // ربط الأزرار
    prompt.querySelector('.pwa-prompt-install').addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('Install outcome:', outcome);
      deferredPrompt = null;
      hideInstallPrompt();

      if (outcome === 'dismissed') dismiss();
    });

    prompt.querySelector('.pwa-prompt-close').addEventListener('click', () => {
      hideInstallPrompt();
      dismiss();
    });
  }

  function hideInstallPrompt() {
    const prompt = document.getElementById('pwaInstallPrompt');
    if (!prompt) return;
    prompt.classList.remove('is-visible');
    setTimeout(() => prompt.remove(), 300);
  }

  function showIOSInstallHint() {
    if (document.getElementById('pwaIOSHint')) return;
    if (isInStandaloneMode()) return; // مثبّت بالفعل
    if (isDismissed()) return;

    const lang = getLang();
    const isAr = lang === 'ar';

    const hint = document.createElement('div');
    hint.id = 'pwaIOSHint';
    hint.className = 'pwa-ios-hint';
    hint.innerHTML = `
      <div class="pwa-ios-hint-content">
        <strong>${isAr ? 'ثبّت نُقطة على شاشتك' : 'Install Nuqta on your screen'}</strong>
        <p>${isAr ? 'اضغط زر المشاركة <span style="font-size:18px">⎙</span> ثم "Add to Home Screen"' : 'Tap the share button <span style="font-size:18px">⎙</span> then "Add to Home Screen"'}</p>
      </div>
      <button class="pwa-prompt-close" aria-label="Close">×</button>
    `;

    document.body.appendChild(hint);
    requestAnimationFrame(() => hint.classList.add('is-visible'));

    hint.querySelector('.pwa-prompt-close').addEventListener('click', () => {
      hint.classList.remove('is-visible');
      setTimeout(() => hint.remove(), 300);
      dismiss();
    });
  }

  function showUpdateNotice() {
    if (document.getElementById('pwaUpdateNotice')) return;

    const lang = getLang();
    const isAr = lang === 'ar';

    const notice = document.createElement('div');
    notice.id = 'pwaUpdateNotice';
    notice.className = 'pwa-update-notice';
    notice.innerHTML = `
      <span>${isAr ? '✨ نسخة جديدة متاحة' : '✨ New version available'}</span>
      <button class="pwa-update-btn">${isAr ? 'تحديث' : 'Update'}</button>
    `;

    document.body.appendChild(notice);
    requestAnimationFrame(() => notice.classList.add('is-visible'));

    notice.querySelector('.pwa-update-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }

  // ==========================================
  // 5. تشغيل iOS hint بعد ٧ ثواني (لو على iOS وما مثبّت)
  // ==========================================
  if (isIOS() && !isInStandaloneMode()) {
    setTimeout(() => {
      if (!isDismissed()) showIOSInstallHint();
    }, 7000);
  }
})();
