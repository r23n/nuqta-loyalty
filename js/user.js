/* ============================================================
   user.js — نسخة Supabase (async)
   ------------------------------------------------------------
   يحلّ محل النسخة القديمة المبنية على localStorage.
   كل الدوال async الآن (يجب استخدام await).

   البنية في Supabase:
   - auth.users: الحسابات (بريد + كلمة سر مشفّرة)
   - public.profiles: البيانات الإضافية (اسم، نقاط، مستوى، باقة)
   - public.transactions: المعاملات

   التعيين: profiles.id = auth.users.id (UUID)
   ============================================================ */

(function () {
  'use strict';

  function sb() {
    if (!window.sb) {
      throw new Error('Supabase client غير مهيّأ');
    }
    return window.sb;
  }

  /* ============================================================
     Session & Auth
     ============================================================ */

  // هل المستخدم مسجّل دخول؟
  async function getSession() {
    try {
      const { data } = await sb().auth.getSession();
      return data.session;
    } catch (e) {
      return null;
    }
  }

  async function isRegistered() {
    return !!(await getSession());
  }

  // تسجيل جديد: إنشاء auth.user + profile row
  async function signUp({ name, email, password, phone, interests, referredBy }) {
    const { data: authData, error: authError } = await sb().auth.signUp({
      email: email,
      password: password
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('فشل التسجيل');

    // نُنشئ الـ profile row مع referred_by لو موجود
    // (الـ trigger على جدول profiles يعطي ٢٠٠ نقطة لكلا الطرفين تلقائياً)
    const profileData = {
      id: authData.user.id,
      name: name,
      phone: phone || null,
      interests: interests || [],
      points: 100
    };

    if (referredBy) {
      profileData.referred_by = referredBy;
    }

    const { error: profileError } = await sb()
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      console.error('فشل إنشاء profile:', profileError);
      throw profileError;
    }

    return authData;
  }

  // تسجيل دخول
  async function signIn(email, password) {
    const { data, error } = await sb().auth.signInWithPassword({
      email: email,
      password: password
    });
    if (error) throw error;
    return data.user;
  }

  // تسجيل خروج
  async function signOut() {
    await sb().auth.signOut();
  }

  // طلب إعادة تعيين كلمة السر (يرسل Supabase رابطاً للبريد)
  async function requestPasswordReset(email) {
    const redirectTo = window.location.origin + '/reset-password.html';
    const { error } = await sb().auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo
    });
    if (error) throw error;
    return true;
  }

  // تحديث كلمة السر (بعد ما يضغط المستخدم على الرابط في البريد)
  async function updatePassword(newPassword) {
    const { error } = await sb().auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return true;
  }


  /* ============================================================
     Profile (بيانات المستخدم)
     ============================================================ */

  // قراءة profile المستخدم الحالي (مع الإيميل من auth)
  async function getProfile() {
    const session = await getSession();
    if (!session) return null;

    const { data, error } = await sb()
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('getProfile:', error);
      return null;
    }

    return { ...data, email: session.user.email };
  }

  // تحديث جزئي للـ profile
  async function updateProfile(patch) {
    const session = await getSession();
    if (!session) return false;

    const { error } = await sb()
      .from('profiles')
      .update(patch)
      .eq('id', session.user.id);

    if (error) console.error('updateProfile:', error);
    return !error;
  }

  // تفعيل باقة بعد الدفع
  async function activatePlan(plan, billing) {
    return updateProfile({
      plan: plan,
      billing: billing || 'monthly',
      plan_active: true,
      plan_activated_at: new Date().toISOString()
    });
  }


  /* ============================================================
     Transactions (المعاملات)
     ============================================================ */

  async function getTransactions(limit) {
    const session = await getSession();
    if (!session) return [];

    let q = sb()
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });

    if (limit) q = q.limit(limit);

    const { data, error } = await q;
    return error ? [] : (data || []);
  }

  /* ---------- مضاعف النقاط حسب الباقة ---------- */
  // العادية (المجانية) = 1x | بريميوم = 2x | VIP = 4x
  // نقبل أسماء متعددة للتوافق مع المصطلحات القديمة
  const PLAN_MULTIPLIERS = {
    free: 1,
    basic: 1,
    pro: 2,
    premium: 2,
    vip: 4
  };

  function getPlanMultiplier(plan) {
    if (!plan) return 1;
    return PLAN_MULTIPLIERS[plan.toLowerCase()] || 1;
  }

  /* ---------- إضافة معاملة ---------- */
  async function addTransaction({ store, storeInitial, amount, points, type, value, category, note, code, skipMultiplier }) {
    const session = await getSession();
    if (!session) throw new Error('Not signed in');

    // تطبيق مضاعف الباقة على النقاط المكتسبة (earn فقط، ليس redeem)
    // skipMultiplier = true لما نضيف مكافأة مباشرة (مثل الدعوة/التحدّيات/الميلاد)
    let finalPoints = points || 0;
    if (type === 'earn' && !skipMultiplier && amount > 0) {
      const profile = await getProfile();
      const multiplier = getPlanMultiplier(profile?.plan);
      // نحسب النقاط من المبلغ × المضاعف
      finalPoints = Math.floor(amount * multiplier);
    }

    const txData = {
      user_id: session.user.id,
      store: store,
      store_initial: storeInitial || (store || '◆').charAt(0).toUpperCase(),
      amount: amount || 0,
      points: finalPoints,
      type: type || 'earn',
      value: value || 0
    };

    if (category) txData.category = category;
    if (note) txData.note = note;
    if (code) txData.code = code;

    let { data: tx, error: txError } = await sb()
      .from('transactions')
      .insert(txData)
      .select()
      .single();

    // Fallback لو الأعمدة الجديدة غير موجودة
    if (txError && /column.*(?:category|note|code)/i.test(txError.message || '')) {
      console.warn('⚠️ الأعمدة الجديدة غير موجودة. شغّل SQL الدفعة 1.');
      delete txData.category;
      delete txData.note;
      delete txData.code;
      const retry = await sb().from('transactions').insert(txData).select().single();
      tx = retry.data;
      txError = retry.error;
    }

    if (txError) throw txError;

    // تحديث الرصيد (نستخدم finalPoints بعد تطبيق المضاعف)
    const delta = (type === 'redeem') ? -Math.abs(finalPoints) : Math.abs(finalPoints);
    const { data: profile } = await sb()
      .from('profiles')
      .select('points')
      .eq('id', session.user.id)
      .single();

    const newPoints = Math.max(0, (profile?.points || 0) + delta);
    const { error: updateError } = await sb()
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', session.user.id);

    if (updateError) throw updateError;

    return tx;
  }

  /* ---------- استبدال مكافأة ---------- */
  async function redeemReward({ rewardTitle, rewardDesc, cost, value, category }) {
    // 1. تأكّد من وجود رصيد كافٍ
    const profile = await getProfile();
    if (!profile) throw new Error('Not signed in');
    if (profile.points < cost) {
      const err = new Error('Insufficient points');
      err.code = 'INSUFFICIENT_POINTS';
      throw err;
    }

    // 2. ولّد كود استبدال
    const code = await generateRedeemCode();

    // 3. أضف معاملة من نوع redeem
    const tx = await addTransaction({
      store: rewardTitle,
      storeInitial: '🎁',
      amount: 0,
      points: cost,
      type: 'redeem',
      value: value || 0,
      category: category || 'reward',
      note: rewardDesc || '',
      code: code
    });

    return { ...tx, code };
  }

  /* ---------- توليد كود استبدال ---------- */
  async function generateRedeemCode() {
    try {
      const { data, error } = await sb().rpc('generate_transaction_code');
      if (!error && data) return data;
    } catch (e) { /* fallback */ }

    // fallback محلي
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'NQ-';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }


  /* ============================================================
     دوال مساعدة محلية (sync — لا تحتاج Supabase)
     ============================================================ */

  function calculateTier(points) {
    if (points >= 20000) return 'platinum';
    if (points >= 5000)  return 'gold';
    if (points >= 1000)  return 'silver';
    return 'bronze';
  }

  function firstName(profile) {
    if (!profile || !profile.name) return '';
    return profile.name.split(/\s+/)[0];
  }

  function daysSinceJoined(profile) {
    if (!profile || !profile.created_at) return 0;
    const ms = Date.now() - new Date(profile.created_at).getTime();
    return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  function joinedYear(profile) {
    if (!profile || !profile.created_at) return new Date().getFullYear();
    return new Date(profile.created_at).getFullYear();
  }


  /* ============================================================
     مراقب تغيّر الجلسة (login/logout في علامات تبويب أخرى)
     ============================================================ */
  function onAuthChange(callback) {
    if (!window.sb) return null;
    return sb().auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }


  /* ============================================================
     تصدير
     ============================================================ */
  window.NuqtaUser = {
    // Session
    getSession,
    isRegistered,

    // Auth
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,

    // Profile
    getProfile,
    updateProfile,
    activatePlan,

    // Transactions
    getTransactions,
    addTransaction,
    redeemReward,
    generateRedeemCode,
    getPlanMultiplier,

    // Helpers
    calculateTier,
    firstName,
    daysSinceJoined,
    joinedYear,

    // Events
    onAuthChange
  };
})();
