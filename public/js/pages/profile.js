// ===== Avatar Cropper (vanilla JS, integrated with Alpine) =====
const CROPPER_SIZE = 192;
let avatarCropState = { dragging: false, startX: 0, startY: 0, imgX: 0, imgY: 0, scale: 1, minScale: 1 };
let particleTimer = null;

function renderCrop() {
  const img = document.getElementById('avatarCropImg');
  if (!img || !img.naturalWidth) return;
  const sx = -avatarCropState.imgX / avatarCropState.scale;
  const sy = -avatarCropState.imgY / avatarCropState.scale;
  const sw = CROPPER_SIZE / avatarCropState.scale;
  const sh = CROPPER_SIZE / avatarCropState.scale;

  const mainCanvas = document.getElementById('avatarCropCanvas');
  const mainCtx = mainCanvas.getContext('2d');
  mainCtx.clearRect(0, 0, CROPPER_SIZE, CROPPER_SIZE);
  mainCtx.save();
  mainCtx.beginPath();
  mainCtx.arc(CROPPER_SIZE/2, CROPPER_SIZE/2, CROPPER_SIZE/2, 0, Math.PI * 2);
  mainCtx.clip();
  mainCtx.drawImage(img, sx, sy, sw, sh, 0, 0, CROPPER_SIZE, CROPPER_SIZE);
  mainCtx.restore();

  const prevCanvas = document.getElementById('avatarPreviewCanvas');
  const prevCtx = prevCanvas.getContext('2d');
  const prevSize = 64;
  prevCtx.clearRect(0, 0, prevSize, prevSize);
  prevCtx.save();
  prevCtx.beginPath();
  prevCtx.arc(prevSize/2, prevSize/2, prevSize/2, 0, Math.PI * 2);
  prevCtx.clip();
  prevCtx.drawImage(img, sx, sy, sw, sh, 0, 0, prevSize, prevSize);
  prevCtx.restore();
}

function clampCropPosition() {
  const img = document.getElementById('avatarCropImg');
  const scaledW = img.naturalWidth * avatarCropState.scale;
  const scaledH = img.naturalHeight * avatarCropState.scale;
  if (scaledW >= CROPPER_SIZE) {
    avatarCropState.imgX = Math.min(0, Math.max(CROPPER_SIZE - scaledW, avatarCropState.imgX));
  } else {
    avatarCropState.imgX = (CROPPER_SIZE - scaledW) / 2;
  }
  if (scaledH >= CROPPER_SIZE) {
    avatarCropState.imgY = Math.min(0, Math.max(CROPPER_SIZE - scaledH, avatarCropState.imgY));
  } else {
    avatarCropState.imgY = (CROPPER_SIZE - scaledH) / 2;
  }
}

function updateZoomLevel() {
  const img = document.getElementById('avatarCropImg');
  const baseScale = Math.max(CROPPER_SIZE / img.naturalWidth, CROPPER_SIZE / img.naturalHeight);
  const percent = Math.round((avatarCropState.scale / baseScale) * 100);
  document.getElementById('zoomLevel').textContent = percent + '%';
}

function zoomAtPoint(factor, cx, cy) {
  const rect = document.getElementById('avatarCropper').getBoundingClientRect();
  const mx = cx - rect.left;
  const my = cy - rect.top;
  const imgMx = mx - avatarCropState.imgX;
  const imgMy = my - avatarCropState.imgY;
  const oldScale = avatarCropState.scale;
  const newScale = Math.max(avatarCropState.minScale, Math.min(oldScale * factor, avatarCropState.minScale * 40));
  avatarCropState.scale = newScale;
  avatarCropState.imgX = mx - imgMx * (newScale / oldScale);
  avatarCropState.imgY = my - imgMy * (newScale / oldScale);
  clampCropPosition();
  renderCrop();
  updateZoomLevel();
}

function zoomBtn(delta) {
  const rect = document.getElementById('avatarCropper').getBoundingClientRect();
  zoomAtPoint(1 + delta, rect.left + rect.width/2, rect.top + rect.height/2);
}

function getCroppedBlob() {
  const img = document.getElementById('avatarCropImg');
  const outputSize = 256;
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(outputSize/2, outputSize/2, outputSize/2, 0, Math.PI * 2);
  ctx.clip();
  const sx = -avatarCropState.imgX / avatarCropState.scale;
  const sy = -avatarCropState.imgY / avatarCropState.scale;
  const sw = CROPPER_SIZE / avatarCropState.scale;
  const sh = CROPPER_SIZE / avatarCropState.scale;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
}

