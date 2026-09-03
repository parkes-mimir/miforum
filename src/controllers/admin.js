const { requireAuth, requireAdmin: requireAdminFactory, requireSuperAdmin: requireSuperAdminFactory } = require('../middleware/auth');
const { deleteImages, intToBool, parseJsonField } = require('../utils/helpers');

module.exports = function (app, db) {
  const requireAdmin = requireAdminFactory(db);
  const requireSuperAdmin = requireSuperAdminFactory(db);

  app.get('/api/admin/status', requireAuth, (req, res) => {
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    res.json({ isAdmin });
  });

  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = db.prepare(`
      SELECT u.*,
        (SELECT COUNT(*) FROM posts WHERE author_id = u.id) AS posts_count,
        (SELECT COUNT(*) FROM comments WHERE author_id = u.id) AS comments_count
      FROM profiles u
    `).all().map(u => ({
      id: u.id,
      display_id: u.display_id,
      username: u.username,
      email: u.email,
      points: u.points || 0,
      muted: intToBool(u.muted),
      role: u.role || 'user',
      created_at: u.created_at,
      posts_count: u.posts_count,
      comments_count: u.comments_count
    }));
    res.json({ users });
  });

  app.put('/api/admin/users/:id/mute', requireAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT role, muted FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'super_admin') return res.status(403).json({ error: '不能禁言超级管理员' });

    const newMuted = intToBool(user.muted) ? 0 : 1;
    db.prepare('UPDATE profiles SET muted = ? WHERE id = ?').run(newMuted, uid);
    res.json({ ok: true, muted: intToBool(newMuted) });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'super_admin') return res.status(403).json({ error: '不能删除超级管理员' });

    const deleteUser = db.transaction(() => {
      const userPosts = db.prepare('SELECT id, images FROM posts WHERE author_id = ?').all(uid);

      userPosts.forEach(p => deleteImages(parseJsonField(p.images, [])));

      const allComments = db.prepare('SELECT id, images, post_id FROM comments WHERE author_id = ?').all(uid);
      allComments.forEach(c => deleteImages(parseJsonField(c.images, [])));

      const postRelatedComments = db.prepare('SELECT id, images FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)').all(uid);
      postRelatedComments.forEach(c => deleteImages(parseJsonField(c.images, [])));

      db.prepare('DELETE FROM posts WHERE author_id = ?').run(uid);
      db.prepare('DELETE FROM comments WHERE author_id = ?').run(uid);
      db.prepare('DELETE FROM post_likes WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM check_ins WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM profiles WHERE id = ?').run(uid);
    });
    deleteUser();

    res.json({ ok: true });
  });

  app.put('/api/posts/:id/pin', requireAdmin, (req, res) => {
    const pid = Number(req.params.id);
    const post = db.prepare('SELECT pinned FROM posts WHERE id = ?').get(pid);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const newPinned = intToBool(post.pinned) ? 0 : 1;
    db.prepare('UPDATE posts SET pinned = ? WHERE id = ?').run(newPinned, pid);
    res.json({ ok: true, pinned: intToBool(newPinned) });
  });

  app.put('/api/admin/users/:id/points', requireAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT id FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const points = Number(req.body.points);
    if (!Number.isFinite(points) || points < 0) return res.status(400).json({ error: '积分必须为非负整数' });
    if (points > 1000000) return res.status(400).json({ error: '积分上限为 1,000,000' });

    db.prepare('UPDATE profiles SET points = ? WHERE id = ?').run(Math.floor(points), uid);
    res.json({ ok: true, points: Math.floor(points) });
  });

  app.get('/api/categories', (req, res) => {
    const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json({ categories: cats.map(c => ({ id: c.id, name: c.name, label: c.label, color: c.color, order: c.sort_order })) });
  });

  app.post('/api/categories', requireAdmin, (req, res) => {
    const { name, label, color } = req.body;
    if (!name || !label) return res.status(400).json({ error: '请填写分类标识和名称' });
    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ error: '分类标识已存在' });

    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get();
    const order = (maxOrder.m || 0) + 1;

    const result = db.prepare(`
      INSERT INTO categories (name, label, color, sort_order) VALUES (?, ?, ?, ?)
    `).run(name.slice(0, 20), label, color || 'bg-gray-100 text-gray-700', order);

    res.json({ ok: true, category: { id: result.lastInsertRowid, name: name.slice(0, 20), label, color: color || 'bg-gray-100 text-gray-700', order } });
  });

  app.put('/api/categories/:id', requireAdmin, (req, res) => {
    const { label, color, order } = req.body;
    const cid = Number(req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
    if (!cat) return res.status(404).json({ error: '分类不存在' });

    db.prepare('UPDATE categories SET label = ?, color = ?, sort_order = ? WHERE id = ?')
      .run(label || cat.label, color || cat.color, order !== undefined ? Number(order) : cat.sort_order, cid);

    res.json({ ok: true, category: { id: cid, name: cat.name, label: label || cat.label, color: color || cat.color, order: order !== undefined ? Number(order) : cat.sort_order } });
  });

  app.delete('/api/categories/:id', requireAdmin, (req, res) => {
    const cid = Number(req.params.id);
    const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(cid);
    if (!cat) return res.status(404).json({ error: '分类不存在' });

    db.transaction(() => {
      db.prepare('UPDATE posts SET category = ? WHERE category = ?').run('uncategorized', cat.name);
      db.prepare('DELETE FROM categories WHERE id = ?').run(cid);
    })();

    res.json({ ok: true });
  });

  app.put('/api/superadmin/grant-admin/:id', requireSuperAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'super_admin') return res.status(400).json({ error: '不能修改超级管理员角色' });

    db.prepare('UPDATE profiles SET role = ? WHERE id = ?').run('admin', uid);
    res.json({ ok: true, role: 'admin' });
  });

  app.put('/api/superadmin/revoke-admin/:id', requireSuperAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'super_admin') return res.status(400).json({ error: '不能修改超级管理员角色' });

    db.prepare('UPDATE profiles SET role = ? WHERE id = ?').run('user', uid);
    res.json({ ok: true, role: 'user' });
  });

  app.put('/api/superadmin/transfer/:id', requireSuperAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const target = db.prepare('SELECT * FROM profiles WHERE id = ?').get(uid);
    if (!target) return res.status(404).json({ error: '目标用户不存在' });
    if (target.role === 'super_admin') return res.status(400).json({ error: '对方已是超级管理员' });

    db.transaction(() => {
      db.prepare('UPDATE profiles SET role = ? WHERE id = ?').run('user', req.session.userId);
      db.prepare('UPDATE profiles SET role = ? WHERE id = ?').run('super_admin', uid);
    })();

    res.json({ ok: true, message: `已将超级管理员转让给 ${target.username}` });
  });

  app.get('/api/tags', (req, res) => {
    const rows = db.prepare('SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != \'[]\'').all();
    const tagCount = {};
    rows.forEach(r => {
      const tags = parseJsonField(r.tags, []);
      tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
    });
    const tags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    res.json({ tags });
  });

  // ============================================================
  // 系统设置 API
  // ============================================================

  /** 获取 SMTP 配置（隐藏密码） */
  app.get('/api/admin/smtp', requireAdmin, (req, res) => {
    const host = db.prepare("SELECT value FROM settings WHERE key = 'smtp_host'").get();
    const port = db.prepare("SELECT value FROM settings WHERE key = 'smtp_port'").get();
    const secure = db.prepare("SELECT value FROM settings WHERE key = 'smtp_secure'").get();
    const user = db.prepare("SELECT value FROM settings WHERE key = 'smtp_user'").get();
    const pass = db.prepare("SELECT value FROM settings WHERE key = 'smtp_pass'").get();
    res.json({
      smtp_host: host ? host.value : '',
      smtp_port: port ? port.value : '465',
      smtp_secure: secure ? secure.value === 'true' : true,
      smtp_user: user ? user.value : '',
      smtp_pass: pass ? '********' : '',
      configured: !!(host && user && pass)
    });
  });

  /** 保存 SMTP 配置 */
  app.put('/api/admin/smtp', requireAdmin, (req, res) => {
    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass } = req.body;
    if (!smtp_host || !smtp_user) {
      return res.status(400).json({ error: '请填写 SMTP 主机和用户名' });
    }
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');
    upsert.run('smtp_host', smtp_host, smtp_host);
    upsert.run('smtp_port', smtp_port || '465', smtp_port || '465');
    upsert.run('smtp_secure', smtp_secure ? 'true' : 'false', smtp_secure ? 'true' : 'false');
    upsert.run('smtp_user', smtp_user, smtp_user);
    // 只有输入了新密码才更新
    if (smtp_pass && smtp_pass !== '********') {
      upsert.run('smtp_pass', smtp_pass, smtp_pass);
    }
    res.json({ ok: true, message: 'SMTP 配置已保存' });
  });

  /** 测试 SMTP 连接 */
  app.post('/api/admin/smtp/test', requireAdmin, async (req, res) => {
    const host = db.prepare("SELECT value FROM settings WHERE key = 'smtp_host'").get();
    const port = db.prepare("SELECT value FROM settings WHERE key = 'smtp_port'").get();
    const secure = db.prepare("SELECT value FROM settings WHERE key = 'smtp_secure'").get();
    const user = db.prepare("SELECT value FROM settings WHERE key = 'smtp_user'").get();
    const pass = db.prepare("SELECT value FROM settings WHERE key = 'smtp_pass'").get();

    if (!host || !user || !pass) {
      return res.status(400).json({ error: '请先配置 SMTP 信息' });
    }

    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: host.value,
        port: parseInt(port ? port.value : '465'),
        secure: secure ? secure.value === 'true' : true,
        auth: { user: user.value, pass: pass.value }
      });
      await transporter.verify();
      res.json({ ok: true, message: 'SMTP 连接成功' });
    } catch (err) {
      res.status(400).json({ error: `连接失败: ${err.message}` });
    }
  });

  // ============================================================
  // 版本信息与更新 API
  // ============================================================

  /** 获取当前版本信息 */
  app.get('/api/admin/version', requireAdmin, (req, res) => {
    const pkg = require('../../package.json');
    res.json({
      name: pkg.name,
      version: pkg.version,
      description: pkg.description || 'Flarum 风格的轻量论坛',
      repository: 'https://github.com/parkes-mimir/miforum',
      author: 'parkes-mimir',
      license: pkg.license || 'MIT'
    });
  });

  /** 检查更新（从 GitHub API 获取最新版本） */
  app.get('/api/admin/check-update', requireAdmin, async (req, res) => {
    try {
      const pkg = require('../../package.json');
      const currentVersion = pkg.version;

      const response = await fetch('https://api.github.com/repos/parkes-mimir/miforum/releases/latest', {
        headers: { 'User-Agent': 'MiForum' }
      });

      if (!response.ok) {
        return res.json({ hasUpdate: false, message: '无法获取最新版本信息' });
      }

      const data = await response.json();
      const latestVersion = data.tag_name.replace('v', '');

      // 简单版本比较
      const current = currentVersion.split('.').map(Number);
      const latest = latestVersion.split('.').map(Number);

      let hasUpdate = false;
      for (let i = 0; i < 3; i++) {
        if (latest[i] > current[i]) {
          hasUpdate = true;
          break;
        } else if (latest[i] < current[i]) {
          break;
        }
      }

      res.json({
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseUrl: data.html_url,
        releaseNotes: data.body || '',
        publishedAt: data.published_at
      });
    } catch (err) {
      res.json({ hasUpdate: false, message: '检查更新失败: ' + err.message });
    }
  });

  /** 执行更新（从 GitHub 拉取最新代码） */
  app.post('/api/admin/update', requireSuperAdmin, async (req, res) => {
    try {
      const { execSync } = require('child_process');

      // 备份当前版本
      const backupDir = path.join(__dirname, '../../backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const backupName = `backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
      execSync(`tar -czf ${backupDir}/${backupName} --exclude=node_modules --exclude=data.db --exclude=.git .`, { cwd: path.join(__dirname, '../..') });

      // 拉取最新代码
      execSync('git fetch origin main', { cwd: path.join(__dirname, '../..') });
      execSync('git reset --hard origin/main', { cwd: path.join(__dirname, '../..') });

      // 安装依赖
      execSync('npm install --omit=dev', { cwd: path.join(__dirname, '../..') });

      res.json({
        ok: true,
        message: '更新成功，需要重启服务器才能生效',
        backup: backupName
      });
    } catch (err) {
      res.status(500).json({ error: '更新失败: ' + err.message });
    }
  });
};
