/**
 * channels.js - 频道控制器
 *
 * 提供频道的创建、编辑、删除、加入/退出功能，
 * 支持频道管理员设置和成员管理。
 */

const { requireAuth } = require('../middleware/auth');
const { isAdmin } = require('../services/post-helper');

module.exports = function (app, db) {
  /** 获取频道列表 */
  app.get('/api/channels', (req, res) => {
    const userId = req.session?.userId || null;
    const channels = db
      .prepare(
        `
      SELECT c.*,
        (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) AS member_count,
        (SELECT COUNT(*) FROM categories WHERE channel_id = c.id) AS board_count,
        cm.role AS user_role
      FROM channels c
      LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
      ORDER BY c.is_official DESC, c.sort_order ASC, c.created_at ASC
    `
      )
      .all(userId);
    res.json({ channels });
  });

  /** 获取单个频道详情 */
  app.get('/api/channels/:id', (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session?.userId || null;
    const channel = db
      .prepare(
        `
      SELECT c.*,
        (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) AS member_count,
        (SELECT COUNT(*) FROM categories WHERE channel_id = c.id) AS board_count,
        cm.role AS user_role
      FROM channels c
      LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
      WHERE c.id = ?
    `
      )
      .get(userId, channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });
    res.json({ channel });
  });

  /** 创建频道 */
  app.post('/api/channels', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { name, label, description, icon, color, joinPolicy } = req.body;

    if (!name || !label) return res.status(400).json({ error: '请填写频道标识和名称' });
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).json({ error: '频道标识只能包含英文、数字、下划线' });
    if (name.length < 2 || name.length > 20) return res.status(400).json({ error: '频道标识2-20字符' });
    if (label.length > 20) return res.status(400).json({ error: '频道名称最多20字' });

    const user = db.prepare('SELECT points FROM profiles WHERE id = ?').get(userId);
    const checkinCount = db.prepare('SELECT COUNT(*) as count FROM check_ins WHERE user_id = ?').get(userId);

    if (checkinCount.count < 10) {
      return res.status(403).json({ error: `签到天数不足，需要签到满10天，当前${checkinCount.count}天` });
    }
    if ((user.points || 0) < 500) {
      return res.status(403).json({ error: `积分不足，需要500积分，当前${user.points || 0}积分` });
    }

    const exists = db.prepare('SELECT id FROM channels WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ error: '频道标识已存在' });

    const validPolicies = ['open', 'verify', 'deny'];
    const policy = validPolicies.includes(joinPolicy) ? joinPolicy : 'open';

    const result = db.transaction(() => {
      // 扣除积分
      db.prepare('UPDATE profiles SET points = points - 500 WHERE id = ?').run(userId);

      const result = db
        .prepare(
          `
        INSERT INTO channels (name, label, description, icon, color, created_by, join_policy, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM channels))
      `
        )
        .run(
          name.slice(0, 20),
          label,
          (description || '').slice(0, 200),
          icon || '',
          color || 'bg-gray-100 text-gray-700',
          userId,
          policy
        );

      const channelId = result.lastInsertRowid;

      // 创建者自动成为 owner
      db.prepare('INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)').run(
        channelId,
        userId,
        'owner'
      );

      return { channelId, result };
    })();

    const channelId = result.channelId;

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    res.json({ ok: true, channel });
  });

  /** 编辑频道 */
  app.put('/api/channels/:id', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;
    const { label, description, icon, color, joinPolicy } = req.body;

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });

    // 检查权限：频道主、频道管理员、或全局管理员
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权编辑此频道' });
    }

    const validPolicies = ['open', 'verify', 'deny'];
    const policy = validPolicies.includes(joinPolicy) ? joinPolicy : channel.join_policy;

    db.prepare(
      `
      UPDATE channels SET label = ?, description = ?, icon = ?, color = ?, join_policy = ?
      WHERE id = ?
    `
    ).run(
      label || channel.label,
      description !== undefined ? description : channel.description,
      icon !== undefined ? icon : channel.icon,
      color || channel.color,
      policy,
      channelId
    );

    const updated = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    res.json({ ok: true, channel: updated });
  });

  /** 删除频道 */
  app.delete('/api/channels/:id', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });
    if (channel.is_official) return res.status(403).json({ error: '官方频道不可删除' });

    // 检查权限：频道主或全局管理员
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权删除此频道' });
    }

    db.prepare('DELETE FROM channels WHERE id = ?').run(channelId);
    res.json({ ok: true });
  });

  /** 加入频道 */
  app.post('/api/channels/:id/join', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });

    // 检查是否已是成员
    const existing = db
      .prepare('SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    if (existing) return res.status(400).json({ error: '已是频道成员' });

    // 检查加入策略
    if (channel.join_policy === 'deny') {
      return res.status(403).json({ error: '该频道不允许加入' });
    }
    if (channel.join_policy === 'verify') {
      // TODO: 实现审核逻辑
      return res.status(403).json({ error: '该频道需要审核，暂不支持' });
    }

    db.prepare('INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)').run(
      channelId,
      userId,
      'member'
    );
    res.json({ ok: true });
  });

  /** 退出频道 */
  app.post('/api/channels/:id/leave', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });
    if (channel.is_official) return res.status(403).json({ error: '官方频道不可退出' });

    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    if (!member) return res.status(400).json({ error: '不是频道成员' });
    if (member.role === 'owner') return res.status(403).json({ error: '频道主不可退出，请先转让频道' });

    db.prepare('DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?').run(channelId, userId);
    res.json({ ok: true });
  });

  /** 获取频道成员列表 */
  app.get('/api/channels/:id/members', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const members = db
      .prepare(
        `
      SELECT cm.user_id, cm.role, cm.joined_at,
        p.username, p.display_id, p.avatar_url, p.title, p.avatar_frame
      FROM channel_members cm
      JOIN profiles p ON p.id = cm.user_id
      WHERE cm.channel_id = ?
      ORDER BY cm.role ASC, cm.joined_at ASC
    `
      )
      .all(channelId);
    res.json({ members });
  });

  /** 设置频道成员角色 */
  app.put('/api/channels/:id/members/:uid/role', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const targetUserId = Number(req.params.uid);
    const userId = req.session.userId;
    const { role } = req.body;

    const validRoles = ['admin', 'member'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: '无效的角色' });

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });

    // 只有频道主可以设置角色
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ error: '只有频道主可以设置成员角色' });
    }

    // 不能修改自己的角色
    if (userId === targetUserId) return res.status(400).json({ error: '不能修改自己的角色' });

    // 目标用户必须是频道成员
    const targetMember = db
      .prepare('SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, targetUserId);
    if (!targetMember) return res.status(400).json({ error: '用户不是频道成员' });

    db.prepare('UPDATE channel_members SET role = ? WHERE channel_id = ? AND user_id = ?').run(
      role,
      channelId,
      targetUserId
    );
    res.json({ ok: true });
  });

  /** 获取频道板块列表 */
  app.get('/api/channels/:id/boards', (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session?.userId || null;

    const boards = db
      .prepare(
        `
      SELECT c.*
      FROM categories c
      WHERE c.channel_id = ?
      ORDER BY c.sort_order ASC
    `
      )
      .all(channelId);

    // 过滤可见板块
    const visibleBoards = boards.filter((board) => {
      if (board.visibility === 'all') return true;
      if (!userId) return false;
      if (board.visibility === 'members') {
        const isMember = db
          .prepare('SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?')
          .get(channelId, userId);
        return !!isMember;
      }
      if (board.visibility === 'selected') {
        const isVisible = db
          .prepare('SELECT id FROM board_visible_members WHERE board_id = ? AND user_id = ?')
          .get(board.id, userId);
        return !!isVisible;
      }
      return false;
    });

    res.json({ boards: visibleBoards });
  });
};
