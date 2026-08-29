const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

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

app.post('/api/posts', requireAuth, (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });
  const db = loadDB();
  const post = { id: db.nextId.posts++, title, content, category: category || 'tech', author_id: req.session.userId, created_at: new Date().toISOString() };
  db.posts.push(post);
  saveDB(db);
  res.json({ postId: post.id });
});

// ============================================================
// 评论
// ============================================================
app.get('/api/posts/:id/comments', (req, res) => {
  const db = loadDB();
  const pid = Number(req.params.id);
  const comments = db.comments.filter(c => c.post_id === pid).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(c => {
    const author = db.profiles.find(u => u.id === c.author_id);
    return { ...c, author_name: author ? author.username : '未知' };
  });
  res.json({ comments });
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '请输入评论内容' });
  const db = loadDB();
  const comment = { id: db.nextId.comments++, post_id: Number(req.params.id), author_id: req.session.userId, content, created_at: new Date().toISOString() };
  db.comments.push(comment);
  saveDB(db);
  res.json({ commentId: comment.id });
});

app.put('/api/comments/:id', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '评论不能为空' });
  const db = loadDB();
  const cid = Number(req.params.id);
  const c = db.comments.find(x => x.id === cid);
  if (!c) return res.status(404).json({ error: '评论不存在' });
  if (c.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的评论' });
  c.content = content;
  saveDB(db);
  res.json({ ok: true });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const db = loadDB();
  const cid = Number(req.params.id);
  const idx = db.comments.findIndex(x => x.id === cid);
  if (idx === -1) return res.status(404).json({ error: '评论不存在' });
  if (db.comments[idx].author_id !== req.session.userId) return res.status(403).json({ error: '只能删除自己的评论' });
  db.comments.splice(idx, 1);
  saveDB(db);
  res.json({ ok: true });
});

// ============================================================
// 签到
// ============================================================

// 辅助函数：日期工具
function dateStr(d) { return new Date(d).toLocaleDateString('sv-SE'); }
function todayStr() { return dateStr(new Date()); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function daysBetween(a, b) { return Math.floor((new Date(b) - new Date(a)) / 86400000); }

// 辅助函数：计算连续天数和统计
function calcStreaks(checkinDates) {
  if (!checkinDates.length) return { current: 0, longest: 0, total: 0 };
  const sorted = [...checkinDates].sort();
  const dateSet = new Set(sorted);
  let current = 0, longest = 0, streak = 0;
  // 从今天往回数当前连续天数
  const today = todayStr();
  let d = today;
  while (dateSet.has(d)) { current++; d = dateStr(addDays(d, -1)); }
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
  const regDate = dateStr(user.created_at);
  // 取最近365天
  const yearAgo = dateStr(addDays(today, -364));
  const startDate = regDate > yearAgo ? regDate : yearAgo;

  const userCheckins = db.check_ins.filter(c => c.user_id === req.session.userId).map(c => c.check_in_date);
  const checkinSet = new Set(userCheckins);

  // 365天内已签到日期
  const checkinDates = userCheckins.filter(d => d >= yearAgo);

  // 计算可补签的日期（注册到今天之间，未签到的日期）
  const missedDays = [];
  let d = startDate;
  while (d <= today) {
    if (!checkinSet.has(d)) {
      missedDays.push(d);
    }
    d = dateStr(addDays(d, 1));
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
  const regDate = dateStr(user.created_at);

  // 校验：必须是注册日到今天之间的日期
  if (date < regDate || date > today) {
    return res.status(400).json({ error: '只能补签注册日至今天的日期' });
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

// 每日签到
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
const server = app.listen(PORT, () => {
  console.log(`\n  MiForum 运行在 http://localhost:${PORT}\n`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ✗ 端口 ${PORT} 被占用，先执行: fuser -k ${PORT}/tcp\n`);
    process.exit(1);
  }
  throw err;
});
