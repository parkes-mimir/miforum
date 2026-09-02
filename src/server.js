/**
 * server.js - MiForum 主入口
 *
 * 职责：
 * - Express 应用配置
 * - 中间件注册
 * - 路由注册（加载各控制器模块）
 * - 服务器启动
 */

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getDb, closeDb } = require('./database');
const { UPLOADS_DIR } = require('./utils/helpers');

// ============================================================
// 常量
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// 确保上传目录存在
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// 初始化数据库
const db = getDb();

// ============================================================
// 中间件配置
// ============================================================

// Body 解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTML 文件禁用缓存
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '/shop') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// 静态文件（前端）
app.use(express.static(path.join(__dirname, '../public'), { etag: false, lastModified: false }));
app.use('/uploads', express.static(UPLOADS_DIR));

// 页面路由
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/forum.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, '../public/shop.html')));

// Session 配置
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// ============================================================
// 注册各模块路由
// ============================================================
require('./controllers/auth')(app, db);
require('./controllers/posts')(app, db);
require('./controllers/comments')(app, db);
require('./controllers/checkin')(app, db);
require('./controllers/likes')(app, db);
require('./controllers/shop')(app, db);
require('./controllers/level')(app, db);
require('./controllers/profile')(app, db);
require('./controllers/admin')(app, db);

// ============================================================
// 服务器启动
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

// 优雅退出
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

startServer();
