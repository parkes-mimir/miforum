/**
 * MiForum 后端服务器
 * 基于 Express.js + SQLite 数据库的轻量论坛
 *
 * 功能：用户认证、个人资料、帖子 CRUD、评论 CRUD、签到系统、点赞、收藏、标签、分类管理
 * 数据存储：data.db（SQLite，通过 database.js 模块管理）
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { execSync } = require('child_process');
const { getDb, closeDb, getNextDisplayId } = require('./database');

// ============================================================
// 常量配置
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SUPER_ADMIN_EMAIL = 'root@miforum.local';
const SUPER_ADMIN_PASSWORD = '123456';

const db = getDb();

// 确保上传目录存在
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ============================================================
// Multer 图片上传配置
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const name = 'webforum' + date + '-' + Date.now() + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('仅支持 JPG/PNG/GIF/WebP/BMP 格式图片'));
  }
});

// ============================================================
// 辅助函数
// ============================================================

/** 安全删除文件（防止路径遍历攻击） */
function deleteFile(url) {
  if (!url || typeof url !== 'string') return;
  // 只允许删除 uploads 目录下的文件
  const filePath = path.join(__dirname, url);
  const resolved = path.resolve(filePath);
  const uploadsDir = path.resolve(UPLOADS_DIR);
  if (!resolved.startsWith(uploadsDir + path.sep)) return;
  if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
}

/** 批量删除图片文件 */
function deleteImages(images) {
  if (images && Array.isArray(images)) images.forEach(deleteFile);
}

function parseJsonField(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (Array.isArray(val) || typeof val === 'object') return val;
  try { return JSON.parse(val); } catch (e) { return fallback; }
}

function boolToInt(v) { return v ? 1 : 0; }
function intToBool(v) { return v === 1 || v === true; }

// ============================================================
// 活跃度等级 / 经验值
// ============================================================
// 升级所需累计经验（索引即等级，level 0 占位，1~10 真实阈值）
const EXP_LEVELS = [0, 0, 50, 150, 300, 600, 1000, 1500, 2200, 3000, 5000];
const MAX_LEVEL = 10;

// 各行为获得的经验值
const EXP_REWARDS = {
  register: 50,      // 注册
  signin: 10,        // 签到
  retroactive: 5,    // 补签
  post: 20,          // 发帖
  comment: 5,         // 评论
  receive_like: 3,    // 收到点赞
  receive_comment: 2, // 收到评论
  bookmark: 2        // 收藏帖子
};

/**
 * 由累计经验值计算等级（1~10）
 */
function getLevel(exp) {
  let lv = 1;
  for (let i = 1; i <= MAX_LEVEL; i++) {
    if (exp >= EXP_LEVELS[i]) lv = i;
  }
  return lv;
}

/**
 * 等级对应的图标（参考 QQ 星星/月亮/太阳/皇冠）
 * 1-3：⭐ 星 / 4-6：🌙 月亮 / 7-9：☀️ 太阳 / 10：👑 皇冠
 */
function getLevelIcon(level) {
  if (level >= 10) return '👑';
  if (level >= 7) return '☀️';
  if (level >= 4) return '🌙';
  return '⭐';
}

/**
 * 等级阶段配色（不同阶段不同颜色）
 */
function getLevelTheme(level) {
  if (level >= 10) {
    return {
      stage: 'crown', stageName: '皇冠',
      icon: '👑',
      badgeBg: 'linear-gradient(90deg, #fbbf24 0%, #ef4444 50%, #f59e0b 100%)',
      badgeText: '#ffffff',
      cardBg: 'linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%)',
      cardBorder: '#fcd34d',
      progressBg: 'rgba(255,255,255,0.7)',
      progressFill: 'linear-gradient(90deg, #fbbf24 0%, #ef4444 50%, #f59e0b 100%)',
      accentColor: '#d97706'
    };
  }
  if (level >= 7) {
    return {
      stage: 'sun', stageName: '太阳',
      icon: '☀️',
      badgeBg: 'linear-gradient(90deg, #fbbf24 0%, #f97316 100%)',
      badgeText: '#ffffff',
      cardBg: 'linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%)',
      cardBorder: '#fcd34d',
      progressBg: 'rgba(255,255,255,0.7)',
      progressFill: 'linear-gradient(90deg, #fbbf24 0%, #f97316 100%)',
      accentColor: '#d97706'
    };
  }
  if (level >= 4) {
    return {
      stage: 'moon', stageName: '月亮',
      icon: '🌙',
      badgeBg: 'linear-gradient(90deg, #a78bfa 0%, #6366f1 100%)',
      badgeText: '#ffffff',
      cardBg: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
      cardBorder: '#c4b5fd',
      progressBg: 'rgba(255,255,255,0.7)',
      progressFill: 'linear-gradient(90deg, #a78bfa 0%, #6366f1 100%)',
      accentColor: '#7c3aed'
    };
  }
  return {
    stage: 'star', stageName: '星星',
    icon: '⭐',
    badgeBg: 'linear-gradient(90deg, #93c5fd 0%, #3b82f6 100%)',
    badgeText: '#ffffff',
    cardBg: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
    cardBorder: '#93c5fd',
    progressBg: 'rgba(255,255,255,0.7)',
    progressFill: 'linear-gradient(90deg, #93c5fd 0%, #3b82f6 100%)',
    accentColor: '#2563eb'
  };
}

