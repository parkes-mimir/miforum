const { requireAuth } = require('../middleware/auth');

module.exports = function registerShopRoutes(app, db) {
  app.get('/api/shop/items', (req, res) => {
    const items = db.prepare('SELECT * FROM shop_items WHERE enabled = 1').all();
    res.json({ items });
  });

  app.get('/api/shop/orders', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const orders = db.prepare(`
      SELECT o.*, si.name AS item_name, si.icon AS item_icon, si.value AS item_value
      FROM shop_orders o
      LEFT JOIN shop_items si ON si.id = o.item_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).all(userId);
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

    // 检查永久物品是否已拥有（头像框、称号不可重复购买）
    if (item.type === 'title' || item.type === 'avatar_frame') {
      const hasOwned = db.prepare('SELECT id FROM shop_orders WHERE user_id = ? AND item_type = ? AND status = ?').get(userId, item.type, 'completed');
      if (hasOwned) {
        const typeName = item.type === 'title' ? '称号' : '头像框';
        return res.status(400).json({ error: `你已经拥有${typeName}，不可重复购买` });
      }
    }

    const doExchange = db.transaction(() => {
      db.prepare('UPDATE profiles SET points = points - ? WHERE id = ?').run(item.price, userId);
      if (item.stock > 0) db.prepare('UPDATE shop_items SET stock = stock - 1 WHERE id = ?').run(item.id);

      db.prepare(`
        INSERT INTO shop_orders (user_id, item_id, item_name, item_type, price, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'completed', datetime('now'))
      `).run(userId, item.id, item.name, item.type, item.price);

      if (item.type === 'rename_card') {
        db.prepare('UPDATE profiles SET rename_chances = rename_chances + 1 WHERE id = ?').run(userId);
      } else if (item.type === 'title') {
        db.prepare('UPDATE profiles SET title = ? WHERE id = ?').run(item.value, userId);
      } else if (item.type === 'avatar_frame') {
        db.prepare('UPDATE profiles SET avatar_frame = ? WHERE id = ?').run(item.value === 'none' ? null : item.value, userId);
      }
    });
    doExchange();

    const updatedUser = db.prepare('SELECT points, rename_chances, title, avatar_frame FROM profiles WHERE id = ?').get(userId);
    res.json({
      ok: true,
      message: `成功兑换 ${item.name}`,
      order: { item_id: item.id, item_name: item.name, item_type: item.type, price: item.price },
      points: updatedUser.points || 0,
      rename_chances: updatedUser.rename_chances || 0,
      title: updatedUser.title || null,
      avatar_frame: updatedUser.avatar_frame || null
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
    const owned = db.prepare('SELECT id FROM shop_orders WHERE user_id = ? AND item_id = ? AND status = ?').get(userId, item.id, 'completed');
    if (!owned && item.price > 0) {
      return res.status(403).json({ error: '你还没有购买此商品' });
    }

    const value = item.value === 'none' ? null : item.value;
    const field = item.type === 'title' ? 'title' : 'avatar_frame';
    db.prepare(`UPDATE profiles SET ${field} = ? WHERE id = ?`).run(value, userId);

    const updated = db.prepare('SELECT title, avatar_frame FROM profiles WHERE id = ?').get(userId);
    res.json({ ok: true, message: `已装备 ${item.name}`, [field]: updated[field] });
  });

  app.post('/api/shop/unequip', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { type } = req.body;
    if (type !== 'title' && type !== 'avatar_frame') return res.status(400).json({ error: '参数错误' });
    const field = type === 'title' ? 'title' : 'avatar_frame';
    db.prepare(`UPDATE profiles SET ${field} = NULL WHERE id = ?`).run(userId);
    res.json({ ok: true, [field]: null });
  });

  app.get('/api/shop/items/:id', (req, res) => {
    const itemId = Number(req.params.id);
    const item = db.prepare('SELECT * FROM shop_items WHERE id = ? AND enabled = 1').get(itemId);
    if (!item) return res.status(404).json({ error: '商品不存在' });
    res.json({ item });
  });
};
