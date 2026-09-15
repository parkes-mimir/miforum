/**
 * shop.js - 积分商店页面逻辑
 */

document.addEventListener('alpine:init', () => {
  Alpine.store('shop', {
    items: [],
    orders: [],
    loading: true,

    async loadItems() {
      try {
        const { items } = await api('/api/shop/items');
        this.items = items;
      } catch (e) {
        Alpine.store('toast').show('加载商品失败');
      }
    },

    async loadOrders() {
      try {
        const { orders } = await api('/api/shop/orders');
        this.orders = orders;
      } catch (e) {}
    },

    async load() {
      await Alpine.store('auth').load();
      await Promise.all([this.loadItems(), this.loadOrders()]);
      this.loading = false;
    }
  });

  window.shopPage = Alpine.data('shopPage', () => ({
    exchangeOpen: false,
    exchangeItem: null,
    exchanging: false,
    redeemCode: '',
    redeeming: false,

    get items() { return Alpine.store('shop').items; },
    get orders() { return Alpine.store('shop').orders; },
    get loading() { return Alpine.store('shop').loading; },
    get user() { return Alpine.store('auth').user; },
    get userPoints() { return this.user?.points || 0; },

    get exchangeRemaining() {
      if (!this.exchangeItem) return 0;
      return (this.user?.points || 0) - this.exchangeItem.price;
    },

    get exchangePreviewBeforeHtml() {
      const u = this.user;
      if (!u) return '';
      const letter = (u.username || '?')[0].toUpperCase();
      if (u.avatar_url) return `<img src="${escAttr(u.avatar_url)}" class="w-full h-full object-cover rounded-full" alt="">`;
      return letter;
    },

    get exchangePreviewAfterStyle() {
      if (!this.exchangeItem || this.exchangeItem.type !== 'avatar_frame') return '';
      const s = FRAME_STYLES;
      const val = this.exchangeItem.value;
      if (s[val]) return `background:${s[val]};padding:3px;border-radius:9999px;display:inline-flex`;
      return '';
    },

    async init() {
      await Alpine.store('shop').load();
    },

    showExchangeModal(item) {
      if (!this.user) {
        Alpine.store('toast').show('请先登录');
        return;
      }
      this.exchangeItem = item;
      this.exchangeOpen = true;
      this.exchanging = false;
    },

    hideExchangeModal() {
      this.exchangeOpen = false;
      this.exchangeItem = null;
    },

    async confirmExchange() {
      if (!this.exchangeItem || this.exchangeRemaining < 0 || this.exchanging) return;
      this.exchanging = true;
      try {
        const result = await api('/api/shop/exchange', {
          method: 'POST',
          body: JSON.stringify({ itemId: this.exchangeItem.id })
        });
        Alpine.store('toast').show(result.message);
        Alpine.store('auth').user.points = result.points;
        if (result.renameChances !== undefined) Alpine.store('auth').user.rename_chances = result.renameChances;
        this.hideExchangeModal();
        await Alpine.store('shop').loadOrders();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      } finally {
        this.exchanging = false;
      }
    },

    async redeemCodeFn() {
      if (!this.redeemCode.trim() || this.redeeming) return;
      this.redeeming = true;
      try {
        const result = await api('/api/redemption/redeem', {
          method: 'POST',
          body: JSON.stringify({ code: this.redeemCode.trim() })
        });
        Alpine.store('toast').show(result.message);
        if (result.points !== undefined) Alpine.store('auth').user.points = result.points;
        this.redeemCode = '';
        await Alpine.store('shop').loadOrders();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      } finally {
        this.redeeming = false;
      }
    }
  }));
});
