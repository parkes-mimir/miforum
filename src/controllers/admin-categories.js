/**
 * admin-categories.js - 分类管理控制器
 *
 * 提供分类的创建、编辑、删除功能，
 * 支持管理员分类和用户自定义板块。
 */

const { requireAuth, requireAdmin: requireAdminFactory } = require('../middleware/auth');
const { parseJsonField } = require('../utils/helpers');

const VALID_SECTION_TYPES = ['announcement', 'hot', 'normal'];

module.exports = function (app, db) {
  const requireAdmin = requireAdminFactory(db);

  app.get('/api/categories', (req, res) => {
    const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json({
      categories: cats.map((c) => ({
        id: c.id,
        name: c.name,
        label: c.label,
        description: c.description || '',
        color: c.color,
        icon: c.icon || '',
        sectionType: c.section_type || 'normal',
        order: c.sort_order,
        created_by: c.created_by
      }))
    });
  });

  app.post('/api/categories', requireAdmin, (req, res) => {
    const { name, label, description, color, icon, sectionType } = req.body;
    if (!name || !label) return res.status(400).json({ error: '请填写分类标识和名称' });
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).json({ error: '分类标识只能包含英文、数字、下划线' });
    if (name.length < 2 || name.length > 20) return res.status(400).json({ error: '分类标识2-20字符' });
    if (label.length > 20) return res.status(400).json({ error: '分类名称最多20字' });
    if (sectionType && !VALID_SECTION_TYPES.includes(sectionType)) {
      return res.status(400).json({ error: '无效的板块类型' });
    }
    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ error: '分类标识已存在' });

    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get();
    const order = (maxOrder.m || 0) + 1;
    const type = sectionType || 'normal';

    const result = db
      .prepare(
        `
      INSERT INTO categories (name, label, description, color, icon, section_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(name.slice(0, 20), label, description || '', color || 'bg-gray-100 text-gray-700', icon || '', type, order);

    res.json({
      ok: true,
      category: {
        id: result.lastInsertRowid,
        name: name.slice(0, 20),
        label,
        description: description || '',
        color: color || 'bg-gray-100 text-gray-700',
        icon: icon || '',
        sectionType: type,
        order
      }
    });
  });

  app.post('/api/categories/user', requireAuth, (req, res) => {
    const { name, label, description, color, icon } = req.body;
    if (!name || !label) return res.status(400).json({ error: '请填写板块标识和名称' });
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).json({ error: '板块标识只能包含英文、数字、下划线' });
    if (name.length < 2 || name.length > 20) return res.status(400).json({ error: '板块标识2-20字符' });
    if (label.length < 1 || label.length > 10) return res.status(400).json({ error: '板块名称1-10字' });
    if (description && description.length > 100) return res.status(400).json({ error: '简介最多100字' });

    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ error: '板块标识已存在' });

    const userCats = db
      .prepare('SELECT COUNT(*) as count FROM categories WHERE created_by = ?')
      .get(req.session.userId);
    if (userCats.count >= 5) return res.status(400).json({ error: '每人最多创建5个板块' });

    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get();
    const order = (maxOrder.m || 0) + 1;

    const result = db
      .prepare(
        `
      INSERT INTO categories (name, label, description, color, icon, section_type, created_by, sort_order) VALUES (?, ?, ?, ?, ?, 'normal', ?, ?)
    `
      )
      .run(
        name.slice(0, 20),
        label,
        (description || '').slice(0, 100),
        color || 'bg-gray-100 text-gray-700',
        icon || '',
        req.session.userId,
        order
      );

    res.json({
      ok: true,
      category: {
        id: result.lastInsertRowid,
        name: name.slice(0, 20),
        label,
        description: (description || '').slice(0, 100),
        color: color || 'bg-gray-100 text-gray-700',
        icon: icon || '',
        sectionType: 'normal',
        order
      }
    });
  });

  app.put('/api/categories/:id', requireAdmin, (req, res) => {
    const { label, description, color, icon, order } = req.body;
    if (label && label.length > 20) return res.status(400).json({ error: '分类名称最多20字' });
    const cid = Number(req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
    if (!cat) return res.status(404).json({ error: '分类不存在' });

    db.prepare(
      'UPDATE categories SET label = ?, description = ?, color = ?, icon = ?, sort_order = ? WHERE id = ?'
    ).run(
      label || cat.label,
      description !== undefined ? description : cat.description,
      color || cat.color,
      icon !== undefined ? icon : cat.icon,
      order !== undefined ? Number(order) : cat.sort_order,
      cid
    );

    res.json({
      ok: true,
      category: {
        id: cid,
        name: cat.name,
        label: label || cat.label,
        description: description !== undefined ? description : cat.description,
        color: color || cat.color,
        icon: icon !== undefined ? icon : cat.icon,
        order: order !== undefined ? Number(order) : cat.sort_order
      }
    });
  });

  app.delete('/api/categories/:id', requireAdmin, (req, res) => {
    const cid = Number(req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
    if (!cat) return res.status(404).json({ error: '分类不存在' });
    if (cat.section_type === 'announcement' || cat.section_type === 'hot') {
      return res.status(400).json({ error: '特殊板块不可删除' });
    }

    db.transaction(() => {
      // 确保 uncategorized 分类存在
      const uncategorized = db.prepare("SELECT id FROM categories WHERE name = 'uncategorized'").get();
      if (!uncategorized) {
        const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get();
        db.prepare(
          "INSERT INTO categories (name, label, description, section_type, sort_order) VALUES ('uncategorized', '未分类', '未分类的帖子', 'normal', ?)"
        ).run((maxOrder.m || 0) + 1);
      }
      db.prepare('UPDATE posts SET category = ? WHERE category = ?').run('uncategorized', cat.name);
      db.prepare('DELETE FROM categories WHERE id = ?').run(cid);
    })();

    res.json({ ok: true });
  });

  app.get('/api/tags', (req, res) => {
    const rows = db
      .prepare(
        "SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != '[]' AND created_at > datetime('now', '-30 days')"
      )
      .all();
    const tagCount = {};
    rows.forEach((r) => {
      const tags = parseJsonField(r.tags, []);
      tags.forEach((t) => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
    const tags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));
    res.json({ tags });
  });
};
