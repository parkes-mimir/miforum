/**
 * shop.js - 积分商店控制器
 *
 * 提供商品列表、兑换、装备/卸下功能，
 * 支持称号和头像框类型的道具。
 */

const { requireAuth, requireAdmin: requireAdminFactory } = require('../middleware/auth');

module.exports = function registerShopRoutes(app, db) {
  const requireAdmin = requireAdminFactory(db);
  app.get('/api/shop/items', (req, res) => {
    const items = db.prepare('SELECT * FROM shop_items WHERE enabled = 1').all();
    res.json({ items });
  });

  app.get('/api/shop/orders', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const orders = db
      .prepare(
        `
      SELECT o.*, si.name AS item_name, si.icon AS item_icon, si.value AS item_value
      FROM shop_orders o
      LEFT JOIN shop_items si ON si.id = o.item_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `
      )
      .all(userId);
    res.json({ orders });
  });

  app.post('/api/shop/exchange', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const itemId = Number(req.body.itemId);
    if (!itemId) return res.status(400).json({ error: '缺少商品 ID' });

    const item = db.prepare('SELECT * FROM shop_items WHERE id = ? AND enabled = 1').get(itemId);
    if (!item) return res.status(404).json({ error: '商品不存在或已下架' });
    if (item.stock === 0) return res.status(400).json({ error: '商品已售罄' });

    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if ((user.points || 0) < item.price) {
      return res.status(400).json({ error: `积分不足，需要 ${item.price} 积分，当前 ${user.points || 0} 积分` });
    }

    // 检查是否已拥有同一商品（同一称号/头像框不可重复购买，但可以买不同的）
    if (item.type === 'title' || item.type === 'avatar_frame') {
      const hasOwned = db
        .prepare('SELECT id FROM shop_orders WHERE user_id = ? AND item_id = ? AND status = ?')
        .get(userId, item.id, 'completed');
      if (hasOwned) {
        return res.status(400).json({ error: `你已经拥有「${item.name}」，不可重复购买` });
      }
    }

    // 检查连续签到天数要求
    if (item.checkin_required > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const checkins = db
        .prepare('SELECT check_in_date FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC')
        .all(userId)
        .map((c) => c.check_in_date);

      // 计算连续签到天数
      let streak = 0;
      let checkDate = today;
      for (const date of checkins) {
        if (date === checkDate) {
          streak++;
          // 前一天
          const d = new Date(checkDate + 'T00:00:00Z');
          d.setUTCDate(d.getUTCDate() - 1);
          checkDate = d.toISOString().slice(0, 10);
        } else if (date < checkDate) {
          break;
        }
      }

      if (streak < item.checkin_required) {
        return res.status(400).json({
          error: `需要连续签到 ${item.checkin_required} 天才能兑换，当前连续签到 ${streak} 天`
        });
      }
    }

    const doExchange = db.transaction(() => {
      db.prepare('UPDATE profiles SET points = points - ? WHERE id = ?').run(item.price, userId);
      if (item.stock > 0) db.prepare('UPDATE shop_items SET stock = stock - 1 WHERE id = ?').run(item.id);

      db.prepare(
        `INSERT INTO shop_orders (user_id, item_id, item_name, item_type, price, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'completed', datetime('now'))`
      ).run(userId, item.id, item.name, item.type, item.price);

      if (item.type === 'title') {
        db.prepare('UPDATE profiles SET title = ? WHERE id = ?').run(item.value || item.name, userId);
      }
      // "other" 类型只记录兑换，无实际效果
    });
    doExchange();

    const updatedUser = db.prepare('SELECT points, title FROM profiles WHERE id = ?').get(userId);
    res.json({
      ok: true,
      message: `成功兑换 ${item.name}`,
      order: { itemId: item.id, itemName: item.name, itemType: item.type, price: item.price },
      points: updatedUser.points || 0,
      title: updatedUser.title || null
    });
  });

  app.post('/api/shop/equip', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: '缺少商品 ID' });

    const item = db.prepare('SELECT * FROM shop_items WHERE id = ? AND enabled = 1').get(Number(itemId));
    if (!item) return res.status(404).json({ error: '商品不存在或已下架' });

    if (item.type !== 'title' && item.type !== 'avatar_frame') {
      return res.status(400).json({ error: '只有称号和头像框可以装备' });
    }

    // 检查是否已拥有（免费的"无头像框"和用户已购买的都算可装备）
    const owned = db
      .prepare('SELECT id FROM shop_orders WHERE user_id = ? AND item_id = ? AND status = ?')
      .get(userId, item.id, 'completed');
    if (!owned && item.price > 0) {
      return res.status(403).json({ error: '你还没有购买此商品' });
    }

    const value = item.value === 'none' ? null : item.value;
    // 白名单校验字段名，防止 SQL 注入
    const allowedFields = { title: 'title', avatar_frame: 'avatar_frame' };
    const field = allowedFields[item.type];
    if (!field) return res.status(400).json({ error: '无效的商品类型' });
    db.prepare(`UPDATE profiles SET ${field} = ? WHERE id = ?`).run(value, userId);

    const updated = db.prepare('SELECT title, avatar_frame FROM profiles WHERE id = ?').get(userId);
    res.json({ ok: true, message: `已装备 ${item.name}`, [field]: updated[field] });
  });

  app.post('/api/shop/unequip', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { type } = req.body;
    const allowedFields = { title: 'title', avatar_frame: 'avatar_frame' };
    const field = allowedFields[type];
    if (!field) return res.status(400).json({ error: '参数错误' });
    db.prepare(`UPDATE profiles SET ${field} = NULL WHERE id = ?`).run(userId);
    res.json({ ok: true, [field]: null });
  });

  app.get('/api/shop/items/:id', (req, res) => {
    const itemId = Number(req.params.id);
    const item = db.prepare('SELECT * FROM shop_items WHERE id = ? AND enabled = 1').get(itemId);
    if (!item) return res.status(404).json({ error: '商品不存在' });
    res.json({ item });
  });

  // ============================================================
  // 管理员接口
  // ============================================================

  /** 获取所有商品（含下架商品） */
  app.get('/api/admin/shop/items', requireAdmin, (req, res) => {
    const items = db.prepare('SELECT * FROM shop_items ORDER BY id ASC').all();
    res.json({ items });
  });

  /** 创建商品 */
  app.post('/api/admin/shop/items', requireAdmin, (req, res) => {
    const { name, description, icon, type, value, price, stock, checkinRequired } = req.body;
    if (!name || !type || price === undefined) {
      return res.status(400).json({ error: '缺少必填字段（name, type, price）' });
    }
    const validTypes = ['title', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: '无效的商品类型，支持：title, avatar_frame, rename_card' });
    }
    if (price < 0) return res.status(400).json({ error: '价格不能为负数' });

    const result = db
      .prepare(
        `
      INSERT INTO shop_items (name, description, icon, type, value, price, stock, enabled, checkin_required)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `
      )
      .run(
        String(name).slice(0, 50),
        String(description || '').slice(0, 200),
        icon || '',
        type,
        value || null,
        Math.floor(price),
        stock !== undefined ? Math.floor(stock) : -1,
        checkinRequired ? Math.floor(checkinRequired) : 0
      );

    const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(result.lastInsertRowid);
    res.json({ ok: true, item });
  });

  /** 更新商品 */
  app.put('/api/admin/shop/items/:id', requireAdmin, (req, res) => {
    const itemId = Number(req.params.id);
    const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
    if (!item) return res.status(404).json({ error: '商品不存在' });
    const { name, description, icon, value, price, stock, enabled, checkinRequired } = req.body;
    db.prepare(
      'UPDATE shop_items SET name = ?, description = ?, icon = ?, value = ?, price = ?, stock = ?, enabled = ?, checkin_required = ? WHERE id = ?'
    ).run(
      name !== undefined ? String(name).slice(0, 50) : item.name,
      description !== undefined ? String(description).slice(0, 200) : item.description,
      icon !== undefined ? icon : item.icon,
      value !== undefined ? value : item.value,
      price !== undefined ? Math.floor(price) : item.price,
      stock !== undefined ? Math.floor(stock) : item.stock,
      enabled !== undefined ? (enabled ? 1 : 0) : item.enabled,
      checkinRequired !== undefined ? Math.floor(checkinRequired) : item.checkin_required,
      itemId
    );

    const updated = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
    res.json({ ok: true, item: updated });
  });

  /** 删除商品 */
  app.delete('/api/admin/shop/items/:id', requireAdmin, (req, res) => {
    const itemId = Number(req.params.id);
    const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
    if (!item) return res.status(404).json({ error: '商品不存在' });

    // 检查是否有已完成的订单
    const orderCount = db.prepare('SELECT COUNT(*) AS c FROM shop_orders WHERE item_id = ?').get(itemId).c;
    if (orderCount > 0) {
      // 有订单，只下架不删除
      db.prepare('UPDATE shop_items SET enabled = 0 WHERE id = ?').run(itemId);
      return res.json({ ok: true, message: '商品有历史订单，已下架而非删除' });
    }

    db.prepare('DELETE FROM shop_items WHERE id = ?').run(itemId);
    res.json({ ok: true, message: '商品已删除' });
  });

  /** 获取所有兑换记录（含用户信息） */
  app.get('/api/admin/shop/orders', requireAdmin, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { total } = db.prepare('SELECT COUNT(*) AS total FROM shop_orders').get();

    const orders = db
      .prepare(
        `
      SELECT o.*,
        u.username, u.display_id, u.avatar_url,
        si.name AS item_name, si.icon AS item_icon, si.value AS item_value
      FROM shop_orders o
      LEFT JOIN profiles u ON u.id = o.user_id
      LEFT JOIN shop_items si ON si.id = o.item_id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(limit, offset);

    res.json({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });
};
