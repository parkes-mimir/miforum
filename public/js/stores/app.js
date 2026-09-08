/**
 * Alpine.js 全局状态
 *
 * 注册全局 store：auth、toast、exchange
 * 所有页面共享这些状态
 */
document.addEventListener('alpine:init', () => {
  // ============================================================
  // 认证状态
  // ============================================================
  Alpine.store('auth', {
    user: null,
    showLogin: false,

    get isLoggedIn() {
      return !!this.user;
    },

    get isAdmin() {
      return this.user && ['admin', 'super_admin'].includes(this.user.role);
    },

    get isSuperAdmin() {
      return this.user && this.user.role === 'super_admin';
    },

    get userAvatarHtml() {
      const u = this.user;
      if (!u) return '';
      const letter = (u.username || '?')[0].toUpperCase();
      return avatarHtml(u.avatar_url, letter, 'w-7 h-7', u.avatar_frame);
    },

    async load() {
      try {
        const { user } = await api('/api/me');
        this.user = user;
      } catch (e) {
        this.user = null;
      }
    },

    async logout() {
      try {
        await api('/api/logout', { method: 'POST' });
      } catch (e) {}
      this.user = null;
      window.location.href = '/';
    }
  });

  // ============================================================
  // Toast 提示
  // ============================================================
  Alpine.store('toast', {
    message: '',
    visible: false,
    timer: null,

    show(msg, duration = 2500) {
      this.message = msg;
      this.visible = true;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.visible = false;
      }, duration);
    }
  });
});
