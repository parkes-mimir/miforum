/**
 * admin-bots.js - BOT管理控制器
 *
 * 提供BOT的CRUD功能和手动触发拉取。
 */

const { requireAuth, requireAdmin: requireAdminFactory } = require('../middleware/auth');
const { manualFetch } = require('../services/bot');

module.exports = function (app, db) {
  const requireAdmin = requireAdminFactory(db);

  /** 获取BOT列表 */
  app.get('/api/admin/bots', requireAdmin, (req, res) => {
    const bots = db
      .prepare(
        `
      SELECT b.*,
        (SELECT COUNT(*) FROM bot_posts WHERE bot_id = b.id) AS post_count
      FROM bots b
      ORDER BY b.created_at DESC
    `
      )
      .all();
    res.json({ bots });
  });

  /** 创建BOT */
  app.post('/api/admin/bots', requireAdmin, (req, res) => {
    const { name, rssUrl, category, intervalMinutes } = req.body;

    if (!name || !rssUrl) return res.status(400).json({ error: '请填写名称和RSS地址' });
    if (name.length > 50) return res.status(400).json({ error: '名称最多50字' });

    // 验证URL格式
    try {
      new URL(rssUrl);
    } catch (e) {
      return res.status(400).json({ error: 'RSS地址格式不正确' });
    }

    const interval = Math.max(5, Math.min(1440, Number(intervalMinutes) || 30));

    const result = db
      .prepare(
        `
      INSERT INTO bots (name, rss_url, category, interval_minutes)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(name, rssUrl, category || 'tech', interval);

    res.json({
      ok: true,
      bot: {
        id: result.lastInsertRowid,
        name,
        rss_url: rssUrl,
        category: category || 'tech',
        interval_minutes: interval
      }
    });
  });

  /** 更新BOT */
  app.put('/api/admin/bots/:id', requireAdmin, (req, res) => {
    const botId = Number(req.params.id);
    const { name, rssUrl, category, intervalMinutes, enabled } = req.body;

    const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(botId);
    if (!bot) return res.status(404).json({ error: 'BOT不存在' });

    if (name && name.length > 50) return res.status(400).json({ error: '名称最多50字' });
    if (rssUrl) {
      try {
        new URL(rssUrl);
      } catch (e) {
        return res.status(400).json({ error: 'RSS地址格式不正确' });
      }
    }

    const interval = intervalMinutes ? Math.max(5, Math.min(1440, Number(intervalMinutes))) : bot.interval_minutes;

    db.prepare(
      `
      UPDATE bots SET name = ?, rss_url = ?, category = ?, interval_minutes = ?, enabled = ?
      WHERE id = ?
    `
    ).run(
      name || bot.name,
      rssUrl || bot.rss_url,
      category || bot.category,
      interval,
      enabled !== undefined ? (enabled ? 1 : 0) : bot.enabled,
      botId
    );

    res.json({ ok: true });
  });

  /** 删除BOT */
  app.delete('/api/admin/bots/:id', requireAdmin, (req, res) => {
    const botId = Number(req.params.id);
    const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(botId);
    if (!bot) return res.status(404).json({ error: 'BOT不存在' });

    db.prepare('DELETE FROM bots WHERE id = ?').run(botId);
    res.json({ ok: true });
  });

  /** 手动触发BOT拉取 */
  app.post('/api/admin/bots/:id/fetch', requireAdmin, async (req, res) => {
    const botId = Number(req.params.id);
    try {
      const result = await manualFetch(db, botId);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  /** 获取BOT发帖记录 */
  app.get('/api/admin/bots/:id/posts', requireAdmin, (req, res) => {
    const botId = Number(req.params.id);
    const posts = db
      .prepare(
        `
      SELECT bp.*, p.title, p.category, p.created_at AS post_created_at
      FROM bot_posts bp
      JOIN posts p ON p.id = bp.post_id
      WHERE bp.bot_id = ?
      ORDER BY bp.created_at DESC
      LIMIT 50
    `
      )
      .all(botId);
    res.json({ posts });
  });
};
