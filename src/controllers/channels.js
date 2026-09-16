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

  /** 转让频道主 */
  app.put('/api/channels/:id/transfer', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;
    const { targetUserId } = req.body;

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });
    if (channel.is_official) return res.status(403).json({ error: '官方频道不可转让' });

    // 检查权限：只有频道主可以转让
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ error: '只有频道主可以转让频道' });
    }

    // 检查目标用户是否是频道成员
    const targetMember = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, targetUserId);
    if (!targetMember) return res.status(400).json({ error: '目标用户不是频道成员' });
    if (targetMember.role === 'owner') return res.status(400).json({ error: '不能转让给自己' });

    // 执行转让
    db.transaction(() => {
      // 原频道主降为管理员
      db.prepare("UPDATE channel_members SET role = 'admin' WHERE channel_id = ? AND user_id = ?").run(
        channelId,
        userId
      );
      // 目标用户升级为频道主
      db.prepare("UPDATE channel_members SET role = 'owner' WHERE channel_id = ? AND user_id = ?").run(
        channelId,
        targetUserId
      );
    })();

    const targetUser = db.prepare('SELECT username FROM profiles WHERE id = ?').get(targetUserId);
    res.json({ ok: true, message: `已将频道转让给 ${targetUser?.username}` });
  });

  /** 加入频道 */
  app.post('/api/channels/:id/join', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;
    const { reason } = req.body;

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

    // 审核加入
    if (channel.join_policy === 'verify') {
      // 检查是否已有待审核的申请
      const existingRequest = db
        .prepare("SELECT id FROM channel_join_requests WHERE channel_id = ? AND user_id = ? AND status = 'pending'")
        .get(channelId, userId);
      if (existingRequest) return res.status(400).json({ error: '已提交申请，请等待审核' });

      // 创建申请
      db.prepare('INSERT INTO channel_join_requests (channel_id, user_id, reason) VALUES (?, ?, ?)').run(
        channelId,
        userId,
        (reason || '').slice(0, 200)
      );

      return res.json({ ok: true, pending: true, message: '申请已提交，等待审核' });
    }

    // 直接加入（open策略）
    db.prepare('INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)').run(
      channelId,
      userId,
      'member'
    );
    res.json({ ok: true, pending: false });
  });

  /** 获取频道加入申请列表（频道主/管理员） */
  app.get('/api/channels/:id/requests', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;

    // 检查权限
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权查看' });
    }

    const requests = db
      .prepare(
        `
      SELECT r.*, p.username, p.display_id, p.avatar_url
      FROM channel_join_requests r
      JOIN profiles p ON p.id = r.user_id
      WHERE r.channel_id = ? AND r.status = 'pending'
      ORDER BY r.created_at ASC
    `
      )
      .all(channelId);

    res.json({ requests });
  });

  /** 审核加入申请 */
  app.put('/api/channels/:id/requests/:requestId', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const requestId = Number(req.params.requestId);
    const userId = req.session.userId;
    const { action } = req.body; // 'approve' or 'reject'

    // 检查权限
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权操作' });
    }

    const request = db
      .prepare("SELECT * FROM channel_join_requests WHERE id = ? AND channel_id = ? AND status = 'pending'")
      .get(requestId, channelId);
    if (!request) return res.status(404).json({ error: '申请不存在' });

    if (action === 'approve') {
      db.transaction(() => {
        // 批准：添加为成员
        db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)').run(
          channelId,
          request.user_id,
          'member'
        );
        // 更新申请状态
        db.prepare(
          "UPDATE channel_join_requests SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?"
        ).run(userId, requestId);
      })();
      res.json({ ok: true, message: '已批准' });
    } else if (action === 'reject') {
      db.prepare(
        "UPDATE channel_join_requests SET status = 'rejected', reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?"
      ).run(userId, requestId);
      res.json({ ok: true, message: '已拒绝' });
    } else {
      return res.status(400).json({ error: '无效的操作' });
    }
  });

  /** 检查用户是否已申请加入频道 */
  app.get('/api/channels/:id/request-status', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;

    const request = db
      .prepare(
        'SELECT status FROM channel_join_requests WHERE channel_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(channelId, userId);

    res.json({ status: request ? request.status : null });
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

  /** 移除频道成员 */
  app.delete('/api/channels/:id/members/:uid', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const targetUserId = Number(req.params.uid);
    const userId = req.session.userId;

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });

    // 检查权限：频道主或全局管理员
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权移除成员' });
    }

    // 不能移除自己
    if (userId === targetUserId) return res.status(400).json({ error: '不能移除自己' });

    // 检查目标用户是否是频道成员
    const targetMember = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, targetUserId);
    if (!targetMember) return res.status(400).json({ error: '用户不是频道成员' });

    // 不能移除频道主
    if (targetMember.role === 'owner') return res.status(403).json({ error: '不能移除频道主' });

    db.prepare('DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?').run(channelId, targetUserId);
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

  /** 频道主创建板块 */
  app.post('/api/channels/:id/boards', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const userId = req.session.userId;
    const { name, label, description, icon, color, visibility, postPolicy } = req.body;

    // 检查频道是否存在
    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });

    // 检查权限：频道主、频道管理员或全局管理员
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权在此频道创建板块' });
    }

    // 输入校验
    if (!name || !label) return res.status(400).json({ error: '请填写板块标识和名称' });
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).json({ error: '板块标识只能包含英文、数字、下划线' });
    if (name.length < 2 || name.length > 20) return res.status(400).json({ error: '板块标识2-20字符' });
    if (label.length < 1 || label.length > 10) return res.status(400).json({ error: '板块名称1-10字' });
    if (description && description.length > 100) return res.status(400).json({ error: '简介最多100字' });

    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ error: '板块标识已存在' });

    const validVisibility = ['all', 'members', 'selected'];
    const validPostPolicy = ['all', 'members', 'selected'];
    const vis = validVisibility.includes(visibility) ? visibility : 'all';
    const policy = validPostPolicy.includes(postPolicy) ? postPolicy : 'members';

    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories WHERE channel_id = ?').get(channelId);
    const order = (maxOrder.m || 0) + 1;

    const result = db
      .prepare(
        `
      INSERT INTO categories (name, label, description, color, icon, section_type, created_by, channel_id, visibility, post_policy, sort_order)
      VALUES (?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?)
    `
      )
      .run(
        name.slice(0, 20),
        label,
        (description || '').slice(0, 100),
        color || 'bg-gray-100 text-gray-700',
        icon || '',
        userId,
        channelId,
        vis,
        policy,
        order
      );

    res.json({
      ok: true,
      board: {
        id: result.lastInsertRowid,
        name: name.slice(0, 20),
        label,
        description: (description || '').slice(0, 100),
        color: color || 'bg-gray-100 text-gray-700',
        icon: icon || '',
        visibility: vis,
        postPolicy: policy,
        order
      }
    });
  });

  /** 频道主编辑板块 */
  app.put('/api/channels/:id/boards/:boardId', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const boardId = Number(req.params.boardId);
    const userId = req.session.userId;
    const { label, description, icon, color, visibility, postPolicy, order } = req.body;

    // 检查频道是否存在
    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });

    // 检查板块是否存在且属于该频道
    const board = db.prepare('SELECT * FROM categories WHERE id = ? AND channel_id = ?').get(boardId, channelId);
    if (!board) return res.status(404).json({ error: '板块不存在或不属于此频道' });

    // 检查权限
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权编辑此板块' });
    }

    if (label && label.length > 10) return res.status(400).json({ error: '板块名称最多10字' });

    const validVisibility = ['all', 'members', 'selected'];
    const validPostPolicy = ['all', 'members', 'selected'];

    db.prepare(
      `
      UPDATE categories SET label = ?, description = ?, color = ?, icon = ?, visibility = ?, post_policy = ?, sort_order = ?
      WHERE id = ?
    `
    ).run(
      label || board.label,
      description !== undefined ? description : board.description,
      color || board.color,
      icon !== undefined ? icon : board.icon,
      visibility && validVisibility.includes(visibility) ? visibility : board.visibility || 'all',
      postPolicy && validPostPolicy.includes(postPolicy) ? postPolicy : board.post_policy || 'members',
      order !== undefined ? Number(order) : board.sort_order,
      boardId
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(boardId);
    res.json({
      ok: true,
      board: {
        id: boardId,
        name: updated.name,
        label: updated.label,
        description: updated.description,
        color: updated.color,
        icon: updated.icon,
        visibility: updated.visibility,
        postPolicy: updated.post_policy,
        order: updated.sort_order
      }
    });
  });

  /** 频道主删除板块 */
  app.delete('/api/channels/:id/boards/:boardId', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const boardId = Number(req.params.boardId);
    const userId = req.session.userId;

    // 检查频道是否存在
    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!channel) return res.status(404).json({ error: '频道不存在' });

    // 检查板块是否存在且属于该频道
    const board = db.prepare('SELECT * FROM categories WHERE id = ? AND channel_id = ?').get(boardId, channelId);
    if (!board) return res.status(404).json({ error: '板块不存在或不属于此频道' });

    // 检查权限
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权删除此板块' });
    }

    if (board.section_type === 'announcement' || board.section_type === 'hot') {
      return res.status(400).json({ error: '特殊板块不可删除' });
    }

    db.transaction(() => {
      const uncategorized = db.prepare("SELECT id FROM categories WHERE name = 'uncategorized'").get();
      if (!uncategorized) {
        const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get();
        db.prepare(
          "INSERT INTO categories (name, label, description, section_type, sort_order) VALUES ('uncategorized', '未分类', '未分类的帖子', 'normal', ?)"
        ).run((maxOrder.m || 0) + 1);
      }
      db.prepare('UPDATE posts SET category = ? WHERE category = ?').run('uncategorized', board.name);
      db.prepare('DELETE FROM categories WHERE id = ?').run(boardId);
    })();

    res.json({ ok: true });
  });

  /** 获取板块可见成员列表 */
  app.get('/api/channels/:id/boards/:boardId/members', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const boardId = Number(req.params.boardId);
    const userId = req.session.userId;

    // 检查权限
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权查看' });
    }

    // 检查板块是否存在且属于该频道
    const board = db.prepare('SELECT * FROM categories WHERE id = ? AND channel_id = ?').get(boardId, channelId);
    if (!board) return res.status(404).json({ error: '板块不存在' });

    const members = db
      .prepare(
        `
      SELECT bvm.user_id, p.username, p.display_id, p.avatar_url
      FROM board_visible_members bvm
      JOIN profiles p ON p.id = bvm.user_id
      WHERE bvm.board_id = ?
    `
      )
      .all(boardId);

    res.json({ members });
  });

  /** 添加板块可见成员 */
  app.post('/api/channels/:id/boards/:boardId/members', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const boardId = Number(req.params.boardId);
    const userId = req.session.userId;
    const { userIds } = req.body;

    // 检查权限
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权操作' });
    }

    // 检查板块是否存在且属于该频道
    const board = db.prepare('SELECT * FROM categories WHERE id = ? AND channel_id = ?').get(boardId, channelId);
    if (!board) return res.status(404).json({ error: '板块不存在' });

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: '请选择成员' });
    }

    const insert = db.prepare('INSERT OR IGNORE INTO board_visible_members (board_id, user_id) VALUES (?, ?)');
    db.transaction(() => {
      for (const uid of userIds) {
        insert.run(boardId, uid);
      }
    })();

    res.json({ ok: true });
  });

  /** 删除板块可见成员 */
  app.delete('/api/channels/:id/boards/:boardId/members/:userId', requireAuth, (req, res) => {
    const channelId = Number(req.params.id);
    const boardId = Number(req.params.boardId);
    const targetUserId = Number(req.params.userId);
    const userId = req.session.userId;

    // 检查权限
    const member = db
      .prepare('SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?')
      .get(channelId, userId);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isOwner = member && member.role === 'owner';
    const isChannelAdmin = member && member.role === 'admin';
    const isGlobalAdmin = isAdmin(user);

    if (!isOwner && !isChannelAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: '无权操作' });
    }

    // 检查板块是否存在且属于该频道
    const board = db.prepare('SELECT * FROM categories WHERE id = ? AND channel_id = ?').get(boardId, channelId);
    if (!board) return res.status(404).json({ error: '板块不存在' });

    db.prepare('DELETE FROM board_visible_members WHERE board_id = ? AND user_id = ?').run(boardId, targetUserId);

    res.json({ ok: true });
  });
};
