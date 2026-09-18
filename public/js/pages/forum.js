document.addEventListener('alpine:init', () => {
  // ============================================================
  // Forum Page Component
  // ============================================================
  window.forumPage = Alpine.data('forumPage', () => ({
    // State
    loading: true,
    sidebarOpen: false,
    searchQuery: '',
    currentCat: 'hot',
    currentTag: null,
    currentSort: 'newest',
    sortOptions: [
      { value: 'newest', label: '最新' },
      { value: 'most_liked', label: '最多赞' },
      { value: 'oldest', label: '最早' }
    ],
    monthNames: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],

    // Data
    categoriesData: [],
    channelsData: [],
    channelBoards: {},
    expandedChannels: {},
    currentChannel: null,

    // Channel management modals
    channelModalOpen: false,
    channelModalMode: 'create',
    channelForm: { name: '', label: '', description: '', icon: '', joinPolicy: 'open' },
    editingChannelId: null,
    boardModalOpen: false,
    boardForm: { name: '', label: '', description: '', icon: '', channelId: null },
    channelSettingsOpen: false,
    channelSettingsTab: 'info',
    channelMembers: [],
    channelSettingsForm: { label: '', description: '', icon: '', joinPolicy: 'open' },
    channelBoardsList: [],
    editingBoardId: null,
    boardEditForm: { label: '', description: '', icon: '', color: 'bg-gray-100 text-gray-700', visibility: 'all', postPolicy: 'members' },
    boardEditOpen: false,
    boardVisibleMembers: [],
    boardMemberSelectOpen: false,
    boardMemberCandidates: [],
    joinChannelModalOpen: false,
    joinChannelId: null,
    joinChannelName: '',
    joinReason: '',
    channelRequests: [],
    channelRequestsOpen: false,

    // Game modal
    gameModalOpen: false,
    games: [],

    posts: [],
    tagCloud: [],
    likedIds: new Set(),
    bookmarkedIds: new Set(),
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    statPosts: '-',
    statComments: '-',

    // Checkin
    checkinLoaded: false,
    todayCheckedIn: false,
    checkinStreak: 0,
    checkinTotal: 0,
    userPoints: 0,

    // Calendar
    checkinModalOpen: false,
    showMonthPicker: false,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    calCheckinSet: new Set(),
    calMissedSet: new Set(),
    calTodayStr: '',
    calStats: { currentStreak: 0, longestStreak: 0, totalDays: 0, missedCount: 0 },
    retroactiveCost: 10,
    retroactiveLoading: false,

    // New post modal
    newPostOpen: false,
    editingPostId: null,
    newPostTitle: '',
    newPostCategory: 'tech',
    newPostContent: '',
    newPostPrivate: false,
    newPostTags: [],
    selectedImages: [],
    dragImageIdx: null,
    showPollForm: false,
    pollQuestion: '',
    pollOptions: ['', ''],
    pollMultiple: false,
    pollDuration: '',
    submittingPost: false,

    // Category modal
    categoryModalOpen: false,
    newCatName: '',
    newCatLabel: '',

    // Create section
    createSectionOpen: false,
    newSection: { name: '', label: '', description: '', icon: '' },

    // Admin
    adminPanelOpen: false,
    adminTab: 'users',
    adminUsers: [],
    adminShopItems: [],
    adminOrders: [],
    adminOrdersPagination: null,
    showShopItemForm: false,
    editingShopItem: null,
    shopItemForm: { name: '', description: '', icon: '', type: 'title', value: '', titleColor: '#4f46e5', price: 0, stock: -1, enabled: true, checkinRequired: 0 },

    // Redemption codes
    redemptionCodes: [],
    showCodeForm: false,
    codeForm: { rewardType: 'points', rewardValue: 100, maxUses: 1, expiresAt: '' },

    smtp: { host: '', port: '465', secure: true, user: '', pass: '', configured: false },
    smtpStatus: '',
    smtpStatusOk: true,
    aboutVersion: '-',
    updateChecking: false,
    updateResult: '',
    updateResultOk: true,
    updateHasNew: false,

    // Computed
    get user() { return Alpine.store('auth').user; },
    get isLoggedIn() { return Alpine.store('auth').isLoggedIn; },
    get isAdmin() { return Alpine.store('auth').isAdmin; },
    get isSuperAdmin() { return Alpine.store('auth').isSuperAdmin; },

    get userAvatarHtml() {
      if (!this.user) return '';
      return avatarHtml(this.user.avatar_url, this.user.username[0].toUpperCase(), 'w-8 h-8', this.user.avatar_frame);
    },

    get roleLabel() {
      if (!this.user) return '';
      return this.isSuperAdmin ? '超管' : this.isAdmin ? '管理' : '';
    },

    get roleBadgeClass() {
      if (!this.user) return '';
      return this.user.role === 'super_admin' ? 'bg-red-500 text-white' : this.user.role === 'admin' ? 'bg-amber-500 text-white' : '';
    },

    get unreadCount() {
      return this._unreadCount || 0;
    },

    get pageTitle() {
      if (this.currentTag) return '标签: #' + this.currentTag;
      if (this.searchQuery) return '搜索: ' + this.searchQuery;
      return this.catLabel(this.currentCat);
    },

    get pageSub() {
      if (this.currentTag || this.searchQuery) return '';
      if (this.currentCat === 'hot') return '根据你的兴趣推荐的热门帖子';
      const cat = this.categoriesData.find(c => c.name === this.currentCat);
      if (cat && cat.sectionType === 'announcement') return '官方公告和通知';
      if (cat && cat.description) return cat.description;
      return '欢迎来到社区，参与讨论吧';
    },

    get specialCategories() {
      return this.categoriesData.filter(c => c.sectionType === 'announcement' || c.sectionType === 'hot');
    },

    get normalCategories() {
      return this.categoriesData.filter(c => c.sectionType === 'normal');
    },

    get postableCategories() {
      return this.categoriesData.filter(c => c.sectionType !== 'hot');
    },

    get paginationRange() {
      const { page, pages } = this.pagination;
      const range = [];
      const maxVisible = 5;
      let start = Math.max(1, page - Math.floor(maxVisible / 2));
      let end = Math.min(pages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
      for (let i = start; i <= end; i++) range.push(i);
      return range;
    },

    get calendarCells() {
      const firstDay = new Date(this.calYear, this.calMonth, 1);
      const lastDay = new Date(this.calYear, this.calMonth + 1, 0);
      const startPad = firstDay.getDay();
      const totalDays = lastDay.getDate();
      const prevLast = new Date(this.calYear, this.calMonth, 0);
      const prevDays = prevLast.getDate();
      const cells = [];

      for (let i = 0; i < 42; i++) {
        let d, y, m, isCurrent = true;
        if (i < startPad) {
          d = prevDays - startPad + 1 + i;
          y = this.calMonth === 0 ? this.calYear - 1 : this.calYear;
          m = this.calMonth === 0 ? 12 : this.calMonth;
          isCurrent = false;
        } else if (i >= startPad + totalDays) {
          d = i - startPad - totalDays + 1;
          y = this.calMonth === 11 ? this.calYear + 1 : this.calYear;
          m = this.calMonth === 11 ? 1 : this.calMonth + 2;
          isCurrent = false;
        } else {
          d = i - startPad + 1;
          y = this.calYear;
          m = this.calMonth + 1;
        }
        const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!isCurrent) {
          cells.push({ day: d, cls: 'cal-cell', style: 'color:#d1d5db', clickable: false, dateStr: ds, missed: false, title: '' });
          continue;
        }
        let cls = 'cal-cell';
        let clickable = false;
        let missed = false;
        let title = '';
        if (ds > this.calTodayStr) { /* future */ }
        else if (this.calCheckinSet.has(ds)) { cls += ' checked'; }
        else if (this.calMissedSet.has(ds)) { cls += ' missed'; clickable = true; missed = true; title = '点击补签'; }
        if (ds === this.calTodayStr) cls += ' today';
        cells.push({ day: d, cls, style: '', clickable, dateStr: ds, missed, title });
      }
      return cells;
    },

    // Methods
    async init() {
      await Alpine.store('auth').load();
      this.userPoints = this.user?.points || 0;
      await Promise.all([this.loadCategories(), this.loadChannels()]);
      await this.loadCheckin();
      // Read URL params
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      const tag = params.get('tag');
      const sort = params.get('sort');
      const search = params.get('search');
      if (sort && ['newest', 'most_liked', 'oldest'].includes(sort)) this.currentSort = sort;
      if (search) this.searchQuery = search;
      await this.loadPosts(1);
      if (cat && this.catExists(cat)) this.filterCategory(cat);
      if (tag) this.filterByTag(tag);
      if (this.user?.force_password_change) {
        setTimeout(() => { const el = document.querySelector('[x-data*="changePasswordModal"]'); if (el && el.__x) el.__x.$data.show(); }, 1000);
      }
      if (this.isLoggedIn) this.loadUnreadCounts();
      window.addEventListener('auth-changed', async () => {
        this.userPoints = this.user?.points || 0;
        await this.loadCategories();
        await this.loadCheckin();
        await this.loadPosts(1);
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isLoggedIn) this.loadUnreadCounts();
      });
    },

    async loadUnreadCounts() {
      try {
        const [n, m] = await Promise.all([
          api('/api/notifications/unread-count'),
          api('/api/messages/unread-count')
        ]);
        this._unreadCount = (n.unread || 0) + (m.unread || 0);
      } catch (e) {}
    },

    async loadCategories() {
      try {
        const { categories } = await api('/api/categories');
        this.categoriesData = categories;
        if (this.postableCategories.length && !this.postableCategories.find(c => c.name === this.newPostCategory)) {
          this.newPostCategory = this.postableCategories[0]?.name || 'tech';
        }
      } catch (e) {}
    },

    async loadChannels() {
      try {
        const { channels } = await api('/api/channels');
        this.channelsData = channels || [];
        // 初始化频道展开状态（确保 Alpine.js 响应式）
        const expanded = {};
        const boards = {};
        this.channelsData.forEach(ch => {
          expanded[ch.id] = this.expandedChannels[ch.id] || false;
          boards[ch.id] = this.channelBoards[ch.id] || null;
        });
        this.expandedChannels = expanded;
        this.channelBoards = boards;
        // 自动展开官方频道
        const official = this.channelsData.find(c => c.is_official);
        if (official) {
          this.expandedChannels[official.id] = true;
          await this.loadChannelBoards(official.id);
        }
      } catch (e) {}
    },

    async loadChannelBoards(channelId) {
      try {
        const { boards } = await api('/api/channels/' + channelId + '/boards');
        // 创建新对象确保 Alpine.js 响应式触发
        this.channelBoards = { ...this.channelBoards, [channelId]: boards || [] };
      } catch (e) {
        this.channelBoards = { ...this.channelBoards, [channelId]: [] };
      }
    },

    async toggleChannel(channelId) {
      // 创建新对象确保 Alpine.js 响应式触发
      this.expandedChannels = { ...this.expandedChannels, [channelId]: !this.expandedChannels[channelId] };
      if (this.expandedChannels[channelId] && !this.channelBoards[channelId]) {
        await this.loadChannelBoards(channelId);
      }
    },

    showCreateChannelModal() {
      this.channelModalMode = 'create';
      this.channelForm = { name: '', label: '', description: '', icon: '', joinPolicy: 'open' };
      this.editingChannelId = null;
      this.channelModalOpen = true;
    },

    showEditChannelModal(ch) {
      this.channelModalMode = 'edit';
      this.channelForm = {
        name: ch.name,
        label: ch.label,
        description: ch.description || '',
        icon: ch.icon || '',
        joinPolicy: ch.join_policy || 'open'
      };
      this.editingChannelId = ch.id;
      this.channelModalOpen = true;
    },

    async saveChannel() {
      if (!this.channelForm.name.trim() || !this.channelForm.label.trim()) {
        Alpine.store('toast').show('请填写频道标识和名称');
        return;
      }
      try {
        if (this.channelModalMode === 'create') {
          await api('/api/channels', { method: 'POST', body: JSON.stringify(this.channelForm) });
          Alpine.store('toast').show('频道创建成功');
        } else {
          await api('/api/channels/' + this.editingChannelId, { method: 'PUT', body: JSON.stringify(this.channelForm) });
          Alpine.store('toast').show('频道已更新');
        }
        this.channelModalOpen = false;
        await this.loadChannels();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async deleteChannel(ch) {
      if (!confirm(`确定删除频道「${ch.label}」？\n该频道下的所有板块将一并删除。`)) return;
      try {
        await api('/api/channels/' + ch.id, { method: 'DELETE' });
        Alpine.store('toast').show('频道已删除');
        await this.loadChannels();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    showCreateBoardModal(channelId) {
      this.boardForm = { name: '', label: '', description: '', icon: '', channelId };
      this.boardModalOpen = true;
    },

    async saveBoard() {
      if (!this.boardForm.name.trim() || !this.boardForm.label.trim()) {
        Alpine.store('toast').show('请填写板块标识和名称');
        return;
      }
      try {
        await api('/api/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: this.boardForm.name,
            label: this.boardForm.label,
            description: this.boardForm.description,
            icon: this.boardForm.icon,
            channelId: this.boardForm.channelId
          })
        });
        Alpine.store('toast').show('板块创建成功');
        this.boardModalOpen = false;
        await this.loadChannelBoards(this.boardForm.channelId);
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    showChannelSettings(ch) {
      this.channelSettingsForm = {
        label: ch.label,
        description: ch.description || '',
        icon: ch.icon || '',
        joinPolicy: ch.join_policy || 'open'
      };
      this.editingChannelId = ch.id;
      this.channelSettingsTab = 'info';
      this.channelSettingsOpen = true;
      this.loadChannelMembers(ch.id);
      this.loadChannelBoardsList(ch.id);
    },

    async loadChannelMembers(channelId) {
      try {
        const { members } = await api('/api/channels/' + channelId + '/members');
        this.channelMembers = members || [];
      } catch (e) {
        this.channelMembers = [];
      }
    },

    async saveChannelSettings() {
      try {
        await api('/api/channels/' + this.editingChannelId, {
          method: 'PUT',
          body: JSON.stringify(this.channelSettingsForm)
        });
        Alpine.store('toast').show('频道设置已保存');
        this.channelSettingsOpen = false;
        await this.loadChannels();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async leaveChannel(channelId, channelName) {
      if (!confirm(`确定退出频道「${channelName}」？`)) return;
      try {
        await api('/api/channels/' + channelId + '/leave', { method: 'POST' });
        Alpine.store('toast').show('已退出频道');
        await this.loadChannels();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async setMemberRole(userId, role) {
      try {
        await api('/api/channels/' + this.editingChannelId + '/members/' + userId + '/role', {
          method: 'PUT',
          body: JSON.stringify({ role })
        });
        Alpine.store('toast').show('角色已更新');
        await this.loadChannelMembers(this.editingChannelId);
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async removeMember(userId, username) {
      if (!confirm(`确定移除成员「${username}」？`)) return;
      try {
        await api('/api/channels/' + this.editingChannelId + '/members/' + userId, { method: 'DELETE' });
        Alpine.store('toast').show('已移除成员');
        await this.loadChannelMembers(this.editingChannelId);
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async deleteChannel(channelId, channelName) {
      if (!confirm(`确定删除频道「${channelName}」？\n该频道下的所有板块和帖子将被删除，此操作不可撤销。`)) return;
      try {
        await api('/api/channels/' + channelId, { method: 'DELETE' });
        Alpine.store('toast').show('频道已删除');
        await this.loadChannels();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async transferChannel(userId, username) {
      if (!confirm(`确定将频道转让给「${username}」？\n转让后您将变为管理员，对方将成为频道主。`)) return;
      try {
        await api('/api/channels/' + this.editingChannelId + '/transfer', {
          method: 'PUT',
          body: JSON.stringify({ targetUserId: userId })
        });
        Alpine.store('toast').show('频道已转让');
        this.channelSettingsOpen = false;
        await this.loadChannels();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async loadChannelBoardsList(channelId) {
      try {
        const { boards } = await api('/api/channels/' + channelId + '/boards');
        this.channelBoardsList = boards || [];
      } catch (e) {
        this.channelBoardsList = [];
      }
    },

    showBoardEdit(board) {
      this.editingBoardId = board.id;
      this.boardEditForm = {
        label: board.label || '',
        description: board.description || '',
        icon: board.icon || '',
        color: board.color || 'bg-gray-100 text-gray-700',
        visibility: board.visibility || 'all',
        postPolicy: board.postPolicy || 'members'
      };
      this.boardVisibleMembers = [];
      this.boardEditOpen = true;
      this.loadBoardVisibleMembers(board.id);
    },

    async saveBoardEdit() {
      if (!this.boardEditForm.label.trim()) {
        Alpine.store('toast').show('请填写板块名称');
        return;
      }
      try {
        await api('/api/channels/' + this.editingChannelId + '/boards/' + this.editingBoardId, {
          method: 'PUT',
          body: JSON.stringify(this.boardEditForm)
        });
        Alpine.store('toast').show('板块已更新');
        this.boardEditOpen = false;
        await this.loadChannelBoardsList(this.editingChannelId);
        await this.loadChannelBoards(this.editingChannelId);
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async deleteBoard(board) {
      if (!confirm(`确定删除板块「${board.label}」？\n该板块下的帖子将移至未分类。`)) return;
      try {
        await api('/api/channels/' + this.editingChannelId + '/boards/' + board.id, { method: 'DELETE' });
        Alpine.store('toast').show('板块已删除');
        await this.loadChannelBoardsList(this.editingChannelId);
        await this.loadChannelBoards(this.editingChannelId);
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async loadBoardVisibleMembers(boardId) {
      try {
        const { members } = await api('/api/channels/' + this.editingChannelId + '/boards/' + boardId + '/members');
        this.boardVisibleMembers = members || [];
      } catch (e) {
        this.boardVisibleMembers = [];
      }
    },

    async showBoardMemberSelect() {
      // 加载频道成员作为候选
      try {
        const { members } = await api('/api/channels/' + this.editingChannelId + '/members');
        const existingIds = new Set(this.boardVisibleMembers.map(m => m.user_id));
        this.boardMemberCandidates = (members || []).filter(m => !existingIds.has(m.user_id));
        this.boardMemberSelectOpen = true;
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async addBoardVisibleMembers(userIds) {
      try {
        await api('/api/channels/' + this.editingChannelId + '/boards/' + this.editingBoardId + '/members', {
          method: 'POST',
          body: JSON.stringify({ userIds })
        });
        Alpine.store('toast').show('已添加');
        this.boardMemberSelectOpen = false;
        await this.loadBoardVisibleMembers(this.editingBoardId);
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async removeBoardVisibleMember(userId) {
      try {
        await api('/api/channels/' + this.editingChannelId + '/boards/' + this.editingBoardId + '/members/' + userId, {
          method: 'DELETE'
        });
        Alpine.store('toast').show('已移除');
        await this.loadBoardVisibleMembers(this.editingBoardId);
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    showJoinChannelModal(ch) {
      this.joinChannelId = ch.id;
      this.joinChannelName = ch.label;
      this.joinReason = '';
      this.joinChannelModalOpen = true;
    },

    async joinChannel() {
      try {
        const result = await api('/api/channels/' + this.joinChannelId + '/join', {
          method: 'POST',
          body: JSON.stringify({ reason: this.joinReason })
        });
        if (result.pending) {
          Alpine.store('toast').show('申请已提交，等待审核');
        } else {
          Alpine.store('toast').show('已加入频道');
        }
        this.joinChannelModalOpen = false;
        await this.loadChannels();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async loadChannelRequests(channelId) {
      try {
        const { requests } = await api('/api/channels/' + channelId + '/requests');
        this.channelRequests = requests || [];
      } catch (e) {
        this.channelRequests = [];
      }
    },

    async showChannelRequests(ch) {
      this.editingChannelId = ch.id;
      this.channelRequestsOpen = true;
      await this.loadChannelRequests(ch.id);
    },

    async reviewRequest(requestId, action) {
      try {
        await api('/api/channels/' + this.editingChannelId + '/requests/' + requestId, {
          method: 'PUT',
          body: JSON.stringify({ action })
        });
        Alpine.store('toast').show(action === 'approve' ? '已批准' : '已拒绝');
        await this.loadChannelRequests(this.editingChannelId);
        await this.loadChannels();
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async showGameModal() {
      // 从API加载游戏列表
      try {
        const { games } = await api('/api/games');
        this.games = games || [];
      } catch (e) {
        this.games = [];
      }
      this.gameModalOpen = true;
    },

    async loadCheckin() {
      if (!this.isLoggedIn) { this.checkinLoaded = false; return; }
      try {
        const res = await api('/api/checkin/auto', { method: 'POST' });
        this.userPoints = res.points;
        if (this.user) this.user.points = res.points;
        if (res.newCheckin) Alpine.store('toast').show('每日签到成功！');
        this.todayCheckedIn = res.checkedIn;
        this.checkinLoaded = true;
      } catch (e) { this.checkinLoaded = false; }
      try {
        const data = await api('/api/checkin/history');
        if (data) {
          this.checkinStreak = data.currentStreak;
          this.checkinTotal = data.totalDays;
        }
      } catch (e) {}
    },

    async loadPosts(page = 1) {
      this.loading = true;
      const params = new URLSearchParams();
      params.set('category', this.currentCat);
      if (this.currentTag) params.set('tag', this.currentTag);
      if (this.searchQuery) params.set('search', this.searchQuery);
      params.set('sort', this.currentSort);
      params.set('page', page);
      params.set('limit', 20);
      try {
        const { posts, pagination } = await api('/api/posts?' + params);
        this.posts = posts.map(p => ({ ...p, _showAllTags: false }));
        this.pagination = pagination;
        if (this.isLoggedIn) {
          try { const { ids } = await api('/api/likes'); this.likedIds = new Set(ids); } catch (e) { this.likedIds = new Set(); }
          try { const b = await api('/api/bookmarks'); this.bookmarkedIds = new Set((b.posts || []).map(p => p.id)); } catch (e) { this.bookmarkedIds = new Set(); }
        } else { this.likedIds = new Set(); this.bookmarkedIds = new Set(); }
        this.statPosts = pagination.total || posts.length;
        this.statComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
        this.loadTagCloud();
      } catch (e) { Alpine.store('toast').show(e.message); }
      this.loading = false;
    },

    async loadTagCloud() {
      try {
        const { tags } = await api('/api/tags');
        this.tagCloud = (tags || []).slice(0, 20);
      } catch (e) {}
    },

    filterCategory(cat) {
      this.currentCat = cat;
      this.currentTag = null;
      this.searchQuery = '';
      this.loadPosts(1);
      if (window.innerWidth < 1024) this.sidebarOpen = false;
    },

    filterByTag(tag) {
      this.currentTag = tag;
      this.searchQuery = '';
      this.loadPosts(1);
    },

    setSort(sort) {
      this.currentSort = sort;
      this.loadPosts(1);
    },

    doSearch() {
      if (!this.searchQuery.trim()) {
        this.currentTag = null;
        this.searchQuery = '';
        this.loadPosts(1);
        // 清除 URL 中的 search 参数
        const url = new URL(window.location);
        url.searchParams.delete('search');
        window.history.replaceState({}, '', url);
        return;
      }
      this.currentTag = null;
      this.currentCat = 'hot';
      this.loadPosts(1);
      // 同步搜索词到 URL
      const url = new URL(window.location);
      url.searchParams.set('search', this.searchQuery.trim());
      window.history.replaceState({}, '', url);
    },

    catLabel(name) {
      if (name === 'hot') return '热门';
      const c = this.categoriesData.find(c => c.name === name);
      return c ? c.label : name;
    },

    catColorClass(name) {
      const c = this.categoriesData.find(c => c.name === name);
      return c ? c.color : 'bg-gray-100 text-gray-600';
    },

    catExists(name) {
      return name === 'hot' || this.categoriesData.some(c => c.name === name);
    },

    postAvatarHtml(p) {
      return avatarHtml(p.author_avatar_url, p.author_name?.[0]?.toUpperCase(), 'w-9 h-9', p.author_avatar_frame);
    },

    renderPostPreview(p) {
      const text = (p.content || '').replace(/\[img:\d+\]/g, '').replace(/\n/g, ' ');
      return renderEmojiInText(text);
    },

    async toggleLike(p) {
      if (!this.isLoggedIn) { Alpine.store('toast').show('请先登录'); Alpine.store('auth').showLogin = true; return; }
      const wasLiked = this.likedIds.has(p.id);
      const oldCount = p.likes_count || 0;

      // 乐观更新 UI
      if (wasLiked) {
        this.likedIds.delete(p.id);
        p.likes_count = Math.max(0, oldCount - 1);
      } else {
        this.likedIds.add(p.id);
        p.likes_count = oldCount + 1;
      }
      this.likedIds = new Set(this.likedIds);

      try {
        if (wasLiked) {
          await api('/api/like/' + p.id, { method: 'DELETE' });
        } else {
          await api('/api/like/' + p.id, { method: 'POST' });
        }
      } catch (e) {
        // 回滚 UI 状态
        if (wasLiked) {
          this.likedIds.add(p.id);
          p.likes_count = oldCount;
        } else {
          this.likedIds.delete(p.id);
          p.likes_count = oldCount;
        }
        this.likedIds = new Set(this.likedIds);
        Alpine.store('toast').show(e.message);
      }
    },

    /** 切换收藏状态（乐观更新，失败自动回滚） */
    async toggleBookmark(p) {
      if (!this.isLoggedIn) { Alpine.store('toast').show('请先登录'); Alpine.store('auth').showLogin = true; return; }
      const wasBookmarked = this.bookmarkedIds.has(p.id);

      // 乐观更新 UI
      if (wasBookmarked) {
        this.bookmarkedIds.delete(p.id);
      } else {
        this.bookmarkedIds.add(p.id);
      }
      this.bookmarkedIds = new Set(this.bookmarkedIds);

      try {
        if (wasBookmarked) {
          await api('/api/bookmark/' + p.id, { method: 'DELETE' });
          Alpine.store('toast').show('已取消收藏');
        } else {
          await api('/api/bookmark/' + p.id, { method: 'POST' });
          Alpine.store('toast').show('收藏成功');
        }
      } catch (e) {
        // 回滚 UI 状态
        if (wasBookmarked) {
          this.bookmarkedIds.add(p.id);
        } else {
          this.bookmarkedIds.delete(p.id);
        }
        this.bookmarkedIds = new Set(this.bookmarkedIds);
        Alpine.store('toast').show(e.message);
      }
    },

    async togglePinPost(p) {
      try {
        await api('/api/posts/' + p.id + '/pin', { method: 'PUT' });
        Alpine.store('toast').show(p.pinned ? '已取消置顶' : '已置顶');
        await this.loadPosts(this.pagination.page);
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async adminDeletePost(pid) {
      if (!confirm('确定删除这篇帖子？')) return;
      try {
        await api('/api/posts/' + pid, { method: 'DELETE' });
        Alpine.store('toast').show('帖子已删除');
        await this.loadPosts(1);
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // New Post
    showNewPostModal() {
      if (!this.isLoggedIn) { Alpine.store('toast').show('请先登录'); Alpine.store('auth').showLogin = true; return; }
      this.resetPostForm();
      this.restoreDraft();
      this.newPostOpen = true;
      this._startDraftAutoSave();
    },

    /** 检查表单是否有内容 */
    get hasPostContent() {
      return !!(this.newPostTitle.trim() || this.newPostContent.trim() || this.newPostTags.length > 0 || this.selectedImages.length > 0);
    },

    /** 检查是否有草稿 */
    get hasDraft() {
      try {
        return !!localStorage.getItem('miforum-draft');
      } catch (e) { return false; }
    },

    /** 关闭弹窗（有内容时自动保存草稿） */
    closeNewPostModal() {
      if (this.editingPostId) {
        this.newPostOpen = false;
        return;
      }
      if (this.hasPostContent) {
        this.saveDraft();
        Alpine.store('toast').show('已自动保存为草稿');
      } else {
        this.discardDraft();
      }
      this.newPostOpen = false;
      this._stopDraftAutoSave();
    },

    /** 保存草稿到 localStorage */
    saveDraft() {
      try {
        const draft = {
          title: this.newPostTitle,
          content: this.newPostContent,
          category: this.newPostCategory,
          tags: this.newPostTags,
          isPrivate: this.newPostPrivate,
          showPollForm: this.showPollForm,
          pollQuestion: this.pollQuestion,
          pollOptions: this.pollOptions,
          pollMultiple: this.pollMultiple,
          pollDuration: this.pollDuration,
          savedAt: Date.now()
        };
        localStorage.setItem('miforum-draft', JSON.stringify(draft));
      } catch (e) {}
    },

    /** 从 localStorage 恢复草稿 */
    restoreDraft() {
      try {
        const saved = localStorage.getItem('miforum-draft');
        if (!saved) return;
        const draft = JSON.parse(saved);
        // 草稿超过 7 天自动清除
        if (Date.now() - (draft.savedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem('miforum-draft');
          return;
        }
        this.newPostTitle = draft.title || '';
        this.newPostContent = draft.content || '';
        this.newPostCategory = draft.category || this.postableCategories[0]?.name || 'tech';
        this.newPostTags = draft.tags || [];
        this.newPostPrivate = draft.isPrivate || false;
        this.showPollForm = draft.showPollForm || false;
        this.pollQuestion = draft.pollQuestion || '';
        this.pollOptions = draft.pollOptions || ['', ''];
        this.pollMultiple = draft.pollMultiple || false;
        this.pollDuration = draft.pollDuration || '';
      } catch (e) {}
    },

    /** 清除草稿 */
    discardDraft() {
      try {
        localStorage.removeItem('miforum-draft');
      } catch (e) {}
    },

    /** 开始自动保存草稿（每 5 秒） */
    _startDraftAutoSave() {
      this._stopDraftAutoSave();
      this._draftTimer = setInterval(() => {
        if (this.hasPostContent) this.saveDraft();
      }, 5000);
    },

    /** 停止自动保存 */
    _stopDraftAutoSave() {
      if (this._draftTimer) {
        clearInterval(this._draftTimer);
        this._draftTimer = null;
      }
    },

    resetPostForm() {
      this.editingPostId = null;
      this.newPostTitle = '';
      this.newPostContent = '';
      this.newPostCategory = this.postableCategories[0]?.name || 'tech';
      this.newPostPrivate = false;
      this.newPostTags = [];
      this.selectedImages.forEach(f => { if (f._url) URL.revokeObjectURL(f._url); });
      this.selectedImages = [];
      this.showPollForm = false;
      this.pollQuestion = '';
      this.pollOptions = ['', ''];
      this.pollMultiple = false;
      this.pollDuration = '';
    },

    addTag() {
      const input = this.$refs.tagInputRef;
      const tag = (input?.value || '').trim().replace(/,/g, '');
      if (!tag) return;
      if (this.newPostTags.length >= 10) { Alpine.store('toast').show('最多10个标签'); return; }
      if (tag.length > 20) { Alpine.store('toast').show('标签最多20字'); return; }
      if (this.newPostTags.includes(tag)) { Alpine.store('toast').show('标签重复'); return; }
      this.newPostTags.push(tag);
      input.value = '';
    },

    addPollOption() {
      if (this.pollOptions.length >= 10) { Alpine.store('toast').show('最多10个选项'); return; }
      this.pollOptions.push('');
    },

    removePollOption(idx) {
      if (this.pollOptions.length <= 2) { Alpine.store('toast').show('至少需要2个选项'); return; }
      this.pollOptions.splice(idx, 1);
    },

    handleImageSelect(event) {
      const files = Array.from(event.target.files);
      if (this.selectedImages.length + files.length > 30) { Alpine.store('toast').show('最多上传30张图片'); event.target.value = ''; return; }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
      for (const f of files) {
        if (!allowedTypes.includes(f.type)) { Alpine.store('toast').show(`"${f.name}" 不是支持的图片格式`); continue; }
        if (f.size > 10 * 1024 * 1024) { Alpine.store('toast').show(`"${f.name}" 超过10MB`); continue; }
        f._url = URL.createObjectURL(f);
        this.selectedImages.push(f);
      }
      event.target.value = '';
    },

    insertImageAtCursor(index) {
      const textarea = this.$el?.querySelector('textarea[x-model="newPostContent"]') || document.querySelector('textarea[x-model="newPostContent"]');
      if (!textarea) return;
      const tag = `[img:${index}]`;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      this.newPostContent = value.slice(0, start) + tag + value.slice(end);
      this.$nextTick(() => { textarea.selectionStart = textarea.selectionEnd = start + tag.length; textarea.focus(); });
    },

    dropImage(toIdx) {
      if (this.dragImageIdx === null || this.dragImageIdx === toIdx) return;
      const item = this.selectedImages.splice(this.dragImageIdx, 1)[0];
      this.selectedImages.splice(toIdx, 0, item);
      this.dragImageIdx = null;
    },

    async doNewPost() {
      if (!this.newPostTitle.trim()) { Alpine.store('toast').show('请输入标题'); return; }
      if (!this.newPostContent.trim()) { Alpine.store('toast').show('请输入正文'); return; }
      this.submittingPost = true;
      try {
        const formData = new FormData();
        formData.append('title', this.newPostTitle.trim());
        formData.append('content', this.newPostContent.trim());
        formData.append('category', this.newPostCategory);
        formData.append('tags', JSON.stringify(this.newPostTags));
        formData.append('private', this.newPostPrivate);
        this.selectedImages.forEach(f => formData.append('images', f));
        // Poll
        if (this.showPollForm && this.pollQuestion.trim()) {
          const opts = this.pollOptions.map(o => o.trim()).filter(Boolean);
          if (opts.length >= 2) {
            formData.append('pollQuestion', this.pollQuestion.trim());
            formData.append('pollOptions', JSON.stringify(opts));
            formData.append('pollType', this.pollMultiple ? 'multiple' : 'single');
            formData.append('pollMaxChoices', this.pollMultiple ? opts.length : 1);
            const durationMap = { '1h': 1, '6h': 6, '1d': 24, '3d': 72, '7d': 168, '30d': 720 };
            const hours = durationMap[this.pollDuration];
            if (hours) formData.append('pollCloseAt', new Date(Date.now() + hours * 3600000).toISOString());
          }
        }
        const res = await fetch('/api/posts', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '发布失败');
        this.newPostOpen = false;
        this.discardDraft();
        this._stopDraftAutoSave();
        if (data.points !== undefined) { this.userPoints = data.points; if (this.user) this.user.points = data.points; }
        // 发帖成功后跳转到帖子所在分类
        const postCat = this.newPostCategory || 'tech';
        this.filterCategory(postCat);
        Alpine.store('toast').show('发布成功！');
      } catch (e) { Alpine.store('toast').show(e.message); }
      this.submittingPost = false;
    },

    // Checkin Calendar
    async showCheckinHistory() {
      if (!this.isLoggedIn) { Alpine.store('toast').show('请先登录'); Alpine.store('auth').showLogin = true; return; }
      this.checkinModalOpen = true;
      await this.loadCheckinHistory();
    },

    async loadCheckinHistory() {
      try {
        const data = await api('/api/checkin/history');
        this.calStats = {
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          totalDays: data.totalDays,
          missedCount: data.missedDays.length
        };
        this.retroactiveCost = data.retroactiveCost || 10;
        this.calCheckinSet = new Set(data.checkinDates);
        this.calMissedSet = new Set(data.missedDays);
        this.calTodayStr = new Date().toLocaleDateString('sv-SE');
        const now = new Date();
        this.calYear = now.getFullYear();
        this.calMonth = now.getMonth();
      } catch (e) { Alpine.store('toast').show('加载失败'); }
    },

    calPrev() { this.showMonthPicker = false; this.calMonth--; if (this.calMonth < 0) { this.calMonth = 11; this.calYear--; } },
    calNext() { this.showMonthPicker = false; this.calMonth++; if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; } },
    calGoToday() { this.showMonthPicker = false; const now = new Date(); this.calYear = now.getFullYear(); this.calMonth = now.getMonth(); },
    selectMonth(m) { this.calMonth = m; this.showMonthPicker = false; },

    async doRetroactive(dateStr) {
      if (this.retroactiveLoading) return;
      if (!confirm(`确认补签 ${dateStr}？\n消耗 ${this.retroactiveCost} 积分`)) return;
      this.retroactiveLoading = true;
      try {
        const res = await api('/api/checkin/retroactive', { method: 'POST', body: JSON.stringify({ date: dateStr }) });
        this.userPoints = res.points;
        if (this.user) this.user.points = res.points;
        await this.loadCheckinHistory();
        await this.loadCheckin();
        Alpine.store('toast').show(`补签成功！${dateStr}，剩余 ${res.points} 积分`);
      } catch (e) { Alpine.store('toast').show(e.message); }
      this.retroactiveLoading = false;
    },

    // Category Management
    showCategoryModal() { this.categoryModalOpen = true; },

    async createCategory() {
      if (!this.newCatName.trim() || !this.newCatLabel.trim()) { Alpine.store('toast').show('请填写标识和名称'); return; }
      try {
        await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: this.newCatName.trim(), label: this.newCatLabel.trim(), sectionType: 'normal' }) });
        this.newCatName = ''; this.newCatLabel = '';
        await this.loadCategories();
        Alpine.store('toast').show('分类已添加');
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async editCategory(c) {
      const newLabel = prompt('分类显示名称：', c.label);
      if (!newLabel || newLabel === c.label) return;
      const newDesc = prompt('分类简介（可选）：', c.description || '');
      const newIcon = prompt('图标（emoji，可选）：', c.icon || '');
      try {
        await api('/api/categories/' + c.id, { method: 'PUT', body: JSON.stringify({ label: newLabel, description: newDesc || '', icon: newIcon || '' }) });
        await this.loadCategories();
        Alpine.store('toast').show('分类已更新');
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteCategory(c) {
      if (!confirm(`删除分类「${c.name}」？\n该分类下的帖子将变为未分类。`)) return;
      try {
        await api('/api/categories/' + c.id, { method: 'DELETE' });
        await this.loadCategories();
        if (this.currentCat === c.name) this.filterCategory('hot');
        Alpine.store('toast').show('分类已删除');
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Create Section
    showCreateSectionModal() { this.newSection = { name: '', label: '', description: '', icon: '' }; this.createSectionOpen = true; },

    async doCreateSection() {
      if (!this.newSection.name.trim() || !this.newSection.label.trim()) { Alpine.store('toast').show('请填写标识和名称'); return; }
      try {
        await api('/api/categories/user', { method: 'POST', body: JSON.stringify(this.newSection) });
        this.createSectionOpen = false;
        await this.loadCategories();
        Alpine.store('toast').show('板块创建成功');
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Admin Panel
    showAdminPanel() {
      this.adminPanelOpen = true;
      this.adminTab = 'users';
      this.loadAdminUsers();
    },

    async loadAdminUsers() {
      try {
        const { users } = await api('/api/admin/users');
        this.adminUsers = users;
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    adminAvatarHtml(u) {
      return avatarHtml(u.avatar_url, u.username?.[0]?.toUpperCase(), 'w-9 h-9');
    },

    async toggleMute(u) {
      if (!confirm(`确认${u.muted ? '解禁' : '禁言'}用户「${u.username}」？`)) return;
      try {
        await api('/api/admin/users/' + u.id + '/mute', { method: 'PUT' });
        Alpine.store('toast').show(u.muted ? '已解禁' : '已禁言');
        this.loadAdminUsers();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async adminDeleteUser(u) {
      if (!confirm(`确定删除用户「${u.username}」？\n其帖子、评论、点赞、签到将一并删除，且不可恢复。`)) return;
      try {
        await api('/api/admin/users/' + u.id, { method: 'DELETE' });
        Alpine.store('toast').show('用户已删除');
        this.loadAdminUsers();
        this.loadPosts(1);
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async grantAdmin(u) {
      if (!confirm(`确认将「${u.username}」设为管理员？`)) return;
      try {
        await api('/api/superadmin/grant-admin/' + u.id, { method: 'PUT' });
        Alpine.store('toast').show('已设为管理员');
        this.loadAdminUsers();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async revokeAdmin(u) {
      if (!confirm(`确认撤销「${u.username}」的管理员权限？`)) return;
      try {
        await api('/api/superadmin/revoke-admin/' + u.id, { method: 'PUT' });
        Alpine.store('toast').show('已撤销管理员');
        this.loadAdminUsers();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async transferSuperAdmin(u) {
      if (!confirm(`⚠️ 确认将超级管理员转让给「${u.username}」？\n\n转让后你将降为普通用户，此操作不可撤销！`)) return;
      if (!confirm('再次确认：真的要转让超级管理员吗？')) return;
      try {
        await api('/api/superadmin/transfer/' + u.id, { method: 'PUT' });
        Alpine.store('toast').show('超级管理员已转让');
        await Alpine.store('auth').load();
        this.adminPanelOpen = false;
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Shop Management
    async loadAdminShopItems() {
      try {
        const { items } = await api('/api/admin/shop/items');
        this.adminShopItems = items;
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    resetShopItemForm() {
      this.shopItemForm = { name: '', description: '', icon: '', type: 'title', value: '', titleColor: '#4f46e5', price: 0, stock: -1, enabled: true, checkinRequired: 0 };
      this.editingShopItem = null;
    },

    editShopItem(item) {
      this.editingShopItem = item;
      this.shopItemForm = {
        name: item.name || '',
        description: item.description || '',
        icon: item.icon || '',
        type: item.type || 'title',
        value: item.value || '',
        price: item.price || 0,
        stock: item.stock ?? -1,
        enabled: !!item.enabled,
        checkinRequired: item.checkin_required || 0
      };
      this.showShopItemForm = true;
    },

    async saveShopItem() {
      if (!this.shopItemForm.name.trim()) { Alpine.store('toast').show('请输入商品名称'); return; }
      if (this.shopItemForm.price < 0) { Alpine.store('toast').show('价格不能为负数'); return; }
      try {
        const body = JSON.stringify(this.shopItemForm);
        if (this.editingShopItem) {
          await api('/api/admin/shop/items/' + this.editingShopItem.id, { method: 'PUT', body });
          Alpine.store('toast').show('商品已更新');
        } else {
          await api('/api/admin/shop/items', { method: 'POST', body });
          Alpine.store('toast').show('商品已添加');
        }
        this.showShopItemForm = false;
        this.resetShopItemForm();
        await this.loadAdminShopItems();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async toggleShopItemEnabled(item) {
      try {
        await api('/api/admin/shop/items/' + item.id, { method: 'PUT', body: JSON.stringify({ enabled: !item.enabled }) });
        Alpine.store('toast').show(item.enabled ? '已下架' : '已上架');
        await this.loadAdminShopItems();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteShopItem(item) {
      if (!confirm(`确定删除商品「${item.name}」？`)) return;
      try {
        const data = await api('/api/admin/shop/items/' + item.id, { method: 'DELETE' });
        Alpine.store('toast').show(data.message || '已删除');
        await this.loadAdminShopItems();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async loadAdminOrders(page = 1) {
      try {
        const data = await api('/api/admin/shop/orders?page=' + page + '&limit=20');
        this.adminOrders = data.orders || [];
        this.adminOrdersPagination = data.pagination || null;
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Redemption Codes
    async loadRedemptionCodes() {
      try {
        const { codes } = await api('/api/admin/redemption-codes');
        this.redemptionCodes = codes || [];
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async createRedemptionCode() {
      if (!this.codeForm.rewardValue || this.codeForm.rewardValue <= 0) {
        Alpine.store('toast').show('请输入有效的奖励值');
        return;
      }
      try {
        const body = {
          rewardType: this.codeForm.rewardType,
          rewardValue: this.codeForm.rewardValue,
          maxUses: this.codeForm.maxUses || 1,
          expiresAt: this.codeForm.expiresAt || null
        };
        const { code } = await api('/api/admin/redemption-codes', { method: 'POST', body: JSON.stringify(body) });
        Alpine.store('toast').show(`兑换码已创建: ${code.code}`);
        this.showCodeForm = false;
        this.codeForm = { rewardType: 'points', rewardValue: 100, maxUses: 1, expiresAt: '' };
        await this.loadRedemptionCodes();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteRedemptionCode(code) {
      if (!confirm(`确定删除兑换码「${code.code}」？`)) return;
      try {
        await api('/api/admin/redemption-codes/' + code.id, { method: 'DELETE' });
        Alpine.store('toast').show('兑换码已删除');
        await this.loadRedemptionCodes();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // SMTP
    async loadSmtpConfig() {
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

    async saveSmtpConfig() {
      try {
        await api('/api/admin/smtp', { method: 'PUT', body: JSON.stringify({ smtpHost: this.smtp.host, smtpPort: this.smtp.port, smtpSecure: this.smtp.secure, smtpUser: this.smtp.user, smtpPass: this.smtp.pass }) });
        this.smtpStatus = '✓ 配置已保存'; this.smtpStatusOk = true;
        setTimeout(() => { this.smtpStatus = ''; }, 3000);
      } catch (e) { this.smtpStatus = '✗ ' + e.message; this.smtpStatusOk = false; }
    },

    async testSmtpConfig() {
      this.smtpStatus = '测试中...'; this.smtpStatusOk = true;
      try {
        const data = await api('/api/admin/smtp/test', { method: 'POST' });
        this.smtpStatus = '✓ ' + data.message; this.smtpStatusOk = true;
      } catch (e) { this.smtpStatus = '✗ ' + e.message; this.smtpStatusOk = false; }
    },

    async loadVersionInfo() {
      try { const data = await api('/api/admin/version'); this.aboutVersion = data.version; } catch (e) {}
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
          this.updateResult = data.message || '✓ 已是最新版本'; this.updateResultOk = true;
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
    },

    // Logout
    async doLogout() {
      await Alpine.store('auth').logout();
    }
  }));
});
