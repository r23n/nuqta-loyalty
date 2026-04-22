/* ============================================================
   analytics.js — تحليلات شخصية للعميل
   ------------------------------------------------------------
   يحلّل معاملات العميل ويعرض إحصائيات مفيدة:
   - أكثر متجر زُرت
   - متوسط الإنفاق الشهري
   - عدد المعاملات
   - نسبة المعاملات حسب الفئة
   ============================================================ */

(function () {
  'use strict';

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

  /* ---------- حساب الإحصائيات ---------- */
  function computeAnalytics(transactions) {
    const earnTxs = transactions.filter((tx) => tx.type === 'earn');

    if (earnTxs.length === 0) {
      return null;
    }

    // أكثر متجر
    const storeCount = {};
    earnTxs.forEach((tx) => {
      const key = tx.store || 'Unknown';
      storeCount[key] = (storeCount[key] || 0) + 1;
    });
    const topStore = Object.entries(storeCount)
      .sort((a, b) => b[1] - a[1])[0];

    // مجموع الإنفاق
    const totalSpent = earnTxs.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

    // متوسط الإنفاق لكل معاملة
    const avgSpent = totalSpent / earnTxs.length;

    // مجموع النقاط المكتسبة
    const totalEarned = earnTxs.reduce((sum, tx) => sum + (tx.points || 0), 0);

    // معاملات هذا الشهر
    const now = new Date();
    const thisMonth = earnTxs.filter((tx) => {
      const d = new Date(tx.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      totalTxs: earnTxs.length,
      topStore: topStore[0],
      topStoreCount: topStore[1],
      totalSpent: totalSpent,
      avgSpent: avgSpent,
      totalEarned: totalEarned,
      thisMonthCount: thisMonth.length
    };
  }

  /* ---------- بناء البطاقة ---------- */
  function render(transactions) {
    const container = document.getElementById('analyticsSection');
    if (!container) return;

    const stats = computeAnalytics(transactions);

    // لو ما في معاملات، نعرض حالة تشجيعية بدل الإخفاء
    if (!stats) {
      container.classList.remove('dash-sub-section--hidden');
      container.innerHTML = `
        <div class="panel-head">
          <h2 class="panel-title">${t('analytics.title')}</h2>
          <p class="panel-sub">${t('analytics.sub')}</p>
        </div>
        <div class="empty-state" style="padding:40px 20px">
          <div class="empty-icon">📊</div>
          <h3>${t('analytics.empty.title')}</h3>
          <p>${t('analytics.empty.desc')}</p>
        </div>
      `;
      return;
    }

    container.classList.remove('dash-sub-section--hidden');

    container.innerHTML = `
      <div class="panel-head">
        <h2 class="panel-title" data-i18n="analytics.title">Your insights</h2>
        <p class="panel-sub" data-i18n="analytics.sub">A quick look at your shopping habits</p>
      </div>

      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-icon">🏪</div>
          <div class="analytics-label" data-i18n="analytics.top.store">Favorite store</div>
          <div class="analytics-value" data-no-translate dir="ltr">${stats.topStore}</div>
          <div class="analytics-meta">
            <span>${fmt(stats.topStoreCount)}</span> <span data-i18n="analytics.visits">visits</span>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-icon">💰</div>
          <div class="analytics-label" data-i18n="analytics.total.spent">Total spent</div>
          <div class="analytics-value">
            ${fmt(stats.totalSpent.toFixed(0))}
            <span class="analytics-unit" data-i18n="calc.currency">BHD</span>
          </div>
          <div class="analytics-meta">
            <span data-i18n="analytics.avg">Avg.</span> ${fmt(stats.avgSpent.toFixed(1))} <span data-i18n="calc.currency">BHD</span>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-icon">⚡</div>
          <div class="analytics-label" data-i18n="analytics.total.earned">Points earned</div>
          <div class="analytics-value analytics-value--gold">${fmt(stats.totalEarned)}</div>
          <div class="analytics-meta">
            <span data-i18n="analytics.from">from</span>
            <span>${fmt(stats.totalTxs)}</span>
            <span data-i18n="analytics.txs">transactions</span>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-icon">📅</div>
          <div class="analytics-label" data-i18n="analytics.this.month">This month</div>
          <div class="analytics-value">${fmt(stats.thisMonthCount)}</div>
          <div class="analytics-meta" data-i18n="analytics.txs.count">transactions</div>
        </div>
      </div>
    `;

    if (window.Nuqta && window.Nuqta.applyTranslations) {
      window.Nuqta.applyTranslations(window.Nuqta.getCurrentLang());
    }
  }

  window.NuqtaAnalytics = { render };
})();
