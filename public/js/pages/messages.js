document.addEventListener('alpine:init', () => {
  window.messagesPage = Alpine.data('messagesPage', () => ({
    user: null,
    currentSection: 'messages',
    sidebarOpen: false,
    currentConvId: null,
    chatPollTimer: null,
    chatInput: '',
    chatTitle: '',
    chatOtherUserId: null,
    chatAvatarHtml: '',
    chatMessages: [],
    conversations: [],
    convLoading: true,
    badges: { messages: 0, replies: 0, likes: 0, bookmarks: 0 },

    sections: [
      { key: 'messages', label: '我的私信', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>' },
      { key: 'replies', label: '回复我的', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>' },
      { key: 'likes', label: '收到的赞', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>' },
      { key: 'bookmarks', label: '收藏我的', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>' }
    ],

    sectionLabels: { messages: '我的私信', replies: '回复我的', likes: '收到的赞', bookmarks: '收藏我的' },

    notifTypeMap: { replies: 'comment', likes: 'like', bookmarks: 'bookmark' },

    notifData: {
      replies: { items: [], page: 1, totalPages: 1, loading: false },
      likes: { items: [], page: 1, totalPages: 1, loading: false },
      bookmarks: { items: [], page: 1, totalPages: 1, loading: false }
    },

    async init() {
      await Alpine.store('auth').load();
      this.user = Alpine.store('auth').user;
      if (!this.user) { location.href = '/'; return; }

      const targetUserId = new URLSearchParams(window.location.search).get('user');
      if (targetUserId) {
        await this.openConversationWithUser(targetUserId);
      } else {
        this.switchSection('messages');
      }
      this.loadBadges();
      this.$nextTick(() => {
        if (this.$refs.emojiBtn && this.$refs.chatInput) {
          new EmojiPicker({
            trigger: this.$refs.emojiBtn,
            target: this.$refs.chatInput
          });
        }
      });
    },

    switchSection(section) {
      this.currentSection = section;
      this.sidebarOpen = false;
      if (section === 'messages') {
        this.loadConversations();
      } else {
        this.loadNotifications(section);
      }
    },

    renderEmoji(text) {
      if (!text) return '';
      return typeof renderEmojiInText === 'function' ? renderEmojiInText(text) : esc(text);
    },

    convAvatarHtml(c) {
      const letter = c.other_username ? c.other_username[0].toUpperCase() : '?';
      return avatarHtml(c.other_avatar_url, letter, 'w-10 h-10', c.other_avatar_frame);
    },

    async loadConversations() {
      this.convLoading = true;
      try {
        const data = await api('/api/conversations');
        this.conversations = data.conversations || [];
      } catch (e) {
        Alpine.store('toast').show(e.message);
      } finally {
        this.convLoading = false;
      }
    },

    async openConversation(c) {
      this.currentConvId = c.id;
      this.chatTitle = c.other_username;
      this.chatOtherUserId = c.other_user_id;
      const letter = c.other_username ? c.other_username[0].toUpperCase() : '?';
      this.chatAvatarHtml = c.other_avatar_url
        ? `<img src="${escAttr(c.other_avatar_url)}" class="w-8 h-8 rounded-full object-cover" alt="">`
        : `<div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">${esc(letter)}</div>`;
      await this.loadChatMessages();
      this.loadBadges();
      if (this.chatPollTimer) clearInterval(this.chatPollTimer);
      this.chatPollTimer = setInterval(() => {
        if (this.currentConvId) this.loadChatMessages(true);
      }, 5000);
    },

    async openConversationWithUser(userId) {
      this.switchSection('messages');
      try {
        const conv = await api('/api/conversations', { method: 'POST', body: JSON.stringify({ userId: Number(userId) }) });
        const userData = await api('/api/users/' + userId);
        await this.openConversation({
          id: conv.conversation.id,
          other_username: userData.user.username,
          other_avatar_url: userData.user.avatar_url,
          other_user_id: Number(userId)
        });
      } catch (e) {
        Alpine.store('toast').show('无法打开会话：' + e.message);
      }
    },

    async loadChatMessages(silent) {
      if (!this.currentConvId) return;
      try {
        const data = await api('/api/conversations/' + this.currentConvId + '/messages?limit=50');
        this.chatMessages = data.messages.reverse();
        this.$nextTick(() => {
          const el = this.$refs.chatMessages;
          if (el) el.scrollTop = el.scrollHeight;
        });
      } catch (e) {
        if (!silent) Alpine.store('toast').show(e.message);
      }
    },

    backToConvList() {
      this.currentConvId = null;
      this.chatMessages = [];
      this.chatInput = '';
      if (this.chatPollTimer) { clearInterval(this.chatPollTimer); this.chatPollTimer = null; }
      this.loadConversations();
    },

    async sendChatMsg() {
      if (!this.currentConvId) return;
      const content = this.chatInput.trim();
      if (!content) return;
      const inputEl = this.chatInput;
      this.chatInput = '';
      try {
        const data = await api('/api/conversations/' + this.currentConvId + '/messages', { method: 'POST', body: JSON.stringify({ content }) });
        // 追加新消息到列表（避免全量刷新）
        this.chatMessages.push({
          id: data.messageId,
          conversation_id: this.currentConvId,
          sender_id: this.user.id,
          content: content,
          created_at: new Date().toISOString(),
          sender_name: this.user.username,
          sender_avatar_url: this.user.avatar_url,
          sender_avatar_frame: this.user.avatar_frame,
          sender_display_id: this.user.display_id
        });
        this.$nextTick(() => {
          const el = this.$refs.chatMessages;
          if (el) el.scrollTop = el.scrollHeight;
        });
      } catch (e) {
        this.chatInput = inputEl;
        Alpine.store('toast').show(e.message);
      }
    },

    async loadNotifications(section) {
      const nd = this.notifData[section];
      nd.loading = true;
      const type = this.notifTypeMap[section];
      try {
        const data = await api('/api/notifications?type=' + type + '&page=' + nd.page + '&limit=20');
        nd.items = data.notifications || [];
        nd.totalPages = data.pagination?.pages || 1;
      } catch (e) {
        Alpine.store('toast').show(e.message);
      } finally {
        nd.loading = false;
      }
    },

    async readNotif(n) {
      try {
        await api('/api/notifications/' + n.id + '/read', { method: 'PUT' });
        n.read = true;
        this.loadBadges();
        if (n.post_id && n.post_title) {
          window.open('/post.html?id=' + n.post_id, '_blank');
        } else if (n.post_id && !n.post_title) {
          Alpine.store('toast').show('帖子已被删除');
        }
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async markTypeRead(type) {
      try {
        await api('/api/notifications/read-all?type=' + type, { method: 'PUT' });
        this.loadBadges();
        const sectionMap = { comment: 'replies', like: 'likes', bookmark: 'bookmarks' };
        const section = sectionMap[type];
        if (section && this.currentSection === section) this.loadNotifications(section);
        Alpine.store('toast').show('已全部标为已读');
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    },

    async loadBadges() {
      try {
        const [n, m] = await Promise.all([
          api('/api/notifications/unread-count'),
          api('/api/messages/unread-count')
        ]);
        this.badges = {
          messages: m.unread || 0,
          replies: n.comments || 0,
          likes: n.likes || 0,
          bookmarks: n.bookmarks || 0
        };
      } catch (e) {}
    }
  }));
});
