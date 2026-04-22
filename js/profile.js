/* ============================================================
   profile.js
   ------------------------------------------------------------
   صفحة تعديل الملف الشخصي:
   - تحميل بيانات المستخدم من Supabase
   - تحديث الاسم والجوال
   - تحديث الاهتمامات (toggle)
   - تغيير كلمة السر
   - تسجيل خروج
   ============================================================ */

(function () {
  'use strict';

  let currentProfile = null;

  function t(key) {
    const lang = (window.Nuqta && window.Nuqta.getCurrentLang)
                 ? window.Nuqta.getCurrentLang() : 'en';
    return (translations[lang] && translations[lang][key]) || key;
  }

  function showErr(fieldId, msg) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const err = field.parentElement.querySelector('.form-error');
    if (err) err.textContent = msg;
    field.classList.add('has-error');
  }

  function clearErr(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const err = field.parentElement.querySelector('.form-error');
    if (err) err.textContent = '';
    field.classList.remove('has-error');
  }

  function validatePhone(s) {
    const digits = s.replace(/[^0-9]/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }

  /* ---------- تعبئة الحقول من البيانات ---------- */
  function fillForm(profile) {
    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('profileEmail').value = profile.email || '';
    document.getElementById('profilePhone').value = profile.phone || '';

    // الاهتمامات: نحدّد الأزرار المختارة
    const selected = new Set(profile.interests || []);
    document.querySelectorAll('.interest-tag').forEach((btn) => {
      // كل زر يحمل data-tag بالإنجليزي الموحّد
      const tag = btn.dataset.tag;
      btn.classList.toggle('is-selected', selected.has(tag));
    });
  }

  /* ---------- حفظ البيانات الشخصية ---------- */
  async function savePersonal() {
    const btn = document.getElementById('btnSavePersonal');
    const name = document.getElementById('profileName').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();

    clearErr('profileName'); clearErr('profilePhone');

    let ok = true;
    if (!name) { showErr('profileName', t('signup.err.required')); ok = false; }
    if (!phone) { showErr('profilePhone', t('signup.err.required')); ok = false; }
    else if (!validatePhone(phone)) { showErr('profilePhone', t('signup.err.phone')); ok = false; }
    if (!ok) return;

    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = t('profile.saving');

    try {
      await window.NuqtaUser.updateProfile({ name, phone });
      Toast.success(t('profile.saved'));
      currentProfile.name = name;
      currentProfile.phone = phone;
    } catch (err) {
      console.error('Save error:', err);
      Toast.error(t('profile.save.err'));
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  /* ---------- حفظ الاهتمامات ---------- */
  async function saveInterests() {
    const btn = document.getElementById('btnSaveInterests');
    const selected = Array.from(document.querySelectorAll('.interest-tag.is-selected'))
      .map((el) => el.dataset.tag);

    if (selected.length < 1) {
      Toast.warning(t('profile.interests.min'));
      return;
    }

    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = t('profile.saving');

    try {
      await window.NuqtaUser.updateProfile({ interests: selected });
      Toast.success(t('profile.saved'));
      currentProfile.interests = selected;
    } catch (err) {
      console.error('Interests error:', err);
      Toast.error(t('profile.save.err'));
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  /* ---------- تغيير كلمة السر ---------- */
  async function savePassword() {
    const btn = document.getElementById('btnSavePassword');
    const newPwd = document.getElementById('profileNewPwd').value;
    const confirmPwd = document.getElementById('profileConfirmPwd').value;

    clearErr('profileNewPwd'); clearErr('profileConfirmPwd');

    let ok = true;
    if (!newPwd) { showErr('profileNewPwd', t('signup.err.required')); ok = false; }
    else if (newPwd.length < 6) { showErr('profileNewPwd', t('signup.err.password.short')); ok = false; }
    if (!confirmPwd) { showErr('profileConfirmPwd', t('signup.err.required')); ok = false; }
    else if (newPwd !== confirmPwd) { showErr('profileConfirmPwd', t('reset.err.mismatch')); ok = false; }
    if (!ok) return;

    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = t('reset.submitting');

    try {
      await window.NuqtaUser.updatePassword(newPwd);
      Toast.success(t('profile.password.updated'));
      document.getElementById('profileNewPwd').value = '';
      document.getElementById('profileConfirmPwd').value = '';
    } catch (err) {
      console.error('Password error:', err);
      Toast.error(t('profile.password.err'));
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  /* ---------- تسجيل خروج ---------- */
  async function handleSignoutAll() {
    try {
      await window.NuqtaUser.signOut();
      window.location.href = 'index.html';
    } catch (err) {
      Toast.error(t('login.err.generic'));
    }
  }

  /* ---------- عرض قسم الدعوة وQR ---------- */
  function renderInvite(profile) {
    const code = profile.referral_code;
    if (!code) {
      // لو ما في كود دعوة (حسابات قديمة)، نخفي القسم
      const card = document.querySelector('.invite-wrap');
      if (card) card.closest('.profile-card').style.display = 'none';
      return;
    }

    const shareURL = window.NuqtaReferral
      ? window.NuqtaReferral.buildShareURL(code)
      : window.location.origin + '/index.html?ref=' + code;

    // عرض الكود والرابط
    const codeEl = document.getElementById('referralCode');
    const linkEl = document.getElementById('referralLink');
    if (codeEl) codeEl.textContent = code;
    if (linkEl) linkEl.textContent = shareURL;

    // QR Code
    if (window.NuqtaQR) {
      const qrContainer = document.getElementById('qrContainer');
      if (qrContainer) window.NuqtaQR.render(shareURL, qrContainer, 180);
    }

    // زر تحميل QR
    const downloadBtn = document.getElementById('btnDownloadQR');
    if (downloadBtn && window.NuqtaQR) {
      downloadBtn.addEventListener('click', () => {
        window.NuqtaQR.download(shareURL, `nuqta-${code}.png`, 400);
      });
    }

    // نسخ الكود
    const copyCodeBtn = document.getElementById('btnCopyCode');
    if (copyCodeBtn && window.NuqtaReferral) {
      copyCodeBtn.addEventListener('click', async () => {
        const ok = await window.NuqtaReferral.copyToClipboard(code);
        if (ok && window.Toast) Toast.success(t('profile.invite.copied'));
      });
    }

    // نسخ الرابط
    const copyLinkBtn = document.getElementById('btnCopyLink');
    if (copyLinkBtn && window.NuqtaReferral) {
      copyLinkBtn.addEventListener('click', async () => {
        const ok = await window.NuqtaReferral.copyToClipboard(shareURL);
        if (ok && window.Toast) Toast.success(t('profile.invite.copied'));
      });
    }

    // زر واتساب
    const waBtn = document.getElementById('btnShareWhatsApp');
    if (waBtn && window.NuqtaReferral) {
      waBtn.href = window.NuqtaReferral.whatsappLink(
        shareURL,
        t('profile.invite.share.msg')
      );
    }

    // Web Share API
    const shareBtn = document.getElementById('btnShareNative');
    if (shareBtn && window.NuqtaReferral) {
      shareBtn.addEventListener('click', async () => {
        const ok = await window.NuqtaReferral.share(
          shareURL,
          t('profile.invite.share.msg')
        );
        if (!ok) {
          // fallback: نسخ الرابط
          await window.NuqtaReferral.copyToClipboard(shareURL);
          if (window.Toast) Toast.success(t('profile.invite.copied'));
        }
      });
    }

    // تحميل قائمة المدعوّين
    loadMyInvites(code);
  }


  /* ---------- تحميل قائمة من انضم بدعوة العميل ---------- */
  async function loadMyInvites(myCode) {
    if (!window.sb || !myCode) return;

    const { data, error } = await window.sb()
      .from('profiles')
      .select('name, created_at')
      .eq('referred_by', myCode)
      .order('created_at', { ascending: false });

    const list = document.getElementById('invitesList');
    const countEl = document.getElementById('invitesCount');
    if (!list) return;

    if (error) {
      console.error('Invites load error:', error);
      return;
    }

    const invites = data || [];
    if (countEl) countEl.textContent = invites.length;

    if (invites.length === 0) return;

    // نعرض القائمة
    list.innerHTML = '';
    invites.forEach((inv) => {
      const item = document.createElement('div');
      item.className = 'invite-item';
      const date = new Date(inv.created_at).toLocaleDateString();
      item.innerHTML = `
        <div class="invite-item-avatar">${(inv.name || '?').charAt(0).toUpperCase()}</div>
        <div class="invite-item-info">
          <div class="invite-item-name" data-no-translate dir="ltr">${inv.name || 'Anonymous'}</div>
          <div class="invite-item-date">${date}</div>
        </div>
        <div class="invite-item-bonus">+200</div>
      `;
      list.appendChild(item);
    });
  }


  /* ---------- عرض الأوسمة ---------- */
  async function renderBadges() {
    const grid = document.getElementById('badgesGrid');
    if (!grid || !window.NuqtaAchievements) return;

    const all = window.NuqtaAchievements.BADGES;
    const earned = await window.NuqtaAchievements.getEarned();
    const earnedKeys = new Set(earned.map((a) => a.badge_key));

    grid.innerHTML = '';

    all.forEach((badge) => {
      const isEarned = earnedKeys.has(badge.key);
      const item = document.createElement('div');
      item.className = `badge-item ${isEarned ? 'badge-item--earned' : 'badge-item--locked'}`;
      item.innerHTML = `
        <div class="badge-emoji">${badge.icon}</div>
        <div class="badge-title">${t(badge.titleKey)}</div>
        <div class="badge-desc">${t(badge.descKey)}</div>
      `;
      grid.appendChild(item);
    });

    // عرض العدد
    const countEl = document.getElementById('badgeCount');
    if (countEl) {
      countEl.textContent = `${earned.length}/${all.length}`;
    }
  }

  /* ---------- تهيئة ---------- */
  async function init() {
    if (!document.getElementById('profileContent')) return;

    // تحقق من الجلسة
    const session = await window.NuqtaUser.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    // قراءة الـ profile
    const profile = await window.NuqtaUser.getProfile();
    if (!profile) {
      Toast.error(t('login.err.generic'));
      return;
    }

    currentProfile = profile;
    fillForm(profile);

    // عرض قسم الدعوة و QR
    renderInvite(profile);

    // عرض الأوسمة
    renderBadges();

    // إخفاء التحميل وإظهار المحتوى
    const loading = document.getElementById('profileLoading');
    const content = document.getElementById('profileContent');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';

    // ربط الأزرار
    document.getElementById('btnSavePersonal').addEventListener('click', savePersonal);
    document.getElementById('btnSaveInterests').addEventListener('click', saveInterests);
    document.getElementById('btnSavePassword').addEventListener('click', savePassword);
    document.getElementById('btnSignoutAll').addEventListener('click', handleSignoutAll);

    // interest tags toggle
    document.querySelectorAll('.interest-tag').forEach((tag) => {
      tag.addEventListener('click', () => tag.classList.toggle('is-selected'));
    });

    // إزالة أخطاء عند الكتابة
    ['profileName', 'profilePhone', 'profileNewPwd', 'profileConfirmPwd'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => clearErr(id));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
