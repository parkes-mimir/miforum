const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ============================================================
// 图片上传配置（multer）
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const now = new Date();
    const date = now.toISOString().slice(0,10).replace(/-/g, '');
    const ts = Date.now();
    const name = 'webforum' + date + '-' + ts + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('仅支持 JPG/PNG/GIF/WebP/BMP 格式图片'));
  }
});

// ============================================================
// JSON 文件数据库
// ============================================================
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { profiles: [], posts: [], comments: [], check_ins: [], post_likes: [], nextId: { profiles:1, posts:1, comments:1, check_ins:1, post_likes:1 } };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// ============================================================
// 中间件
// ============================================================
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'forum.html')));
app.use(session({
  secret: 'miforum-' + Math.random().toString(36).slice(2),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
  next();
}

// multer 错误处理（忽略 Unexpected field）
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
// Auth
// ============================================================
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: '请填写所有字段' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });
  const db = loadDB();
  if (db.profiles.find(p => p.email === email)) return res.status(400).json({ error: '邮箱已被注册' });
  if (db.profiles.find(p => p.username === username)) return res.status(400).json({ error: '用户名已被占用' });
  const hash = await bcrypt.hash(password, 10);
  const user = { id: db.nextId.profiles++, username, email, password_hash: hash, points: 0, created_at: new Date().toISOString() };
  db.profiles.push(user);
  saveDB(db);
  req.session.userId = user.id;
  res.json({ user: { id: user.id, username, email, points: 0 } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '请填写邮箱和密码' });
  const db = loadDB();
  const user = db.profiles.find(p => p.email === email);
  if (!user) return res.status(400).json({ error: '邮箱或密码错误' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: '邮箱或密码错误' });
  req.session.userId = user.id;
  res.json({ user: { id: user.id, username: user.username, email: user.email, points: user.points } });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const db = loadDB();
  const u = db.profiles.find(p => p.id === req.session.userId);
  res.json({ user: u ? { id: u.id, username: u.username, email: u.email, points: u.points } : null });
});

// ============================================================
// 帖子
// ============================================================
app.get('/api/posts', (req, res) => {
  const db = loadDB();
  let posts = [...db.posts];
  const { category, search } = req.query;
  if (category && category !== 'all') posts = posts.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
  }
  posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const result = posts.map(p => {
    const author = db.profiles.find(u => u.id === p.author_id);
    return {
      ...p,
      author_name: author ? author.username : '未知',
      likes_count: db.post_likes.filter(l => l.post_id === p.id).length,
      comments_count: db.comments.filter(c => c.post_id === p.id).length
    };
  });
  res.json({ posts: result });
});

// 发帖（支持多图片上传）
app.post('/api/posts', requireAuth, multerUpload(upload.array('images', 30)), (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });
  const db = loadDB();
  const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
  const post = {
    id: db.nextId.posts++,
    title,
    content,
    category: category || 'tech',
    author_id: req.session.userId,
    images,
    created_at: new Date().toISOString(),
    updated_at: null
  };
  db.posts.push(post);
  // 发帖奖励5积分
  const user = db.profiles.find(p => p.id === req.session.userId);
  if (user) user.points = (user.points || 0) + 5;
  saveDB(db);
  res.json({ postId: post.id, points: user ? user.points : 0 });
});