/**
 * 计算等级信息：等级、图标、当前等级区间、距下一级差值、进度百分比
 */
function getLevelInfo(exp) {
  const level = getLevel(exp);
  const curBase = EXP_LEVELS[level];
  const nextBase = level >= MAX_LEVEL ? EXP_LEVELS[MAX_LEVEL] : EXP_LEVELS[level + 1];
  const nextLevel = level >= MAX_LEVEL ? MAX_LEVEL : level + 1;
  const need = nextBase - curBase;           // 当前等级升下一级所需经验
  const have = exp - curBase;                // 当前等级已得经验
  const remain = Math.max(0, need - have);   // 距下一级还差多少
  const progress = need > 0 ? Math.min(100, Math.round(have / need * 100)) : 100;
  const theme = getLevelTheme(level);
  return {
    level, icon: theme.icon,
    exp, cur_base: curBase, next_base: nextBase, next_level: nextLevel,
    need, have, remain, progress,
    max_level: MAX_LEVEL,
    stage: theme.stage, stage_name: theme.stageName,
    badge_bg: theme.badgeBg, badge_text: theme.badgeText,
    card_bg: theme.cardBg, card_border: theme.cardBorder,
    progress_bg: theme.progressBg, progress_fill: theme.progressFill,
    accent_color: theme.accentColor
  };
}

/**
 * 给用户增加经验值，返回新经验值
 */
function addExp(userId, amount) {
  if (!Number.isFinite(amount) || amount === 0) return null;
  db.prepare('UPDATE profiles SET exp = MAX(0, exp + ?) WHERE id = ?').run(amount, userId);
  const u = db.prepare('SELECT exp FROM profiles WHERE id = ?').get(userId);
  return u ? u.exp : 0;
}

// ============================================================
// 中间件
// ============================================================
app.use(express.json());
// HTML 文件禁用缓存，避免浏览器缓存旧版本导致看不到最新修改
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '/shop') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
app.use(express.static(path.join(__dirname), { etag: false, lastModified: false }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'forum.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'shop.html')));

// Session 配置（安全加固）
const crypto = require('crypto');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,      // 防止 JS 读取
    sameSite: 'lax'      // 防止 CSRF
  }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
  const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
  const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ error: '需要超级管理员权限' });
  }
  next();
}

function requireNotMuted(req, res, next) {
  const user = db.prepare('SELECT muted FROM profiles WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: '用户不存在' });
  if (intToBool(user.muted)) return res.status(403).json({ error: '你已被禁言，暂时无法发布内容' });
  next();
}

function multerUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err && err.code === 'LIMIT_UNEXPECTED_FILE') return next();
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

// ============================================================
// 日期工具（签到系统）
// ============================================================
function dateStr(d) { return new Date(d).toLocaleDateString('sv-SE'); }
function todayStr() { return dateStr(new Date()); }

function addDays(dateStrIn, n) {
  const [y, m, d] = dateStrIn.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.floor((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}

function calcStreaks(checkinDates) {
  if (!checkinDates.length) return { current: 0, longest: 0, total: 0 };

  const sorted = [...checkinDates].sort();
  const dateSet = new Set(sorted);
  let current = 0, longest = 0, streak = 0;

  const today = todayStr();
  let d = dateSet.has(today) ? today : addDays(today, -1);
  while (dateSet.has(d)) { current++; d = addDays(d, -1); }

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || daysBetween(sorted[i - 1], sorted[i]) === 1) streak++;
    else streak = 1;
    longest = Math.max(longest, streak);
  }

  return { current, longest, total: sorted.length };
}

// ============================================================
// 用户认证 API
// ============================================================

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

  const displayId = getNextDisplayId();
  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(`
    INSERT INTO profiles (display_id, username, email, password_hash, role, profile_public, created_at)
    VALUES (?, ?, ?, ?, 'user', 1, datetime('now'))
  `).run(displayId, username, email, hash);

  req.session.userId = result.lastInsertRowid;
  // 注册送经验
  addExp(result.lastInsertRowid, EXP_REWARDS.register);
  const info = getLevelInfo(EXP_REWARDS.register);
  res.json({ user: { id: result.lastInsertRowid, display_id: displayId, username, email, points: 0, exp: info.exp, level_info: info } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '请填写邮箱和密码' });

  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
  if (!user) return res.status(400).json({ error: '邮箱或密码错误' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: '邮箱或密码错误' });

  req.session.userId = user.id;
  res.json({ user: { id: user.id, display_id: user.display_id, username: user.username, email: user.email, points: user.points, role: user.role } });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

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
    level_info: getLevelInfo(u.exp || 0)
  } });
});

// ============================================================
// 帖子 API
// ============================================================

