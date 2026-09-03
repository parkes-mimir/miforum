/**
 * database.js - SQLite 数据库模块
 * 使用 better-sqlite3 实现轻量化、高性能的本地数据库
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// 数据库文件路径（支持环境变量配置，默认为当前目录下的 data.db）
const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'data.db');

// 默认商品
const DEFAULT_SHOP_ITEMS = [
  { name: '改名卡', description: '修改一次用户名', icon: '✏️', type: 'rename_card', value: null, price: 100, stock: -1, enabled: 1 },
  { name: '新手上路', description: '永久称号', icon: '🌱', type: 'title', value: '新手上路', price: 50, stock: -1, enabled: 1 },
  { name: '活跃达人', description: '永久称号', icon: '🔥', type: 'title', value: '活跃达人', price: 200, stock: -1, enabled: 1 },
  { name: '技术大佬', description: '永久称号', icon: '💎', type: 'title', value: '技术大佬', price: 300, stock: -1, enabled: 1 },
  { name: '社区元老', description: '永久称号', icon: '🏛️', type: 'title', value: '社区元老', price: 500, stock: -1, enabled: 1 },
  { name: '论坛之星', description: '永久称号', icon: '⭐', type: 'title', value: '论坛之星', price: 800, stock: -1, enabled: 1 },
  { name: '金色光环', description: '头像金色光圈', icon: '🟡', type: 'avatar_frame', value: 'gold', price: 150, stock: -1, enabled: 1 },
  { name: '银色边框', description: '头像银色边框', icon: '⚪', type: 'avatar_frame', value: 'silver', price: 80, stock: -1, enabled: 1 },
  { name: '蓝色冰晶', description: '头像蓝色光晕', icon: '🔵', type: 'avatar_frame', value: 'blue', price: 200, stock: -1, enabled: 1 },
  { name: '紫色星光', description: '头像紫色光晕', icon: '🟣', type: 'avatar_frame', value: 'purple', price: 250, stock: -1, enabled: 1 }
];

// 默认分类
const DEFAULT_CATEGORIES = [
  { name: 'tech', label: '技术', color: 'bg-blue-100 text-blue-700', sort_order: 1 },
  { name: 'life', label: '生活', color: 'bg-pink-100 text-pink-700', sort_order: 2 },
  { name: 'notice', label: '公告', color: 'bg-amber-100 text-amber-700', sort_order: 3 }
];

let db = null;

/**
 * 初始化数据库连接
 */
