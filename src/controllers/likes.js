/**
 * likes.js - 点赞与收藏控制器
 */

const { requireAuth } = require('../middleware/auth');
const { parseJsonField, intToBool } = require('../utils/helpers');
const { createNotification } = require('./notifications');

module.exports = function(app, db) {
  const { addExp, EXP_REWARDS } = require('./level');

  /** 获取当前用户点赞的帖子 ID 列表 */
  app.get('/api/likes', (req, res) => {
    if (!req.session.userId) return res.json({ ids: [] });
    const ids = db.prepare('SELECT post_id FROM post_likes WHERE user_id = ?')
      .all(req.session.userId)
      .map(l => l.post_id);
    res.json({ ids });
  });

  /** 点赞帖子 */
  app.post('/api/like/:postId', requireAuth, (req, res) => {
    const pid = Number(req.params.postId);
    const exists = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?')
      .get(pid, req.session.userId);
    if (exists) return res.status(400).json({ error: '已点赞' });

    db.prepare('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, datetime(\'now\'))')
      .run(pid, req.session.userId);

    // 帖子作者获得「被点赞」经验 + 通知
    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(pid);
    if (post && post.author_id && post.author_id !== req.session.userId) {
      addExp(db, post.author_id, EXP_REWARDS.receive_like);
      createNotification(db, { userId: post.author_id, fromUserId: req.session.userId, type: 'like', postId: pid });
    }
    res.json({ ok: true });
  });

  /** 取消点赞 */
  app.delete('/api/like/:postId', requireAuth, (req, res) => {
    const pid = Number(req.params.postId);
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?')
      .run(pid, req.session.userId);
    res.json({ ok: true });
  });

  /** 收藏帖子 */
  app.post('/api/bookmark/:postId', requireAuth, (req, res) => {
    const pid = Number(req.params.postId);
    const post = db.prepare('SELECT id, author_id FROM posts WHERE id = ?').get(pid);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const exists = db.prepare('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?')
      .get(pid, req.session.userId);
    if (exists) return res.status(400).json({ error: '已收藏' });

    db.prepare('INSERT INTO bookmarks (post_id, user_id, created_at) VALUES (?, ?, datetime(\'now\'))')
      .run(pid, req.session.userId);

    // 收藏行为获得经验 + 通知帖子作者
    addExp(db, req.session.userId, EXP_REWARDS.bookmark);
    if (post.author_id && post.author_id !== req.session.userId) {
      createNotification(db, { userId: post.author_id, fromUserId: req.session.userId, type: 'bookmark', postId: pid });
    }
    res.json({ ok: true });
  });

  /** 取消收藏 */
  app.delete('/api/bookmark/:postId', requireAuth, (req, res) => {
    const pid = Number(req.params.postId);
    db.prepare('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?')
      .run(pid, req.session.userId);
    res.json({ ok: true });
  });

  /** 检查帖子是否已收藏 */
  app.get('/api/bookmark/:postId', requireAuth, (req, res) => {
    const pid = Number(req.params.postId);
    const found = db.prepare('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?')
      .get(pid, req.session.userId);
    res.json({ isBookmarked: !!found });
  });

  /** 获取当前用户收藏列表（支持分页） */
  app.get('/api/bookmarks', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // 查询总数
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM bookmarks WHERE user_id = ?').get(userId);

    // 查询当前页数据
    const rows = db.prepare(`
      SELECT p.*, b.created_at AS bookmarked_at,
        pr.display_id AS author_display_id, pr.username AS author_name,
        pr.avatar_url AS author_avatar_url, pr.title AS author_title,
        pr.avatar_frame AS author_avatar_frame,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
      FROM bookmarks b
      JOIN posts p ON p.id = b.post_id
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const posts = rows.map(p => ({
      ...p,
      tags: parseJsonField(p.tags, []),
      images: parseJsonField(p.images, []),
      pinned: intToBool(p.pinned),
      author_avatar_url: p.author_avatar_url || null,
      author_title: p.author_title || null,
      author_avatar_frame: p.author_avatar_frame || null
    }));

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });
};
