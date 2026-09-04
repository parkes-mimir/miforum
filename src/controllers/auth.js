/**
 * auth.js - 认证控制器（注册、登录、登出、用户信息、修改密码、邮箱验证）
 */

const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const { intToBool } = require('../utils/helpers');
const { getLevelInfo, EXP_REWARDS, addExp } = require('./level');
const { generateCode, sendVerificationCode } = require('../utils/email');
const { getNextDisplayId } = require('../database');

/**
 * 注册认证路由
 * @param {Object} app Express 应用实例
 * @param {Object} db 数据库实例
 */
function authRoutes(app, db) {
  // 验证码错误锁定（内存存储，重启重置）
  const codeLockouts = new Map(); // key -> { attempts, lockedUntil }

  // 发送验证码
  app.post('/api/send-code', async (req, res) => {
    const { email, type } = req.body;
    if (!email) return res.status(400).json({ error: '请填写邮箱' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });

    const codeType = type || 'register';

    // 检查邮箱是否已注册（注册类型）
    if (codeType === 'register') {
      const exists = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
      if (exists) return res.status(400).json({ error: '邮箱已被注册' });
    }

    // 检查发送频率（60秒内只能发一次）
    const recent = db.prepare(
      "SELECT id FROM verification_codes WHERE email = ? AND type = ? AND created_at > datetime('now', '-1 minute') ORDER BY id DESC LIMIT 1"
    ).get(email, codeType);
    if (recent) return res.status(429).json({ error: '验证码发送过于频繁，请稍后再试' });

    // 检查同一邮箱10分钟内验证码尝试次数（防暴力破解）
    const attempts = db.prepare(
      "SELECT COUNT(*) as count FROM verification_codes WHERE email = ? AND type = ? AND created_at > datetime('now', '-10 minutes')"
    ).get(email, codeType);
    if (attempts.count >= 5) return res.status(429).json({ error: '验证码尝试次数过多，请10分钟后再试' });

    // 生成并发送验证码
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分钟

    db.prepare(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)'
    ).run(email, code, codeType, expiresAt);

    const sent = await sendVerificationCode(db, email, code, codeType);
    if (!sent) return res.status(500).json({ error: '验证码发送失败，请稍后再试' });

    res.json({ ok: true, message: '验证码已发送' });
  });

  // 注册
  app.post('/api/register', async (req, res) => {
    const { username, email, password, code } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: '请填写所有字段' });
    // 测试环境跳过验证码
    if (process.env.NODE_ENV !== 'test' && !code) return res.status(400).json({ error: '请填写所有字段' });

    // 输入校验
    if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名 2-20 字' });
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(username)) return res.status(400).json({ error: '用户名含非法字符' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });

    const existsEmail = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
    if (existsEmail) return res.status(400).json({ error: '邮箱已被注册' });
    const existsName = db.prepare('SELECT id FROM profiles WHERE username = ?').get(username);
    if (existsName) return res.status(400).json({ error: '用户名已被占用' });

    // 验证验证码（测试环境跳过）
    if (process.env.NODE_ENV !== 'test') {
      // 检查是否被锁定
      const lockoutKey = email + ':register';
      const lockout = codeLockouts.get(lockoutKey);
      if (lockout && lockout.lockedUntil > Date.now()) {
        const remaining = Math.ceil((lockout.lockedUntil - Date.now()) / 60000);
        return res.status(429).json({ error: `验证码错误次数过多，请${remaining}分钟后再试` });
      }

      const verification = db.prepare(
        "SELECT id FROM verification_codes WHERE email = ? AND code = ? AND type = 'register' AND used = 0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1"
      ).get(email, code);
      if (!verification) {
        // 记录失败尝试
        const current = codeLockouts.get(lockoutKey) || { attempts: 0, lockedUntil: 0 };
        current.attempts++;
        if (current.attempts >= 5) {
          current.lockedUntil = Date.now() + 10 * 60 * 1000;
          current.attempts = 0;
        }
        codeLockouts.set(lockoutKey, current);
        return res.status(400).json({ error: '验证码无效或已过期' });
      }

      // 验证成功，清除锁定
      codeLockouts.delete(lockoutKey);
      // 标记验证码已使用
      db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(verification.id);
    }

    const hash = await bcrypt.hash(password, 10);
    let displayId;
    let result;
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      displayId = getNextDisplayId();
      try {
        result = db.prepare(`
          INSERT INTO profiles (display_id, username, email, password_hash, role, profile_public, created_at)
          VALUES (?, ?, ?, ?, 'user', 1, datetime('now'))
        `).run(displayId, username, email, hash);
        break;
      } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' && attempt < maxRetries - 1) continue;
        throw e;
      }
    }

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

    const user = db.prepare('SELECT id, display_id, username, email, password_hash, points, role, force_password_change FROM profiles WHERE email = ?').get(email);
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
    const u = db.prepare('SELECT id, display_id, username, email, avatar_url, bio, location, website, profile_public, points, exp, muted, role, title, avatar_frame, rename_chances, force_password_change FROM profiles WHERE id = ?').get(req.session.userId);
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

    const user = db.prepare('SELECT id, password_hash FROM profiles WHERE id = ?').get(req.session.userId);
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
