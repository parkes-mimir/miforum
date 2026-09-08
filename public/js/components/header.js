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
      return avatarHtml(u.avatar_url, letter, 'w-7 h-7', u.avatar_frame);
    },

    async logout() {
      await Alpine.store('auth').logout();
    }
  }));
});
