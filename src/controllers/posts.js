const { requireAuth, requireNotMuted } = require('../middleware/auth');
const { deleteImages, deleteFile, parseJsonField, intToBool } = require('../utils/helpers');
const { postUpload, multerUpload } = require('../utils/upload');
const { addExp, EXP_REWARDS, getLevelInfo } = require('./level');

module.exports = function (app, db) {
  /** 获取帖子列表（支持分页、分类、标签、搜索、排序，过滤私密帖子） */
  app.get('/api/posts', (req, res) => {
    const { category, search, tag } = req.query;
    const sort = req.query.sort || 'newest';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // 获取当前用户信息（用于过滤私密帖子）
    const userId = req.session.userId || null;
    let userRole = 'user';
    if (userId) {
      const u = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
      if (u) userRole = u.role;
    }
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    let whereSql = ' WHERE 1=1';
    const params = [];

    // 过滤私密帖子：仅作者和管理员可见
    if (!isAdmin) {
      whereSql += ' AND (p.private = 0 OR p.author_id = ?)';
      params.push(userId || 0);
    }

    if (category && category !== 'all') {
      whereSql += ' AND p.category = ?';
      params.push(category);
    }
    if (tag) {
      whereSql += ' AND p.tags LIKE ?';
      params.push(`%"${tag}"%`);
    }
    if (search) {
      whereSql += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 排序方式
    const sortOptions = {
      newest: 'p.created_at DESC',
      oldest: 'p.created_at ASC',
      most_liked: '(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) DESC'
    };
    const orderBy = sortOptions[sort] || sortOptions.newest;

    // 查询总数
    const countSql = `SELECT COUNT(*) AS total FROM posts p${whereSql}`;
    const { total } = db.prepare(countSql).get(...params);

    // 查询当前页数据
    const sql = `
      SELECT p.*,
        pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
        pr.title AS author_title, pr.avatar_frame AS author_avatar_frame, pr.exp AS author_exp,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
      FROM posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      ${whereSql}
      ORDER BY p.pinned DESC, ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(sql).all(...params, limit, offset);
    const posts = rows.map(p => ({
      ...p,
      tags: parseJsonField(p.tags, []),
      images: parseJsonField(p.images, []),
      pinned: intToBool(p.pinned),
      private: intToBool(p.private),
      author_avatar_url: p.author_avatar_url || null,
      author_title: p.author_title || null,
      author_avatar_frame: p.author_avatar_frame || null,
      author_level_info: getLevelInfo(p.author_exp || 0)
    }));

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  });

  app.get('/api/posts/:id', (req, res) => {
    const pid = Number(req.params.id);
    const p = db.prepare(`
      SELECT p.*,
        pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
        pr.title AS author_title, pr.avatar_frame AS author_avatar_frame, pr.exp AS author_exp,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
      FROM posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE p.id = ?
    `).get(pid);
    if (!p) return res.status(404).json({ error: '帖子不存在' });

    // 私密帖子权限检查
    if (intToBool(p.private)) {
      const userId = req.session.userId || null;
      const user = userId ? db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId) : null;
      const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
      if (p.author_id !== userId && !isAdmin) {
        return res.status(404).json({ error: '帖子不存在' });
      }
    }

    res.json({
      post: {
        ...p,
        tags: parseJsonField(p.tags, []),
        images: parseJsonField(p.images, []),
        pinned: intToBool(p.pinned),
        private: intToBool(p.private),
        author_avatar_url: p.author_avatar_url || null,
        author_title: p.author_title || null,
        author_avatar_frame: p.author_avatar_frame || null,
        author_level_info: getLevelInfo(p.author_exp || 0)
      }
    });
  });

  app.post('/api/posts', requireAuth, requireNotMuted(db), multerUpload(postUpload.array('images', 30)), (req, res) => {
    const { title, content, category, tags, private: isPrivate } = req.body;
    if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });

    const privateVal = (isPrivate === true || isPrivate === 'true' || isPrivate === '1' || isPrivate === 1) ? 1 : 0;

    const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
    let parsedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === 'string') {
        try { parsedTags = JSON.parse(tags); } catch (e) { parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean); }
      }
    }
    parsedTags = [...new Set(parsedTags.map(t => String(t).slice(0, 20)))].slice(0, 10);

    const insertPost = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO posts (title, content, category, tags, author_id, images, private, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(title, content, category || 'tech', JSON.stringify(parsedTags), req.session.userId, JSON.stringify(images), privateVal);

      db.prepare('UPDATE profiles SET points = points + 5 WHERE id = ?').run(req.session.userId);
      addExp(db, req.session.userId, EXP_REWARDS.post);
      const user = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
      return { postId: result.lastInsertRowid, points: user ? user.points : 0, exp: user ? user.exp : 0, level_info: getLevelInfo(user ? user.exp : 0) };
    });

    const result = insertPost();
    res.json({ postId: result.postId, points: result.points, exp: result.exp, level_info: result.level_info });
  });

  app.put('/api/posts/:id', requireAuth, requireNotMuted(db), multerUpload(postUpload.array('images', 30)), (req, res) => {
    const { title, content, category, tags, removeImages, private: isPrivate } = req.body;
    if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });

    const pid = Number(req.params.id);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pid);
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    if (post.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的帖子' });

    const privateVal = (isPrivate === true || isPrivate === 'true' || isPrivate === '1' || isPrivate === 1) ? 1 : (isPrivate === false || isPrivate === 'false' || isPrivate === '0' || isPrivate === 0) ? 0 : intToBool(post.private) ? 1 : 0;

    let currentImages = parseJsonField(post.images, []);

    if (removeImages) {
      let removeList;
      try { removeList = JSON.parse(removeImages); }
      catch (e) { return res.status(400).json({ error: 'removeImages 格式错误' }); }
      removeList.forEach(deleteFile);
      currentImages = currentImages.filter(u => !removeList.includes(u));
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => '/uploads/' + f.filename);
      currentImages = [...currentImages, ...newImages];
    }

    let finalTags = parseJsonField(post.tags, []);
    if (tags !== undefined) {
      let parsedTags = [];
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === 'string') {
        try { parsedTags = JSON.parse(tags); } catch (e) { parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean); }
      }
      finalTags = [...new Set(parsedTags.map(t => String(t).slice(0, 20)))].slice(0, 10);
    }

    db.prepare(`
      UPDATE posts SET title = ?, content = ?, category = ?, tags = ?, images = ?, private = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, content, category || post.category, JSON.stringify(finalTags), JSON.stringify(currentImages), privateVal, pid);

    res.json({ ok: true });
  });

  app.delete('/api/posts/:id', requireAuth, (req, res) => {
    const pid = Number(req.params.id);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pid);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    if (post.author_id !== req.session.userId && !isAdmin) {
      return res.status(403).json({ error: '只能删除自己的帖子' });
    }

    const deletePost = db.transaction(() => {
      const commentImages = db.prepare('SELECT images FROM comments WHERE post_id = ?').all(pid);
      commentImages.forEach(c => deleteImages(parseJsonField(c.images, [])));

      deleteImages(parseJsonField(post.images, []));

      db.prepare('DELETE FROM posts WHERE id = ?').run(pid);
    });
    deletePost();

    res.json({ ok: true });
  });
};
