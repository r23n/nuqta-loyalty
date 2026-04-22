/* ============================================================
   notifications.js
   ------------------------------------------------------------
   نظام إشعارات ذكية داخل الـ Dashboard.

   القواعد (Rules) تُقيّم حالة المستخدم وتعرض بانرات ملائمة:
   - "قريب من المستوى التالي"
   - "حصلت على نقاط ترحيبية"
   - "اختر باقتك لفتح كل الميزات"
   - "رجعت بعد فترة"
   - وغيرها...

   الاستخدام (من dashboard.js):
     NuqtaNotifications.render(profile, transactions);

   كل إشعار يمكن إغلاقه. الإخفاء يُحفظ في localStorage.
   ============================================================ */

(function () {
  'use strict';

  const DISMISSED_KEY = 'nuqta_dismissed_notifs';

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    return (translations[lang] && translations[lang][key]) || key;
  }

  /* ---------- إدارة الإشعارات المُخفاة ---------- */
  function getDismissed() {
    try {
      return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function isDismissed(id) {
    return getDismissed().includes(id);
  }

  function dismiss(id) {
    const list = getDismissed();
    if (!list.includes(id)) {
      list.push(id);
      try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(list)); } catch (e) {}
    }
  }

  /* ---------- القواعد (Rules) ----------
     كل قاعدة ترجع notification object أو null
  */
  const RULES = [
    // ١. قريب من المستوى التالي
    function nearNextTier(profile) {
      const thresholds = {
        bronze:   { next: 'silver',   at: 1000,  labelKey: 'tier.silver' },
        silver:   { next: 'gold',     at: 5000,  labelKey: 'tier.gold' },
        gold:     { next: 'platinum', at: 20000, labelKey: 'tier.platinum' },
        platinum: null
      };
      const info = thresholds[profile.tier];
      if (!info) return null;

      const remaining = info.at - profile.points;
      // نعرض الإشعار لو قريب (200 نقطة أو أقل)
      if (remaining > 200 || remaining <= 0) return null;

      return {
        id: `near-${info.next}-${Math.floor(profile.points / 100)}`,
        type: 'info',
        icon: '🎯',
        title: t('notif.near.title'),
        message: t('notif.near.msg')
          .replace('{n}', remaining)
          .replace('{tier}', t(info.labelKey))
      };
    },

    // ٢. حساب جديد لم يختر باقة
    function noPlan(profile) {
      if (profile.plan_active) return null;
      // لا نعرضه لو مرّ أكثر من ٧ أيام (إحباط العميل)
      const days = window.NuqtaUser.daysSinceJoined(profile);
      if (days > 7) return null;

      return {
        id: 'no-plan',
        type: 'warning',
        icon: '✨',
        title: t('notif.plan.title'),
        message: t('notif.plan.msg'),
        action: {
          label: t('notif.plan.cta'),
          href: 'pricing.html?onboarding=1'
        }
      };
    },

    // ٣. رجوع بعد غياب (إذا مرّت ٣٠+ يوم بدون معاملات)
    function comeBack(profile, transactions) {
      if (!transactions || transactions.length === 0) return null;
      const lastTx = new Date(transactions[0].date);
      const daysSince = Math.floor((Date.now() - lastTx.getTime()) / (1000*60*60*24));
      if (daysSince < 30) return null;

      return {
        id: 'comeback-' + Math.floor(daysSince / 30),
        type: 'info',
        icon: '👋',
        title: t('notif.back.title'),
        message: t('notif.back.msg').replace('{days}', daysSince)
      };
    },

    // ٤. تذكير أول معاملة (للأعضاء الجدد بدون معاملات)
    function firstTransaction(profile, transactions) {
      if (transactions && transactions.length > 0) return null;
      const days = window.NuqtaUser.daysSinceJoined(profile);
      if (days < 1) return null; // يوم واحد على الأقل

      return {
        id: 'first-tx',
        type: 'info',
        icon: '🛍️',
        title: t('notif.firsttx.title'),
        message: t('notif.firsttx.msg'),
        action: {
          label: t('notif.firsttx.cta'),
          href: 'index.html#rewards'
        }
      };
    }
  ];

  /* ---------- عرض إشعار واحد ---------- */
  function renderOne(notif) {
    const el = document.createElement('div');
    el.className = `notif notif--${notif.type || 'info'}`;
    el.dataset.notifId = notif.id;

    el.innerHTML = `
      <div class="notif-icon">${notif.icon || '◆'}</div>
      <div class="notif-body">
        <div class="notif-title"></div>
        <div class="notif-msg"></div>
      </div>
      ${notif.action ? `<a href="${notif.action.href}" class="notif-action"></a>` : ''}
      <button class="notif-close" aria-label="Dismiss">&times;</button>
    `;

    // نحط النصوص بطريقة آمنة (textContent) لتفادي XSS
    el.querySelector('.notif-title').textContent = notif.title || '';
    el.querySelector('.notif-msg').textContent = notif.message || '';
    if (notif.action) {
      el.querySelector('.notif-action').textContent = notif.action.label || '';
    }

    // زر الإغلاق
    el.querySelector('.notif-close').addEventListener('click', () => {
      dismiss(notif.id);
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 300);
    });

    return el;
  }

  /* ---------- عرض كل الإشعارات ---------- */
  function render(profile, transactions) {
    const container = document.getElementById('notifications');
    if (!container) return;

    container.innerHTML = '';

    const notifs = RULES
      .map((rule) => {
        try { return rule(profile, transactions); }
        catch (e) { console.error('Notif rule error:', e); return null; }
      })
      .filter((n) => n && !isDismissed(n.id));

    if (notifs.length === 0) return;

    notifs.forEach((n) => container.appendChild(renderOne(n)));
  }

  /* ---------- تصدير ---------- */
  window.NuqtaNotifications = {
    render: render,
    dismiss: dismiss,
    isDismissed: isDismissed
  };
})();
