/**
 * database.js - SQLite 数据库模块
 * 使用 better-sqlite3 实现轻量化、高性能的本地数据库
 *
 * 数据库路径优先级：
 *   1. DB_PATH 环境变量（Docker 生产环境使用）
 *   2. data/db/data.db（默认路径，需有写入权限）
 *   3. src/data.db（回退路径，本地开发用）
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { SCHEMA_SQL } = require('./db/schema');
const { initDefaultData } = require('./db/seeds');

// 数据库文件路径选择
function resolveDbPath() {
  // 优先使用环境变量（Docker 生产环境）
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  // 默认路径：data/db/data.db
  const defaultPath = path.join(__dirname, '..', 'data', 'db', 'data.db');
  const defaultDir = path.dirname(defaultPath);

  // 检查目录是否可写
  try {
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    fs.accessSync(defaultDir, fs.constants.W_OK);
    return defaultPath;
  } catch (e) {
    // 回退到 src/data.db（本地开发）
    const fallbackPath = path.join(__dirname, 'data.db');
    console.log(`  ⚠ 无权写入 ${defaultDir}，使用本地数据库: ${fallbackPath}`);
    return fallbackPath;
  }
}

const DB_FILE = resolveDbPath();
let db = null;

/**
 * 初始化数据库连接
 */
function initDatabase() {
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * 创建所有表
 */
function createTables() {
  db.exec(SCHEMA_SQL);

  // 字段迁移：旧库没有的列自动补上
  const migrations = [
    ['profiles', 'exp', 'INTEGER DEFAULT 0'],
    ['profiles', 'rename_chances', 'INTEGER DEFAULT 0'],
    ['profiles', 'title', 'TEXT'],
    ['profiles', 'avatar_frame', 'TEXT'],
    ['profiles', 'force_password_change', 'INTEGER DEFAULT 0'],
    ['posts', 'private', 'INTEGER DEFAULT 0'],
    ['categories', 'description', 'TEXT DEFAULT \'\''],
    ['categories', 'icon', 'TEXT DEFAULT \'\''],
    ['categories', 'section_type', 'TEXT DEFAULT \'normal\''],
    ['categories', 'created_by', 'INTEGER'],
    ['profiles', 'theme', "TEXT DEFAULT 'auto'"],
    ['profiles', 'theme_color', "TEXT DEFAULT 'purple'"]
  ];
  for (const [table, column, definition] of migrations) {
    ensureColumn(table, column, definition);
  }

  // 迁移：更新超管 display_id 从 '000' 到 '000000'
  const admin = db.prepare('SELECT id, display_id FROM profiles WHERE email = \'root@miforum.local\'').get();
  if (admin && admin.display_id === '000') {
    db.prepare('UPDATE profiles SET display_id = \'000000\' WHERE id = ?').run(admin.id);
  }

  // 删除已废弃的「无头像框」商品
  const noneItem = db.prepare('SELECT id FROM shop_items WHERE value = \'none\' AND type = \'avatar_frame\'').get();
  if (noneItem) {
    db.prepare('DELETE FROM shop_orders WHERE item_id = ?').run(noneItem.id);
    db.prepare('DELETE FROM shop_items WHERE id = ?').run(noneItem.id);
  }
}

/**
 * 字段迁移：若表中不存在指定列则 ALTER ADD
 */
function ensureColumn(table, column, definition) {
  const allowedTables = ['profiles', 'posts', 'comments', 'check_ins', 'post_likes', 'bookmarks', 'shop_items', 'shop_orders', 'categories', 'verification_codes', 'settings', 'exp_log', 'custom_emoji', 'user_emoji'];
  const columnRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!allowedTables.includes(table) || !columnRegex.test(column)) {
    console.error(`  ✗ ensureColumn 参数无效: table=${table}, column=${column}`);
    return;
  }
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  ✓ 已为 ${table} 表添加字段 ${column}`);
  }
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
 * 获取数据库实例（懒初始化）
 */
function getDb() {
  if (!db) {
    initDatabase();
    createTables();
    initDefaultData(db);
  }
  return db;
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