function initCropperEvents() {
  const cropper = document.getElementById('avatarCropper');
  if (!cropper || cropper._bound) return;
  cropper._bound = true;

  cropper.addEventListener('mousedown', (e) => {
    e.preventDefault();
    avatarCropState.dragging = true;
    avatarCropState.startX = e.clientX - avatarCropState.imgX;
    avatarCropState.startY = e.clientY - avatarCropState.imgY;
  });
  document.addEventListener('mousemove', (e) => {
    if (!avatarCropState.dragging) return;
    avatarCropState.imgX = e.clientX - avatarCropState.startX;
    avatarCropState.imgY = e.clientY - avatarCropState.startY;
    clampCropPosition();
    renderCrop();
  });
  document.addEventListener('mouseup', () => { avatarCropState.dragging = false; });

  cropper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      avatarCropState.dragging = true;
      avatarCropState.startX = e.touches[0].clientX - avatarCropState.imgX;
      avatarCropState.startY = e.touches[0].clientY - avatarCropState.imgY;
    }
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!avatarCropState.dragging || e.touches.length !== 1) return;
    avatarCropState.imgX = e.touches[0].clientX - avatarCropState.startX;
    avatarCropState.imgY = e.touches[0].clientY - avatarCropState.startY;
    clampCropPosition();
    renderCrop();
  }, { passive: true });
  document.addEventListener('touchend', () => { avatarCropState.dragging = false; });

  cropper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    zoomAtPoint(factor, e.clientX, e.clientY);
  }, { passive: false });

  let lastPinchDist = 0;
  cropper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      avatarCropState.dragging = false;
    }
  }, { passive: true });
  cropper.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist > 0) {
        const factor = dist / lastPinchDist;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomAtPoint(factor, cx, cy);
      }
      lastPinchDist = dist;
    }
  }, { passive: false });
  cropper.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) lastPinchDist = 0;
  });
}

function spawnParticles(info) {
  const container = document.querySelector('[x-ref="levelParticles"]');
  if (!container) return;
  container.innerHTML = '';
  if (particleTimer) { clearInterval(particleTimer); particleTimer = null; }

  const color = info.accent_color || '#3b82f6';
  const anchorPct = Math.min(info.progress, 100);

  particleTimer = setInterval(() => {
    if (!container.isConnected || container.offsetParent === null) {
      clearInterval(particleTimer); particleTimer = null; return;
    }
    const wrapRect = container.parentElement.getBoundingClientRect();
    const wrapW = wrapRect.width;
    const anchorX = (anchorPct / 100) * wrapW;
    const size = 2 + Math.random() * 1.5;
    const angleDeg = Math.random() * 60 - 30;
    const angleRad = angleDeg * Math.PI / 180;
    const dist = 14 + Math.random() * 14;
    const dx = Math.cos(angleRad) * dist;
    const dy = Math.sin(angleRad) * dist;

    const p = document.createElement('span');
    p.style.cssText = `position:absolute;left:${anchorX}px;top:50%;width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 ${size*2}px ${color};pointer-events:none;will-change:transform,opacity;`;
    container.appendChild(p);

    const start = performance.now();
    const dur = 800;
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const ease = t * t;
      p.style.transform = `translate(calc(-50% + ${dx * ease}px), calc(-50% + ${dy * ease}px)) scale(${1 - ease * 0.7})`;
      p.style.opacity = (1 - ease).toFixed(2);
      if (t < 1) requestAnimationFrame(step);
      else p.remove();
    }
    requestAnimationFrame(step);
  }, 150);
}

