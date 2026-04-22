/* ============================================================
   challenges.js — نظام التحدّيات الشهرية
   ------------------------------------------------------------
   - يجلب التحدّيات النشطة من جدول challenges
   - يحسب تقدم العميل في كل تحدي (بناء على معاملاته)
   - يحفظ التقدم في جدول user_challenges
   - يمنح المكافأة عند الإكمال
   ============================================================ */

(function () {
  'use strict';

  function sb() {
    if (!window.sb) throw new Error('Supabase not ready');
    return window.sb;
  }

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    return (translations[lang] && translations[lang][key]) || key;
  }

  /* ---------- جلب التحدّيات النشطة ---------- */
  async function getActiveChallenges() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await sb()
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .or(`active_to.is.null,active_to.gte.${today}`);

    if (error) {
      console.error('getActiveChallenges:', error);
      return [];
    }

    return data || [];
  }

  /* ---------- جلب تقدم المستخدم ---------- */
  async function getUserProgress() {
    const session = await window.NuqtaUser.getSession();
    if (!session) return [];

    const { data, error } = await sb()
      .from('user_challenges')
      .select('*')
      .eq('user_id', session.user.id);

    return error ? [] : (data || []);
  }

  /* ---------- حساب التقدم في تحدي ---------- */
  function calcProgress(challenge, transactions) {
    // نحدّد الفترة النشطة للتحدي
    const fromDate = challenge.active_from
      ? new Date(challenge.active_from)
      : new Date(0);

    const relevantTxs = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= fromDate;
    });

    switch (challenge.type) {
      case 'spend':
        return relevantTxs
          .filter((tx) => tx.type === 'earn')
          .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

      case 'count':
        return relevantTxs.filter((tx) => tx.type === 'earn').length;

      case 'redeem':
        return relevantTxs.filter((tx) => tx.type === 'redeem').length;

      default:
        return 0;
    }
  }

  /* ---------- تحديث تقدم تحدي في قاعدة البيانات ---------- */
  async function updateUserProgress(challengeKey, progress, completed) {
    const session = await window.NuqtaUser.getSession();
    if (!session) return;

    const data = {
      user_id: session.user.id,
      challenge_key: challengeKey,
      progress: progress,
      completed: completed,
      updated_at: new Date().toISOString()
    };

    if (completed) {
      data.completed_at = new Date().toISOString();
    }

    // Upsert
    const { error } = await sb()
      .from('user_challenges')
      .upsert(data, { onConflict: 'user_id,challenge_key' });

    if (error) console.error('updateUserProgress:', error);
  }

  /* ---------- منح مكافأة التحدي عند الاكتمال ---------- */
  async function grantReward(challenge) {
    const session = await window.NuqtaUser.getSession();
    if (!session) return;

    try {
      await window.NuqtaUser.addTransaction({
        store: 'Challenge completed',
        storeInitial: '🏁',
        amount: 0,
        points: challenge.reward_points,
        type: 'earn',
        category: 'challenge',
        note: 'Reward for: ' + challenge.key
      });
    } catch (e) {
      console.error('grantReward:', e);
    }
  }

  /* ---------- الفحص الرئيسي: يُنادى من Dashboard ---------- */
  async function checkAndUpdate(transactions) {
    const challenges = await getActiveChallenges();
    if (challenges.length === 0) return [];

    const userProgress = await getUserProgress();
    const progressMap = {};
    userProgress.forEach((p) => { progressMap[p.challenge_key] = p; });

    const newlyCompleted = [];

    for (const challenge of challenges) {
      const current = calcProgress(challenge, transactions || []);
      const existing = progressMap[challenge.key];

      // لو مكتمل مسبقاً، تخطاه
      if (existing && existing.completed) continue;

      const isNowComplete = current >= challenge.target;

      // حدّث التقدم في DB
      await updateUserProgress(challenge.key, current, isNowComplete);

      // لو اكتمل الآن، امنح المكافأة
      if (isNowComplete && (!existing || !existing.completed)) {
        await grantReward(challenge);
        newlyCompleted.push(challenge);
      }
    }

    return newlyCompleted;
  }

  /* ---------- احتفال عند اكتمال تحدي ---------- */
  function celebrate(challenge) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    const title = lang === 'ar' ? challenge.title_ar : challenge.title_en;

    if (window.Toast) {
      window.Toast.success(
        `${challenge.icon} ${t('challenge.done')}: ${title} (+${challenge.reward_points})`,
        { duration: 7000 }
      );
    }

    if (window.NuqtaConfetti) {
      window.NuqtaConfetti.burst({ count: 80 });
    }
  }

  async function checkAndCelebrate(transactions) {
    const completed = await checkAndUpdate(transactions);
    completed.forEach((ch, i) => {
      setTimeout(() => celebrate(ch), i * 2000);
    });
    return completed;
  }

  /* ---------- جلب البيانات الكاملة للعرض ---------- */
  async function getAll() {
    const challenges = await getActiveChallenges();
    const progress = await getUserProgress();
    const progressMap = {};
    progress.forEach((p) => { progressMap[p.challenge_key] = p; });

    return challenges.map((ch) => ({
      ...ch,
      userProgress: progressMap[ch.key] || { progress: 0, completed: false }
    }));
  }

  window.NuqtaChallenges = {
    getAll,
    checkAndUpdate,
    checkAndCelebrate,
    calcProgress
  };
})();
