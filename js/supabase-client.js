/* ============================================================
   supabase-client.js
   ------------------------------------------------------------
   ينشئ عميل Supabase الموحّد ويضعه في window.sb
   لكل صفحات الموقع.

   يعتمد على:
   - Supabase SDK من CDN (نحمّله في <head>)
   - supabase-config.js (المفاتيح)

   Session management:
   - Supabase يحفظ الجلسة في localStorage تلقائياً
   - المفتاح: nuqta_auth (حدّدنا اسم مخصّص)
   - تُجدّد التوكنات تلقائياً (autoRefreshToken)
   ============================================================ */

(function () {
  'use strict';

  // تحقق أن SDK محمّل
  if (!window.supabase || !window.supabase.createClient) {
    console.error('❌ Supabase SDK غير محمّل. تأكد من <script> في <head>.');
    return;
  }

  // تحقق أن المفاتيح محدّدة
  if (!window.SUPABASE_URL ||
      !window.SUPABASE_ANON_KEY ||
      window.SUPABASE_URL.includes('YOUR_') ||
      window.SUPABASE_ANON_KEY.includes('YOUR_')) {
    console.error('❌ مفاتيح Supabase مفقودة. عدّل js/supabase-config.js');
    alert('يرجى تحديد مفاتيح Supabase في js/supabase-config.js');
    return;
  }

  // إنشاء العميل
  window.sb = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'nuqta_auth'
      }
    }
  );

  console.log('✓ Supabase client جاهز');
})();