// ===== Alpine Component =====
document.addEventListener('alpine:init', () => {
  window.profilePage = Alpine.data('profilePage', () => ({
    loading: true,
    error: null,
    profile: null,
    levelInfo: null,
    activeTab: 'posts',
    posts: [],
    likes: [],
    bookmarks: [],
    postsPagination: null,
    likesPagination: null,
    bookmarksPagination: null,
    showEdit: false,
    showCropper: false,
    showPasswordModal: false,
    editForm: { username: '', bio: '', location: '', website: '', profile_public: true },
    passwordForm: { old: '', new: '', confirm: '' },
    selectedTitle: '',
    selectedFrame: '',
    titleOptions: [],
    frameOptions: [],
    editAvatarFile: null,
    profileUid: null,

    async init() {
      await Alpine.store('auth').load();
      this.profileUid = new URLSearchParams(window.location.search).get('id');
      if (!this.profileUid) {
        this.error = '用户不存在';
        this.loading = false;
        return;
      }
      await this.loadProfile();
    },

    get user() { return Alpine.store('auth').user; },
    get isLoggedIn() { return Alpine.store('auth').isLoggedIn; },
    get isOwner() { return this.user && this.profile && this.user.id === this.profile.id; },
    get isPrivate() { return this.profile && this.profile.profile_public === false; },

    get roleLabel() {
      if (!this.profile) return '';
      if (this.profile.role === 'super_admin') return '超管';
      if (this.profile.role === 'admin') return '管理';
      return '';
    },
    get roleColorClass() {
      if (!this.profile) return '';
      if (this.profile.role === 'super_admin') return 'bg-red-500 text-white';
      if (this.profile.role === 'admin') return 'bg-amber-500 text-white';
      return '';
    },
    get hasMeta() {
      return this.profile && (this.profile.location || this.profile.website);
    },
    get profileAvatarHtml() {
      if (!this.profile) return '';
      const letter = (this.profile.username || '?')[0].toUpperCase();
      if (this.profile.avatar_url) return `<img src="${this.profile.avatar_url}" class="w-full h-full object-cover">`;
      return `<div class="w-full h-full rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white">${esc(letter)}</div>`;
    },
    get editAvatarPreviewHtml() {
      if (!this.profile) return '';
      if (this.profile.avatar_url) return `<img src="${this.profile.avatar_url}" class="w-full h-full object-cover">`;
      return (this.profile.username || '?')[0].toUpperCase();
    },
    get avatarFrameStyle() {
      const frameStyles = {
        gold: 'linear-gradient(135deg, #fde047 0%, #eab308 50%, #d97706 100%)',
        silver: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%)',
        blue: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
        purple: 'linear-gradient(135deg, #d8b4fe 0%, #a855f7 50%, #7e22ce 100%)'
      };
      if (!this.profile || !this.profile.avatar_frame || !frameStyles[this.profile.avatar_frame]) return '';
      return `background:${frameStyles[this.profile.avatar_frame]};padding:3px;`;
    },
    get levelBadgeHtml() {
      if (!this.levelInfo) return '';
      return `<span style="font-size:8px;line-height:1;">${this.levelInfo.icon}</span><span>Lv${this.levelInfo.level}</span>`;
    },
    get passwordStrength() {
      const pw = this.passwordForm.new;
      if (!pw) return { score: 0, label: '', labelColor: '#9ca3af' };
      let score = 0;
      const checks = { length: pw.length >= 8, long: pw.length >= 12, lowercase: /[a-z]/.test(pw), uppercase: /[A-Z]/.test(pw), numbers: /[0-9]/.test(pw), symbols: /[^a-zA-Z0-9]/.test(pw) };
      if (checks.length) score++;
      if (checks.long) score++;
      const types = [checks.lowercase, checks.uppercase, checks.numbers, checks.symbols].filter(Boolean).length;
      if (types >= 2) score++;
      if (types >= 3) score++;
      score = Math.min(4, score);
      const levels = [
        { label: '非常弱', labelColor: '#ef4444', color: '#ef4444' },
        { label: '弱', labelColor: '#f97316', color: '#f97316' },
        { label: '一般', labelColor: '#eab308', color: '#eab308' },
        { label: '强', labelColor: '#22c55e', color: '#22c55e' },
        { label: '非常强', labelColor: '#10b981', color: '#10b981' }
      ];
      return { score, ...levels[score] };
    },

    passwordStrengthColor(i) {
      return i <= this.passwordStrength.score ? this.passwordStrength.color : '#e5e7eb';
    },

    relTime(iso) {
      if (!iso) return '';
      const d = Date.now() - new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z')).getTime();
      const m = Math.floor(d / 60000);
      if (m < 1) return '刚刚';
      if (m < 60) return m + '分钟前';
      const h = Math.floor(m / 60);
      if (h < 24) return h + '小时前';
      const date = new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'));
      return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
    },

    catLabel(cat) { return { tech: '技术', life: '生活', notice: '公告' }[cat] || cat; },
    catColor(cat) { return { tech: 'bg-blue-100 text-blue-700', life: 'bg-pink-100 text-pink-700', notice: 'bg-amber-100 text-amber-700' }[cat] || 'bg-gray-100 text-gray-600'; },

    async loadProfile() {
      try {
        const { user } = await api('/api/users/' + this.profileUid);
        this.profile = user;
        document.title = user.username + ' - MiForum';
        this.levelInfo = user.level_info || null;
        if (this.levelInfo) {
          this.$nextTick(() => spawnParticles(this.levelInfo));
        }
        await this.loadPosts(1);
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    async switchTab(tab) {
      this.activeTab = tab;
      if (tab === 'posts' && this.posts.length === 0) await this.loadPosts(1);
      else if (tab === 'likes' && this.likes.length === 0) await this.loadLikes(1);
      else if (tab === 'bookmarks' && this.bookmarks.length === 0) await this.loadBookmarks(1);
    },

    async loadPosts(page) {
      try {
        const { posts, pagination } = await api('/api/users/' + this.profileUid + '/posts?page=' + page + '&limit=20');
        this.posts = posts;
        this.postsPagination = pagination;
      } catch (e) {}
    },

    async loadLikes(page) {
      try {
        const { posts, pagination } = await api('/api/users/' + this.profileUid + '/likes?page=' + page + '&limit=20');
        this.likes = posts;
        this.likesPagination = pagination;
      } catch (e) { this.likes = []; }
    },

    async loadBookmarks(page) {
      try {
        const { posts, pagination } = await api('/api/bookmarks?page=' + page + '&limit=20');
        this.bookmarks = posts;
        this.bookmarksPagination = pagination;
      } catch (e) { this.bookmarks = []; }
    },

    goToChat() {
      if (!this.isLoggedIn) { location.href = '/'; return; }
      window.open('/messages?user=' + this.profileUid, '_blank');
    },

    showEditModal() {
      if (!this.profile) return;
      this.editForm = {
        username: this.profile.username || '',
        bio: this.profile.bio || '',
        location: this.profile.location || '',
        website: this.profile.website || '',
        profile_public: this.profile.profile_public !== false
      };
      this.selectedTitle = this.profile.title || '';
      this.selectedFrame = this.profile.avatar_frame || '';
      this.editAvatarFile = null;
      this.showCropper = false;
      this.loadUserItems();
      this.showEdit = true;
    },

    hideEditModal() {
      this.showEdit = false;
      this.showCropper = false;
    },

    showChangePassword() {
      this.passwordForm = { old: '', new: '', confirm: '' };
      this.showPasswordModal = true;
    },

    handleAvatarSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { toast('头像不能超过10MB'); return; }
      this.editAvatarFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.getElementById('avatarCropImg');
        img.src = ev.target.result;
        img.onload = () => {
          const scale = Math.max(CROPPER_SIZE / img.naturalWidth, CROPPER_SIZE / img.naturalHeight);
          avatarCropState.scale = scale;
          avatarCropState.minScale = scale;
          avatarCropState.imgX = (CROPPER_SIZE - img.naturalWidth * scale) / 2;
          avatarCropState.imgY = (CROPPER_SIZE - img.naturalHeight * scale) / 2;
          this.showCropper = true;
          this.$nextTick(() => {
            initCropperEvents();
            renderCrop();
            updateZoomLevel();
          });
        };
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },

    async loadUserItems() {
      try {
        const { orders } = await api('/api/shop/orders');
        const titles = orders.filter(o => o.item_type === 'title' && o.status === 'completed').map(o => ({ name: o.item_name, value: o.item_value || o.item_name }));
        this.titleOptions = [{ name: '无称号', value: '' }, ...titles];
        const frames = orders.filter(o => o.item_type === 'avatar_frame' && o.status === 'completed').map(o => ({ name: o.item_name, value: o.item_value || o.item_name }));
        this.frameOptions = [{ name: '无边框', value: '' }, ...frames];
      } catch (e) {}
    },

    async saveProfile() {
      if (!this.editForm.username.trim()) { toast('用户名不能为空'); return; }
      try {
        const fd = new FormData();
        fd.append('username', this.editForm.username.trim());
        fd.append('bio', (this.editForm.bio || '').trim());
        fd.append('location', (this.editForm.location || '').trim());
        fd.append('website', (this.editForm.website || '').trim());
        fd.append('profile_public', this.editForm.profile_public);
        fd.append('title', this.selectedTitle || '');
        fd.append('avatar_frame', this.selectedFrame || '');
        if (this.editAvatarFile) {
          if (this.showCropper) {
            const blob = await getCroppedBlob();
            fd.append('avatar', blob, 'avatar.png');
          } else {
            fd.append('avatar', this.editAvatarFile);
          }
        }
        const res = await fetch('/api/profile', { method: 'PUT', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '保存失败');
        Alpine.store('auth').user = { ...Alpine.store('auth').user, ...data.user };
        this.hideEditModal();
        this.loading = true;
        await this.loadProfile();
        toast('资料已更新');
      } catch (e) { toast(e.message); }
    },

    async doChangePassword() {
      const { old: oldPw, new: newPw, confirm: confirmPw } = this.passwordForm;
      if (!oldPw || !newPw || !confirmPw) { toast('请填写所有字段'); return; }
      if (newPw.length < 6) { toast('新密码至少6位'); return; }
      if (newPw !== confirmPw) { toast('两次输入的密码不一致'); return; }
      if (oldPw === newPw) { toast('新密码不能与旧密码相同'); return; }
      try {
        await api('/api/change-password', { method: 'POST', body: JSON.stringify({ old_password: oldPw, new_password: newPw }) });
        this.showPasswordModal = false;
        toast('密码修改成功！');
      } catch (e) { toast(e.message); }
    }
  }));
});
