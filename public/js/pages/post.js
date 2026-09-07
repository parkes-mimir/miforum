// Lightbox helper (uses Alpine store)
function openLightbox(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  Alpine.store('lightbox').src = url;
  Alpine.store('lightbox').open = true;
}

document.addEventListener('alpine:init', () => {
  // Post page component
  window.postPage = Alpine.data('postPage', () => ({
    loading: true,
    error: null,
    post: null,
    poll: null,
    comments: [],
    commentTotal: 0,
    commentPage: 1,
    commentPages: 1,
    liked: false,
    bookmarked: false,
    showAllTags: false,
    commentInput: '',
    commentImages: [],
    editing: false,

    // Edit state
    editTitle: '',
    editCategory: 'tech',
    editContent: '',
    editPrivate: false,
    editTags: [],
    editRemoveImages: [],
    editNewImages: [],
    editHasExistingPoll: false,
    editDeletePoll: false,
    editShowPollForm: false,
    editPollQuestion: '',
    editPollOptions: ['', ''],
    editPollMultiple: false,
    editPollDuration: '',

    _emojiPicker: null,

    get user() {
      return Alpine.store('auth').user;
    },

    get isAdmin() {
      return Alpine.store('auth').isAdmin;
    },

    get isAuthor() {
      return this.user && this.post && this.post.author_id === this.user.id;
    },

    get isPostOwner() {
      return this.isAuthor;
    },

    get CAT_MAP() { return { tech: '技术', life: '生活', notice: '公告' }; },
    get CAT_COLORS() { return { tech: 'bg-blue-100 text-blue-700', life: 'bg-pink-100 text-pink-700', notice: 'bg-amber-100 text-amber-700' }; },

    get categoryLabel() { return this.CAT_MAP[this.post?.category] || ''; },
    get categoryClass() { return this.CAT_COLORS[this.post?.category] || 'bg-gray-100 text-gray-600'; },

    get postAvatarHtml() {
      if (!this.post) return '';
      return avatarHtml(this.post.author_avatar_url, this.post.author_name?.[0]?.toUpperCase(), 'w-10 h-10', this.post.author_avatar_frame);
    },

    },

    get hasInlineImages() {
      return this.post?.content && /\[img:\d+\]/.test(this.post.content);
    },

    get postContentHtml() {
      if (!this.post) return '';
      return this.renderPostContentWithImages(this.post.content, this.post.images || []);
    },

    get postContentOnly() {
      if (!this.post) return '';
      return renderEmojiInText(this.post.content);
    },

    get pollCountdown() {
      if (!this.poll?.closeAt || this.poll.status === 'closed') return '';
      const remaining = new Date(this.poll.closeAt) - new Date();
      if (remaining <= 0) return '';
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      if (hours > 24) return `<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">剩余${Math.floor(hours/24)}天</span>`;
      if (hours > 0) return `<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">剩余${hours}时${mins}分</span>`;
      return `<span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">剩余${mins}分钟</span>`;
    },

    get editImagesList() {
      const images = this.post?.images || [];
      return images.map((url, idx) => ({
        url,
        removed: this.editRemoveImages.includes(url)
      }));
    },

    get editExistingCount() {
      return (this.post?.images || []).filter(url => !this.editRemoveImages.includes(url)).length;
    },

    get editPollInfoHtml() {
      if (!this.poll) return '';
      const hasVotes = this.poll.totalVotes > 0;
      return `<p><strong>${esc(this.poll.question)}</strong></p><p class="text-xs text-gray-500 mt-1">${this.poll.pollType === 'multiple' ? '多选' : '单选'} · ${this.poll.totalVotes}人已投 · ${hasVotes ? '已有投票，不可编辑' : '暂无投票'}</p>`;
    },

    get commentPageNumbers() {
      const pages = [];
      for (let i = 1; i <= this.commentPages; i++) pages.push(i);
      return pages;
    },

    renderEmoji(text) {
      return renderEmojiInText(text || '');
    },

    renderPostContentWithImages(content, images) {
      if (!content) return '';
      let html = renderEmojiInText(content);
      html = html.replace(/\[img:(\d+)\]/g, (match, index) => {
        const i = parseInt(index, 10);
        if (i >= 0 && i < images.length) {
          return `<img src="${images[i]}" class="rounded-xl max-w-full max-h-96 object-cover cursor-pointer hover:opacity-90 transition my-2" onclick="openLightbox('${escAttr(images[i])}')">`;
        }
        return match;
      });
      return html;
    },

    relTime(iso) {
      if (!iso) return '';
      return relTime(iso);
    },

    commentAvatarHtml(c) {
      return avatarHtml(c.author_avatar_url, c.author_name?.[0]?.toUpperCase(), 'w-8 h-8', c.author_avatar_frame);
    },

    canDeleteComment(c) {
      if (!this.user) return false;
      return c.author_id === this.user.id || this.isPostOwner || this.isAdmin;
    },

    pollPercent(opt) {
      if (!this.poll || !this.poll.totalVotes) return 0;
      return Math.round((opt.votes || 0) / this.poll.totalVotes * 100);
    },

    shareCurrentPost(event) {
      sharePost(this.post, event);
    },

    async init() {
      // Wait for auth (header component also loads, but we need it before loadPage)
      await Alpine.store('auth').load();
      await this.loadPage();

      // Listen for auth changes (e.g. after login/logout)
      window.addEventListener('auth-changed', () => {
        this.loadPage();
      });

      // Init emoji picker after DOM ready
      this.$nextTick(() => {
        this.initEmojiPicker();
      });
    },

    initEmojiPicker() {
      if (!this.user) return;
      const btn = this.$refs.commentEmojiBtn;
      const input = this.$refs.commentInput?.closest('textarea') || document.querySelector('textarea[x-model="commentInput"]');
      if (btn && input) {
        this._emojiPicker = new EmojiPicker({
          trigger: btn,
          target: input
        });
      }
    },

    async loadPage() {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('id');
      if (!pid) { this.error = '帖子不存在'; this.loading = false; return; }

      try {
        this.loading = true;
        this.error = null;
        const { post, poll } = await api('/api/posts/' + pid);
        this.post = post;
        this.poll = poll || null;

        document.title = post.title + ' - MiForum';

        // Load like/bookmark status
        if (this.user) {
          try {
            const { ids } = await api('/api/likes');
            this.liked = ids.includes(post.id);
          } catch (e) {}
        }
        try {
          const d = await api('/api/bookmark/' + post.id);
          this.bookmarked = d.isBookmarked;
        } catch (e) {}

        await this.loadComments(1);
        this.loading = false;

        // Re-init emoji picker after content loaded
        this.$nextTick(() => this.initEmojiPicker());

        // Check force password change
        if (this.user?.force_password_change) {
          setTimeout(() => {
            const el = document.querySelector('[x-data*="changePasswordModal"]');
            if (el && el.__x) el.__x.$data.show();
          }, 1000);
        }
      } catch (e) {
        this.error = e.message;
        this.loading = false;
      }
    },

    async loadComments(page = 1) {
      if (!this.post) return;
      try {
        const { comments, postOwnerId, pagination } = await api('/api/posts/' + this.post.id + '/comments?page=' + page + '&limit=50');
        this.comments = comments.map(c => ({
          ...c,
          _editing: false,
          _editContent: '',
          _editExistingImages: [],
          _editRemoveImages: [],
          _editNewImages: []
        }));
        this.commentTotal = pagination ? pagination.total : comments.length;
        this.commentPage = page;
        this.commentPages = pagination ? pagination.pages : 1;
      } catch (e) {
        Alpine.store('toast').show('加载评论失败');
      }
    },

    async toggleLike() {
      if (!this.user) { Alpine.store('toast').show('请先登录'); return; }
      try {
        if (this.liked) {
          await api('/api/like/' + this.post.id, { method: 'DELETE' });
          this.post.likes_count--;
          this.liked = false;
        } else {
          await api('/api/like/' + this.post.id, { method: 'POST' });
          this.post.likes_count++;
          this.liked = true;
        }
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async toggleBookmark() {
      if (!this.user) { Alpine.store('toast').show('请先登录'); return; }
      try {
        if (this.bookmarked) {
          await api('/api/bookmark/' + this.post.id, { method: 'DELETE' });
          this.bookmarked = false;
          Alpine.store('toast').show('已取消收藏');
        } else {
          await api('/api/bookmark/' + this.post.id, { method: 'POST' });
          this.bookmarked = true;
          Alpine.store('toast').show('收藏成功');
        }
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async castVote() {
      if (!this.user) { Alpine.store('toast').show('请先登录'); return; }
      if (!this.poll) return;
      const selected = Array.from(document.querySelectorAll('.poll-input:checked')).map(i => Number(i.value));
      if (!selected.length) { Alpine.store('toast').show('请选择一个选项'); return; }
      try {
        await api('/api/polls/' + this.poll.id + '/vote', { method: 'POST', body: JSON.stringify({ optionIds: selected }) });
        Alpine.store('toast').show('投票成功');
        await this.loadPage();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async removeVote() {
      if (!this.poll) return;
      if (!confirm('确定撤销投票？')) return;
      try {
        await api('/api/polls/' + this.poll.id + '/vote', { method: 'DELETE' });
        Alpine.store('toast').show('已撤销投票');
        await this.loadPage();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // --- Edit Post ---
    startEditPost() {
      this.editing = true;
      this.editTitle = this.post.title;
      this.editCategory = this.post.category;
      this.editContent = this.post.content;
      this.editPrivate = !!this.post.private;
      this.editTags = this.post.tags ? [...this.post.tags] : [];
      this.editRemoveImages = [];
      this.editNewImages = [];
      this.editDeletePoll = false;
      this.editHasExistingPoll = !!this.poll;
      this.editShowPollForm = false;
      this.editPollQuestion = '';
      this.editPollOptions = ['', ''];
      this.editPollMultiple = false;
      this.editPollDuration = '';
    },

    cancelEditPost() {
      this.editing = false;
      this.editDeletePoll = false;
    },

    addEditTag() {
      const input = this.$refs.editTagInput;
      const tag = input.value.trim().replace(/,/g, '');
      if (!tag || this.editTags.length >= 10 || tag.length > 20) return;
      if (this.editTags.includes(tag)) return;
      this.editTags.push(tag);
      input.value = '';
    },

    markRemoveImg(idx) {
      const url = this.post.images[idx];
      if (url && !this.editRemoveImages.includes(url)) {
        this.editRemoveImages.push(url);
      }
    },

    undoRemoveImg(idx) {
      const url = this.post.images[idx];
      this.editRemoveImages = this.editRemoveImages.filter(u => u !== url);
    },

    handleEditImageSelect(event) {
      const files = Array.from(event.target.files);
      const existing = (this.post.images || []).length - this.editRemoveImages.length;
      if (existing + this.editNewImages.length + files.length > 30) {
        Alpine.store('toast').show('最多30张');
        event.target.value = '';
        return;
      }
      files.forEach(f => {
        this.editNewImages.push({ file: f, objectUrl: URL.createObjectURL(f) });
      });
      event.target.value = '';
    },

    removeEditNewImg(idx) {
      this.editNewImages.splice(idx, 1);
    },

    insertEditImageAtCursor(index) {
      const tag = `[img:${index}]`;
      const ta = document.querySelector('textarea[x-model="editContent"]');
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const value = ta.value;
      this.editContent = value.slice(0, start) + tag + value.slice(end);
      this.$nextTick(() => {
        ta.selectionStart = ta.selectionEnd = start + tag.length;
        ta.focus();
      });
    },

    deleteExistingPoll() {
      if (!confirm('确定删除投票？删除后不可恢复。')) return;
      this.editDeletePoll = true;
      this.editHasExistingPoll = false;
      Alpine.store('toast').show('投票将在保存后删除');
    },

    addEditPollOption() {
      if (this.editPollOptions.length >= 10) { Alpine.store('toast').show('最多10个选项'); return; }
      this.editPollOptions.push('');
    },

    removeEditPollOption(idx) {
      if (this.editPollOptions.length <= 2) { Alpine.store('toast').show('至少需要2个选项'); return; }
      this.editPollOptions.splice(idx, 1);
    },

    async saveEditPost() {
      const title = this.editTitle.trim();
      const content = this.editContent.trim();
      if (!title) { Alpine.store('toast').show('请输入标题'); return; }
      if (!content) { Alpine.store('toast').show('请输入正文'); return; }
      try {
        const fd = new FormData();
        fd.append('title', title);
        fd.append('content', content);
        fd.append('category', this.editCategory);
        fd.append('tags', JSON.stringify(this.editTags));
        fd.append('private', this.editPrivate);
        if (this.editRemoveImages.length > 0) fd.append('removeImages', JSON.stringify(this.editRemoveImages));
        this.editNewImages.forEach(f => fd.append('images', f.file));

        if (this.editDeletePoll) fd.append('deletePoll', true);

        // New poll data
        const pollQ = this.editPollQuestion.trim();
        const pollOpts = this.editPollOptions.map(o => o.trim()).filter(Boolean);
        if (pollQ && pollOpts.length >= 2) {
          fd.append('pollQuestion', pollQ);
          fd.append('pollOptions', JSON.stringify(pollOpts));
          fd.append('pollType', this.editPollMultiple ? 'multiple' : 'single');
          fd.append('pollMaxChoices', pollOpts.length);
          const durationMap = { '1h': 1, '6h': 6, '1d': 24, '3d': 72, '7d': 168, '30d': 720 };
          const hours = durationMap[this.editPollDuration];
          if (hours) fd.append('pollCloseAt', new Date(Date.now() + hours * 3600000).toISOString());
        }

        const res = await fetch('/api/posts/' + this.post.id, { method: 'PUT', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '修改失败');
        this.editDeletePoll = false;
        Alpine.store('toast').show('修改成功');
        this.editing = false;
        await this.loadPage();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deletePost() {
      if (!confirm('确定删除这篇帖子？')) return;
      try {
        await api('/api/posts/' + this.post.id, { method: 'DELETE' });
        Alpine.store('toast').show('已删除');
        window.location = '/';
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async togglePinPost() {
      try {
        const res = await api('/api/posts/' + this.post.id + '/pin', { method: 'PUT' });
        Alpine.store('toast').show(res.pinned ? '已置顶' : '已取消置顶');
        await this.loadPage();
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    // --- Comments ---
    handleCommentImageSelect(event) {
      const files = Array.from(event.target.files);
      if (this.commentImages.length + files.length > 3) {
        Alpine.store('toast').show('最多3张');
        event.target.value = '';
        return;
      }
      files.forEach(f => {
        this.commentImages.push({ file: f, objectUrl: URL.createObjectURL(f) });
      });
      event.target.value = '';
    },

    async doComment() {
      const text = this.commentInput.trim();
      if (!text && this.commentImages.length === 0) {
        Alpine.store('toast').show('请输入评论或上传图片');
        return;
      }
      try {
        const fd = new FormData();
        if (text) fd.append('content', text);
        this.commentImages.forEach(f => fd.append('images', f.file));
        const res = await fetch('/api/posts/' + this.post.id + '/comments', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '评论失败');
        this.commentInput = '';
        this.commentImages = [];
        await this.loadComments(this.commentPage);
        Alpine.store('toast').show('评论成功！');
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async togglePinComment(cid) {
      try {
        const res = await api('/api/comments/' + cid + '/pin', { method: 'PUT' });
        Alpine.store('toast').show(res.pinned ? '已置顶' : '已取消置顶');
        await this.loadComments(this.commentPage);
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    startEditComment(c) {
      c._editing = true;
      c._editContent = c.content || '';
      c._editExistingImages = c.images ? [...c.images] : [];
      c._editRemoveImages = [];
      c._editNewImages = [];
    },

    cancelEditComment(c) {
      c._editing = false;
    },

    markRemoveCImg(c, url) {
      if (!c._editRemoveImages) c._editRemoveImages = [];
      if (!c._editRemoveImages.includes(url)) c._editRemoveImages.push(url);
    },

    undoRemoveCImg(c, url) {
      c._editRemoveImages = (c._editRemoveImages || []).filter(u => u !== url);
    },

    handleEditCImgSelect(event, c) {
      const files = Array.from(event.target.files);
      if (!c._editNewImages) c._editNewImages = [];
      if (!c._editRemoveImages) c._editRemoveImages = [];
      const existing = (c._editExistingImages || []).length - c._editRemoveImages.length;
      if (existing + c._editNewImages.length + files.length > 3) {
        Alpine.store('toast').show('最多3张');
        event.target.value = '';
        return;
      }
      files.forEach(f => {
        c._editNewImages.push({ file: f, objectUrl: URL.createObjectURL(f) });
      });
      event.target.value = '';
    },

    removeEditCNewImg(c, idx) {
      (c._editNewImages || []).splice(idx, 1);
    },

    async saveEditComment(c) {
      const text = (c._editContent || '').trim();
      const st = { removeImages: c._editRemoveImages || [], newImages: c._editNewImages || [] };
      const existingImages = (c._editExistingImages || []).filter(url => !st.removeImages.includes(url));
      if (!text && st.newImages.length === 0 && existingImages.length === 0) {
        Alpine.store('toast').show('评论不能为空');
        return;
      }
      try {
        const fd = new FormData();
        if (text) fd.append('content', text);
        if (st.removeImages.length > 0) fd.append('removeImages', JSON.stringify(st.removeImages));
        st.newImages.forEach(f => fd.append('images', f.file));
        const res = await fetch('/api/comments/' + c.id, { method: 'PUT', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '修改失败');
        c._editing = false;
        await this.loadComments(this.commentPage);
        Alpine.store('toast').show('已更新');
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    async deleteComment(cid) {
      if (!confirm('确定删除这条评论？')) return;
      try {
        await api('/api/comments/' + cid, { method: 'DELETE' });
        await this.loadComments(this.commentPage);
        Alpine.store('toast').show('已删除');
      } catch (e) { Alpine.store('toast').show(e.message); }
    }
  }));
});