// 等级排行榜（前 20 名）
app.get('/api/leaderboard/level', (req, res) => {
  const rows = db.prepare(`
    SELECT id, display_id, username, avatar_url, title, avatar_frame, exp, role
    FROM profiles
    WHERE muted = 0
    ORDER BY exp DESC, id ASC
    LIMIT 20
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

app.get('/api/posts', (req, res) => {
  const { category, search, tag } = req.query;
  let sql = `
    SELECT p.*,
      pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
      pr.title AS author_title, pr.avatar_frame AS author_avatar_frame, pr.exp AS author_exp,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
    FROM posts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (tag) {
    sql += ' AND p.tags LIKE ?';
    params.push(`%"${tag}"%`);
  }
  if (search) {
    sql += ' AND (p.title LIKE ? OR p.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY p.pinned DESC, p.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  const posts = rows.map(p => ({
    ...p,
    tags: parseJsonField(p.tags, []),
    images: parseJsonField(p.images, []),
    pinned: intToBool(p.pinned),
    author_avatar_url: p.author_avatar_url || null,
    author_title: p.author_title || null,
    author_avatar_frame: p.author_avatar_frame || null,
    author_level_info: getLevelInfo(p.author_exp || 0)
  }));
  res.json({ posts });
});

app.get('/api/posts/:id', (req, res) => {
  const pid = Number(req.params.id);
  const p = db.prepare(`
    SELECT p.*,
      pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
      pr.title AS author_title, pr.avatar_frame AS author_avatar_frame, pr.exp AS author_exp,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
    FROM posts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE p.id = ?
  `).get(pid);
  if (!p) return res.status(404).json({ error: '帖子不存在' });

  res.json({
    post: {
      ...p,
      tags: parseJsonField(p.tags, []),
      images: parseJsonField(p.images, []),
      pinned: intToBool(p.pinned),
      author_avatar_url: p.author_avatar_url || null,
      author_title: p.author_title || null,
      author_avatar_frame: p.author_avatar_frame || null,
      author_level_info: getLevelInfo(p.author_exp || 0)
    }
  });
});

app.post('/api/posts', requireAuth, requireNotMuted, multerUpload(upload.array('images', 30)), (req, res) => {
  const { title, content, category, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });

  const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
  let parsedTags = [];
  if (tags) {
    if (Array.isArray(tags)) {
      parsedTags = tags;
    } else if (typeof tags === 'string') {
      try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean); }
    }
  }
  parsedTags = [...new Set(parsedTags.map(t => String(t).slice(0, 20)))].slice(0, 10);

  const insertPost = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO posts (title, content, category, tags, author_id, images, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(title, content, category || 'tech', JSON.stringify(parsedTags), req.session.userId, JSON.stringify(images));

    db.prepare('UPDATE profiles SET points = points + 5 WHERE id = ?').run(req.session.userId);
    addExp(req.session.userId, EXP_REWARDS.post);
    const user = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
    return { postId: result.lastInsertRowid, points: user ? user.points : 0, exp: user ? user.exp : 0, level_info: getLevelInfo(user ? user.exp : 0) };
  });

  const result = insertPost();
  res.json({ postId: result.postId, points: result.points, exp: result.exp, level_info: result.level_info });
});

app.put('/api/posts/:id', requireAuth, requireNotMuted, multerUpload(upload.array('images', 30)), (req, res) => {
  const { title, content, category, tags, removeImages } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });

  const pid = Number(req.params.id);
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pid);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (post.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的帖子' });

  let currentImages = parseJsonField(post.images, []);

  if (removeImages) {
    let removeList;
    try { removeList = JSON.parse(removeImages); }
    catch (e) { return res.status(400).json({ error: 'removeImages 格式错误' }); }
    removeList.forEach(deleteFile);
    currentImages = currentImages.filter(u => !removeList.includes(u));
  }

  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(f => '/uploads/' + f.filename);
    currentImages = [...currentImages, ...newImages];
  }

  let finalTags = parseJsonField(post.tags, []);
  if (tags !== undefined) {
    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags;
    } else if (typeof tags === 'string') {
      try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean); }
    }
    finalTags = [...new Set(parsedTags.map(t => String(t).slice(0, 20)))].slice(0, 10);
  }

  db.prepare(`
    UPDATE posts SET title = ?, content = ?, category = ?, tags = ?, images = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(title, content, category || post.category, JSON.stringify(finalTags), JSON.stringify(currentImages), pid);

  res.json({ ok: true });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const pid = Number(req.params.id);
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pid);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  if (post.author_id !== req.session.userId && !isAdmin) {
    return res.status(403).json({ error: '只能删除自己的帖子' });
  }

  const deletePost = db.transaction(() => {
    const commentImages = db.prepare('SELECT images FROM comments WHERE post_id = ?').all(pid);
    commentImages.forEach(c => deleteImages(parseJsonField(c.images, [])));

    deleteImages(parseJsonField(post.images, []));

    db.prepare('DELETE FROM posts WHERE id = ?').run(pid);
  });
  deletePost();

  res.json({ ok: true });
});

// ============================================================
// 评论 API
// ============================================================

app.get('/api/posts/:id/comments', (req, res) => {
  const pid = Number(req.params.id);
  const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(pid);

  const commentsRaw = db.prepare(`
    SELECT c.*,
      pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
      pr.title AS author_title, pr.avatar_frame AS author_avatar_frame
    FROM comments c
    LEFT JOIN profiles pr ON pr.id = c.author_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(pid);

  const floorMap = {};
  commentsRaw.forEach((c, i) => { floorMap[c.id] = i + 1; });

  const comments = [...commentsRaw]
    .sort((a, b) => {
      const ap = intToBool(a.pinned) ? 1 : 0;
      const bp = intToBool(b.pinned) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(a.created_at) - new Date(b.created_at);
    })
    .map(c => ({
      ...c,
      images: parseJsonField(c.images, []),
      pinned: intToBool(c.pinned),
      author_avatar_url: c.author_avatar_url || null,
      author_title: c.author_title || null,
      author_avatar_frame: c.author_avatar_frame || null,
      floor: floorMap[c.id],
      is_post_owner: post ? c.author_id === post.author_id : false
    }));

  res.json({ comments, postOwnerId: post ? post.author_id : null });
});

