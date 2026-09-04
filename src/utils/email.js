/**
 * email.js - 邮件发送模块
 * 优先从数据库读取 SMTP 配置，否则使用环境变量
 */

const nodemailer = require('nodemailer');

let transporter = null;
let lastConfig = null;

/**
 * 从数据库获取 SMTP 配置
 */
function getSmtpConfig(db) {
  const host = db.prepare("SELECT value FROM settings WHERE key = 'smtp_host'").get();
  const port = db.prepare("SELECT value FROM settings WHERE key = 'smtp_port'").get();
  const secure = db.prepare("SELECT value FROM settings WHERE key = 'smtp_secure'").get();
  const user = db.prepare("SELECT value FROM settings WHERE key = 'smtp_user'").get();
  const pass = db.prepare("SELECT value FROM settings WHERE key = 'smtp_pass'").get();

  // 优先使用数据库配置
  if (host && user && pass) {
    return {
      host: host.value,
      port: parseInt(port ? port.value : '465'),
      secure: secure ? secure.value === 'true' : true,
      auth: { user: user.value, pass: pass.value }
    };
  }

  // 回退到环境变量
  return {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  };
}

/**
 * 获取邮件传输器
 */
function getTransporter(db) {
  const config = getSmtpConfig(db);
  const configKey = JSON.stringify(config);

  if (!transporter || lastConfig !== configKey) {
    if (!config.auth.user || !config.auth.pass) {
      throw new Error('SMTP 未配置，请在管理面板配置或设置环境变量');
    }
    transporter = nodemailer.createTransport(config);
    lastConfig = configKey;
  }
  return transporter;
}

/**
 * 生成 6 位验证码（使用密码学安全随机数）
 */
function generateCode() {
  const crypto = require('crypto');
  return String(crypto.randomInt(100000, 999999));
}

/**
 * 发送验证码邮件
 * @param {Object} db 数据库实例
 * @param {string} to 收件人邮箱
 * @param {string} code 验证码
 * @param {string} type 类型（register/reset）
 * @returns {Promise<boolean>}
 */
async function sendVerificationCode(db, to, code, type = 'register') {
  const subject = type === 'reset' ? '密码重置验证码' : '注册验证码';
  const action = type === 'reset' ? '重置密码' : '注册账号';

  const html = `
    <div style="font-family: 'Microsoft YaHei', sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">MiForum</h1>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">您正在进行<strong>${action}</strong>操作，验证码如下：</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <span style="font-size: 28px; font-weight: bold; color: #4f46e5; letter-spacing: 4px;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">验证码 10 分钟内有效，请勿泄露给他人。</p>
      </div>
    </div>
  `;

  try {
    const t = getTransporter(db);
    await t.sendMail({
      from: `"MiForum" <${getSmtpConfig(db).auth.user}>`,
      to,
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error('邮件发送失败:', err.message);
    return false;
  }
}

module.exports = {
  generateCode,
  sendVerificationCode
};
