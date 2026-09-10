/**
 * admin-system.js - 系统设置控制器
 *
 * 提供 SMTP 配置、版本信息、检查更新功能，
 * 需要管理员权限。
 */

const { requireAdmin: requireAdminFactory } = require('../middleware/auth');
const { encryptText, decryptText } = require('../utils/helpers');
const { getSmtpRawConfig } = require('../utils/email');

module.exports = function (app, db) {
  const requireAdmin = requireAdminFactory(db);

  app.get('/api/admin/smtp', requireAdmin, (req, res) => {
    const config = getSmtpRawConfig(db);
    res.json({
      smtpHost: config.host,
      smtpPort: config.port,
      smtpSecure: config.secure,
      smtpUser: config.user,
      smtpPass: config.pass,
      configured: config.configured
    });
  });

  app.put('/api/admin/smtp', requireAdmin, (req, res) => {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = req.body;
    if (!smtpHost || !smtpUser) {
      return res.status(400).json({ error: '请填写 SMTP 主机和用户名' });
    }
    const upsert = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
    );
    upsert.run('smtp_host', smtpHost, smtpHost);
    upsert.run('smtp_port', smtpPort || '465', smtpPort || '465');
    upsert.run('smtp_secure', smtpSecure ? 'true' : 'false', smtpSecure ? 'true' : 'false');
    upsert.run('smtp_user', smtpUser, smtpUser);
    if (smtpPass && smtpPass !== '********') {
      upsert.run('smtp_pass', encryptText(smtpPass), encryptText(smtpPass));
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

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let data;
      try {
        const response = await fetch('https://api.github.com/repos/parkes-mimir/miforum/releases/latest', {
          headers: { 'User-Agent': 'MiForum/' + currentVersion },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.status === 403) {
          return res.json({ hasUpdate: false, message: 'GitHub API 请求频率限制，请稍后再试' });
        }
        if (response.status === 404) {
          return res.json({ hasUpdate: false, message: '暂无发布版本' });
        }
        if (!response.ok) {
          return res.json({ hasUpdate: false, message: '无法获取最新版本信息 (HTTP ' + response.status + ')' });
        }
        data = await response.json();
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (fetchErr.name === 'AbortError') {
          return res.json({ hasUpdate: false, message: '请求超时，请检查网络或配置 GITHUB_MIRROR' });
        }
        return res.json({ hasUpdate: false, message: '网络错误: ' + fetchErr.message });
      }

      if (!data.tag_name) {
        return res.json({ hasUpdate: false, message: 'GitHub API 响应格式异常' });
      }

      const latestVersion = data.tag_name.replace(/^v/, '');
      const current = currentVersion.split('.').map(Number);
      const latest = latestVersion.split('.').map(Number);

      let hasUpdate = false;
      for (let i = 0; i < 3; i++) {
        if ((latest[i] || 0) > (current[i] || 0)) {
          hasUpdate = true;
          break;
        } else if ((latest[i] || 0) < (current[i] || 0)) {
          break;
        }
      }

      res.json({
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseUrl: data.html_url || 'https://github.com/parkes-mimir/miforum/releases',
        releaseNotes: (data.body || '').slice(0, 500),
        publishedAt: data.published_at || ''
      });
    } catch (err) {
      res.json({ hasUpdate: false, message: '检查更新失败: ' + err.message });
    }
  });
};