app.post('/api/posts/:id/comments', requireAuth, requireNotMuted, multerUpload(upload.array('images', 3)), (req, res) => {
  const { content } = req.body;
  if (!content && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: '请输入评论内容或上传图片' });
  }

  // 检查帖子是否存在
  const post = db.prepare('SELECT id, author_id FROM posts WHERE id = ?').get(Number(req.params.id));
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
  const result = db.prepare(`
    INSERT INTO comments (post_id, author_id, content, images, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(Number(req.params.id), req.session.userId, content || '', JSON.stringify(images));

  // 评论者获得经验，帖子作者获得「被评论」经验
  addExp(req.session.userId, EXP_REWARDS.comment);
  if (post.author_id && post.author_id !== req.session.userId) {
    addExp(post.author_id, EXP_REWARDS.receive_comment);
  }

  res.json({ commentId: result.lastInsertRowid });
});

app.put('/api/comments/:id', requireAuth, requireNotMuted, multerUpload(upload.array('images', 3)), (req, res) => {
  const { content, removeImages } = req.body;
  if (!content && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: '评论不能为空' });
  }

  const cid = Number(req.params.id);
  const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(cid);
  if (!c) return res.status(404).json({ error: '评论不存在' });
  if (c.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的评论' });

  let currentImages = parseJsonField(c.images, []);

  if (removeImages) {
    let removeList;
    try { removeList = JSON.parse(removeImages); }
    catch (e) { return res.status(400).json({ error: 'removeImages 格式错误' }); }
    removeList.forEach(deleteFile);
    currentImages = currentImages.filter(u => !removeList.includes(u));
  }

  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(f => '/uploads/' + f.filename);
    currentImages = [...currentImages, ...newImages];
  }

  db.prepare('UPDATE comments SET content = ?, images = ? WHERE id = ?')
    .run(content || c.content, JSON.stringify(currentImages), cid);

  res.json({ ok: true });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const cid = Number(req.params.id);
  const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(cid);
  if (!c) return res.status(404).json({ error: '评论不存在' });

  const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(c.post_id);
  const isPostOwner = post && post.author_id === req.session.userId;

  const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  if (c.author_id !== req.session.userId && !isPostOwner && !isAdmin) {
    return res.status(403).json({ error: '只能删除自己的评论或自己帖子下的评论' });
  }

  deleteImages(parseJsonField(c.images, []));
  db.prepare('DELETE FROM comments WHERE id = ?').run(cid);

  res.json({ ok: true });
});

app.put('/api/comments/:id/pin', requireAuth, (req, res) => {
  const cid = Number(req.params.id);
  const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(cid);
  if (!c) return res.status(404).json({ error: '评论不存在' });

  const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(c.post_id);
  if (!post || post.author_id !== req.session.userId) {
    return res.status(403).json({ error: '只有帖主可以置顶评论' });
  }

  const newPinned = intToBool(c.pinned) ? 0 : 1;
  db.prepare('UPDATE comments SET pinned = ? WHERE id = ?').run(newPinned, cid);
  res.json({ ok: true, pinned: intToBool(newPinned) });
});

// ============================================================
// 签到 API
// ============================================================

app.get('/api/checkin/today', (req, res) => {
  if (!req.session.userId) return res.json({ checkedIn: false });
  const today = todayStr();
  const found = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
    .get(req.session.userId, today);
  res.json({ checkedIn: !!found });
});

app.get('/api/checkin/history', (req, res) => {
  const empty = { checkinDates: [], currentStreak: 0, longestStreak: 0, totalDays: 0, missedDays: [], retroactiveCost: 10 };
  if (!req.session.userId) return res.json(empty);

  const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
  if (!user) return res.json(empty);

  const today = todayStr();
  const regDate = dateStr(user.created_at).slice(0, 10);
  const yearAgo = addDays(today, -364);
  const startDate = regDate > yearAgo ? regDate : yearAgo;

  const userCheckins = db.prepare('SELECT check_in_date FROM check_ins WHERE user_id = ?')
    .all(req.session.userId).map(c => c.check_in_date);
  const checkinSet = new Set(userCheckins);

  const checkinDates = userCheckins.filter(d => d >= yearAgo);

  const yesterday = addDays(today, -1);
  const missedDays = [];
  let d = startDate;
  while (d <= yesterday) {
    if (!checkinSet.has(d)) missedDays.push(d);
    d = addDays(d, 1);
  }

  const streaks = calcStreaks(userCheckins);

  res.json({
    checkinDates,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    totalDays: streaks.total,
    missedDays,
    retroactiveCost: 10,
    retroactiveTotal: missedDays.length * 10,
    points: user.points || 0
  });
});

app.post('/api/checkin/retroactive', requireAuth, (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: '请指定补签日期' });

  const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const today = todayStr();
  const regDate = dateStr(user.created_at).slice(0, 10);
  const cost = 10;

  if (date < regDate || date >= today) {
    return res.status(400).json({ error: '只能补签注册日至昨天的日期' });
  }
  const exists = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
    .get(req.session.userId, date);
  if (exists) return res.status(400).json({ error: '该日期已签到' });
  if ((user.points || 0) < cost) {
    return res.status(400).json({ error: `积分不足，补签需要 ${cost} 积分，当前 ${user.points || 0} 积分` });
  }

  const doRetroactive = db.transaction(() => {
    db.prepare('UPDATE profiles SET points = points - ? WHERE id = ?').run(cost, req.session.userId);
    db.prepare('INSERT INTO check_ins (user_id, check_in_date, retroactive, created_at) VALUES (?, ?, 1, datetime(\'now\'))')
      .run(req.session.userId, date);
    addExp(req.session.userId, EXP_REWARDS.retroactive);
  });
  doRetroactive();

  const updatedUser = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
  res.json({ ok: true, points: updatedUser.points, exp: updatedUser.exp, level_info: getLevelInfo(updatedUser.exp), date });
});

app.post('/api/checkin/auto', requireAuth, (req, res) => {
  const today = todayStr();
  const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
  if (!user) return res.json({ checkedIn: false, points: 0 });

  const already = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
    .get(req.session.userId, today);
  if (already) return res.json({ checkedIn: true, points: user.points, newCheckin: false });

  const doCheckin = db.transaction(() => {
    db.prepare('INSERT INTO check_ins (user_id, check_in_date, created_at) VALUES (?, ?, datetime(\'now\'))')
      .run(req.session.userId, today);
    db.prepare('UPDATE profiles SET points = points + 10 WHERE id = ?').run(req.session.userId);
    addExp(req.session.userId, EXP_REWARDS.signin);
  });
  doCheckin();

  const updatedUser = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
  res.json({ checkedIn: true, points: updatedUser.points, newCheckin: true, exp: updatedUser.exp, level_info: getLevelInfo(updatedUser.exp) });
});

app.post('/api/checkin', requireAuth, (req, res) => {
  const today = todayStr();
  const exists = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
    .get(req.session.userId, today);
  if (exists) return res.status(400).json({ error: '今天已经签到过了' });

  const doCheckin = db.transaction(() => {
    db.prepare('INSERT INTO check_ins (user_id, check_in_date, created_at) VALUES (?, ?, datetime(\'now\'))')
      .run(req.session.userId, today);
    db.prepare('UPDATE profiles SET points = points + 10 WHERE id = ?').run(req.session.userId);
    addExp(req.session.userId, EXP_REWARDS.signin);
  });
  doCheckin();

  const user = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
  res.json({ ok: true, points: user ? user.points : 0, exp: user ? user.exp : 0, level_info: getLevelInfo(user ? user.exp : 0) });
});

// ============================================================
// 点赞 API
// ============================================================

app.get('/api/likes', (req, res) => {
  if (!req.session.userId) return res.json({ ids: [] });
  const ids = db.prepare('SELECT post_id FROM post_likes WHERE user_id = ?').all(req.session.userId).map(l => l.post_id);
  res.json({ ids });
});

app.post('/api/like/:postId', requireAuth, (req, res) => {
  const pid = Number(req.params.postId);
  const exists = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(pid, req.session.userId);
  if (exists) return res.status(400).json({ error: '已点赞' });

  db.prepare('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, datetime(\'now\'))').run(pid, req.session.userId);
  // 帖子作者获得「被点赞」经验
  const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(pid);
  if (post && post.author_id && post.author_id !== req.session.userId) {
    addExp(post.author_id, EXP_REWARDS.receive_like);
  }
  res.json({ ok: true });
});

app.delete('/api/like/:postId', requireAuth, (req, res) => {
  const pid = Number(req.params.postId);
  db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(pid, req.session.userId);
  res.json({ ok: true });
});

// ============================================================
// 收藏 API
// ============================================================

app.post('/api/bookmark/:postId', requireAuth, (req, res) => {
  const pid = Number(req.params.postId);
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(pid);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const exists = db.prepare('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?').get(pid, req.session.userId);
  if (exists) return res.status(400).json({ error: '已收藏' });

  db.prepare('INSERT INTO bookmarks (post_id, user_id, created_at) VALUES (?, ?, datetime(\'now\'))').run(pid, req.session.userId);
  // 收藏行为获得经验
  addExp(req.session.userId, EXP_REWARDS.bookmark);
  res.json({ ok: true });
});

app.delete('/api/bookmark/:postId', requireAuth, (req, res) => {
  const pid = Number(req.params.postId);
  db.prepare('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?').run(pid, req.session.userId);
  res.json({ ok: true });
});

app.get('/api/bookmark/:postId', requireAuth, (req, res) => {
  const pid = Number(req.params.postId);
  const found = db.prepare('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?').get(pid, req.session.userId);
  res.json({ isBookmarked: !!found });
});

app.get('/api/bookmarks', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const rows = db.prepare(`
    SELECT p.*, b.created_at AS bookmarked_at,
      pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
      pr.title AS author_title, pr.avatar_frame AS author_avatar_frame,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
    FROM bookmarks b
    JOIN posts p ON p.id = b.post_id
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId);

  const posts = rows.map(p => ({
    ...p,
    tags: parseJsonField(p.tags, []),
    images: parseJsonField(p.images, []),
    pinned: intToBool(p.pinned),
    author_avatar_url: p.author_avatar_url || null,
    author_title: p.author_title || null,
    author_avatar_frame: p.author_avatar_frame || null
  }));
  res.json({ posts });
});

