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
        console.error('加载商品失败:', e);
        Alpine.store('toast').show('加载商品失败');
      }
    },

    async loadOrders() {
      try {
        const { orders } = await api('/api/shop/orders');
        this.orders = orders;
      } catch (e) {
        console.error('加载兑换记录失败:', e);
      }
    },

    async load() {
      await Alpine.store('auth').load();
      await Promise.all([this.loadItems(), this.loadOrders()]);
      this.loading = false;
    }
  });

  Alpine.store('exchange', {
    open: false,
    item: null,
    exchanging: false,

    show(item) {
      this.item = item;
      this.open = true;
      this.exchanging = false;
    },

    hide() {
      this.open = false;
      this.item = null;
    },

    get remaining() {
      if (!this.item) return 0;
      return (Alpine.store('auth').user?.points || 0) - this.item.price;
    },

    get previewBeforeHtml() {
      const user = Alpine.store('auth').user;
      if (!user) return '';
      const letter = user.username ? user.username[0].toUpperCase() : '?';
      if (user.avatar_url) return `<img src="${user.avatar_url}" class="w-full h-full object-cover rounded-full">`;
      return letter;
    },

    get previewAfterHtml() {
      return this.previewBeforeHtml;
    },

    get previewAfterStyle() {
      if (!this.item || this.item.type !== 'avatar_frame') return '';
      const frameStyles = {
        gold: 'box-shadow: 0 0 0 3px #fbbf24, 0 0 8px #fbbf2440',
        silver: 'border: 3px solid #94a3b8',
        blue: 'box-shadow: 0 0 0 3px #3b82f6, 0 0 8px #3b82f640',
        purple: 'box-shadow: 0 0 0 3px #a855f7, 0 0 12px #a855f740'
      };
      return frameStyles[this.item.value] || '';
    },

    async confirmExchange() {
      if (!this.item || this.remaining < 0 || this.exchanging) return;
      this.exchanging = true;
      try {
        const result = await api('/api/shop/exchange', {
          method: 'POST',
          body: JSON.stringify({ itemId: this.item.id })
        });

        Alpine.store('toast').show(result.message);
        Alpine.store('auth').user.points = result.points;
        if (result.rename_chances !== undefined) Alpine.store('auth').user.rename_chances = result.rename_chances;

        if (this.item.type === 'rename_card') {
          Alpine.store('toast').show(`当前改名卡：${result.rename_chances} 张`);
        } else if (this.item.type === 'title') {
          Alpine.store('toast').show(`称号已更换为「${this.item.value}」`);
        } else if (this.item.type === 'avatar_frame') {
          Alpine.store('toast').show(`头像框已${this.item.value === 'none' ? '移除' : '更换'}`);
        }

        this.hide();
        await Alpine.store('shop').loadOrders();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      } finally {
        this.exchanging = false;
      }
    }
  });

  window.shopPage = Alpine.data('shopPage', () => ({
    get items() { return Alpine.store('shop').items; },
    get orders() { return Alpine.store('shop').orders; },
    get loading() { return Alpine.store('shop').loading; },

    get user() {
      return Alpine.store('auth').user;
    },

    get userPoints() {
      return this.user?.points || 0;
    },

    async init() {
      await Alpine.store('shop').load();
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

    showExchangeModal(item) {
      if (!this.user) {
        Alpine.store('toast').show('请先登录');
        return;
      }
      Alpine.store('exchange').show(item);
    }
  }));
});
