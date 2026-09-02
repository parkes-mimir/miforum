/**
 * server.js - MiForum 主入口
 *
 * 职责：
 * - Express 应用配置
 * - 中间件注册
 * - 路由注册（加载各控制器模块）
 * - 服务器启动
 */

// 加载环境变量（必须在最前面）
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getDb, closeDb } = require('./database');
const { UPLOADS_DIR } = require('./utils/helpers');

/**
 * 获取本机局域网 IP
 */
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ============================================================
// 创建 Express 应用
// ============================================================
function createApp() {
  const app = express();

  // 安全 HTTP 头
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  // 速率限制
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: '请求过于频繁，请稍后再试' }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: '登录尝试过于频繁，请15分钟后再试' }
  });

  app.use('/api/', apiLimiter);
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);

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

  // 静态文件
  app.use(express.static(path.join(__dirname, '../public'), { etag: false, lastModified: false }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // 页面路由
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/forum.html')));
  app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, '../public/shop.html')));

  // Session 配置
  const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
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

  return app;
}

// ============================================================
// 注册路由
// ============================================================
function registerRoutes(app, db) {
  require('./controllers/auth')(app, db);
  require('./controllers/posts')(app, db);
  require('./controllers/comments')(app, db);
  require('./controllers/checkin')(app, db);
  require('./controllers/likes')(app, db);
  require('./controllers/shop')(app, db);
  require('./controllers/level')(app, db);
  require('./controllers/profile')(app, db);
  require('./controllers/admin')(app, db);
}

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
  const PORT = process.env.PORT || 3000;
  const db = getDb();
  const app = createApp();
  registerRoutes(app, db);

  const server = app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log(`\n  MiForum 运行在:`);
    console.log(`  本地: http://localhost:${PORT}`);
    console.log(`  网络: http://${ip}:${PORT}\n`);
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

  // 优雅退出
  process.on('SIGINT', () => { closeDb(); process.exit(0); });
  process.on('SIGTERM', () => { closeDb(); process.exit(0); });
}

// ============================================================
// 导出（供测试使用）
// ============================================================
module.exports = { createApp, registerRoutes };

// 直接运行时启动服务器
if (require.main === module) {
  startServer();
}
