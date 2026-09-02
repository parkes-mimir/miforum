const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireNotMuted } = require('../middleware/auth');
const { deleteImages, deleteFile, parseJsonField, intToBool } = require('../utils/helpers');
const { addExp, EXP_REWARDS } = require('./level');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
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

  app.get('/api/posts/:id/comments', (req, res) => {
    const pid = Number(req.params.id);
    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(pid);

    const commentsRaw = db.prepare(`
      SELECT c.*,
        pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
        pr.title AS author_title, pr.avatar_frame AS author_avatar_frame
      FROM comments c
      LEFT JOIN profiles pr ON pr.id = c.author_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(pid);

    const floorMap = {};
    commentsRaw.forEach((c, i) => { floorMap[c.id] = i + 1; });

    const comments = [...commentsRaw]
      .sort((a, b) => {
        const ap = intToBool(a.pinned) ? 1 : 0;
        const bp = intToBool(b.pinned) ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return new Date(a.created_at) - new Date(b.created_at);
      })
      .map(c => ({
        ...c,
        images: parseJsonField(c.images, []),
        pinned: intToBool(c.pinned),
        author_avatar_url: c.author_avatar_url || null,
        author_title: c.author_title || null,
        author_avatar_frame: c.author_avatar_frame || null,
        floor: floorMap[c.id],
        is_post_owner: post ? c.author_id === post.author_id : false
      }));

    res.json({ comments, postOwnerId: post ? post.author_id : null });
  });

  app.post('/api/posts/:id/comments', requireAuth, requireNotMuted(db), multerUpload(upload.array('images', 3)), (req, res) => {
    const { content } = req.body;
    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: '请输入评论内容或上传图片' });
    }

    const post = db.prepare('SELECT id, author_id FROM posts WHERE id = ?').get(Number(req.params.id));
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
    const result = db.prepare(`
      INSERT INTO comments (post_id, author_id, content, images, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(Number(req.params.id), req.session.userId, content || '', JSON.stringify(images));

    addExp(db, req.session.userId, EXP_REWARDS.comment);
    if (post.author_id && post.author_id !== req.session.userId) {
      addExp(db, post.author_id, EXP_REWARDS.receive_comment);
    }

    res.json({ commentId: result.lastInsertRowid });
  });

  app.put('/api/comments/:id', requireAuth, requireNotMuted(db), multerUpload(upload.array('images', 3)), (req, res) => {
    const { content, removeImages } = req.body;
    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: '评论不能为空' });
    }

    const cid = Number(req.params.id);
    const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(cid);
    if (!c) return res.status(404).json({ error: '评论不存在' });
    if (c.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的评论' });

    let currentImages = parseJsonField(c.images, []);

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

    db.prepare('UPDATE comments SET content = ?, images = ? WHERE id = ?')
      .run(content || c.content, JSON.stringify(currentImages), cid);

    res.json({ ok: true });
  });

  app.delete('/api/comments/:id', requireAuth, (req, res) => {
    const cid = Number(req.params.id);
    const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(cid);
    if (!c) return res.status(404).json({ error: '评论不存在' });

    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(c.post_id);
    const isPostOwner = post && post.author_id === req.session.userId;

    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    if (c.author_id !== req.session.userId && !isPostOwner && !isAdmin) {
      return res.status(403).json({ error: '只能删除自己的评论或自己帖子下的评论' });
    }

    deleteImages(parseJsonField(c.images, []));
    db.prepare('DELETE FROM comments WHERE id = ?').run(cid);

    res.json({ ok: true });
  });

  app.put('/api/comments/:id/pin', requireAuth, (req, res) => {
    const cid = Number(req.params.id);
    const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(cid);
    if (!c) return res.status(404).json({ error: '评论不存在' });

    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(c.post_id);
    if (!post || post.author_id !== req.session.userId) {
      return res.status(403).json({ error: '只有帖主可以置顶评论' });
    }

    const newPinned = intToBool(c.pinned) ? 0 : 1;
    db.prepare('UPDATE comments SET pinned = ? WHERE id = ?').run(newPinned, cid);
    res.json({ ok: true, pinned: intToBool(newPinned) });
  });
};
