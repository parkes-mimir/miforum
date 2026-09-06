// Lightbox helper
function openLightbox(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  Alpine.store('lightbox').src = url;
  Alpine.store('lightbox').open = true;
}

document.addEventListener('alpine:init', () => {
  Alpine.store('lightbox', { open: false, src: '' });

  // Auth modal component (inline, post.html style)
  Alpine.data('authModal', () => ({
    open: false,
    tab: 'login',
    loginEmail: '',
    loginPassword: '',
    regUsername: '',
    regEmail: '',
    regPassword: '',
    regCode: '',
    codeCooldown: 0,
    _codeTimer: null,

    init() {
      this.$watch('$store.auth.showLogin', (val) => {
        if (val) { this.open = true; Alpine.store('auth').showLogin = false; }
      });
    },

    show() { this.open = true; },
    hide() { this.open = false; },

    get regPasswordStrength() {
      return getPasswordStrength(this.regPassword);
    },

    async doLogin() {
      if (!this.loginEmail.trim() || !this.loginPassword) { Alpine.store('toast').show('请填写邮箱和密码'); return; }
      try {
        const { user } = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: this.loginEmail.trim(), password: this.loginPassword }) });
        Alpine.store('auth').user = user;
        this.hide();
        Alpine.store('toast').show('登录成功！');
        window.dispatchEvent(new CustomEvent('auth-changed'));
        if (user.force_password_change) {
          setTimeout(() => { document.querySelector('[x-data*="changePasswordModal"]').__x.$data.show(); }, 500);
        }
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async doRegister() {
      if (!this.regUsername.trim() || !this.regEmail.trim() || !this.regPassword || !this.regCode.trim()) { Alpine.store('toast').show('请填写所有字段'); return; }
      if (this.regPassword.length < 6) { Alpine.store('toast').show('密码至少6位'); return; }
      try {
        const { user } = await api('/api/register', { method: 'POST', body: JSON.stringify({ username: this.regUsername.trim(), email: this.regEmail.trim(), password: this.regPassword, code: this.regCode.trim() }) });
        Alpine.store('auth').user = user;
        this.hide();
        Alpine.store('toast').show('注册成功！');
        window.dispatchEvent(new CustomEvent('auth-changed'));
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async sendCode() {
      const email = this.regEmail.trim();
      if (!email) { Alpine.store('toast').show('请先填写邮箱'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Alpine.store('toast').show('邮箱格式不正确'); return; }
      if (this.codeCooldown > 0) return;
      try {
        await api('/api/send-code', { method: 'POST', body: JSON.stringify({ email, type: 'register' }) });
        Alpine.store('toast').show('验证码已发送到邮箱');
        this.codeCooldown = 60;
        this._codeTimer = setInterval(() => {
          this.codeCooldown--;
          if (this.codeCooldown <= 0) clearInterval(this._codeTimer);
        }, 1000);
      } catch (e) { Alpine.store('toast').show(e.message); }
    }
  }));

  // ============================================================
  // Forum Page Component
  // ============================================================
  window.forumPage = Alpine.data('forumPage', () => ({
    // State
    loading: true,
    sidebarOpen: false,
    searchQuery: '',
    currentCat: 'all',
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
      return this.isSuperAdmin ? 'bg-red-500' : 'bg-amber-500';
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
      if (this.currentCat === 'all') return '欢迎来到社区，参与讨论吧';
      const cat = this.categoriesData.find(c => c.name === this.currentCat);
      if (cat && cat.section_type === 'announcement') return '官方公告和通知';
      if (cat && cat.section_type === 'hot') return '根据你的兴趣推荐的热门帖子';
      if (cat && cat.description) return cat.description;
      return '欢迎来到社区，参与讨论吧';
    },

    get specialCategories() {
      return this.categoriesData.filter(c => c.section_type === 'announcement' || c.section_type === 'hot');
    },

    get normalCategories() {
      return this.categoriesData.filter(c => c.section_type === 'normal');
    },

    get postableCategories() {
      return this.categoriesData.filter(c => c.section_type !== 'hot');
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
      await this.loadCategories();
      await this.loadCheckin();
      // Read URL params
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      const tag = params.get('tag');
      const sort = params.get('sort');
      if (sort && ['newest', 'most_liked', 'oldest'].includes(sort)) this.currentSort = sort;
      await this.loadPosts(1);
      if (cat && this.catExists(cat)) this.filterCategory(cat);
      if (tag) this.filterByTag(tag);
      if (this.user?.force_password_change) {
        setTimeout(() => { document.querySelector('[x-data*="changePasswordModal"]').__x.$data.show(); }, 1000);
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

    async loadCheckin() {
      if (!this.isLoggedIn) { this.checkinLoaded = false; return; }
      try {
        const res = await api('/api/checkin/auto', { method: 'POST' });
        this.userPoints = res.points;
        if (this.user) this.user.points = res.points;
        if (res.newCheckin) Alpine.store('toast').show('每日签到成功！积分 +10');
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
      if (this.currentCat !== 'all') params.set('category', this.currentCat);
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
        this.loadPosts(1);
        return;
      }
      this.currentTag = null;
      this.currentCat = 'all';
      this.loadPosts(1);
    },

    catLabel(name) {
      if (name === 'all') return '全部话题';
      const c = this.categoriesData.find(c => c.name === name);
      return c ? c.label : name;
    },

    catColorClass(name) {
      const c = this.categoriesData.find(c => c.name === name);
      return c ? c.color : 'bg-gray-100 text-gray-600';
    },

    catExists(name) {
      return name === 'all' || this.categoriesData.some(c => c.name === name);
    },

    postAvatarHtml(p) {
      return avatarHtml(p.author_avatar_url, p.author_name?.[0]?.toUpperCase(), 'w-9 h-9', p.author_avatar_frame);
    },

    authorLevelHtml(p) {
      const li = p.author_level_info;
      if (!li) return '';
      return `<span style="background:${li.badge_bg}">${li.icon}Lv${li.level}</span>`;
    },

    renderPostPreview(p) {
      const text = (p.content || '').replace(/\[img:\d+\]/g, '').replace(/\n/g, ' ');
      return renderEmojiInText(text);
    },

    relTime(iso) {
      if (!iso) return '';
      return relTime(iso);
    },

    sharePost(post, event) {
      sharePost(post, event);
    },

    /** 切换点赞状态（乐观更新，失败自动回滚） */
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
      this.newPostOpen = true;
    },

    resetPostForm() {
      this.editingPostId = null;
      this.newPostTitle = '';
      this.newPostContent = '';
      this.newPostCategory = this.postableCategories[0]?.name || 'tech';
      this.newPostPrivate = false;
      this.newPostTags = [];
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
      for (const f of files) {
        if (f.size > 10 * 1024 * 1024) { Alpine.store('toast').show(`"${f.name}" 超过10MB`); continue; }
        f._url = URL.createObjectURL(f);
        this.selectedImages.push(f);
      }
      event.target.value = '';
    },

    insertImageAtCursor(index) {
      const textarea = document.querySelector('textarea[x-model="newPostContent"]');
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
            formData.append('pollMaxChoices', opts.length);
            const durationMap = { '1h': 1, '6h': 6, '1d': 24, '3d': 72, '7d': 168, '30d': 720 };
            const hours = durationMap[this.pollDuration];
            if (hours) formData.append('pollCloseAt', new Date(Date.now() + hours * 3600000).toISOString());
          }
        }
        const res = await fetch('/api/posts', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '发布失败');
        this.newPostOpen = false;
        if (data.points) { this.userPoints = data.points; if (this.user) this.user.points = data.points; }
        if (this.currentCat !== 'all') this.filterCategory('all');
        else await this.loadPosts(1);
        Alpine.store('toast').show('发布成功！积分 +5');
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
      if (!confirm(`确认补签 ${dateStr}？\n消耗 10 积分`)) return;
      try {
        const res = await api('/api/checkin/retroactive', { method: 'POST', body: JSON.stringify({ date: dateStr }) });
        this.userPoints = res.points;
        if (this.user) this.user.points = res.points;
        await this.loadCheckinHistory();
        await this.loadCheckin();
        Alpine.store('toast').show(`补签成功！${dateStr}，剩余 ${res.points} 积分`);
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // Category Management
    showCategoryModal() { this.categoryModalOpen = true; },

    async createCategory() {
      if (!this.newCatName.trim() || !this.newCatLabel.trim()) { Alpine.store('toast').show('请填写标识和名称'); return; }
      try {
        await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: this.newCatName.trim(), label: this.newCatLabel.trim(), section_type: 'normal' }) });
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
        if (this.currentCat === c.name) this.filterCategory('all');
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

    rewardPoints(u) {
      const amount = prompt(`奖励「${u.username}」多少积分？`, '100');
      if (!amount) return;
      const num = parseInt(amount, 10);
      if (!Number.isFinite(num) || num <= 0 || num > 10000) { Alpine.store('toast').show('积分必须为1-10000'); return; }
      const reason = prompt('奖励原因（可选）', '反馈bug奖励') || '';
      api('/api/admin/users/' + u.id + '/points/add', { method: 'PUT', body: JSON.stringify({ amount: num, reason }) })
        .then(data => { Alpine.store('toast').show(data.message || '奖励成功'); this.loadAdminUsers(); })
        .catch(e => Alpine.store('toast').show(e.message));
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

    // SMTP
    async loadSmtpConfig() {
      try {
        const data = await api('/api/admin/smtp');
        this.smtp = {
          host: data.smtp_host || '',
          port: data.smtp_port || '465',
          secure: data.smtp_secure !== false,
          user: data.smtp_user || '',
          pass: '',
          configured: data.configured || false
        };
      } catch (e) {}
    },

    async saveSmtpConfig() {
      try {
        await api('/api/admin/smtp', { method: 'PUT', body: JSON.stringify({ smtp_host: this.smtp.host, smtp_port: this.smtp.port, smtp_secure: this.smtp.secure, smtp_user: this.smtp.user, smtp_pass: this.smtp.pass }) });
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
          this.updateResult = `发现新版本 v${data.latestVersion} <a href="${data.releaseUrl}" target="_blank" class="underline">查看详情</a>`;
          this.updateResultOk = false;
          this.updateHasNew = true;
        } else {
          this.updateResult = '✓ 已是最新版本'; this.updateResultOk = true;
        }
      } catch (e) { this.updateResult = '✗ ' + e.message; this.updateResultOk = false; }
      this.updateChecking = false;
    },

    async doUpdate() {
      if (!confirm('确定要更新吗？更新后需要重启服务器。')) return;
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
