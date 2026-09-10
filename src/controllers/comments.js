/**
 * comments.js - 评论 CRUD 控制器
 *
 * 提供评论的创建、读取、更新、删除功能，
 * 支持图片上传、楼层号、帖主置顶评论。
 */

const { requireAuth, requireNotMuted } = require('../middleware/auth');
const { deleteImages, deleteFile, parseJsonField, intToBool } = require('../utils/helpers');
const { commentUpload, multerUpload } = require('../utils/upload');
const { addExp, EXP_REWARDS } = require('../services/level');
const { createNotification } = require('../services/notification');
const { isAdmin, parsePagination } = require('../services/post-helper');

module.exports = function (app, db) {
  /** 获取帖子评论（支持分页） */
  app.get('/api/posts/:id/comments', (req, res) => {
    const pid = Number(req.params.id);
    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(pid);
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    const { page, limit, offset } = parsePagination(req.query, 50, 100);

    // 查询总数
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM comments WHERE post_id = ?').get(pid);

    // 查询当前页数据（置顶优先，再按时间正序）
    const commentsRaw = db
      .prepare(
        `
      SELECT c.*,
        pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
        pr.title AS author_title, pr.avatar_frame AS author_avatar_frame
      FROM comments c
      LEFT JOIN profiles pr ON pr.id = c.author_id
      WHERE c.post_id = ?
      ORDER BY c.pinned DESC, c.created_at ASC
      LIMIT ? OFFSET ?
    `
      )
      .all(pid, limit, offset);

    const floorMap = {};
    commentsRaw.forEach((c, i) => {
      floorMap[c.id] = offset + i + 1;
    });

    const comments = commentsRaw.map((c) => ({
      ...c,
      images: parseJsonField(c.images, []),
      pinned: intToBool(c.pinned),
      author_avatar_url: c.author_avatar_url || null,
      author_title: c.author_title || null,
      author_avatar_frame: c.author_avatar_frame || null,
      floor: floorMap[c.id],
      is_post_owner: c.author_id === post.author_id
    }));

    res.json({
      comments,
      postOwnerId: post.author_id,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });

  app.post(
    '/api/posts/:id/comments',
    requireAuth,
    requireNotMuted(db),
    multerUpload(commentUpload.array('images', 3)),
    (req, res) => {
      const { content } = req.body;
      if (!content && (!req.files || req.files.length === 0)) {
        return res.status(400).json({ error: '请输入评论内容或上传图片' });
      }
      if (content && content.length > 10000) return res.status(400).json({ error: '评论最多10000字' });

      const post = db.prepare('SELECT id, author_id FROM posts WHERE id = ?').get(Number(req.params.id));
      if (!post) return res.status(404).json({ error: '帖子不存在' });

      const images = req.files ? req.files.map((f) => '/uploads/' + f.filename) : [];

      const result = db.transaction(() => {
        const insertResult = db
          .prepare(
            `
        INSERT INTO comments (post_id, author_id, content, images, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `
          )
          .run(Number(req.params.id), req.session.userId, content || '', JSON.stringify(images));

        addExp(db, req.session.userId, EXP_REWARDS.comment);
        if (post.author_id && post.author_id !== req.session.userId) {
          addExp(db, post.author_id, EXP_REWARDS.receive_comment);
          createNotification(db, {
            userId: post.author_id,
            fromUserId: req.session.userId,
            type: 'comment',
            postId: Number(req.params.id)
          });
        }

        return insertResult;
      })();

      res.json({ ok: true, commentId: result.lastInsertRowid });
    }
  );

  app.put(
    '/api/comments/:id',
    requireAuth,
    requireNotMuted(db),
    multerUpload(commentUpload.array('images', 3)),
    (req, res) => {
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
        try {
          removeList = JSON.parse(removeImages);
        } catch (e) {
          return res.status(400).json({ error: 'removeImages 格式错误' });
        }
        removeList.forEach(deleteFile);
        currentImages = currentImages.filter((u) => !removeList.includes(u));
      }

      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((f) => '/uploads/' + f.filename);
        currentImages = [...currentImages, ...newImages];
      }

      db.prepare('UPDATE comments SET content = ?, images = ? WHERE id = ?').run(
        content !== undefined ? content : c.content,
        JSON.stringify(currentImages),
        cid
      );

      res.json({ ok: true });
    }
  );

  app.delete('/api/comments/:id', requireAuth, (req, res) => {
    const cid = Number(req.params.id);
    const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(cid);
    if (!c) return res.status(404).json({ error: '评论不存在' });

    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(c.post_id);
    const isPostOwner = post && post.author_id === req.session.userId;

    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    if (c.author_id !== req.session.userId && !isPostOwner && !isAdmin(user)) {
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
