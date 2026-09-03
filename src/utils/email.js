/**
 * email.js - 邮件发送模块
 * 使用 nodemailer 通过 SMTP 发送验证码
 */

const nodemailer = require('nodemailer');

// SMTP 配置（从环境变量读取）
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false',  // 默认 true
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

// 发件人名称
const FROM_NAME = process.env.SMTP_FROM_NAME || 'MiForum';

let transporter = null;

/**
 * 获取邮件传输器
 */
function getTransporter() {
  if (!transporter) {
    if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
      throw new Error('SMTP 未配置，请设置 SMTP_USER 和 SMTP_PASS 环境变量');
    }
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

/**
 * 生成 6 位验证码
 */
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 发送验证码邮件
 * @param {string} to 收件人邮箱
 * @param {string} code 验证码
 * @param {string} type 类型（register/reset）
 * @returns {Promise<boolean>}
 */
async function sendVerificationCode(to, code, type = 'register') {
  const subject = type === 'reset' ? 'MiForum 密码重置验证码' : 'MiForum 注册验证码';
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
    const t = getTransporter();
    await t.sendMail({
      from: `"${FROM_NAME}" <${SMTP_CONFIG.auth.user}>`,
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
  sendVerificationCode,
  SMTP_CONFIG
};
