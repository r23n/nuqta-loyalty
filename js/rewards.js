/* ============================================================
   rewards.js — صفحة المكافآت والاستبدال
   ------------------------------------------------------------
   - يعرض كتالوج المكافآت
   - يحسب إن كان العميل يستطيع استبدال كل مكافأة
   - يعالج الاستبدال → يعرض كود فريد
   - يعرض تاريخ الاستبدالات السابقة
   ============================================================ */

(function () {
  'use strict';

  /* ---------- كتالوج المكافآت ---------- */
  const REWARDS = [
    {
      id: 'lilou-5bhd',
      title: 'Lilou — 5 BHD Coupon',
      desc: 'Enjoy 5 BHD off your next order at Lilou',
      cost: 500,
      value: 5,
      category: 'food',
      icon: '☕',
      featured: true
    },
    {
      id: 'villa-mamas-dinner',
      title: 'Villa Mamas — Dinner for Two',
      desc: 'A romantic dinner experience at Villa Mamas',
      cost: 2500,
      value: 30,
      category: 'experiences',
      icon: '🍽️',
      featured: true
    },
    {
      id: 'haji-gahwa-breakfast',
      title: 'Haji Gahwa — Traditional Breakfast',
      desc: 'Bahraini traditional breakfast for two',
      cost: 800,
      value: 10,
      category: 'food',
      icon: '🍵'
    },
    {
      id: 'saffron-lunch',
      title: 'Saffron — Lunch Voucher',
      desc: '15 BHD lunch voucher at Saffron',
      cost: 1500,
      value: 15,
      category: 'food',
      icon: '🍛'
    },
    {
      id: 'mad-monkey-coffee',
      title: 'Mad Monkey — Coffee & Cake',
      desc: 'Coffee and cake combo at Mad Monkey',
      cost: 400,
      value: 4,
      category: 'food',
      icon: '🍰'
    },
    {
      id: 'masso-pizza',
      title: 'Masso — Pizza for Two',
      desc: 'Authentic Italian pizza at Masso',
      cost: 1200,
      value: 12,
      category: 'food',
      icon: '🍕'
    },
    {
      id: 'cantina-kahlo',
      title: 'Cantina Kahlo — Mexican Night',
      desc: 'Complete Mexican dinner for two',
      cost: 1800,
      value: 20,
      category: 'experiences',
      icon: '🌮'
    },
    {
      id: 'cocos-family',
      title: "Coco's — Family Bundle",
      desc: 'Family meal bundle at Coco\'s',
      cost: 2000,
      value: 22,
      category: 'food',
      icon: '🥘'
    },
    {
      id: 'spa-day',
      title: 'Wellness — Spa Day',
      desc: 'Relaxing spa day at a luxury hotel',
      cost: 5000,
      value: 60,
      category: 'experiences',
      icon: '💆'
    },
    {
      id: 'shopping-50',
      title: 'Shopping — 50 BHD Voucher',
      desc: 'Universal shopping voucher',
      cost: 4500,
      value: 50,
      category: 'shopping',
      icon: '🛍️'
    },
    {
      id: 'movie-tickets',
      title: 'Cinema — 4 Movie Tickets',
      desc: 'Family of 4 movie night',
      cost: 1600,
      value: 16,
      category: 'experiences',
      icon: '🎬'
    },
    {
      id: 'weekend-getaway',
      title: 'Travel — Weekend Getaway',
      desc: 'Weekend stay at a beach resort',
      cost: 15000,
      value: 200,
      category: 'travel',
      icon: '✈️'
    }
  ];

  let currentProfile = null;
  let currentFilter = 'all';

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    return (translations[lang] && translations[lang][key]) || key;
  }

  function fmt(num) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    const locale = (lang === 'ar') ? 'ar-EG' : 'en-US';
    return Number(num).toLocaleString(locale);
  }

  /* ---------- عرض الرصيد ---------- */
  function renderBalance() {
    const el = document.getElementById('balanceNumber');
    if (el && currentProfile) {
      el.textContent = fmt(currentProfile.points);
    }
  }

  /* ---------- بناء بطاقة مكافأة ---------- */
  function buildCard(reward) {
    const affordable = currentProfile && currentProfile.points >= reward.cost;
    const shortfall = affordable ? 0 : reward.cost - (currentProfile?.points || 0);

    const card = document.createElement('article');
    card.className = `reward-item ${reward.featured ? 'reward-item--featured' : ''} ${!affordable ? 'reward-item--locked' : ''}`;
    card.dataset.category = reward.category;

    card.innerHTML = `
      ${reward.featured ? `<div class="reward-badge-small">${t('rewards.popular')}</div>` : ''}
      <div class="reward-emoji">${reward.icon}</div>
      <h3 class="reward-item-title" data-no-translate dir="ltr">${reward.title}</h3>
      <p class="reward-item-desc" data-no-translate dir="ltr">${reward.desc}</p>

      <div class="reward-cost-row">
        <div class="reward-cost-num">
          <strong>${fmt(reward.cost)}</strong>
          <span>${t('points.label')}</span>
        </div>
        <div class="reward-cost-value">
          ${t('rewards.worth')} ${fmt(reward.value)} ${t('calc.currency')}
        </div>
      </div>

      ${affordable
        ? `<button class="btn btn-primary btn-full btn-sm reward-redeem-btn" data-reward-id="${reward.id}">${t('rewards.redeem')}</button>`
        : `<button class="btn btn-ghost btn-full btn-sm" disabled>${t('rewards.need.more').replace('{n}', fmt(shortfall))}</button>`
      }
    `;

    // ربط الزر
    const btn = card.querySelector('.reward-redeem-btn');
    if (btn) btn.addEventListener('click', () => handleRedeem(reward));

    return card;
  }

  /* ---------- عرض الكتالوج ---------- */
  function renderCatalog() {
    const container = document.getElementById('rewardsCatalog');
    if (!container) return;

    container.innerHTML = '';

    const filtered = REWARDS.filter((r) =>
      currentFilter === 'all' || r.category === currentFilter
    );

    filtered.forEach((reward) => container.appendChild(buildCard(reward)));

    if (filtered.length === 0) {
      container.innerHTML = `<p class="empty-msg" data-i18n="rewards.empty.filter">No rewards in this category yet.</p>`;
    }
  }

  /* ---------- معالجة الاستبدال ---------- */
  async function handleRedeem(reward) {
    if (!currentProfile) return;

    // تأكيد من المستخدم
    const confirmed = confirm(
      t('rewards.confirm.msg')
        .replace('{title}', reward.title)
        .replace('{cost}', fmt(reward.cost))
    );

    if (!confirmed) return;

    try {
      const result = await window.NuqtaUser.redeemReward({
        rewardTitle: reward.title,
        rewardDesc: reward.desc,
        cost: reward.cost,
        value: reward.value,
        category: reward.category
      });

      // تحديث الرصيد محلياً
      currentProfile.points -= reward.cost;

      // Toast مع الكود
      Toast.success(
        t('rewards.success').replace('{code}', result.code),
        { duration: 8000 }
      );

      // تحديث الواجهة
      renderBalance();
      renderCatalog();
      loadMyRedemptions();

      // فحص الأوسمة الجديدة (first_redeem, big_spender, collector...)
      if (window.NuqtaAchievements) {
        const freshProfile = await window.NuqtaUser.getProfile();
        const freshTxs = await window.NuqtaUser.getTransactions();
        // تأخير بسيط ليُشاهد المستخدم Toast الاستبدال أولاً
        setTimeout(() => {
          window.NuqtaAchievements.checkAndCelebrate(freshProfile, freshTxs);
        }, 2000);
      }

    } catch (err) {
      console.error('Redeem error:', err);
      if (err.code === 'INSUFFICIENT_POINTS') {
        Toast.error(t('rewards.err.insufficient'));
      } else {
        Toast.error(t('rewards.err.generic'));
      }
    }
  }

  /* ---------- تحميل الاستبدالات السابقة ---------- */
  async function loadMyRedemptions() {
    const container = document.getElementById('myRedemptions');
    if (!container) return;

    const all = await window.NuqtaUser.getTransactions();
    const redemptions = all.filter((tx) => tx.type === 'redeem');

    if (redemptions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎁</div>
          <h3 data-i18n="rewards.history.empty.title">No redemptions yet</h3>
          <p data-i18n="rewards.history.empty.desc">Browse the catalog above to redeem your first reward!</p>
        </div>
      `;
      if (window.Nuqta && window.Nuqta.applyTranslations) {
        window.Nuqta.applyTranslations(window.Nuqta.getCurrentLang());
      }
      return;
    }

    container.innerHTML = '<div class="redemptions-list"></div>';
    const list = container.querySelector('.redemptions-list');

    redemptions.slice(0, 10).forEach((tx) => {
      const item = document.createElement('div');
      item.className = 'redemption-item';
      const date = new Date(tx.date).toLocaleDateString();
      item.innerHTML = `
        <div class="redemption-info">
          <div class="redemption-title" data-no-translate dir="ltr">${tx.store}</div>
          <div class="redemption-date">${date}</div>
        </div>
        ${tx.code
          ? `<div class="redemption-code" data-no-translate dir="ltr" title="${t('rewards.code.tooltip')}">${tx.code}</div>`
          : ''
        }
        <div class="redemption-points">-${fmt(tx.points)}</div>
      `;
      list.appendChild(item);
    });
  }

  /* ---------- الفلاتر ---------- */
  function wireFilters() {
    document.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        currentFilter = btn.dataset.filter;
        renderCatalog();
      });
    });
  }

  /* ---------- تحديث عند تغيير اللغة ---------- */
  function watchLanguageChange() {
    const observer = new MutationObserver(() => {
      renderBalance();
      renderCatalog();
      loadMyRedemptions();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });
  }

  /* ---------- تهيئة ---------- */
  async function init() {
    if (!document.getElementById('rewardsCatalog')) return;

    // تحقق الجلسة
    const session = await window.NuqtaUser.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    // قراءة profile
    currentProfile = await window.NuqtaUser.getProfile();
    if (!currentProfile) {
      Toast.error(t('login.err.generic'));
      return;
    }

    // فرض اختيار الباقة
    if (!currentProfile.plan || !currentProfile.plan_active) {
      window.location.href = 'pricing.html?onboarding=1';
      return;
    }

    renderBalance();
    renderCatalog();
    loadMyRedemptions();
    wireFilters();
    watchLanguageChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
