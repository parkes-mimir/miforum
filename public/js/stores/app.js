/**
 * Alpine.js 全局认证状态
 */
document.addEventListener('alpine:init', () => {
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
      const frameStyles = {
        gold: 'box-shadow: 0 0 0 2px #fbbf24, 0 0 6px #fbbf2440',
        silver: 'border: 2px solid #94a3b8',
        blue: 'box-shadow: 0 0 0 2px #3b82f6, 0 0 6px #3b82f640',
        purple: 'box-shadow: 0 0 0 2px #a855f7, 0 0 8px #a855f740'
      };
      const frameStyle = u.avatar_frame && frameStyles[u.avatar_frame] ? frameStyles[u.avatar_frame] : '';
      const wrapOpen = frameStyle ? `<div style="width:28px;height:28px;border-radius:50%;${frameStyle};overflow:hidden;display:flex;align-items:center;justify-content:center;">` : '';
      const wrapClose = frameStyle ? '</div>' : '';
      if (u.avatar_url) return `${wrapOpen}<img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">${wrapClose}`;
      return `${wrapOpen}<div style="width:28px;height:28px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#4f46e5;">${esc(letter)}</div>${wrapClose}`;
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
