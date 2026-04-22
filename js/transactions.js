/* ============================================================
   transactions.js — صفحة تاريخ المعاملات الكاملة
   ------------------------------------------------------------
   - يعرض كل معاملات المستخدم
   - فلاتر: نوع + بحث نصّي
   - Pagination بـ "Load more"
   ============================================================ */

(function () {
  'use strict';

  const PAGE_SIZE = 20;

  let allTransactions = [];
  let displayCount = PAGE_SIZE;
  let currentTypeFilter = 'all';
  let currentSearch = '';

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

  /* ---------- الفلترة ---------- */
  function getFiltered() {
    let list = allTransactions;

    // فلتر النوع
    if (currentTypeFilter !== 'all') {
      list = list.filter((tx) => tx.type === currentTypeFilter);
    }

    // البحث
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      list = list.filter((tx) =>
        (tx.store || '').toLowerCase().includes(q) ||
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.code || '').toLowerCase().includes(q)
      );
    }

    return list;
  }

  /* ---------- حساب الملخّص ---------- */
  function renderSummary() {
    const earnSum = allTransactions
      .filter((tx) => tx.type === 'earn')
      .reduce((s, tx) => s + (tx.points || 0), 0);

    const redeemSum = allTransactions
      .filter((tx) => tx.type === 'redeem')
      .reduce((s, tx) => s + (tx.points || 0), 0);

    document.getElementById('sumEarned').textContent = '+' + fmt(earnSum);
    document.getElementById('sumRedeemed').textContent = '-' + fmt(redeemSum);
    document.getElementById('sumCount').textContent = fmt(allTransactions.length);
  }

  /* ---------- عرض معاملة واحدة ---------- */
  function buildItem(tx) {
    const item = document.createElement('div');
    item.className = `tx-item tx-item--${tx.type}`;

    const date = new Date(tx.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const sign = tx.type === 'earn' ? '+' : '-';

    item.innerHTML = `
      <div class="tx-item-icon">${tx.store_initial || (tx.type === 'earn' ? '🛍️' : '🎁')}</div>
      <div class="tx-item-main">
        <div class="tx-item-store" data-no-translate dir="ltr">${tx.store || 'Unknown'}</div>
        <div class="tx-item-meta">
          <span class="tx-item-date">${dateStr} · ${timeStr}</span>
          ${tx.code ? `<span class="tx-item-code" data-no-translate dir="ltr">${tx.code}</span>` : ''}
          ${tx.amount && parseFloat(tx.amount) > 0 ? `<span class="tx-item-amount">${fmt(tx.amount)} ${t('calc.currency')}</span>` : ''}
        </div>
      </div>
      <div class="tx-item-points tx-item-points--${tx.type}">
        ${sign}${fmt(tx.points || 0)}
      </div>
    `;

    return item;
  }

  /* ---------- عرض القائمة ---------- */
  function render() {
    const list = document.getElementById('txList');
    if (!list) return;

    const filtered = getFiltered();
    const visible = filtered.slice(0, displayCount);

    if (visible.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3 data-i18n="tx.empty.title">No transactions found</h3>
          <p data-i18n="tx.empty.desc">Try adjusting your filters or search terms.</p>
        </div>
      `;
      document.getElementById('txLoadMoreWrap').style.display = 'none';
      if (window.Nuqta && window.Nuqta.applyTranslations) {
        window.Nuqta.applyTranslations(window.Nuqta.getCurrentLang());
      }
      return;
    }

    list.innerHTML = '<div class="tx-list-wrap"></div>';
    const wrap = list.querySelector('.tx-list-wrap');
    visible.forEach((tx) => wrap.appendChild(buildItem(tx)));

    // زر "المزيد"
    const loadMoreWrap = document.getElementById('txLoadMoreWrap');
    if (filtered.length > displayCount) {
      loadMoreWrap.style.display = '';
    } else {
      loadMoreWrap.style.display = 'none';
    }
  }

  /* ---------- ربط الفلاتر ---------- */
  function wireFilters() {
    // نوع
    document.querySelectorAll('[data-filter-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter-type]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        currentTypeFilter = btn.dataset.filterType;
        displayCount = PAGE_SIZE;
        render();
      });
    });

    // بحث (مع debounce بسيط)
    const searchEl = document.getElementById('txSearch');
    let searchTimer;
    searchEl.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = e.target.value.trim();
        displayCount = PAGE_SIZE;
        render();
      }, 200);
    });

    // Load more
    const loadMoreBtn = document.getElementById('txLoadMore');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        displayCount += PAGE_SIZE;
        render();
      });
    }
  }

  /* ---------- تغيير اللغة ---------- */
  function watchLanguageChange() {
    const observer = new MutationObserver(() => {
      renderSummary();
      render();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });
  }

  /* ---------- تهيئة ---------- */
  async function init() {
    if (!document.getElementById('txList')) return;

    const session = await window.NuqtaUser.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    // فرض اختيار الباقة
    const profile = await window.NuqtaUser.getProfile();
    if (profile && (!profile.plan || !profile.plan_active)) {
      window.location.href = 'pricing.html?onboarding=1';
      return;
    }

    // نحمّل كل المعاملات (بدون limit)
    allTransactions = await window.NuqtaUser.getTransactions();

    renderSummary();
    render();
    wireFilters();
    watchLanguageChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
