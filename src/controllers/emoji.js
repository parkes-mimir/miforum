/**
 * emoji.js - 自定义表情控制器
 */

const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { UPLOADS_DIR } = require('../utils/helpers');

const EMOJI_DIR = path.join(UPLOADS_DIR, 'emoji');

module.exports = function (app, db) {

  /** 获取公共表情列表（所有人可用） */
  app.get('/api/emoji/public', (req, res) => {
    const emojis = db.prepare(`
      SELECT ce.*, p.username AS creator_name
      FROM custom_emoji ce
      LEFT JOIN profiles p ON p.id = ce.created_by
      WHERE ce.category != 'private'
      ORDER BY ce.created_at DESC
    `).all();
    res.json({ emojis });
  });

  /** 获取用户收藏的表情 */
  app.get('/api/emoji/my', requireAuth, (req, res) => {
    const emojis = db.prepare(`
      SELECT ce.*, p.username AS creator_name
      FROM user_emoji ue
      JOIN custom_emoji ce ON ce.id = ue.emoji_id
      LEFT JOIN profiles p ON p.id = ce.created_by
      WHERE ue.user_id = ?
      ORDER BY ue.added_at DESC
    `).all(req.session.userId);
    res.json({ emojis });
  });

  /** 上传自定义表情 */
  app.post('/api/emoji', requireAuth, (req, res) => {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: '请上传图片' });

    // 解析 base64 图片
    let buffer;
    try {
      const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ error: '图片格式错误' });
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      buffer = { data: Buffer.from(matches[2], 'base64'), ext };
    } catch (e) {
      return res.status(400).json({ error: '图片格式错误' });
    }

    // 限制大小 500KB
    if (buffer.data.length > 500 * 1024) {
      return res.status(400).json({ error: '图片大小不能超过500KB' });
    }

    // 保存文件
    if (!fs.existsSync(EMOJI_DIR)) fs.mkdirSync(EMOJI_DIR, { recursive: true });
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const filename = `emoji-${ts}-${rand}.${buffer.ext}`;
    const filepath = path.join(EMOJI_DIR, filename);
    fs.writeFileSync(filepath, buffer.data);
    const imageUrl = '/uploads/emoji/' + filename;
    const name = `e${ts}${rand}`;

    // 存入数据库
    const result = db.prepare(`
      INSERT INTO custom_emoji (name, image_url, created_by, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(name, imageUrl, req.session.userId);

    // 自动收藏自己上传的表情
    db.prepare('INSERT OR IGNORE INTO user_emoji (user_id, emoji_id) VALUES (?, ?)')
      .run(req.session.userId, result.lastInsertRowid);

    res.json({ ok: true, emoji: { id: result.lastInsertRowid, name, image_url: imageUrl } });
  });

  /** 收藏表情 */
  app.post('/api/emoji/:id/collect', requireAuth, (req, res) => {
    const emojiId = Number(req.params.id);
    const emoji = db.prepare('SELECT id FROM custom_emoji WHERE id = ?').get(emojiId);
    if (!emoji) return res.status(404).json({ error: '表情不存在' });

    try {
      db.prepare('INSERT INTO user_emoji (user_id, emoji_id) VALUES (?, ?)')
        .run(req.session.userId, emojiId);
      res.json({ ok: true });
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '已收藏' });
      throw e;
    }
  });

  /** 取消收藏 */
  app.delete('/api/emoji/:id/collect', requireAuth, (req, res) => {
    const emojiId = Number(req.params.id);
    db.prepare('DELETE FROM user_emoji WHERE user_id = ? AND emoji_id = ?')
      .run(req.session.userId, emojiId);
    res.json({ ok: true });
  });

  /** 删除自定义表情（仅创建者） */
  app.delete('/api/emoji/:id', requireAuth, (req, res) => {
    const emojiId = Number(req.params.id);
    const emoji = db.prepare('SELECT * FROM custom_emoji WHERE id = ?').get(emojiId);
    if (!emoji) return res.status(404).json({ error: '表情不存在' });
    if (emoji.created_by !== req.session.userId) {
      const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ error: '只能删除自己上传的表情' });
      }
    }

    // 删除文件
    if (emoji.image_url) {
      const filePath = path.join(__dirname, '../..', emoji.image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM custom_emoji WHERE id = ?').run(emojiId);
    res.json({ ok: true });
  });
};
