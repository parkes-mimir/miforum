const { requireAuth } = require('../middleware/auth');

module.exports = function (app, db) {

  /** 获取当前用户的会话列表 */
  app.get('/api/conversations', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { total } = db.prepare(`
      SELECT COUNT(*) AS total FROM conversation_participants WHERE user_id = ?
    `).get(userId);

    const rows = db.prepare(`
      SELECT
        c.id, c.created_at,
        p.id AS other_user_id, p.display_id AS other_display_id,
        p.username AS other_username, p.avatar_url AS other_avatar_url,
        p.avatar_frame AS other_avatar_frame,
        m.content AS last_message, m.created_at AS last_message_at, m.sender_id AS last_message_sender_id,
        (SELECT COUNT(*) FROM messages
         WHERE conversation_id = c.id
           AND sender_id != ?
           AND created_at > cp.last_read_at
        ) AS unread
      FROM conversation_participants cp
      JOIN conversations c ON c.id = cp.conversation_id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != ?
      JOIN profiles p ON p.id = cp2.user_id
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE cp.user_id = ?
      ORDER BY COALESCE(m.created_at, c.created_at) DESC
      LIMIT ? OFFSET ?
    `).all(userId, userId, userId, limit, offset);

    res.json({
      conversations: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });

  /** 创建或查找与指定用户的会话 */
  app.post('/api/conversations', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const targetId = Number(req.body.userId);

    if (!targetId || targetId === userId) {
      return res.status(400).json({ error: '无效的用户 ID' });
    }

    const target = db.prepare('SELECT id FROM profiles WHERE id = ?').get(targetId);
    if (!target) return res.status(404).json({ error: '用户不存在' });

    // 查找已有的 1:1 会话
    const existing = db.prepare(`
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
      WHERE (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
      LIMIT 1
    `).get(userId, targetId);

    if (existing) {
      return res.json({ conversation: { id: existing.id } });
    }

    const createConversation = db.transaction(() => {
      const result = db.prepare('INSERT INTO conversations DEFAULT VALUES').run();
      const convId = result.lastInsertRowid;
      db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(convId, userId);
      db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(convId, targetId);
      return convId;
    });

    const conversationId = createConversation();
    res.json({ conversation: { id: conversationId } });
  });

  /** 获取会话消息（分页，最新在前） */
  app.get('/api/conversations/:id/messages', requireAuth, (req, res) => {
    const convId = Number(req.params.id);
    const userId = req.session.userId;

    const participant = db.prepare(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
    ).get(convId, userId);
    if (!participant) return res.status(403).json({ error: '你不是该会话的参与者' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const { total } = db.prepare(
      'SELECT COUNT(*) AS total FROM messages WHERE conversation_id = ?'
    ).get(convId);

    const messages = db.prepare(`
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
        p.display_id AS sender_display_id, p.username AS sender_name,
        p.avatar_url AS sender_avatar_url, p.avatar_frame AS sender_avatar_frame
      FROM messages m
      LEFT JOIN profiles p ON p.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(convId, limit, offset);

    // 标记已读
    db.prepare(
      'UPDATE conversation_participants SET last_read_at = datetime(\'now\') WHERE conversation_id = ? AND user_id = ?'
    ).run(convId, userId);

    res.json({
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });

  /** 发送消息 */
  app.post('/api/conversations/:id/messages', requireAuth, (req, res) => {
    const convId = Number(req.params.id);
    const userId = req.session.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const participant = db.prepare(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
    ).get(convId, userId);
    if (!participant) return res.status(403).json({ error: '你不是该会话的参与者' });

    const sendMessage = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO messages (conversation_id, sender_id, content, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(convId, userId, content.trim());

      // 更新会话时间戳（触发排序刷新）
      db.prepare('UPDATE conversations SET created_at = datetime(\'now\') WHERE id = ?').run(convId);

      // 标记已读
      db.prepare(
        'UPDATE conversation_participants SET last_read_at = datetime(\'now\') WHERE conversation_id = ? AND user_id = ?'
      ).run(convId, userId);

      return result.lastInsertRowid;
    });

    const messageId = sendMessage();
    res.json({ messageId });
  });

  /** 获取未读消息总数 */
  app.get('/api/messages/unread-count', requireAuth, (req, res) => {
    const userId = req.session.userId;

    const { count } = db.prepare(`
      SELECT COALESCE(SUM(cnt), 0) AS count FROM (
        SELECT COUNT(*) AS cnt
        FROM messages m
        JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
        WHERE m.sender_id != ? AND m.created_at > cp.last_read_at
      )
    `).get(userId, userId);

    res.json({ unread: count });
  });
};
