/**
 * migrate.js - 将 db.json 数据迁移到 SQLite
 * 
 * 用法: node migrate.js
 * 
 * 注意: 运行前确保 data.db 不存在或已备份
 */

const fs = require('fs');
const path = require('path');
const { getDb, closeDb, DB_FILE } = require('./database');

const JSON_FILE = path.join(__dirname, 'db.json');

// 检查 db.json 是否存在
if (!fs.existsSync(JSON_FILE)) {
  console.error('❌ db.json 不存在，无需迁移');
  process.exit(1);
}

// 检查 data.db 是否已存在
if (fs.existsSync(DB_FILE)) {
  console.log('⚠️  data.db 已存在');
  console.log('   如需重新迁移，请先删除 data.db');
  process.exit(0);
}

console.log('📦 开始迁移 db.json → data.db\n');

// 读取 JSON 数据
const jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

// 初始化数据库
const db = getDb();

// 暂时禁用外键约束（迁移时数据顺序可能不一致）
db.pragma('foreign_keys = OFF');

// 使用事务进行迁移
const migrate = db.transaction(() => {
  // 迁移用户
  if (jsonData.profiles && jsonData.profiles.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO profiles (id, username, email, password_hash, avatar_url, bio, location, website, profile_public, points, muted, role, title, avatar_frame, rename_chances, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of jsonData.profiles) {
      insert.run(
        p.id, p.username, p.email, p.password_hash,
        p.avatar_url || null, p.bio || '', p.location || '', p.website || '',
        p.profile_public !== false ? 1 : 0,
        p.points || 0, p.muted ? 1 : 0, p.role || 'user',
        p.title || null, p.avatar_frame || null, p.rename_chances || 0,
        p.created_at || new Date().toISOString()
      );
    }
    console.log(`✅ 迁移用户: ${jsonData.profiles.length} 条`);
  }

  // 迁移帖子
  if (jsonData.posts && jsonData.posts.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO posts (id, title, content, category, tags, author_id, images, pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of jsonData.posts) {
      insert.run(
        p.id, p.title, p.content, p.category || 'tech',
        JSON.stringify(p.tags || []), p.author_id,
        JSON.stringify(p.images || []), p.pinned ? 1 : 0,
        p.created_at, p.updated_at || null
      );
    }
    console.log(`✅ 迁移帖子: ${jsonData.posts.length} 条`);
  }

  // 迁移评论
  if (jsonData.comments && jsonData.comments.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO comments (id, post_id, author_id, content, images, pinned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of jsonData.comments) {
      insert.run(
        c.id, c.post_id, c.author_id, c.content || '',
        JSON.stringify(c.images || []), c.pinned ? 1 : 0,
        c.created_at
      );
    }
    console.log(`✅ 迁移评论: ${jsonData.comments.length} 条`);
  }

  // 迁移签到记录
  if (jsonData.check_ins && jsonData.check_ins.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO check_ins (id, user_id, check_in_date, retroactive, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const c of jsonData.check_ins) {
      insert.run(
        c.id, c.user_id, c.check_in_date,
        c.retroactive ? 1 : 0, c.created_at
      );
    }
    console.log(`✅ 迁移签到记录: ${jsonData.check_ins.length} 条`);
  }

  // 迁移点赞
  if (jsonData.post_likes && jsonData.post_likes.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO post_likes (id, post_id, user_id, created_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const l of jsonData.post_likes) {
      insert.run(l.id, l.post_id, l.user_id, l.created_at);
    }
    console.log(`✅ 迁移点赞: ${jsonData.post_likes.length} 条`);
  }

  // 迁移收藏
  if (jsonData.bookmarks && jsonData.bookmarks.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO bookmarks (id, post_id, user_id, created_at)
      VALUES (?, ?, ?, ?)
    `);
    for (const b of jsonData.bookmarks) {
      insert.run(b.id, b.post_id, b.user_id, b.created_at);
    }
    console.log(`✅ 迁移收藏: ${jsonData.bookmarks.length} 条`);
  }

  // 迁移商品
  if (jsonData.shop_items && jsonData.shop_items.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO shop_items (id, name, description, icon, type, value, price, stock, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of jsonData.shop_items) {
      insert.run(
        item.id, item.name, item.description, item.icon,
        item.type, item.value || null, item.price,
        item.stock, item.enabled ? 1 : 0
      );
    }
    console.log(`✅ 迁移商品: ${jsonData.shop_items.length} 条`);
  }

  // 迁移订单
  if (jsonData.shop_orders && jsonData.shop_orders.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO shop_orders (id, user_id, item_id, item_name, item_type, price, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const o of jsonData.shop_orders) {
      insert.run(
        o.id, o.user_id, o.item_id, o.item_name,
        o.item_type, o.price, o.status || 'completed',
        o.created_at
      );
    }
    console.log(`✅ 迁移订单: ${jsonData.shop_orders.length} 条`);
  }

  // 迁移分类
  if (jsonData.categories && jsonData.categories.length > 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, label, color, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const cat of jsonData.categories) {
      insert.run(cat.id, cat.name, cat.label, cat.color, cat.order || 0);
    }
    console.log(`✅ 迁移分类: ${jsonData.categories.length} 条`);
  }
});

// 执行迁移
try {
  migrate();
  console.log('\n✨ 迁移完成！');
  console.log(`📁 数据库文件: ${DB_FILE}`);
  console.log('\n提示: 可以删除 db.json 或保留作为备份');
} catch (err) {
  console.error('\n❌ 迁移失败:', err.message);
  process.exit(1);
} finally {
  closeDb();
}
