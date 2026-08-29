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
app.get('/api/checkin/today', (req, res) => {
  if (!req.session.userId) return res.json({ checkedIn: false });
  const db = loadDB();
  const today = new Date().toLocaleDateString('sv-SE');
  const found = db.check_ins.find(c => c.user_id === req.session.userId && c.check_in_date === today);
  res.json({ checkedIn: !!found });
});

app.post('/api/checkin', requireAuth, (req, res) => {
  const db = loadDB();
  const today = new Date().toLocaleDateString('sv-SE');
  if (db.check_ins.find(c => c.user_id === req.session.userId && c.check_in_date === today)) {
    return res.status(400).json({ error: '今天已经签到过了' });
  }
  db.check_ins.push({ id: db.nextId.check_ins++, user_id: req.session.userId, check_in_date: today, created_at: new Date().toISOString() });
  const user = db.profiles.find(p => p.id === req.session.userId);
  if (user) user.points = (user.points || 0) + 10;
  saveDB(db);
  res.json({ ok: true });
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