function initDatabase() {
  db = new Database(DB_FILE);

  // 启用 WAL 模式（提升并发性能）
  db.pragma('journal_mode = WAL');
  // 启用外键约束
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * 创建所有表
 */
function createTables() {
  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_id TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      location TEXT DEFAULT '',
      website TEXT DEFAULT '',
      profile_public INTEGER DEFAULT 1,
      points INTEGER DEFAULT 0,
      exp INTEGER DEFAULT 0,
      muted INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      title TEXT,
      avatar_frame TEXT,
      rename_chances INTEGER DEFAULT 0,
      force_password_change INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 帖子表
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'tech',
      tags TEXT DEFAULT '[]',
      author_id INTEGER REFERENCES profiles(id),
      images TEXT DEFAULT '[]',
      pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    -- 评论表
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES profiles(id),
      content TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 签到表
    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES profiles(id),
      check_in_date TEXT NOT NULL,
      retroactive INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, check_in_date)
    );

    -- 点赞表
    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES profiles(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );

    -- 收藏表
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES profiles(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );

    -- 商品表
    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      type TEXT NOT NULL,
      value TEXT,
      price INTEGER NOT NULL,
      stock INTEGER DEFAULT -1,
      enabled INTEGER DEFAULT 1
    );

    -- 订单表
    CREATE TABLE IF NOT EXISTS shop_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES profiles(id),
      item_id INTEGER REFERENCES shop_items(id),
      item_name TEXT,
      item_type TEXT,
      price INTEGER,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 邮箱验证码表
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT DEFAULT 'register',
      used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email, type);

    -- 系统设置表
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- 分类表
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      color TEXT DEFAULT 'bg-gray-100 text-gray-700',
      sort_order INTEGER DEFAULT 0
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
    CREATE INDEX IF NOT EXISTS idx_check_ins_user_date ON check_ins(user_id, check_in_date);
    CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
  `);

  // 字段迁移：旧库没有的列自动补上
  ensureColumn('profiles', 'exp', 'INTEGER DEFAULT 0');
  ensureColumn('profiles', 'rename_chances', 'INTEGER DEFAULT 0');
  ensureColumn('profiles', 'title', 'TEXT');
  ensureColumn('profiles', 'avatar_frame', 'TEXT');
  ensureColumn('profiles', 'force_password_change', 'INTEGER DEFAULT 0');

  // 迁移：更新超管 display_id 从 '000' 到 '000000'
  const admin = db.prepare("SELECT id, display_id FROM profiles WHERE email = 'root@miforum.local'").get();
  if (admin && admin.display_id === '000') {
    db.prepare("UPDATE profiles SET display_id = '000000' WHERE id = ?").run(admin.id);
  }

  // 删除已废弃的「无头像框」商品（先删订单再删商品）
  const noneItem = db.prepare("SELECT id FROM shop_items WHERE value = 'none' AND type = 'avatar_frame'").get();
  if (noneItem) {
    db.prepare('DELETE FROM shop_orders WHERE item_id = ?').run(noneItem.id);
    db.prepare('DELETE FROM shop_items WHERE id = ?').run(noneItem.id);
  }
}

/**
 * 字段迁移：若表中不存在指定列则 ALTER ADD
 * @param {string} table 表名
 * @param {string} column 列名
 * @param {string} definition 列定义（如 'INTEGER DEFAULT 0'）
 */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  ✓ 已为 ${table} 表添加字段 ${column}`);
  }
}

/**
 * 初始化默认数据
 */
function initDefaultData() {
  // 初始化超级管理员（display_id 固定为 '000000'，首次登录需改密）
  const adminExists = db.prepare('SELECT id FROM profiles WHERE email = ?').get('root@miforum.local');
  if (!adminExists) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(`
      INSERT INTO profiles (display_id, username, email, password_hash, role, profile_public, force_password_change)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('000000', '超级管理员', 'root@miforum.local', hash, 'super_admin', 1, 1);
  }

  // 初始化默认商品
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM shop_items').get().count;
  if (itemCount === 0) {
    const insert = db.prepare(`
      INSERT INTO shop_items (name, description, icon, type, value, price, stock, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of DEFAULT_SHOP_ITEMS) {
      insert.run(item.name, item.description, item.icon, item.type, item.value, item.price, item.stock, item.enabled);
    }
  }

  // 初始化默认分类
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    const insert = db.prepare(`
      INSERT INTO categories (name, label, color, sort_order)
      VALUES (?, ?, ?, ?)
    `);
    for (const cat of DEFAULT_CATEGORIES) {
      insert.run(cat.name, cat.label, cat.color, cat.sort_order);
    }
  }
}

/**
 * 获取数据库实例
 */
function getDb() {
  if (!db) {
    initDatabase();
    createTables();
    initDefaultData();
  }
  return db;
}

/**
 * 生成下一个用户 display_id（000001-999999）
 * @returns {string} 六位数ID
 */
function getNextDisplayId() {
  const row = db.prepare(`
    SELECT display_id FROM profiles 
    WHERE display_id != '000000' 
    ORDER BY CAST(display_id AS INTEGER) DESC 
    LIMIT 1
  `).get();

  if (!row) return '000001';

  const nextNum = parseInt(row.display_id, 10) + 1;
  if (nextNum > 999999) throw new Error('用户数量已达上限（999999）');
  return String(nextNum).padStart(6, '0');
}

/**
 * 关闭数据库连接
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  closeDb,
  getNextDisplayId,
  DB_FILE
};
