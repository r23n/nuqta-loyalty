/* ============================================================
   dashboard.js — نسخة Supabase (async)
   ------------------------------------------------------------
   يقرأ بيانات المستخدم من Supabase ويعبّئ لوحة التحكم:
   - الاسم في الترحيب
   - الرصيد والمستوى
   - شريط التقدم للمستوى التالي
   - الإحصائيات
   - جدول المعاملات (فارغ للحساب الجديد)
   - يعيد التوجيه لـ login لو ما في جلسة
   ============================================================ */

(function () {
  'use strict';

  const TIER_THRESHOLDS = {
    bronze: { min: 0, next: 'silver', nextMin: 1000, labelKey: 'tier.bronze' },
    silver: { min: 1000, next: 'gold', nextMin: 5000, labelKey: 'tier.silver' },
    gold: { min: 5000, next: 'platinum', nextMin: 20000, labelKey: 'tier.gold' },
    platinum: { min: 20000, next: null, nextMin: null, labelKey: 'tier.platinum' }
  };

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
      ? window.Nuqta.getCurrentLang() : 'ar';
    return (translations[lang] && translations[lang][key]) || key;
  }

  function fmt(num) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
      ? window.Nuqta.getCurrentLang() : 'ar';
    const locale = (lang === 'ar') ? 'ar-EG' : 'en-US';
    return Number(num).toLocaleString(locale);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ---------- تعبئة العناصر ---------- */
  function fillBalance(profile) {
    const bal = document.getElementById('balanceNumber');
    if (bal) {
      bal.textContent = fmt(profile.points);
      bal.removeAttribute('data-counter');
    }
    const tierInfo = TIER_THRESHOLDS[profile.tier];
    const tierLabel = document.getElementById('tierLabel');
    if (tierLabel && tierInfo) {
      tierLabel.textContent = t(tierInfo.labelKey);
      // مهم: نحذف data-i18n بحيث لا يعيد applyTranslations() استبداله
      tierLabel.removeAttribute('data-i18n');
      tierLabel.dataset.i18nDynamic = tierInfo.labelKey; // نحفظه لإعادة الرسم عند تغيير اللغة
    }
  }

  // خريطة النجوم حسب المستوى
  const TIER_STARS = {
    bronze: '★',
    silver: '★★',
    gold: '★★★',
    platinum: '★★★★'
  };

  function fillProgress(profile) {
    const tierInfo = TIER_THRESHOLDS[profile.tier];
    if (!tierInfo) return;

    const currentTierEl = document.getElementById('progressCurrentTier');
    const nextTierEl = document.getElementById('progressNextTier');
    const fillEl = document.getElementById('dashProgressFill');
    const remainingEl = document.getElementById('remainingPoints');
    const remainingLabelEl = document.getElementById('remainingLabel');

    if (currentTierEl) {
      currentTierEl.innerHTML = `${t(tierInfo.labelKey)} <span class="tier-stars">${TIER_STARS[profile.tier]}</span>`;
      currentTierEl.removeAttribute('data-i18n');
    }

    if (tierInfo.next) {
      // المستوى التالي = نجوم المستوى التالي
      if (nextTierEl) {
        nextTierEl.innerHTML = `<span class="tier-stars">${TIER_STARS[tierInfo.next]}</span>`;
        nextTierEl.removeAttribute('data-i18n');
      }

      const span = tierInfo.nextMin - tierInfo.min;
      const gained = profile.points - tierInfo.min;
      const percent = Math.min(100, Math.max(0, (gained / span) * 100));
      const remaining = Math.max(0, tierInfo.nextMin - profile.points);

      if (fillEl) fillEl.dataset.progress = percent.toFixed(0);
      if (remainingEl) remainingEl.textContent = fmt(remaining) + ' ' + t('points.label');
      if (remainingLabelEl) {
        remainingLabelEl.textContent = t('dashboard.progress.remaining.to.' + tierInfo.next);
      }
    } else {
      // بلاتيني = ٤ نجوم (أعلى مستوى)
      if (nextTierEl) {
        nextTierEl.innerHTML = `<span class="tier-stars tier-stars--max">${TIER_STARS.platinum}</span>`;
        nextTierEl.removeAttribute('data-i18n');
      }
      if (fillEl) fillEl.dataset.progress = '100';
      if (remainingEl) remainingEl.textContent = '';
      if (remainingLabelEl) {
        remainingLabelEl.textContent = t('dashboard.progress.max');
        remainingLabelEl.removeAttribute('data-i18n');
      }
    }
  }

  function fillStats(profile, transactions) {
    // نقاط الشهر (آخر ٣٠ يوم)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const monthPoints = transactions
      .filter((tx) => new Date(tx.date).getTime() >= thirtyDaysAgo)
      .reduce((sum, tx) => sum + (tx.points || 0), 0);

    // المعاملات المستبدلة
    const redeemed = transactions.filter((tx) => tx.type === 'redeem').length;

    // قيمة الخصم (من المستبدلات)
    const saved = transactions
      .filter((tx) => tx.type === 'redeem')
      .reduce((sum, tx) => sum + (Number(tx.value) || 0), 0);

    // أيام الانضمام
    const days = window.NuqtaUser.daysSinceJoined(profile);

    setText('statEarned', fmt(monthPoints));
    setText('statRedeemed', fmt(redeemed));
    setText('statSaved', fmt(saved));
    setText('statDays', fmt(days));

    ['statEarned', 'statRedeemed', 'statSaved', 'statDays'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.removeAttribute('data-counter');
    });
  }

  function fillTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <h3 data-i18n="dashboard.empty.title">لا توجد معاملات بعد</h3>
          <p data-i18n="dashboard.empty.desc">ابدأ التسوّق من أحد المتاجر الشريكة لتظهر معاملاتك هنا.</p>
          <a href="index.html#rewards" class="btn btn-ghost btn-sm" data-i18n="dashboard.empty.cta">
            استكشف المتاجر الشريكة
          </a>
        </div>
      `;

      if (window.Nuqta && window.Nuqta.applyTranslations) {
        window.Nuqta.applyTranslations(window.Nuqta.getCurrentLang());
      }
      return;
    }

    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    ).slice(0, 5);

    container.innerHTML = sorted.map((tx) => `
      <div class="transaction">
        <div class="tx-store">
          <div class="tx-logo" data-no-translate>${tx.store_initial || '◆'}</div>
          <div>
            <div class="tx-name" data-no-translate dir="ltr">${tx.store}</div>
            <div class="tx-date">${new Date(tx.date).toLocaleDateString()}</div>
          </div>
        </div>
        <div class="tx-amount">${fmt(tx.amount)} <span>${t('calc.currency')}</span></div>
        <div class="tx-points">+${fmt(tx.points)}</div>
      </div>
    `).join('');
  }

  function fillWelcome(profile) {
    const name = window.NuqtaUser.firstName(profile);
    setText('welcomeName', name || '—');

    const tierInfo = TIER_THRESHOLDS[profile.tier];
    const year = window.NuqtaUser.joinedYear(profile);
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
      ? window.Nuqta.getCurrentLang() : 'ar';

    const yearStr = (lang === 'ar')
      ? String(year).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
      : String(year);

    const tierName = t(tierInfo.labelKey);
    const tpl = t('dashboard.member.since');
    const filled = tpl.replace('{tier}', tierName).replace('{year}', yearStr);
    setText('memberSince', filled);
  }

  function fillPlanBadge(profile) {
    const badge = document.getElementById('planBadge');
    if (!badge) return;

    if (profile.plan && profile.plan_active) {
      badge.textContent = t('pricing.' + profile.plan + '.name');
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  function wireLogout() {
    const btn = document.getElementById('btnLogout');
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.NuqtaUser.signOut();
      window.location.href = 'index.html';
    });
  }

  function animateProgressBars() {
    const bars = document.querySelectorAll('.dashboard-progress-fill');
    if (!bars.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          setTimeout(() => {
            bar.style.width = (bar.dataset.progress || '0') + '%';
          }, 200);
          observer.unobserve(bar);
        }
      });
    }, { threshold: 0.3 });

    bars.forEach((bar) => observer.observe(bar));
  }

  /* ---------- عرض التحدّيات النشطة ---------- */
  async function renderChallenges() {
    const container = document.getElementById('challengesSection');
    if (!container || !window.NuqtaChallenges) return;

    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
      ? window.Nuqta.getCurrentLang() : 'en';

    let challenges = [];
    try {
      challenges = await window.NuqtaChallenges.getAll();
    } catch (e) {
      console.error('Challenges load:', e);
    }

    // لو ما في تحدّيات، نستبدل الـ skeleton برسالة ودّية بدل الإخفاء
    if (!challenges || challenges.length === 0) {
      container.innerHTML = `
        <div class="panel-head">
          <h2 class="panel-title">${t('challenge.section.title')}</h2>
        </div>
        <div class="empty-state" style="padding:32px 20px">
          <div class="empty-icon">🎯</div>
          <p style="margin:0;color:var(--cream-dim);font-size:14px">
            ${t('challenge.none.active')}
          </p>
        </div>
      `;
      return;
    }

    const cards = challenges.map((ch) => {
      const title = lang === 'ar' ? ch.title_ar : ch.title_en;
      const desc = lang === 'ar' ? ch.desc_ar : ch.desc_en;
      const current = Number(ch.userProgress.progress || 0);
      const target = Number(ch.target);
      const percent = Math.min(100, Math.round((current / target) * 100));
      const isDone = ch.userProgress.completed;
      const unit = ch.type === 'spend' ? t('calc.currency') : '';

      return `
        <div class="challenge-card ${isDone ? 'challenge-card--done' : ''}">
          <div class="challenge-head">
            <div class="challenge-icon">${ch.icon || '🎯'}</div>
            <div class="challenge-info">
              <div class="challenge-title">${title}</div>
              <div class="challenge-desc">${desc || ''}</div>
            </div>
            <div class="challenge-reward">+${fmt(ch.reward_points)}</div>
          </div>
          <div class="challenge-progress-row">
            <div class="challenge-progress-bar">
              <div class="challenge-progress-fill" style="width:${percent}%"></div>
            </div>
            <div class="challenge-progress-text">
              ${fmt(current.toFixed(0))}/${fmt(target)} ${unit}
            </div>
          </div>
          ${isDone ? `<div class="challenge-done-tag">✓ ${t('challenge.done.label')}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="panel-head">
        <h2 class="panel-title">${t('challenge.section.title')}</h2>
        <p class="panel-sub">${t('challenge.section.sub')}</p>
      </div>
      <div class="challenges-grid">${cards}</div>
    `;
  }


  function watchLanguageChange(profile, transactions) {
    const observer = new MutationObserver(() => {
      fillBalance(profile);
      fillProgress(profile);
      fillStats(profile, transactions);
      fillWelcome(profile);
      fillPlanBadge(profile);
      fillTransactions(transactions);
      renderChallenges();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });
  }

  /* ---------- تهيئة (async) ---------- */
  async function init() {
    if (!document.querySelector('.dashboard-hero')) return;

    // التحقق من الجلسة
    const session = await window.NuqtaUser.getSession();
    if (!session) {
      // ما في جلسة → ارجع للصفحة الرئيسية
      window.location.href = 'index.html';
      return;
    }

    // قراءة بيانات المستخدم من Supabase
    const profile = await window.NuqtaUser.getProfile();
    if (!profile) {
      console.error('لم يتم العثور على profile');
      await window.NuqtaUser.signOut();
      window.location.href = 'signup.html';
      return;
    }

    // فرض اختيار الباقة (إلزامي)
    // لو المستخدم ما اختار باقة بعد، نوجّهه لصفحة الباقات
    if (!profile.plan || !profile.plan_active) {
      window.location.href = 'pricing.html?onboarding=1';
      return;
    }

    // قراءة المعاملات
    const transactions = await window.NuqtaUser.getTransactions();

    // تعبئة الواجهة
    fillWelcome(profile);
    fillBalance(profile);
    fillProgress(profile);
    fillStats(profile, transactions);
    fillTransactions(transactions);
    fillPlanBadge(profile);

    // عرض التحليلات الشخصية
    if (window.NuqtaAnalytics) {
      window.NuqtaAnalytics.render(transactions);
    }

    // عرض التحدّيات النشطة
    if (window.NuqtaChallenges) {
      renderChallenges();
      // نفحص التقدم ونحتفل بالمكتمل (مع تأخير بعد الأوسمة)
      setTimeout(() => {
        window.NuqtaChallenges.checkAndCelebrate(transactions);
      }, 3500);
    }

    // عرض الإشعارات الذكية
    if (window.NuqtaNotifications) {
      window.NuqtaNotifications.render(profile, transactions);
    }

    wireLogout();
    animateProgressBars();
    watchLanguageChange(profile, transactions);

    // فحص الأوسمة (welcome, tier_*, loyal_month)
    // نأخذ تأخير بسيط ليُحمّل الـ UI أولاً
    if (window.NuqtaAchievements) {
      setTimeout(() => {
        window.NuqtaAchievements.checkAndCelebrate(profile, transactions);
      }, 1500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
