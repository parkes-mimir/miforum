const path = require('path');
const fs = require('fs');
const { requireSuperAdmin: requireSuperAdminFactory } = require('../middleware/auth');

module.exports = function (app, db) {
  const requireSuperAdmin = requireSuperAdminFactory(db);

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

  app.post('/api/admin/update', requireSuperAdmin, async (req, res) => {
    try {
      const { execSync } = require('child_process');
      const https = require('https');
      const projectRoot = path.join(__dirname, '../..');
      const isDocker = !fs.existsSync(path.join(projectRoot, '.git'));

      // 安全检查：确保路径在项目目录内
      function safePath(p) {
        const resolved = path.resolve(p);
        if (!resolved.startsWith(projectRoot)) {
          throw new Error('路径越界: ' + p);
        }
        return resolved;
      }

      const backupDir = safePath(path.join(projectRoot, 'backups'));
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const backupName = `backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
      try {
        const backupFile = safePath(path.join(backupDir, backupName));
        execSync(`tar -czf "${backupFile}" --exclude=node_modules --exclude=data.db --exclude=.git --exclude=backups .`, { cwd: projectRoot, timeout: 30000 });
      } catch (e) {
        console.warn('备份失败，继续更新:', e.message);
      }

      if (isDocker) {
        const pkg = require('../../package.json');
        const repo = 'parkes-mimir/miforum';
        const githubMirror = process.env.GITHUB_MIRROR || '';

        function mirrorUrl(url) {
          if (githubMirror && url.startsWith('https://github.com')) {
            return githubMirror + '/' + url;
          }
          return url;
        }

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

        execSync('tar -xzf update.tar.gz --strip-components=1', { cwd: safePath(tmpDir), timeout: 30000 });

        const copyItems = ['src', 'public', 'package.json', 'package-lock.json', 'tailwind.config.js', 'Dockerfile', '.eslintrc.json'];
        for (const item of copyItems) {
          const src = safePath(path.join(tmpDir, item));
          const dest = safePath(path.join(projectRoot, item));
          if (fs.existsSync(src)) {
            if (fs.statSync(src).isDirectory()) {
              fs.rmSync(dest, { recursive: true, force: true });
              fs.cpSync(src, dest, { recursive: true });
            } else {
              fs.copyFileSync(src, dest);
            }
          }
        }

        fs.rmSync(safePath(tmpDir), { recursive: true, force: true });

        execSync('npm install --omit=dev', { cwd: safePath(projectRoot), timeout: 120000 });

        res.json({
          ok: true,
          message: `已更新到 ${latestTag}，需要重启容器才能生效`,
          backup: backupName,
          version: latestTag
        });
      } else {
        execSync('git pull --rebase origin main', { cwd: safePath(projectRoot), timeout: 60000 });
        execSync('npm install --omit=dev', { cwd: safePath(projectRoot), timeout: 120000 });

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
