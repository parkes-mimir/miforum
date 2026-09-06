/**
 * Alpine.js 头部组件（消息图标、用户菜单）
 */
document.addEventListener('alpine:init', () => {
  window.header = Alpine.data('header', () => ({
    unreadCount: 0,

    async init() {
      await Alpine.store('auth').load();
      if (Alpine.store('auth').isLoggedIn) {
        await this.loadUnread();
      }
    },

    async loadUnread() {
      try {
        const [n, m] = await Promise.all([
          api('/api/notifications/unread-count'),
          api('/api/messages/unread-count')
        ]);
        this.unreadCount = (n.unread || 0) + (m.unread || 0);
      } catch (e) {}
    },

    get user() {
      return Alpine.store('auth').user;
    },

    get isLoggedIn() {
      return Alpine.store('auth').isLoggedIn;
    },

    get userAvatarHtml() {
      const u = Alpine.store('auth').user;
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

    async logout() {
      await Alpine.store('auth').logout();
    }
  }));
});