// ============================================================
// 管理员 API
// ============================================================

/** 获取当前用户管理员状态 */
app.get('/api/admin/status', requireAuth, (req, res) => {
  const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  res.json({ isAdmin });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM posts WHERE author_id = u.id) AS posts_count,
      (SELECT COUNT(*) FROM comments WHERE author_id = u.id) AS comments_count
    FROM profiles u
  `).all().map(u => ({
    id: u.id,
    display_id: u.display_id,
    username: u.username,
    email: u.email,
    points: u.points || 0,
    muted: intToBool(u.muted),
    role: u.role || 'user',
    created_at: u.created_at,
    posts_count: u.posts_count,
    comments_count: u.comments_count
  }));
  res.json({ users });
});

app.put('/api/admin/users/:id/mute', requireAdmin, (req, res) => {
  const uid = Number(req.params.id);
  const user = db.prepare('SELECT role, muted FROM profiles WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.role === 'super_admin') return res.status(403).json({ error: '不能禁言超级管理员' });

  const newMuted = intToBool(user.muted) ? 0 : 1;
  db.prepare('UPDATE profiles SET muted = ? WHERE id = ?').run(newMuted, uid);
  res.json({ ok: true, muted: intToBool(newMuted) });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const uid = Number(req.params.id);
  const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.role === 'super_admin') return res.status(403).json({ error: '不能删除超级管理员' });

  const deleteUser = db.transaction(() => {
    const userPosts = db.prepare('SELECT id, images FROM posts WHERE author_id = ?').all(uid);
    const userPostIds = new Set(userPosts.map(p => p.id));

    userPosts.forEach(p => deleteImages(parseJsonField(p.images, [])));

    const allComments = db.prepare('SELECT id, images, post_id FROM comments WHERE author_id = ?').all(uid);
    allComments.forEach(c => deleteImages(parseJsonField(c.images, [])));

    const postRelatedComments = db.prepare('SELECT id, images FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)').all(uid);
    postRelatedComments.forEach(c => deleteImages(parseJsonField(c.images, [])));

    db.prepare('DELETE FROM posts WHERE author_id = ?').run(uid);
    db.prepare('DELETE FROM comments WHERE author_id = ?').run(uid);
    db.prepare('DELETE FROM post_likes WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM check_ins WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM profiles WHERE id = ?').run(uid);
  });
  deleteUser();

  res.json({ ok: true });
});

app.put('/api/posts/:id/pin', requireAdmin, (req, res) => {
  const pid = Number(req.params.id);
  const post = db.prepare('SELECT pinned FROM posts WHERE id = ?').get(pid);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const newPinned = intToBool(post.pinned) ? 0 : 1;
  db.prepare('UPDATE posts SET pinned = ? WHERE id = ?').run(newPinned, pid);
  res.json({ ok: true, pinned: intToBool(newPinned) });
});

app.put('/api/admin/users/:id/points', requireAdmin, (req, res) => {
  const uid = Number(req.params.id);
  const user = db.prepare('SELECT id FROM profiles WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const points = Number(req.body.points);
  if (!Number.isFinite(points) || points < 0) return res.status(400).json({ error: '积分必须为非负整数' });
  if (points > 1000000) return res.status(400).json({ error: '积分上限为 1,000,000' });

  db.prepare('UPDATE profiles SET points = ? WHERE id = ?').run(Math.floor(points), uid);
  res.json({ ok: true, points: Math.floor(points) });
});

// ============================================================
// 分类管理 API
// ============================================================

app.get('/api/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
  res.json({ categories: cats.map(c => ({ id: c.id, name: c.name, label: c.label, color: c.color, order: c.sort_order })) });
});

app.post('/api/categories', requireAdmin, (req, res) => {
  const { name, label, color } = req.body;
  if (!name || !label) return res.status(400).json({ error: '请填写分类标识和名称' });
  const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (exists) return res.status(400).json({ error: '分类标识已存在' });

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get();
  const order = (maxOrder.m || 0) + 1;

  const result = db.prepare(`
    INSERT INTO categories (name, label, color, sort_order) VALUES (?, ?, ?, ?)
  `).run(name.slice(0, 20), label, color || 'bg-gray-100 text-gray-700', order);

  res.json({ ok: true, category: { id: result.lastInsertRowid, name: name.slice(0, 20), label, color: color || 'bg-gray-100 text-gray-700', order } });
});

app.put('/api/categories/:id', requireAdmin, (req, res) => {
  const { label, color, order } = req.body;
  const cid = Number(req.params.id);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
  if (!cat) return res.status(404).json({ error: '分类不存在' });

  db.prepare('UPDATE categories SET label = ?, color = ?, sort_order = ? WHERE id = ?')
    .run(label || cat.label, color || cat.color, order !== undefined ? Number(order) : cat.sort_order, cid);

  res.json({ ok: true, category: { id: cid, name: cat.name, label: label || cat.label, color: color || cat.color, order: order !== undefined ? Number(order) : cat.sort_order } });
});

app.delete('/api/categories/:id', requireAdmin, (req, res) => {
  const cid = Number(req.params.id);
  const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(cid);
  if (!cat) return res.status(404).json({ error: '分类不存在' });

  db.transaction(() => {
    db.prepare('UPDATE posts SET category = ? WHERE category = ?').run('uncategorized', cat.name);
    db.prepare('DELETE FROM categories WHERE id = ?').run(cid);
  })();

  res.json({ ok: true });
});

// ============================================================
// 超级管理员专属 API
// ============================================================

app.put('/api/superadmin/grant-admin/:id', requireSuperAdmin, (req, res) => {
  const uid = Number(req.params.id);
  const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.role === 'super_admin') return res.status(400).json({ error: '不能修改超级管理员角色' });

  db.prepare('UPDATE profiles SET role = ? WHERE id = ?').run('admin', uid);
  res.json({ ok: true, role: 'admin' });
});

app.put('/api/superadmin/revoke-admin/:id', requireSuperAdmin, (req, res) => {
  const uid = Number(req.params.id);
  const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.role === 'super_admin') return res.status(400).json({ error: '不能修改超级管理员角色' });

  db.prepare('UPDATE profiles SET role = ? WHERE id = ?').run('user', uid);
  res.json({ ok: true, role: 'user' });
});

app.put('/api/superadmin/transfer/:id', requireSuperAdmin, (req, res) => {
  const uid = Number(req.params.id);
  const target = db.prepare('SELECT * FROM profiles WHERE id = ?').get(uid);
  if (!target) return res.status(404).json({ error: '目标用户不存在' });
  if (target.role === 'super_admin') return res.status(400).json({ error: '对方已是超级管理员' });

  db.transaction(() => {
    db.prepare('UPDATE profiles SET role = ? WHERE id = ?').run('user', req.session.userId);
    db.prepare('UPDATE profiles SET role = ? WHERE id = ?').run('super_admin', uid);
  })();

  res.json({ ok: true, message: `已将超级管理员转让给 ${target.username}` });
});

// ============================================================
// 标签 API
// ============================================================

app.get('/api/tags', (req, res) => {
  const rows = db.prepare('SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != \'[]\'').all();
  const tagCount = {};
  rows.forEach(r => {
    const tags = parseJsonField(r.tags, []);
    tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
  });
  const tags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
  res.json({ tags });
});

// ============================================================
// 积分商店 API
// ============================================================

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

// 装备/切换称号或头像框（无需购买，直接装备已拥有或商城现有）
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

// 卸下称号或头像框
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

// ============================================================
// 个人资料 API
// ============================================================

app.get('/api/users/:id', (req, res) => {
  const uid = Number(req.params.id);
  const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const isOwner = req.session.userId === uid;
  const me = req.session.userId ? db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId) : null;
  const isAdmin = me && (me.role === 'admin' || me.role === 'super_admin');

  const publicData = {
    id: user.id,
    display_id: user.display_id,
    username: user.username,
    avatar_url: user.avatar_url || null,
    role: user.role || 'user',
    title: user.title || null,
    avatar_frame: user.avatar_frame || null,
    created_at: user.created_at,
    exp: user.exp || 0,
    level_info: getLevelInfo(user.exp || 0),
    posts_count: db.prepare('SELECT COUNT(*) AS c FROM posts WHERE author_id = ?').get(uid).c,
    comments_count: db.prepare('SELECT COUNT(*) AS c FROM comments WHERE author_id = ?').get(uid).c
  };

  if (isOwner || isAdmin || intToBool(user.profile_public)) {
    publicData.bio = user.bio || '';
    publicData.location = user.location || '';
    publicData.website = user.website || '';
    publicData.points = user.points || 0;
    publicData.profile_public = intToBool(user.profile_public);
  }

  if (isOwner) {
    publicData.email = user.email;
  }

  res.json({ user: publicData });
});

app.put('/api/profile', requireAuth, multerUpload(upload.single('avatar')), (req, res) => {
  const { username, bio, location, website, profile_public, title, avatar_frame } = req.body;
  const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const updateProfile = db.transaction(() => {
    let newUsername = user.username;
    let newRenameChances = user.rename_chances || 0;

    if (username && username !== user.username) {
      if (newRenameChances <= 0) {
        throw new Error('改名卡不足，请先在积分商店兑换');
      }
      const nameExists = db.prepare('SELECT id FROM profiles WHERE username = ? AND id != ?').get(username, user.id);
      if (nameExists) throw new Error('用户名已被占用');
      newRenameChances--;
      newUsername = username;
    }

    const newBio = bio !== undefined ? bio.slice(0, 200) : user.bio;
    const newLocation = location !== undefined ? location : user.location;
    const newWebsite = website !== undefined ? website : user.website;
    const newProfilePublic = profile_public !== undefined ? boolToInt(profile_public === 'true' || profile_public === true) : user.profile_public;

    let newAvatarUrl = user.avatar_url;
    if (req.file) {
      if (user.avatar_url) deleteFile(user.avatar_url);
      newAvatarUrl = '/uploads/' + req.file.filename;
    }

    // 称号/头像框：必须为用户已购买过的商品 value，校验订单 -> 商品 -> value 链
    let newTitle = user.title || null;
    let newFrame = user.avatar_frame || null;
    if (title !== undefined) {
      if (title === '' || title === null) {
        newTitle = null;
      } else {
        // 通过订单 join 商品表，校验该用户购买的称号对应商品的 value 是否匹配
        const owned = db.prepare(`
          SELECT s.value FROM shop_orders o
          JOIN shop_items s ON s.id = o.item_id
          WHERE o.user_id = ? AND o.item_type = 'title' AND o.status = 'completed'
            AND s.value = ?
        `).get(user.id, title);
        if (!owned) throw new Error('未拥有该称号');
        newTitle = title;
      }
    }
    if (avatar_frame !== undefined) {
      if (avatar_frame === '' || avatar_frame === null) {
        newFrame = null;
      } else {
        const owned = db.prepare(`
          SELECT s.value FROM shop_orders o
          JOIN shop_items s ON s.id = o.item_id
          WHERE o.user_id = ? AND o.item_type = 'avatar_frame' AND o.status = 'completed'
            AND s.value = ?
        `).get(user.id, avatar_frame);
        if (!owned) throw new Error('未拥有该头像框');
        newFrame = avatar_frame === 'none' ? null : avatar_frame;
      }
    }

    db.prepare(`
      UPDATE profiles SET username = ?, bio = ?, location = ?, website = ?,
      profile_public = ?, avatar_url = ?, rename_chances = ?, title = ?, avatar_frame = ? WHERE id = ?
    `).run(newUsername, newBio, newLocation, newWebsite, newProfilePublic, newAvatarUrl, newRenameChances, newTitle, newFrame, user.id);

    return { newUsername, newBio, newLocation, newWebsite, newProfilePublic, newAvatarUrl, newRenameChances, newTitle, newFrame };
  });

  try {
    const result = updateProfile();
    const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
    res.json({
      ok: true,
      user: {
        id: updated.id, display_id: updated.display_id, username: updated.username, email: updated.email,
        avatar_url: updated.avatar_url, bio: updated.bio,
        location: updated.location, website: updated.website,
        profile_public: intToBool(updated.profile_public), points: updated.points || 0,
        title: updated.title || null,
        avatar_frame: updated.avatar_frame || null,
        rename_chances: updated.rename_chances || 0
      }
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/users/:id/posts', (req, res) => {
  const uid = Number(req.params.id);
  const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const posts = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
    FROM posts p
    WHERE p.author_id = ?
    ORDER BY p.created_at DESC
  `).all(uid).map(p => ({
    ...p,
    tags: parseJsonField(p.tags, []),
    images: parseJsonField(p.images, []),
    pinned: intToBool(p.pinned),
    author_display_id: user.display_id,
    author_name: user.username,
    author_avatar_url: user.avatar_url || null,
    author_title: user.title || null,
    author_avatar_frame: user.avatar_frame || null
  }));

  res.json({ posts });
});

