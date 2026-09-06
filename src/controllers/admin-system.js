const { requireAdmin: requireAdminFactory } = require('../middleware/auth');
const { encryptText, decryptText } = require('../utils/helpers');

module.exports = function (app, db) {
  const requireAdmin = requireAdminFactory(db);

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
    if (smtp_pass && smtp_pass !== '********') {
      upsert.run('smtp_pass', encryptText(smtp_pass), encryptText(smtp_pass));
    }
    res.json({ ok: true, message: 'SMTP 配置已保存' });
  });

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
};
