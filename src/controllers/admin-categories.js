/**
 * admin-categories.js - 分类管理控制器
 *
 * 提供分类的创建、编辑、删除功能，
 * 支持频道内板块管理和用户自定义板块。
 */

const { requireAuth, requireAdmin: requireAdminFactory } = require('../middleware/auth');
const { parseJsonField } = require('../utils/helpers');

const VALID_SECTION_TYPES = ['announcement', 'hot', 'normal'];

module.exports = function (app, db) {
  const requireAdmin = requireAdminFactory(db);

  /** 获取分类列表（支持按频道筛选） */
  app.get('/api/categories', (req, res) => {
    const channelId = req.query.channelId;
    let cats;
    if (channelId) {
      cats = db.prepare('SELECT * FROM categories WHERE channel_id = ? ORDER BY sort_order ASC').all(Number(channelId));
    } else {
      cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    }
    res.json({
      categories: cats.map((c) => ({
        id: c.id,
        name: c.name,
        label: c.label,
        description: c.description || '',
        color: c.color,
        icon: c.icon || '',
        sectionType: c.section_type || 'normal',
        channelId: c.channel_id,
        visibility: c.visibility || 'all',
        postPolicy: c.post_policy || 'members',
        order: c.sort_order,
        created_by: c.created_by
      }))
    });
  });

  /** 管理员创建板块 */
  app.post('/api/categories', requireAdmin, (req, res) => {
    const { name, label, description, color, icon, sectionType, channelId, visibility, postPolicy } = req.body;
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
      INSERT INTO categories (name, label, description, color, icon, section_type, channel_id, visibility, post_policy, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        name.slice(0, 20),
        label,
        description || '',
        color || 'bg-gray-100 text-gray-700',
        icon || '',
        type,
        channelId || null,
        visibility || 'all',
        postPolicy || 'members',
        order
      );

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
        channelId: channelId || null,
        visibility: visibility || 'all',
        postPolicy: postPolicy || 'members',
        order
      }
    });
  });

  /** 用户创建板块 */
  app.post('/api/categories/user', requireAuth, (req, res) => {
    const { name, label, description, color, icon, channelId } = req.body;
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
      INSERT INTO categories (name, label, description, color, icon, section_type, created_by, channel_id, visibility, post_policy, sort_order)
      VALUES (?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?)
    `
      )
      .run(
        name.slice(0, 20),
        label,
        (description || '').slice(0, 100),
        color || 'bg-gray-100 text-gray-700',
        icon || '',
        req.session.userId,
        channelId || null,
        'all',
        'members',
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
        channelId: channelId || null,
        visibility: 'all',
        postPolicy: 'members',
        order
      }
    });
  });

  /** 编辑板块 */
  app.put('/api/categories/:id', requireAdmin, (req, res) => {
    const { label, description, color, icon, order, visibility, postPolicy } = req.body;
    if (label && label.length > 20) return res.status(400).json({ error: '分类名称最多20字' });
    const cid = Number(req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
    if (!cat) return res.status(404).json({ error: '分类不存在' });

    db.prepare(
      `
      UPDATE categories SET label = ?, description = ?, color = ?, icon = ?, sort_order = ?, visibility = ?, post_policy = ?
      WHERE id = ?
    `
    ).run(
      label || cat.label,
      description !== undefined ? description : cat.description,
      color || cat.color,
      icon !== undefined ? icon : cat.icon,
      order !== undefined ? Number(order) : cat.sort_order,
      visibility || cat.visibility || 'all',
      postPolicy || cat.post_policy || 'members',
      cid
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
    res.json({
      ok: true,
      category: {
        id: cid,
        name: updated.name,
        label: updated.label,
        description: updated.description,
        color: updated.color,
        icon: updated.icon,
        order: updated.sort_order,
        visibility: updated.visibility,
        postPolicy: updated.post_policy
      }
    });
  });

  /** 删除板块 */
  app.delete('/api/categories/:id', requireAdmin, (req, res) => {
    const cid = Number(req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
    if (!cat) return res.status(404).json({ error: '分类不存在' });
    if (cat.section_type === 'announcement' || cat.section_type === 'hot') {
      return res.status(400).json({ error: '特殊板块不可删除' });
    }

    db.transaction(() => {
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

  /** 获取标签云 */
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