app.get('/api/users/:id/likes', (req, res) => {
  const uid = Number(req.params.id);
  const user = db.prepare('SELECT id FROM profiles WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const posts = db.prepare(`
    SELECT p.*,
      pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
      pr.title AS author_title, pr.avatar_frame AS author_avatar_frame,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
    FROM post_likes pl
    JOIN posts p ON p.id = pl.post_id
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE pl.user_id = ?
    ORDER BY pl.created_at DESC
  `).all(uid).map(p => ({
    ...p,
    tags: parseJsonField(p.tags, []),
    images: parseJsonField(p.images, []),
    pinned: intToBool(p.pinned),
    author_avatar_url: p.author_avatar_url || null,
    author_title: p.author_title || null,
    author_avatar_frame: p.author_avatar_frame || null
  }));

  res.json({ posts });
});

// ============================================================
// 服务器启动（端口被占用时自动杀旧进程）
// ============================================================
function killPort(port) {
  try {
    const pids = execSync(`ss -tlnp | grep :${port} | grep -oP 'pid=\\K\\d+'`, { encoding: 'utf8' }).trim();
    if (pids) {
      pids.split('\n').forEach(pid => { try { process.kill(Number(pid)); } catch (e) {} });
      return true;
    }
  } catch (e) {}
  return false;
}

function startServer() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  MiForum 运行在 http://0.0.0.0:${PORT}\n`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`  端口 ${PORT} 被占用，尝试自动关闭旧进程...`);
      if (killPort(PORT)) {
        setTimeout(() => startServer(), 500);
      } else {
        console.error(`  ✗ 无法释放端口 ${PORT}`);
        process.exit(1);
      }
    } else {
      throw err;
    }
  });
}

process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

startServer();