// 编辑帖子（支持新增/删除图片）
app.put('/api/posts/:id', requireAuth, multerUpload(upload.array('images', 30)), (req, res) => {
  const { title, content, category, removeImages } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });
  const db = loadDB();
  const pid = Number(req.params.id);
  const post = db.posts.find(p => p.id === pid);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (post.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的帖子' });

  // 删除指定的图片
  if (removeImages) {
    const removeList = JSON.parse(removeImages);
    removeList.forEach(url => {
      const imgPath = path.join(__dirname, url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
    post.images = (post.images || []).filter(u => !removeList.includes(u));
  }

  // 添加新上传的图片
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(f => '/uploads/' + f.filename);
    post.images = [...(post.images || []), ...newImages];
  }

  post.title = title;
  post.content = content;
  if (category) post.category = category;
  post.updated_at = new Date().toISOString();
  saveDB(db);
  res.json({ ok: true });
});

// 删除帖子
app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const db = loadDB();
  const pid = Number(req.params.id);
  const idx = db.posts.findIndex(p => p.id === pid);
  if (idx === -1) return res.status(404).json({ error: '帖子不存在' });
  if (db.posts[idx].author_id !== req.session.userId) return res.status(403).json({ error: '只能删除自己的帖子' });
  // 删除关联的图片
  const post = db.posts[idx];
  if (post.images && post.images.length > 0) {
    post.images.forEach(url => {
      const imgPath = path.join(__dirname, url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
  }
  db.posts.splice(idx, 1);
  // 同时删除该帖子的所有评论和点赞
  db.comments = db.comments.filter(c => c.post_id !== pid);
  db.post_likes = db.post_likes.filter(l => l.post_id !== pid);
  saveDB(db);
  res.json({ ok: true });
});

// ============================================================
// 评论
// ============================================================
app.get('/api/posts/:id/comments', (req, res) => {
  const db = loadDB();
  const pid = Number(req.params.id);
  const post = db.posts.find(p => p.id === pid);
  const commentsRaw = db.comments.filter(c => c.post_id === pid);
  
  // 先按时间排序，计算楼层号
  const sortedByTime = [...commentsRaw].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const floorMap = {};
  sortedByTime.forEach((c, i) => { floorMap[c.id] = i + 1; });
  
  // 再按置顶优先排序，但楼层号保持不变
  const comments = [...commentsRaw].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(a.created_at) - new Date(b.created_at);
  }).map(c => {
    const author = db.profiles.find(u => u.id === c.author_id);
    return {
      ...c,
      author_name: author ? author.username : '未知',
      floor: floorMap[c.id],
      is_post_owner: post ? c.author_id === post.author_id : false
    };
  });
  res.json({ comments, postOwnerId: post ? post.author_id : null });
});

app.post('/api/posts/:id/comments', requireAuth, multerUpload(upload.array('images', 3)), (req, res) => {
  const { content } = req.body;
  if (!content && (!req.files || req.files.length === 0)) return res.status(400).json({ error: '请输入评论内容或上传图片' });
  const db = loadDB();
  const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
  const comment = {
    id: db.nextId.comments++,
    post_id: Number(req.params.id),
    author_id: req.session.userId,
    content: content || '',
    images,
    pinned: false,
    created_at: new Date().toISOString()
  };
  db.comments.push(comment);
  saveDB(db);
  res.json({ commentId: comment.id });
});

