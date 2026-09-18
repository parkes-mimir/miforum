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
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });

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
const { registerRoutes } = require('./routes');
const { initBotService } = require('./services/bot');

/**
 * 获取本机所有局域网 IP
 */
function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name: name, address: iface.address });
      }
    }
  }
  return ips;
}

// ============================================================
// 获取用户主题偏好（模块级，供 createApp 和 startServer 共用）
// ============================================================
const VALID_THEMES = ['light', 'dark', 'auto'];
const VALID_COLORS = ['purple', 'blue', 'green', 'orange', 'rose'];

function getUserTheme(userId) {
  const defaults = { theme: 'auto', themeColor: 'purple' };
  if (!userId) return defaults;
  try {
    const db = getDb();
    const u = db.prepare('SELECT theme, theme_color FROM profiles WHERE id = ?').get(userId);
    return {
      theme: u && VALID_THEMES.includes(u.theme) ? u.theme : defaults.theme,
      themeColor: u && VALID_COLORS.includes(u.theme_color) ? u.theme_color : defaults.themeColor
    };
  } catch (e) {
    return defaults;
  }
}

// ============================================================
// 创建 Express 应用
// ============================================================
function createApp() {
  const app = express();

  // 信任代理（Docker/reverse proxy 环境下正确获取客户端 IP）
  app.set('trust proxy', 1);

  // 安全 HTTP 头
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Alpine.js v3 需要 unsafe-eval 用于表达式求值
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'http:', 'https:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: null // 禁用 HTTP 升级 HTTPS
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      hsts: false // 禁用 HSTS，本地 HTTP 访问
    })
  );

  // CORS 配置（白名单模式）
  const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // 允许同源请求（无 origin）和白名单中的跨域请求
    if (!origin || allowedOrigins.includes(origin)) {
      if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API 版本号支持：/api/v1/* → /api/*（向后兼容）
  app.use('/api/v1', (req, res, next) => {
    req.url = '/api' + req.url;
    next();
  });

  // CSRF 防护：校验 state-changing 请求的 Origin 头
  const isProduction = (process.env.NODE_ENV || 'development') === 'production';
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const origin = req.headers.origin || req.headers.referer;
      if (origin) {
        try {
          const originUrl = new URL(origin);
          const host = req.headers.host;
          if (host && originUrl.host !== host) {
            return res.status(403).json({ error: 'CSRF 校验失败' });
          }
        } catch (e) {
          return res.status(403).json({ error: 'CSRF 校验失败' });
        }
      } else if (isProduction && req.headers.cookie) {
        // 生产环境：有 Cookie 但无 Origin/Referer — 浏览器请求不应出现此情况
        return res.status(403).json({ error: 'CSRF 校验失败：缺少 Origin 头' });
      }
    }
    next();
  });

  // 速率限制（开发环境放宽，测试环境禁用）
  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isTest ? 10000 : isDev ? 500 : 300,
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 10000 : isDev ? 50 : 10,
    message: { error: '登录尝试过于频繁，请15分钟后再试' }
  });

  app.use('/api/', apiLimiter);
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);

  // Body 解析
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 模板引擎配置（EJS）
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));

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
  app.use(
    express.static(path.join(__dirname, '../public'), {
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(filePath)) {
          // 图片缓存7天
          res.setHeader('Cache-Control', 'public, max-age=604800');
        } else if (/\.(js|css)$/i.test(filePath)) {
          // JS/CSS 不缓存（开发阶段频繁修改）
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    })
  );
  app.use('/uploads', express.static(UPLOADS_DIR, { etag: true, lastModified: true, maxAge: '7d' }));

  // favicon 不存在时返回 204，避免浏览器报错
  app.get('/favicon.ico', (req, res) => res.status(204).end());

  // Session 配置（使用 SQLite 持久化存储）
  // 如果未设置 SESSION_SECRET 环境变量，则生成一个持久化的随机密钥
  let SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) {
    // 将 secret 存储到与数据库同目录
    const dbDir = path.dirname(require('./database').DB_FILE);
    const secretFile = path.join(dbDir, '.session-secret');
    try {
      if (fs.existsSync(secretFile)) {
        SESSION_SECRET = fs.readFileSync(secretFile, 'utf8').trim();
      }
      if (!SESSION_SECRET) {
        SESSION_SECRET = crypto.randomBytes(32).toString('hex');
        fs.mkdirSync(path.dirname(secretFile), { recursive: true });
        fs.writeFileSync(secretFile, SESSION_SECRET);
      }
    } catch (e) {
      SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    }
  }

  const cookieSecure = process.env.COOKIE_SECURE === 'true';
  const SqliteStore = require('better-sqlite3-session-store')(session);
  const sessionDb = require('better-sqlite3')(require('./database').DB_FILE);
  sessionDb.pragma('journal_mode = WAL');

  // 优雅退出（关闭主数据库和 session 数据库）
  const shutdown = () => {
    closeDb();
    sessionDb.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  app.use(
    session({
      store: new SqliteStore({
        client: sessionDb,
        expired: { clear: true, intervalMs: 900000 } // 每15分钟清理过期会话
      }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: cookieSecure,
        sameSite: 'lax'
      }
    })
  );

  // 页面路由（使用 EJS 模板渲染，注入用户主题偏好避免闪烁）
  // 必须在 session 中间件之后，才能读取 req.session.userId

  function renderPage(view) {
    const siteUrl = process.env.SITE_URL || '';
    const gamesJson = process.env.GAMES || '';
    let games = [];
    try {
      if (gamesJson) games = JSON.parse(gamesJson);
    } catch (e) {
      console.warn('GAMES 配置格式错误:', e.message);
    }
    return (req, res) => {
      const theme = getUserTheme(req.session?.userId);
      const pageUrl = siteUrl ? siteUrl + req.path : '';
      res.render(view, { theme, siteUrl, pageUrl, games });
    };
  }

  app.get('/', renderPage('forum'));
  app.get('/shop', renderPage('shop'));
  app.get('/messages', renderPage('messages'));
  app.get('/profile.html', renderPage('profile'));
  app.get('/admin', renderPage('admin'));

  // 帖子详情页：服务端查询帖子数据用于 OG 标签（微信/社交分享卡片）
  app.get('/post.html', (req, res) => {
    const theme = getUserTheme(req.session?.userId);
    const siteUrl = process.env.SITE_URL || '';
    const pageUrl = siteUrl ? siteUrl + req.path : '';
    let ogTitle = 'MiForum - 帖子详情';
    let ogDesc = '查看帖子内容、评论和投票';
    let ogImage = '';

    const pid = Number(req.query.id);
    if (pid) {
      try {
        const db = getDb();
        const post = db.prepare('SELECT title, content, images FROM posts WHERE id = ?').get(pid);
        if (post) {
          ogTitle = post.title || ogTitle;
          ogDesc = (post.content || '')
            .replace(/\[img:\d+\]/g, '')
            .replace(/\[emoji:[^\]]+\]/g, '')
            .slice(0, 100);
          const imgs = JSON.parse(post.images || '[]');
          if (imgs.length > 0 && siteUrl) {
            ogImage = siteUrl + imgs[0];
          }
        }
      } catch (e) {}
    }

    res.render('post', { theme, siteUrl, pageUrl, ogTitle, ogDesc, ogImage });
  });

  return app;
}

// ============================================================
// 服务器启动
// ============================================================
function killPort(port) {
  try {
    const pids = execSync(`ss -tlnp | grep :${port} | grep -oP 'pid=\\K\\d+'`, { encoding: 'utf8' }).trim();
    if (pids) {
      pids.split('\n').forEach((pid) => {
        try {
          process.kill(Number(pid));
        } catch (e) {}
      });
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

  // 初始化BOT服务
  initBotService(app, db);

  // 404 处理（在所有 API 路由之后）
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: '接口不存在' });
    }
    const theme = getUserTheme(req.session?.userId);
    res.status(404).render('404', { theme });
  });

  // 启动日志显示数据库路径
  console.log(`  数据库: ${require('./database').DB_FILE}`);

  // 统一错误处理中间件
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('  ✗ 未捕获错误:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
    res.status(err.status || 500).json({
      error: err.message || '服务器内部错误'
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIps();
    console.log('\n  MiForum 运行在:');
    console.log(`  本地: http://localhost:${PORT}`);
    ips.forEach(({ name, address }) => {
      console.log(`  ${name}: http://${address}:${PORT}`);
    });
    console.log('');
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

// ============================================================
// 导出（供测试使用）
// ============================================================
module.exports = { createApp, registerRoutes };

// 直接运行时启动服务器
if (require.main === module) {
  startServer();
}
