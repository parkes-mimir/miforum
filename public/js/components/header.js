/**
 * Alpine.js 头部组件（消息图标、用户菜单、管理入口）
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

    get isAdmin() {
      return Alpine.store('auth').isAdmin;
    },

    get isSuperAdmin() {
      return Alpine.store('auth').isSuperAdmin;
    },

    get roleLabel() {
      if (!this.user) return '';
      if (this.user.role === 'super_admin') return '超管';
      if (this.user.role === 'admin') return '管理';
      return '';
    },

    get roleColorClass() {
      if (!this.user) return '';
      if (this.user.role === 'super_admin') return 'bg-red-500 text-white';
      if (this.user.role === 'admin') return 'bg-amber-500 text-white';
      return '';
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
      const wrapStyle = `width:28px;height:28px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;${frameStyle}`;
      if (u.avatar_url) return `<div style="${wrapStyle}"><img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>`;
      return `<div style="${wrapStyle}background:#e0e7ff;font-size:12px;font-weight:700;color:#4f46e5;">${esc(letter)}</div>`;
    },

    async logout() {
      await Alpine.store('auth').logout();
    }
  }));
});
