/**
 * admin.js - 管理面板页面逻辑
 */

document.addEventListener('alpine:init', () => {
  window.adminPage = Alpine.data('adminPage', () => ({
    tab: 'users',
    user: null,
    isSuperAdmin: false,

    // Users
    users: [],

    // Shop
    shopItems: [],
    showItemForm: false,
    editingItem: null,
    itemForm: { name: '', description: '', icon: '', type: 'title', value: '', titleColor: '#4f46e5', price: 0, stock: -1, enabled: true, checkinRequired: 0 },

    // Codes
    codes: [],
    showCodeForm: false,
    codeForm: { rewardType: 'points', rewardValue: 100, maxUses: 1, expiresAt: '' },

    // Orders
    orders: [],
    ordersPagination: null,

    // SMTP
    smtp: { host: '', port: '465', secure: true, user: '', pass: '', configured: false },

    // Bots
    bots: [],
    categories: [],
    showBotFormFlag: false,
    botForm: { name: '', rssUrl: '', category: 'tech', intervalMinutes: 30 },
    editingBotId: null,

    // Games
    games: [],
    showGameFormFlag: false,
    gameForm: { name: '', description: '', url: '', icon: '🎮', author: '', gameType: 'single', sourceType: 'closed', sortOrder: 0 },
    editingGameId: null,
    smtpStatus: '',
    smtpStatusOk: true,

    // About
    aboutVersion: '-',
    updateChecking: false,
    updateResult: '',
    updateResultOk: true,
    updateHasNew: false,

    async init() {
      await Alpine.store('auth').load();
      this.user = Alpine.store('auth').user;
      this.isSuperAdmin = Alpine.store('auth').isSuperAdmin;
      if (!this.user || !Alpine.store('auth').isAdmin) {
        Alpine.store('toast').show('需要管理员权限');
        location.href = '/';
        return;
      }
      await this.loadUsers();
      await this.loadCategories();
    },

    async loadUsers() {
      try {
        const { users } = await api('/api/admin/users');
        this.users = users || [];
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    avatarHtml(url, letter, size, frame) {
      return avatarHtml(url, letter, size, frame);
    },

    async grantAdmin(u) {
      if (!confirm(`确认将「${u.username}」设为管理员？`)) return;
      try {
        await api('/api/superadmin/grant-admin/' + u.id, { method: 'PUT' });
        Alpine.store('toast').show('已设为管理员');
        await this.loadUsers();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async revokeAdmin(u) {
      if (!confirm(`确认撤销「${u.username}」的管理员权限？`)) return;
      try {
        await api('/api/superadmin/revoke-admin/' + u.id, { method: 'PUT' });
        Alpine.store('toast').show('已撤销管理员');
        await this.loadUsers();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async transferSuperAdmin(u) {
      if (!confirm(`确认将超级管理员转让给「${u.username}」？\n转让后你将降为普通用户，此操作不可撤销！`)) return;
      if (!confirm('再次确认：真的要转让超级管理员吗？')) return;
      try {
        await api('/api/superadmin/transfer/' + u.id, { method: 'PUT' });
        Alpine.store('toast').show('超级管理员已转让');
        await Alpine.store('auth').load();
        location.href = '/';
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async toggleMute(u) {
      if (!confirm(`确认${u.muted ? '解禁' : '禁言'}用户「${u.username}」？`)) return;
      try {
        await api('/api/admin/users/' + u.id + '/mute', { method: 'PUT' });
        Alpine.store('toast').show(u.muted ? '已解禁' : '已禁言');
        await this.loadUsers();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteUser(u) {
      if (!confirm(`确定删除用户「${u.username}」？\n其帖子、评论、点赞、签到将一并删除，且不可恢复。`)) return;
      try {
        await api('/api/admin/users/' + u.id, { method: 'DELETE' });
        Alpine.store('toast').show('用户已删除');
        await this.loadUsers();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Shop
    async loadShopItems() {
      try {
        const { items } = await api('/api/admin/shop/items');
        this.shopItems = items || [];
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    resetItemForm() {
      this.itemForm = { name: '', description: '', icon: '', type: 'title', value: '', titleColor: '#4f46e5', price: 0, stock: -1, enabled: true, checkinRequired: 0 };
      this.editingItem = null;
    },

    editItem(item) {
      this.editingItem = item;
      this.itemForm = {
        name: item.name || '',
        description: item.description || '',
        icon: item.icon || '',
        type: item.type || 'title',
        value: item.value || '',
        titleColor: item.title_color || '#4f46e5',
        price: item.price || 0,
        stock: item.stock ?? -1,
        enabled: !!item.enabled,
        checkinRequired: item.checkin_required || 0
      };
      this.showItemForm = true;
    },

    async saveItem() {
      if (!this.itemForm.name.trim()) { Alpine.store('toast').show('请输入商品名称'); return; }
      if (this.itemForm.price < 0) { Alpine.store('toast').show('价格不能为负数'); return; }
      try {
        const body = JSON.stringify(this.itemForm);
        if (this.editingItem) {
          await api('/api/admin/shop/items/' + this.editingItem.id, { method: 'PUT', body });
          Alpine.store('toast').show('商品已更新');
        } else {
          await api('/api/admin/shop/items', { method: 'POST', body });
          Alpine.store('toast').show('商品已添加');
        }
        this.showItemForm = false;
        this.resetItemForm();
        await this.loadShopItems();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async toggleItemEnabled(item) {
      try {
        await api('/api/admin/shop/items/' + item.id, { method: 'PUT', body: JSON.stringify({ enabled: !item.enabled }) });
        Alpine.store('toast').show(item.enabled ? '已下架' : '已上架');
        await this.loadShopItems();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteItem(item) {
      if (!confirm(`确定删除商品「${item.name}」？`)) return;
      try {
        const data = await api('/api/admin/shop/items/' + item.id, { method: 'DELETE' });
        Alpine.store('toast').show(data.message || '已删除');
        await this.loadShopItems();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Codes
    async loadCodes() {
      try {
        const { codes } = await api('/api/admin/redemption-codes');
        this.codes = codes || [];
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async createCode() {
      if (!this.codeForm.rewardValue || this.codeForm.rewardValue <= 0) { Alpine.store('toast').show('请输入有效的奖励值'); return; }
      try {
        const { code } = await api('/api/admin/redemption-codes', { method: 'POST', body: JSON.stringify(this.codeForm) });
        Alpine.store('toast').show('兑换码已创建: ' + code.code);
        this.showCodeForm = false;
        this.codeForm = { rewardType: 'points', rewardValue: 100, maxUses: 1, expiresAt: '' };
        await this.loadCodes();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteCode(code) {
      if (!confirm(`确定删除兑换码「${code.code}」？`)) return;
      try {
        await api('/api/admin/redemption-codes/' + code.id, { method: 'DELETE' });
        Alpine.store('toast').show('已删除');
        await this.loadCodes();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Orders
    async loadOrders(page) {
      try {
        const p = page || 1;
        const data = await api('/api/admin/shop/orders?page=' + p + '&limit=20');
        this.orders = data.orders || [];
        this.ordersPagination = data.pagination || null;
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // SMTP
    async loadSmtp() {
      try {
        const data = await api('/api/admin/smtp');
        this.smtp = {
          host: data.smtpHost || '',
          port: data.smtpPort || '465',
          secure: data.smtpSecure !== false,
          user: data.smtpUser || '',
          pass: '',
          configured: data.configured || false
        };
      } catch (e) {}
    },

    async saveSmtp() {
      try {
        await api('/api/admin/smtp', { method: 'PUT', body: JSON.stringify(this.smtp) });
        this.smtpStatus = '✓ 配置已保存'; this.smtpStatusOk = true;
        setTimeout(() => { this.smtpStatus = ''; }, 3000);
      } catch (e) { this.smtpStatus = '✗ ' + e.message; this.smtpStatusOk = false; }
    },

    async testSmtp() {
      this.smtpStatus = '测试中...'; this.smtpStatusOk = true;
      try {
        const data = await api('/api/admin/smtp/test', { method: 'POST' });
        this.smtpStatus = '✓ ' + data.message; this.smtpStatusOk = true;
      } catch (e) { this.smtpStatus = '✗ ' + e.message; this.smtpStatusOk = false; }
    },

    // Bots
    async loadCategories() {
      try {
        const { categories } = await api('/api/categories');
        this.categories = categories || [];
      } catch (e) { this.categories = []; }
    },

    async loadBots() {
      try {
        const { bots } = await api('/api/admin/bots');
        this.bots = bots || [];
      } catch (e) { this.bots = []; }
    },

    showBotForm(bot) {
      if (bot) {
        this.editingBotId = bot.id;
        this.botForm = { name: bot.name, rssUrl: bot.rss_url, category: bot.category, intervalMinutes: bot.interval_minutes };
      } else {
        this.editingBotId = null;
        this.botForm = { name: '', rssUrl: '', category: 'tech', intervalMinutes: 30 };
      }
      this.showBotFormFlag = true;
    },

    async saveBot() {
      if (!this.botForm.name.trim() || !this.botForm.rssUrl.trim()) {
        Alpine.store('toast').show('请填写名称和RSS地址');
        return;
      }
      try {
        if (this.editingBotId) {
          await api('/api/admin/bots/' + this.editingBotId, { method: 'PUT', body: JSON.stringify(this.botForm) });
        } else {
          await api('/api/admin/bots', { method: 'POST', body: JSON.stringify(this.botForm) });
        }
        Alpine.store('toast').show('保存成功');
        this.showBotFormFlag = false;
        await this.loadBots();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async toggleBot(bot) {
      try {
        await api('/api/admin/bots/' + bot.id, { method: 'PUT', body: JSON.stringify({ enabled: !bot.enabled }) });
        Alpine.store('toast').show(bot.enabled ? '已禁用' : '已启用');
        await this.loadBots();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async fetchBot(botId) {
      Alpine.store('toast').show('正在拉取...');
      try {
        const data = await api('/api/admin/bots/' + botId + '/fetch', { method: 'POST' });
        Alpine.store('toast').show(data.message || '拉取完成');
        await this.loadBots();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteBot(bot) {
      if (!confirm(`确定删除BOT「${bot.name}」？`)) return;
      try {
        await api('/api/admin/bots/' + bot.id, { method: 'DELETE' });
        Alpine.store('toast').show('已删除');
        await this.loadBots();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Games
    async loadGames() {
      try {
        const { games } = await api('/api/admin/games');
        this.games = games || [];
      } catch (e) { this.games = []; }
    },

    showGameForm(game) {
      if (game) {
        this.editingGameId = game.id;
        this.gameForm = {
          name: game.name,
          description: game.description || '',
          url: game.url,
          icon: game.icon || '🎮',
          author: game.author || '',
          gameType: game.game_type || 'single',
          sourceType: game.source_type || 'closed',
          sortOrder: game.sort_order || 0
        };
      } else {
        this.editingGameId = null;
        this.gameForm = { name: '', description: '', url: '', icon: '🎮', author: '', gameType: 'single', sourceType: 'closed', sortOrder: 0 };
      }
      this.showGameFormFlag = true;
    },

    async saveGame() {
      if (!this.gameForm.name.trim() || !this.gameForm.url.trim()) {
        Alpine.store('toast').show('请填写名称和地址');
        return;
      }
      try {
        if (this.editingGameId) {
          await api('/api/admin/games/' + this.editingGameId, { method: 'PUT', body: JSON.stringify(this.gameForm) });
        } else {
          await api('/api/admin/games', { method: 'POST', body: JSON.stringify(this.gameForm) });
        }
        Alpine.store('toast').show('保存成功');
        this.showGameFormFlag = false;
        await this.loadGames();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async toggleGame(game) {
      try {
        await api('/api/admin/games/' + game.id, { method: 'PUT', body: JSON.stringify({ enabled: !game.enabled }) });
        Alpine.store('toast').show(game.enabled ? '已禁用' : '已启用');
        await this.loadGames();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteGame(game) {
      if (!confirm(`确定删除游戏「${game.name}」？`)) return;
      try {
        await api('/api/admin/games/' + game.id, { method: 'DELETE' });
        Alpine.store('toast').show('已删除');
        await this.loadGames();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // About
    async loadVersion() {
      try {
        const data = await api('/api/admin/version');
        this.aboutVersion = data.version || '-';
      } catch (e) {}
    },

    async checkUpdate() {
      this.updateChecking = true; this.updateResult = ''; this.updateHasNew = false;
      try {
        const data = await api('/api/admin/check-update');
        if (data.hasUpdate) {
          this.updateResult = `发现新版本 v${esc(data.latestVersion)} <a href="${escAttr(data.releaseUrl)}" target="_blank" class="underline">查看详情</a>`;
          this.updateResultOk = false;
          this.updateHasNew = true;
        } else {
          this.updateResult = data.message || '✓ 已是最新版本';
          this.updateResultOk = true;
        }
      } catch (e) { this.updateResult = '✗ ' + e.message; this.updateResultOk = false; }
      this.updateChecking = false;
    },

    async doUpdate() {
      this.updateResult = '正在更新...'; this.updateResultOk = true;
      try {
        const data = await api('/api/admin/update', { method: 'POST' });
        this.updateResult = '✓ ' + data.message; this.updateResultOk = true; this.updateHasNew = false;
      } catch (e) { this.updateResult = '✗ ' + e.message; this.updateResultOk = false; }
    }
  }));
});
