const path = require('path');
const fs = require('fs');
const { requireAuth, requireAdmin: requireAdminFactory, requireSuperAdmin: requireSuperAdminFactory } = require('../middleware/auth');
const { deleteImages, intToBool, parseJsonField, encryptText, decryptText } = require('../utils/helpers');

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

  /** 增加用户积分（奖励/补偿） */
  app.put('/api/admin/users/:id/points/add', requireAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT id, points FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const { amount, reason } = req.body;
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: '积分必须为正数' });
    if (amount > 10000) return res.status(400).json({ error: '单次最多增加 10000 积分' });
    db.prepare('UPDATE profiles SET points = points + ? WHERE id = ?').run(amount, uid);
    const updated = db.prepare('SELECT points FROM profiles WHERE id = ?').get(uid);
    res.json({ ok: true, points: updated.points, message: `已奖励 ${amount} 积分${reason ? '：' + reason : ''}` });
  });

  app.get('/api/categories', (req, res) => {
    const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json({ categories: cats.map(c => ({ id: c.id, name: c.name, label: c.label, description: c.description || '', color: c.color, icon: c.icon || '', section_type: c.section_type || 'normal', order: c.sort_order, created_by: c.created_by })) });
  });

  app.post('/api/categories', requireAdmin, (req, res) => {
    const { name, label, description, color, icon, section_type } = req.body;
    if (!name || !label) return res.status(400).json({ error: '请填写分类标识和名称' });
    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ error: '分类标识已存在' });

    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get();
    const order = (maxOrder.m || 0) + 1;
    const type = section_type || 'normal';

    const result = db.prepare(`
      INSERT INTO categories (name, label, description, color, icon, section_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name.slice(0, 20), label, description || '', color || 'bg-gray-100 text-gray-700', icon || '', type, order);

    res.json({ ok: true, category: { id: result.lastInsertRowid, name: name.slice(0, 20), label, description: description || '', color: color || 'bg-gray-100 text-gray-700', icon: icon || '', section_type: type, order } });
  });

  /** 用户创建普通板块 */
  app.post('/api/categories/user', requireAuth, (req, res) => {
    const { name, label, description, color, icon } = req.body;
    if (!name || !label) return res.status(400).json({ error: '请填写板块标识和名称' });
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return res.status(400).json({ error: '板块标识只能包含英文、数字、下划线' });
    if (name.length < 2 || name.length > 20) return res.status(400).json({ error: '板块标识2-20字符' });
    if (label.length < 1 || label.length > 10) return res.status(400).json({ error: '板块名称1-10字' });

    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ error: '板块标识已存在' });

    // 检查用户创建数量限制（每人最多5个）
    const userCats = db.prepare('SELECT COUNT(*) as count FROM categories WHERE created_by = ?').get(req.session.userId);
    if (userCats.count >= 5) return res.status(400).json({ error: '每人最多创建5个板块' });

    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get();
    const order = (maxOrder.m || 0) + 1;

    const result = db.prepare(`
      INSERT INTO categories (name, label, description, color, icon, section_type, created_by, sort_order) VALUES (?, ?, ?, ?, ?, 'normal', ?, ?)
    `).run(name.slice(0, 20), label, description || '', color || 'bg-gray-100 text-gray-700', icon || '', req.session.userId, order);

    res.json({ ok: true, category: { id: result.lastInsertRowid, name: name.slice(0, 20), label, description: description || '', color: color || 'bg-gray-100 text-gray-700', icon: icon || '', section_type: 'normal', order } });
  });

  app.put('/api/categories/:id', requireAdmin, (req, res) => {
    const { label, description, color, icon, order } = req.body;
    const cid = Number(req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
    if (!cat) return res.status(404).json({ error: '分类不存在' });

    db.prepare('UPDATE categories SET label = ?, description = ?, color = ?, icon = ?, sort_order = ? WHERE id = ?')
      .run(label || cat.label, description !== undefined ? description : cat.description, color || cat.color, icon !== undefined ? icon : cat.icon, order !== undefined ? Number(order) : cat.sort_order, cid);

    res.json({ ok: true, category: { id: cid, name: cat.name, label: label || cat.label, description: description !== undefined ? description : cat.description, color: color || cat.color, icon: icon !== undefined ? icon : cat.icon, order: order !== undefined ? Number(order) : cat.sort_order } });
  });

  app.delete('/api/categories/:id', requireAdmin, (req, res) => {
    const cid = Number(req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(cid);
    if (!cat) return res.status(404).json({ error: '分类不存在' });
    if (cat.section_type === 'announcement' || cat.section_type === 'hot') {
      return res.status(400).json({ error: '特殊板块不可删除' });
    }

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
      upsert.run('smtp_pass', encryptText(smtp_pass), encryptText(smtp_pass));
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
        auth: { user: user.value, pass: decryptText(pass.value) }
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
      const https = require('https');
      const projectRoot = path.join(__dirname, '../..');
      const isDocker = !fs.existsSync(path.join(projectRoot, '.git'));

      // 备份当前版本
      const backupDir = path.join(projectRoot, 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const backupName = `backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
      try {
        execSync(`tar -czf ${backupDir}/${backupName} --exclude=node_modules --exclude=data.db --exclude=.git --exclude=backups .`, { cwd: projectRoot, timeout: 30000 });
      } catch (e) {
        console.warn('备份失败，继续更新:', e.message);
      }

      if (isDocker) {
        // Docker 环境：从 GitHub 下载最新 release 源码包
        const pkg = require('../../package.json');
        const repo = 'parkes-mimir/miforum';
        const githubMirror = process.env.GITHUB_MIRROR || ''; // 可配置镜像，如 https://ghproxy.com

        // 构建镜像 URL
        function mirrorUrl(url) {
          if (githubMirror && url.startsWith('https://github.com')) {
            return githubMirror + '/' + url;
          }
          return url;
        }

        // 获取最新 release 信息
        const releaseData = await new Promise((resolve, reject) => {
          const apiUrl = mirrorUrl(`https://api.github.com/repos/${repo}/releases/latest`);
          const req = https.get(apiUrl, {
            headers: { 'User-Agent': 'MiForum/' + pkg.version },
            timeout: 15000
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              if (res.statusCode !== 200) return reject(new Error('无法获取最新版本信息'));
              resolve(JSON.parse(data));
            });
          });
          req.on('error', reject);
          req.setTimeout(15000, () => { req.destroy(); reject(new Error('请求超时，请检查网络或配置 GITHUB_MIRROR 环境变量')); });
        });

        const latestTag = releaseData.tag_name;
        const tarUrl = mirrorUrl(`https://github.com/${repo}/archive/refs/tags/${latestTag}.tar.gz`);

        // 下载并解压到临时目录
        const tmpDir = path.join(projectRoot, '.update-tmp');
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
        fs.mkdirSync(tmpDir, { recursive: true });

        await new Promise((resolve, reject) => {
          const file = fs.createWriteStream(path.join(tmpDir, 'update.tar.gz'));
          https.get(tarUrl, { headers: { 'User-Agent': 'MiForum' } }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
              https.get(response.headers.location, { headers: { 'User-Agent': 'MiForum' } }, (res2) => {
                res2.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
              }).on('error', reject);
            } else {
              response.pipe(file);
              file.on('finish', () => { file.close(); resolve(); });
            }
          }).on('error', reject);
          file.on('error', reject);
        });

        // 解压
        execSync('tar -xzf update.tar.gz --strip-components=1', { cwd: tmpDir, timeout: 30000 });

        // 覆盖源码文件（不动 data.db、uploads、.env、node_modules）
        const copyItems = ['src', 'public', 'package.json', 'package-lock.json', 'tailwind.config.js', 'Dockerfile', '.eslintrc.json'];
        for (const item of copyItems) {
          const src = path.join(tmpDir, item);
          const dest = path.join(projectRoot, item);
          if (fs.existsSync(src)) {
            if (fs.statSync(src).isDirectory()) {
              execSync(`rm -rf "${dest}" && cp -r "${src}" "${dest}"`, { timeout: 15000 });
            } else {
              fs.copyFileSync(src, dest);
            }
          }
        }

        // 清理临时目录
        fs.rmSync(tmpDir, { recursive: true, force: true });

        // 安装依赖
        execSync('npm install --omit=dev', { cwd: projectRoot, timeout: 120000 });

        res.json({
          ok: true,
          message: `已更新到 ${latestTag}，需要重启容器才能生效`,
          backup: backupName,
          version: latestTag
        });
      } else {
        // Git 环境：使用 git pull
        execSync('git pull --rebase origin main', { cwd: projectRoot, timeout: 60000 });
        execSync('npm install --omit=dev', { cwd: projectRoot, timeout: 120000 });

        res.json({
          ok: true,
          message: '更新成功，需要重启服务器才能生效',
          backup: backupName
        });
      }
    } catch (err) {
      res.status(500).json({ error: '更新失败: ' + err.message });
    }
  });
};
