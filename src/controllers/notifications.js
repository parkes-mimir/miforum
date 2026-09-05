/**
 * notifications.js - 通知控制器
 */

const { requireAuth } = require('../middleware/auth');

function createNotification(db, { userId, fromUserId, type, postId }) {
  if (userId === fromUserId) return null;
  const result = db.prepare(`
    INSERT INTO notifications (user_id, from_user_id, type, post_id)
    VALUES (?, ?, ?, ?)
  `).run(userId, fromUserId, type, postId || null);
  return result.lastInsertRowid;
}

module.exports = function (app, db) {

  /** 获取当前用户通知（分页，最新优先，支持按类型筛选） */
  app.get('/api/notifications', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const type = req.query.type || null;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let whereSql = ' WHERE n.user_id = ?';
    const params = [userId];
    if (type && ['like', 'comment', 'bookmark'].includes(type)) {
      whereSql += ' AND n.type = ?';
      params.push(type);
    }

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM notifications n${whereSql}`).get(...params);
    const { unread } = db.prepare(`SELECT COUNT(*) AS unread FROM notifications n${whereSql} AND n.read = 0`).get(...params);

    const rows = db.prepare(`
      SELECT n.*,
        fu.username AS from_username, fu.avatar_url AS from_avatar_url, fu.display_id AS from_display_id,
        p.title AS post_title
      FROM notifications n
      LEFT JOIN profiles fu ON fu.id = n.from_user_id
      LEFT JOIN posts p ON p.id = n.post_id
      ${whereSql}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const notifications = rows.map(n => ({
      ...n,
      read: !!n.read
    }));

    res.json({
      notifications,
      unread,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });

  /** 获取各类型未读数量 */
  app.get('/api/notifications/unread-count', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const all = db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read = 0').get(userId).count;
    const likes = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read = 0 AND type = 'like'").get(userId).count;
    const comments = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read = 0 AND type = 'comment'").get(userId).count;
    const bookmarks = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read = 0 AND type = 'bookmark'").get(userId).count;
    res.json({ unread: all, likes, comments, bookmarks });
  });

  /** 标记单条通知为已读 */
  app.put('/api/notifications/:id/read', requireAuth, (req, res) => {
    const nid = Number(req.params.id);
    const n = db.prepare('SELECT id, user_id FROM notifications WHERE id = ?').get(nid);
    if (!n) return res.status(404).json({ error: '通知不存在' });
    if (n.user_id !== req.session.userId) return res.status(403).json({ error: '无权操作' });

    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(nid);
    res.json({ ok: true });
  });

  /** 标记所有通知为已读（可按类型） */
  app.put('/api/notifications/read-all', requireAuth, (req, res) => {
    const type = req.query.type || null;
    if (type && ['like', 'comment', 'bookmark'].includes(type)) {
      db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0 AND type = ?').run(req.session.userId, type);
    } else {
      db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.session.userId);
    }
    res.json({ ok: true });
  });
};

module.exports.createNotification = createNotification;
