/**
 * admin-games.js - 游戏管理控制器
 *
 * 提供游戏的CRUD功能。
 */

const { requireAuth, requireAdmin: requireAdminFactory } = require('../middleware/auth');

module.exports = function (app, db) {
  const requireAdmin = requireAdminFactory(db);

  /** 获取游戏列表（公开） */
  app.get('/api/games', (req, res) => {
    const games = db.prepare('SELECT * FROM games WHERE enabled = 1 ORDER BY sort_order ASC, created_at DESC').all();
    res.json({ games });
  });

  /** 获取所有游戏（管理员） */
  app.get('/api/admin/games', requireAdmin, (req, res) => {
    const games = db.prepare('SELECT * FROM games ORDER BY sort_order ASC, created_at DESC').all();
    res.json({ games });
  });

  /** 创建游戏 */
  app.post('/api/admin/games', requireAdmin, (req, res) => {
    const { name, description, url, icon, author, gameType, sourceType } = req.body;

    if (!name || !url) return res.status(400).json({ error: '请填写名称和地址' });
    if (name.length > 50) return res.status(400).json({ error: '名称最多50字' });

    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: '地址格式不正确' });
    }

    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM games').get();
    const order = (maxOrder.m || 0) + 1;

    const result = db
      .prepare(
        `
      INSERT INTO games (name, description, url, icon, author, game_type, source_type, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        name,
        (description || '').slice(0, 200),
        url,
        icon || '🎮',
        (author || '').slice(0, 50),
        gameType || 'single',
        sourceType || 'closed',
        order
      );

    res.json({
      ok: true,
      game: {
        id: result.lastInsertRowid,
        name,
        description: (description || '').slice(0, 200),
        url,
        icon: icon || '🎮',
        author: (author || '').slice(0, 50),
        game_type: gameType || 'single',
        source_type: sourceType || 'closed',
        sort_order: order
      }
    });
  });

  /** 更新游戏 */
  app.put('/api/admin/games/:id', requireAdmin, (req, res) => {
    const gameId = Number(req.params.id);
    const { name, description, url, icon, author, gameType, sourceType, enabled, sortOrder } = req.body;

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
    if (!game) return res.status(404).json({ error: '游戏不存在' });

    if (name && name.length > 50) return res.status(400).json({ error: '名称最多50字' });
    if (url) {
      try {
        new URL(url);
      } catch (e) {
        return res.status(400).json({ error: '地址格式不正确' });
      }
    }

    db.prepare(
      `
      UPDATE games SET name = ?, description = ?, url = ?, icon = ?, author = ?, game_type = ?, source_type = ?, enabled = ?, sort_order = ?
      WHERE id = ?
    `
    ).run(
      name || game.name,
      description !== undefined ? description.slice(0, 200) : game.description,
      url || game.url,
      icon !== undefined ? icon : game.icon,
      author !== undefined ? author.slice(0, 50) : game.author,
      gameType || game.game_type,
      sourceType || game.source_type,
      enabled !== undefined ? (enabled ? 1 : 0) : game.enabled,
      sortOrder !== undefined ? Number(sortOrder) : game.sort_order,
      gameId
    );

    res.json({ ok: true });
  });

  /** 删除游戏 */
  app.delete('/api/admin/games/:id', requireAdmin, (req, res) => {
    const gameId = Number(req.params.id);
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
    if (!game) return res.status(404).json({ error: '游戏不存在' });

    db.prepare('DELETE FROM games WHERE id = ?').run(gameId);
    res.json({ ok: true });
  });
};
