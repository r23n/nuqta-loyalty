/* ============================================================
   home-auth.js — ملء Hero الديناميكي للمستخدم المسجّل
   ------------------------------------------------------------
   يعرض: الاسم، الرصيد، المستوى، عدد الأوسمة
   اقتراح ذكي حسب الحالة (قريب من المستوى التالي، لديك مكافآت، إلخ)
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

  const TIER_THRESHOLDS = {
    bronze:   { next: 'silver',   at: 1000 },
    silver:   { next: 'gold',     at: 5000 },
    gold:     { next: 'platinum', at: 20000 },
    platinum: null
  };

  /* اقتراح ذكي حسب حالة العميل */
  function smartSuggestion(profile, badgeCount) {
    const tierInfo = TIER_THRESHOLDS[profile.tier];

    // قريب جداً من المستوى التالي؟
    if (tierInfo) {
      const remaining = tierInfo.at - profile.points;
      if (remaining > 0 && remaining <= 500) {
        return t('home.member.suggest.near')
          .replace('{n}', fmt(remaining))
          .replace('{tier}', t('tier.' + tierInfo.next));
      }
    }

    // فيه نقاط لاستبدال أول مكافأة (400+)
    if (profile.points >= 400) {
      return t('home.member.suggest.redeem');
    }

    // جديد ونقاطه قليلة؟
    if (profile.points < 400) {
      return t('home.member.suggest.earn');
    }

    return t('home.member.sub');
  }

  async function init() {
    const heroMember = document.getElementById('heroMember');
    const heroGuest = document.getElementById('heroGuest');
    if (!heroMember) return;

    if (!window.NuqtaUser) return;

    const session = await window.NuqtaUser.getSession();
    if (!session) {
      // زائر → نخفي member hero ونظهر guest hero (الافتراضي)
      heroMember.style.display = 'none';
      if (heroGuest) heroGuest.style.display = '';
      return;
    }

    const profile = await window.NuqtaUser.getProfile();
    if (!profile) return;

    // نعرض member hero ونخفي guest hero
    heroMember.style.display = '';
    if (heroGuest) heroGuest.style.display = 'none';

    // الاسم (أول كلمة من الاسم)
    const firstName = window.NuqtaUser.firstName(profile) || '—';
    document.getElementById('memberFirstName').textContent = firstName;

    // الرصيد
    document.getElementById('memberPoints').textContent = fmt(profile.points);

    // المستوى
    document.getElementById('memberTierName').textContent = t('tier.' + profile.tier);
    document.getElementById('memberTierBadge').textContent = t('tier.medal.' + profile.tier);

    // الأوسمة
    let badgeCount = 0;
    if (window.NuqtaAchievements) {
      try {
        const earned = await window.NuqtaAchievements.getEarned();
        badgeCount = earned.length;
      } catch (e) { /* ignore */ }
    }
    document.getElementById('memberBadgeCount').textContent = fmt(badgeCount);

    // الاقتراح الذكي
    const suggestionEl = document.getElementById('memberSuggestion');
    if (suggestionEl) {
      suggestionEl.textContent = smartSuggestion(profile, badgeCount);
      suggestionEl.removeAttribute('data-i18n'); // نمنع i18n من استبدالها
    }

    // إعادة تطبيق الترجمات للعناصر الجديدة
    if (window.Nuqta && window.Nuqta.applyTranslations) {
      window.Nuqta.applyTranslations(window.Nuqta.getCurrentLang());
    }

    // إعادة الرسم عند تغيير اللغة (tier name يعتمد على اللغة)
    const observer = new MutationObserver(() => {
      const newLang = (window.Nuqta && window.Nuqta.getCurrentLang)
                      ? window.Nuqta.getCurrentLang() : 'en';
      document.getElementById('memberPoints').textContent = fmt(profile.points);
      document.getElementById('memberTierName').textContent = t('tier.' + profile.tier);
      document.getElementById('memberTierBadge').textContent = t('tier.medal.' + profile.tier);
      if (suggestionEl) {
        suggestionEl.textContent = smartSuggestion(profile, badgeCount);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
