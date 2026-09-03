const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireNotMuted } = require('../middleware/auth');
const { deleteImages, deleteFile, parseJsonField, intToBool, UPLOADS_DIR } = require('../utils/helpers');
const { addExp, EXP_REWARDS, getLevelInfo } = require('./level');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const name = 'webforum' + date + '-' + Date.now() + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('仅支持 JPG/PNG/GIF/WebP/BMP 格式图片'));
  }
});

function multerUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err && err.code === 'LIMIT_UNEXPECTED_FILE') return next();
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

module.exports = function (app, db) {
  /** 获取帖子列表（支持分页、分类、标签、搜索） */
  app.get('/api/posts', (req, res) => {
    const { category, search, tag } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let whereSql = ' WHERE 1=1';
    const params = [];

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
      ORDER BY p.pinned DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(sql).all(...params, limit, offset);
    const posts = rows.map(p => ({
      ...p,
      tags: parseJsonField(p.tags, []),
      images: parseJsonField(p.images, []),
      pinned: intToBool(p.pinned),
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

    res.json({
      post: {
        ...p,
        tags: parseJsonField(p.tags, []),
        images: parseJsonField(p.images, []),
        pinned: intToBool(p.pinned),
        author_avatar_url: p.author_avatar_url || null,
        author_title: p.author_title || null,
        author_avatar_frame: p.author_avatar_frame || null,
        author_level_info: getLevelInfo(p.author_exp || 0)
      }
    });
  });

  app.post('/api/posts', requireAuth, requireNotMuted(db), multerUpload(upload.array('images', 30)), (req, res) => {
    const { title, content, category, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });

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
        INSERT INTO posts (title, content, category, tags, author_id, images, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(title, content, category || 'tech', JSON.stringify(parsedTags), req.session.userId, JSON.stringify(images));

      db.prepare('UPDATE profiles SET points = points + 5 WHERE id = ?').run(req.session.userId);
      addExp(db, req.session.userId, EXP_REWARDS.post);
      const user = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
      return { postId: result.lastInsertRowid, points: user ? user.points : 0, exp: user ? user.exp : 0, level_info: getLevelInfo(user ? user.exp : 0) };
    });

    const result = insertPost();
    res.json({ postId: result.postId, points: result.points, exp: result.exp, level_info: result.level_info });
  });

  app.put('/api/posts/:id', requireAuth, requireNotMuted(db), multerUpload(upload.array('images', 30)), (req, res) => {
    const { title, content, category, tags, removeImages } = req.body;
    if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });

    const pid = Number(req.params.id);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pid);
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    if (post.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的帖子' });

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
      UPDATE posts SET title = ?, content = ?, category = ?, tags = ?, images = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, content, category || post.category, JSON.stringify(finalTags), JSON.stringify(currentImages), pid);

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