app.put('/api/comments/:id', requireAuth, multerUpload(upload.array('images', 3)), (req, res) => {
  const { content, removeImages } = req.body;
  if (!content && (!req.files || req.files.length === 0)) return res.status(400).json({ error: '评论不能为空' });
  const db = loadDB();
  const cid = Number(req.params.id);
  const c = db.comments.find(x => x.id === cid);
  if (!c) return res.status(404).json({ error: '评论不存在' });
  if (c.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的评论' });
  
  // 删除指定的图片
  if (removeImages) {
    const removeList = JSON.parse(removeImages);
    removeList.forEach(url => {
      const imgPath = path.join(__dirname, url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
    c.images = (c.images || []).filter(u => !removeList.includes(u));
  }
  
  // 添加新上传的图片
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(f => '/uploads/' + f.filename);
    c.images = [...(c.images || []), ...newImages];
  }
  
  if (content) c.content = content;
  saveDB(db);
  res.json({ ok: true });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const db = loadDB();
  const cid = Number(req.params.id);
  const idx = db.comments.findIndex(x => x.id === cid);
  if (idx === -1) return res.status(404).json({ error: '评论不存在' });
  const c = db.comments[idx];
  // 评论作者或帖主可删除
  const post = db.posts.find(p => p.id === c.post_id);
  const isPostOwner = post && post.author_id === req.session.userId;
  if (c.author_id !== req.session.userId && !isPostOwner) {
    return res.status(403).json({ error: '只能删除自己的评论或自己帖子下的评论' });
  }
  // 删除评论图片
  if (c.images && c.images.length > 0) {
    c.images.forEach(url => {
      const imgPath = path.join(__dirname, url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
  }
  db.comments.splice(idx, 1);
  saveDB(db);
  res.json({ ok: true });
});

// 帖主置顶/取消置顶评论
app.put('/api/comments/:id/pin', requireAuth, (req, res) => {
  const db = loadDB();
  const cid = Number(req.params.id);
  const c = db.comments.find(x => x.id === cid);
  if (!c) return res.status(404).json({ error: '评论不存在' });
  const post = db.posts.find(p => p.id === c.post_id);
  if (!post || post.author_id !== req.session.userId) {
    return res.status(403).json({ error: '只有帖主可以置顶评论' });
  }
  c.pinned = !c.pinned;
  saveDB(db);
  res.json({ ok: true, pinned: c.pinned });
});

// ============================================================
// 签到（基于 phppi561 的时区安全实现）
// ============================================================

// 辅助函数：日期工具（'YYYY-MM-DD' 纯字符串运算，避免时区/DST 偏差）
function dateStr(d) { return new Date(d).toLocaleDateString('sv-SE'); }
function todayStr() { return dateStr(new Date()); }
function addDays(dateStrIn, n) {
  const [y, m, d] = dateStrIn.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function daysBetween(a, b) { return Math.floor((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }

// 辅助函数：计算连续天数和统计
function calcStreaks(checkinDates) {
  if (!checkinDates.length) return { current: 0, longest: 0, total: 0 };
  const sorted = [...checkinDates].sort();
  const dateSet = new Set(sorted);
  let current = 0, longest = 0, streak = 0;
  // 从今天往回数当前连续天数；今天未签则从昨天起算，避免当天未签就断签
  const today = todayStr();
  let d = dateSet.has(today) ? today : addDays(today, -1);
  while (dateSet.has(d)) { current++; d = addDays(d, -1); }
  // 计算最长连续天数
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || daysBetween(sorted[i - 1], sorted[i]) === 1) { streak++; }
    else { streak = 1; }
    longest = Math.max(longest, streak);
  }
  return { current, longest, total: sorted.length };
}

// 获取今日签到状态
app.get('/api/checkin/today', (req, res) => {
  if (!req.session.userId) return res.json({ checkedIn: false });
  const db = loadDB();
  const today = todayStr();
  const found = db.check_ins.find(c => c.user_id === req.session.userId && c.check_in_date === today);
  res.json({ checkedIn: !!found });
});

// 获取签到历史（365天日历 + 统计 + 可补签日期）
app.get('/api/checkin/history', (req, res) => {
  if (!req.session.userId) return res.json({ checkinDates: [], currentStreak: 0, longestStreak: 0, totalDays: 0, missedDays: [], retroactiveCost: 10 });
  const db = loadDB();
  const user = db.profiles.find(p => p.id === req.session.userId);
  if (!user) return res.json({ checkinDates: [], currentStreak: 0, longestStreak: 0, totalDays: 0, missedDays: [], retroactiveCost: 10 });

  const today = todayStr();
  const regDate = dateStr(user.created_at).slice(0, 10);
  // 取最近365天
  const yearAgo = addDays(today, -364);
  const startDate = regDate > yearAgo ? regDate : yearAgo;

  const userCheckins = db.check_ins.filter(c => c.user_id === req.session.userId).map(c => c.check_in_date);
  const checkinSet = new Set(userCheckins);

  // 365天内已签到日期
  const checkinDates = userCheckins.filter(d => d >= yearAgo);

  // 计算可补签的日期（注册日到昨天之间，未签到的日期）
  const yesterday = addDays(today, -1);
  const missedDays = [];
  let d = startDate;
  while (d <= yesterday) {
    if (!checkinSet.has(d)) {
      missedDays.push(d);
    }
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

// 补签
app.post('/api/checkin/retroactive', requireAuth, (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: '请指定补签日期' });

  const db = loadDB();
  const user = db.profiles.find(p => p.id === req.session.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const today = todayStr();
  const regDate = dateStr(user.created_at).slice(0, 10);

  // 校验：只能是注册日到昨天之间的日期（今天请走正常签到）
  if (date < regDate || date >= today) {
    return res.status(400).json({ error: '只能补签注册日至昨天的日期' });
  }
  // 校验：不能补签已签到的日期
  if (db.check_ins.find(c => c.user_id === req.session.userId && c.check_in_date === date)) {
    return res.status(400).json({ error: '该日期已签到' });
  }
  // 校验：积分是否足够
  const cost = 10;
  if ((user.points || 0) < cost) {
    return res.status(400).json({ error: `积分不足，补签需要 ${cost} 积分，当前 ${user.points || 0} 积分` });
  }

  // 扣积分 + 补签
  user.points -= cost;
  db.check_ins.push({ id: db.nextId.check_ins++, user_id: req.session.userId, check_in_date: date, retroactive: true, created_at: new Date().toISOString() });
  saveDB(db);

  res.json({ ok: true, points: user.points, date });
});

// 自动签到（页面加载时调用，静默签到）
app.post('/api/checkin/auto', requireAuth, (req, res) => {
  const db = loadDB();
  const today = todayStr();
  const user = db.profiles.find(p => p.id === req.session.userId);
  if (!user) return res.json({ checkedIn: false, points: 0 });
  const already = db.check_ins.find(c => c.user_id === req.session.userId && c.check_in_date === today);
  if (already) return res.json({ checkedIn: true, points: user.points, newCheckin: false });
  db.check_ins.push({ id: db.nextId.check_ins++, user_id: req.session.userId, check_in_date: today, created_at: new Date().toISOString() });
  user.points = (user.points || 0) + 10;
  saveDB(db);
  res.json({ checkedIn: true, points: user.points, newCheckin: true });
});

// 每日签到（保留兼容）
app.post('/api/checkin', requireAuth, (req, res) => {
  const db = loadDB();
  const today = todayStr();
  if (db.check_ins.find(c => c.user_id === req.session.userId && c.check_in_date === today)) {
    return res.status(400).json({ error: '今天已经签到过了' });
  }
  db.check_ins.push({ id: db.nextId.check_ins++, user_id: req.session.userId, check_in_date: today, created_at: new Date().toISOString() });
  const user = db.profiles.find(p => p.id === req.session.userId);
  if (user) user.points = (user.points || 0) + 10;
  saveDB(db);
  res.json({ ok: true, points: user ? user.points : 0 });
});

// ============================================================
// 点赞
// ============================================================
app.get('/api/likes', (req, res) => {
  if (!req.session.userId) return res.json({ ids: [] });
  const db = loadDB();
  res.json({ ids: db.post_likes.filter(l => l.user_id === req.session.userId).map(l => l.post_id) });
});

app.post('/api/like/:postId', requireAuth, (req, res) => {
  const db = loadDB();
  const pid = Number(req.params.postId);
  if (db.post_likes.find(l => l.post_id === pid && l.user_id === req.session.userId)) {
    return res.status(400).json({ error: '已点赞' });
  }
  db.post_likes.push({ id: db.nextId.post_likes++, post_id: pid, user_id: req.session.userId, created_at: new Date().toISOString() });
  saveDB(db);
  res.json({ ok: true });
});

app.delete('/api/like/:postId', requireAuth, (req, res) => {
  const db = loadDB();
  const pid = Number(req.params.postId);
  db.post_likes = db.post_likes.filter(l => !(l.post_id === pid && l.user_id === req.session.userId));
  saveDB(db);
  res.json({ ok: true });
});

// ============================================================
// 启动
// ============================================================
const { execSync } = require('child_process');

function killPort(port) {
  try {
    const pids = execSync(`ss -tlnp | grep :${port} | grep -oP 'pid=\\K\\d+'`, { encoding: 'utf8' }).trim();
    if (pids) {
      pids.split('\n').forEach(pid => { try { process.kill(Number(pid)); } catch(e) {} });
      return true;
    }
  } catch(e) {}
  return false;
}

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`\n  MiForum 运行在 http://localhost:${PORT}\n`);
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

startServer();
