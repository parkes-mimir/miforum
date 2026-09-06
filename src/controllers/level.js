/**
 * level.js - 等级排行榜控制器
 */

const { getLevelInfo } = require('../services/level');

module.exports = function(app, db) {
  /** 等级排行榜（前 20 名） */
  app.get('/api/leaderboard/level', (req, res) => {
    const rows = db.prepare(`
      SELECT id, display_id, username, avatar_url, title, avatar_frame, exp, role
      FROM profiles WHERE muted = 0
      ORDER BY exp DESC, id ASC LIMIT 20
    `).all();
    res.json({ leaderboard: rows.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      display_id: r.display_id,
      username: r.username,
      avatar_url: r.avatar_url || null,
      title: r.title || null,
      avatar_frame: r.avatar_frame || null,
      exp: r.exp || 0,
      role: r.role || 'user',
      level_info: getLevelInfo(r.exp || 0)
    })) });
  });
};
