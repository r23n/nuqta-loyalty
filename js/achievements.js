/* ============================================================
   achievements.js — نظام الأوسمة
   ------------------------------------------------------------
   يفحص شروط الأوسمة ويمنحها تلقائياً للمستخدم.
   كل وسام يُحفظ في جدول achievements في Supabase.

   كيف يعمل:
   1. بعد أي عملية مهمة (استبدال، زيادة نقاط، ترقية مستوى)
      نستدعي checkAll(profile, transactions)
   2. كل rule تفحص الشرط وترجع true/false
   3. لو الوسام جديد، يُضاف للقاعدة ويُعرض toast + confetti
   ============================================================ */

(function () {
  'use strict';

  /* ---------- تعريف الأوسمة ---------- */
  const BADGES = [
    {
      key: 'welcome',
      icon: '👋',
      titleKey: 'badge.welcome.title',
      descKey: 'badge.welcome.desc',
      check: (profile) => true  // يُمنح فور إنشاء الحساب
    },
    {
      key: 'first_redeem',
      icon: '🎁',
      titleKey: 'badge.first_redeem.title',
      descKey: 'badge.first_redeem.desc',
      check: (profile, txs) => txs.some((tx) => tx.type === 'redeem')
    },
    {
      key: 'big_spender',
      icon: '💎',
      titleKey: 'badge.big_spender.title',
      descKey: 'badge.big_spender.desc',
      check: (profile, txs) => {
        const redeemed = txs.filter((tx) => tx.type === 'redeem')
          .reduce((sum, tx) => sum + (tx.points || 0), 0);
        return redeemed >= 2000;
      }
    },
    {
      key: 'tier_silver',
      icon: '🥈',
      titleKey: 'badge.tier_silver.title',
      descKey: 'badge.tier_silver.desc',
      check: (profile) => ['silver', 'gold', 'platinum'].includes(profile.tier)
    },
    {
      key: 'tier_gold',
      icon: '🥇',
      titleKey: 'badge.tier_gold.title',
      descKey: 'badge.tier_gold.desc',
      check: (profile) => ['gold', 'platinum'].includes(profile.tier)
    },
    {
      key: 'tier_platinum',
      icon: '👑',
      titleKey: 'badge.tier_platinum.title',
      descKey: 'badge.tier_platinum.desc',
      check: (profile) => profile.tier === 'platinum'
    },
    {
      key: 'collector',
      icon: '🏆',
      titleKey: 'badge.collector.title',
      descKey: 'badge.collector.desc',
      check: (profile, txs) => txs.filter((tx) => tx.type === 'redeem').length >= 5
    },
    {
      key: 'loyal_month',
      icon: '📅',
      titleKey: 'badge.loyal_month.title',
      descKey: 'badge.loyal_month.desc',
      check: (profile) => {
        if (!profile.created_at) return false;
        const days = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000*60*60*24));
        return days >= 30;
      }
    }
  ];

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    return (translations[lang] && translations[lang][key]) || key;
  }

  function sb() {
    if (!window.sb) throw new Error('Supabase not ready');
    return window.sb;
  }

  /* ---------- قراءة الأوسمة الممنوحة ---------- */
  async function getEarned() {
    const session = await window.NuqtaUser.getSession();
    if (!session) return [];

    const { data, error } = await sb()
      .from('achievements')
      .select('*')
      .eq('user_id', session.user.id)
      .order('earned_at', { ascending: false });

    return error ? [] : (data || []);
  }

  /* ---------- منح وسام ---------- */
  async function grant(badgeKey) {
    const session = await window.NuqtaUser.getSession();
    if (!session) return false;

    // unique constraint سيمنع التكرار — لو كان موجود يُرجع خطأ هادئ
    const { error } = await sb()
      .from('achievements')
      .insert({
        user_id: session.user.id,
        badge_key: badgeKey
      });

    // لو الخطأ duplicate (23505)، تجاهله
    if (error && error.code !== '23505') {
      console.error('Grant error:', error);
      return false;
    }

    return !error;
  }

  /* ---------- فحص كل الأوسمة ومنح الجديد ---------- */
  // يُرجع قائمة الأوسمة الجديدة (لعرض احتفال)
  async function checkAll(profile, transactions) {
    if (!profile) return [];

    const earned = await getEarned();
    const earnedKeys = new Set(earned.map((a) => a.badge_key));

    const newlyEarned = [];

    for (const badge of BADGES) {
      if (earnedKeys.has(badge.key)) continue;

      try {
        if (badge.check(profile, transactions || [])) {
          const success = await grant(badge.key);
          if (success) newlyEarned.push(badge);
        }
      } catch (e) {
        console.error('Badge check error:', badge.key, e);
      }
    }

    return newlyEarned;
  }

  /* ---------- احتفال (toast + confetti + صوت) ---------- */
  function celebrate(badge) {
    // Toast احتفالي
    if (window.Toast) {
      window.Toast.success(
        `${badge.icon} ${t('badge.earned')}: ${t(badge.titleKey)}`,
        { duration: 6000 }
      );
    }

    // Confetti
    if (window.NuqtaConfetti) {
      window.NuqtaConfetti.burst();
    }
  }

  async function checkAndCelebrate(profile, transactions) {
    const newBadges = await checkAll(profile, transactions);

    // نعرض احتفال واحد لكل وسام جديد (بفاصل زمني)
    newBadges.forEach((badge, i) => {
      setTimeout(() => celebrate(badge), i * 1500);
    });

    return newBadges;
  }

  /* ---------- اجلب التعريف بالـ key ---------- */
  function getBadgeDefinition(key) {
    return BADGES.find((b) => b.key === key);
  }

  /* ---------- تصدير ---------- */
  window.NuqtaAchievements = {
    BADGES: BADGES,
    getEarned: getEarned,
    checkAll: checkAll,
    checkAndCelebrate: checkAndCelebrate,
    getBadgeDefinition: getBadgeDefinition,
    celebrate: celebrate
  };
})();
