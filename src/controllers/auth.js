/**
 * auth.js - 认证控制器（注册、登录、登出、用户信息、修改密码）
 */

const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const { intToBool } = require('../utils/helpers');
const { getLevelInfo, EXP_REWARDS, addExp } = require('./level');

/**
 * 获取下一个显示 ID
 * @param {Object} db 数据库实例
 * @returns {string}
 */
function getNextDisplayId(db) {
  const row = db.prepare('SELECT MAX(CAST(display_id AS INTEGER)) AS max_id FROM profiles').get();
  const nextId = (row && row.max_id ? row.max_id : 0) + 1;
  return String(nextId).padStart(6, '0');
}

/**
 * 注册认证路由
 * @param {Object} app Express 应用实例
 * @param {Object} db 数据库实例
 */
function authRoutes(app, db) {
  // 注册
  app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: '请填写所有字段' });

    // 输入校验
    if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名 2-20 字' });
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(username)) return res.status(400).json({ error: '用户名含非法字符' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });

    const existsEmail = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
    if (existsEmail) return res.status(400).json({ error: '邮箱已被注册' });
    const existsName = db.prepare('SELECT id FROM profiles WHERE username = ?').get(username);
    if (existsName) return res.status(400).json({ error: '用户名已被占用' });

    const displayId = getNextDisplayId(db);
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO profiles (display_id, username, email, password_hash, role, profile_public, created_at)
      VALUES (?, ?, ?, ?, 'user', 1, datetime('now'))
    `).run(displayId, username, email, hash);

    req.session.userId = result.lastInsertRowid;
    // 注册送经验
    addExp(db, result.lastInsertRowid, EXP_REWARDS.register);
    const info = getLevelInfo(EXP_REWARDS.register);
    res.json({ user: { id: result.lastInsertRowid, display_id: displayId, username, email, points: 0, exp: info.exp, level_info: info } });
  });

  // 登录
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: '请填写邮箱和密码' });

    const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: '邮箱或密码错误' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: '邮箱或密码错误' });

    req.session.userId = user.id;
    res.json({
      user: {
        id: user.id,
        display_id: user.display_id,
        username: user.username,
        email: user.email,
        points: user.points,
        role: user.role,
        force_password_change: intToBool(user.force_password_change)
      }
    });
  });

  // 登出
  app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
  });

  // 获取当前用户信息
  app.get('/api/me', (req, res) => {
    if (!req.session.userId) return res.json({ user: null });
    const u = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
    if (!u) return res.json({ user: null });
    res.json({ user: {
      id: u.id, display_id: u.display_id, username: u.username, email: u.email,
      avatar_url: u.avatar_url || null,
      bio: u.bio || '',
      location: u.location || '',
      website: u.website || '',
      profile_public: intToBool(u.profile_public),
      points: u.points || 0, muted: intToBool(u.muted), role: u.role || 'user',
      title: u.title || null,
      avatar_frame: u.avatar_frame || null,
      rename_chances: u.rename_chances || 0,
      exp: u.exp || 0,
      level_info: getLevelInfo(u.exp || 0),
      force_password_change: intToBool(u.force_password_change)
    } });
  });

  // 修改密码
  app.post('/api/change-password', requireAuth, async (req, res) => {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: '请填写旧密码和新密码' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: '新密码至少6位' });
    }
    if (old_password === new_password) {
      return res.status(400).json({ error: '新密码不能与旧密码相同' });
    }

    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const ok = await bcrypt.compare(old_password, user.password_hash);
    if (!ok) return res.status(400).json({ error: '旧密码错误' });

    const hash = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE profiles SET password_hash = ?, force_password_change = 0 WHERE id = ?')
      .run(hash, user.id);

    res.json({ ok: true, message: '密码修改成功' });
  });
}

module.exports = authRoutes;
