/**
 * seeds.js - 默认数据初始化
 */

const bcrypt = require('bcryptjs');

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

const DEFAULT_CATEGORIES = [
  { name: 'notice', label: '公告', description: '官方公告和通知', color: 'bg-amber-100 text-amber-700', icon: '📢', section_type: 'announcement', sort_order: 1 },
  { name: 'hot', label: '热门', description: '热门帖子自动聚合', color: 'bg-red-100 text-red-700', icon: '🔥', section_type: 'hot', sort_order: 2 },
  { name: 'tech', label: '技术', description: '技术交流与讨论', color: 'bg-blue-100 text-blue-700', icon: '💻', section_type: 'normal', sort_order: 3 },
  { name: 'life', label: '生活', description: '日常生活分享', color: 'bg-pink-100 text-pink-700', icon: '🌿', section_type: 'normal', sort_order: 4 }
];

/**
 * 初始化默认数据
 * @param {import('better-sqlite3').Database} db
 */
function initDefaultData(db) {
  // 初始化超级管理员
  const adminEmail = process.env.ADMIN_EMAIL || 'root@miforum.local';
  const adminPassword = process.env.ADMIN_PASSWORD || '123456';
  const adminExists = db.prepare('SELECT id FROM profiles WHERE email = ?').get(adminEmail);
  if (!adminExists) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`
      INSERT INTO profiles (display_id, username, email, password_hash, role, profile_public, force_password_change)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('000000', '超级管理员', adminEmail, hash, 'super_admin', 1, 1);
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
      INSERT INTO categories (name, label, description, color, icon, section_type, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const cat of DEFAULT_CATEGORIES) {
      insert.run(cat.name, cat.label, cat.description || '', cat.color, cat.icon || '', cat.section_type || 'normal', cat.sort_order);
    }
  } else {
    // 迁移：更新已有分类的 section_type
    const notice = db.prepare('SELECT id FROM categories WHERE name = \'notice\'').get();
    if (notice) {
      db.prepare('UPDATE categories SET section_type = \'announcement\', icon = \'📢\', description = \'官方公告和通知\' WHERE name = \'notice\' AND (section_type IS NULL OR section_type = \'normal\')').run();
    }
    const hot = db.prepare('SELECT id FROM categories WHERE name = \'hot\'').get();
    if (!hot) {
      db.prepare('INSERT INTO categories (name, label, description, color, icon, section_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run('hot', '热门', '热门帖子自动聚合', 'bg-red-100 text-red-700', '🔥', 'hot', 2);
    }
  }
}

module.exports = { initDefaultData };
