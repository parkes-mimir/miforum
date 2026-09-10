/**
 * helpers.js - 通用工具函数
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 加密配置（AES-256-GCM）
const ENC_ALGO = 'aes-256-gcm';
let _encKey = null;

/**
 * 获取加密密钥（从 SESSION_SECRET 派生）
 * @throws {Error} SESSION_SECRET 未设置时抛出错误
 */
function getEncKey() {
  if (!_encKey) {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      // 生成随机密钥并警告（不使用硬编码字符串）
      console.error(
        '  ⚠ 警告: SESSION_SECRET 未设置，SMTP 密码加密使用随机密钥！重启后已加密的密码将无法解密。请在 .env 中设置 SESSION_SECRET'
      );
      _encKey = crypto.randomBytes(32);
    } else {
      _encKey = crypto.createHash('sha256').update(secret).digest();
    }
  }
  return _encKey;
}

function encryptText(text) {
  const key = getEncKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + tag + ':' + encrypted;
}

function decryptText(encrypted) {
  try {
    const key = getEncKey();
    const parts = encrypted.split(':');
    if (parts.length !== 3) return encrypted;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(parts[2], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encrypted;
  }
}

// 上传目录路径（支持环境变量配置）
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(__dirname, '../../uploads');

/**
 * 安全删除文件（防止路径遍历攻击）
 * @param {string} url 文件路径（如 /uploads/xxx.png）
 */
function deleteFile(url) {
  if (!url || typeof url !== 'string') return;
  const filePath = path.join(__dirname, '../..', url);
  const resolved = path.resolve(filePath);
  const uploadsDir = path.resolve(UPLOADS_DIR);
  if (!resolved.startsWith(uploadsDir + path.sep)) return;
  if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
}

/**
 * 批量删除图片文件
 * @param {string[]} images 图片路径数组
 */
function deleteImages(images) {
  if (images && Array.isArray(images)) images.forEach(deleteFile);
}

/**
 * 安全解析 JSON 字段
 * @param {*} val 数据库值
 * @param {*} fallback 默认值
 * @returns {*}
 */
function parseJsonField(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (Array.isArray(val) || typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

/**
 * 布尔值转整数
 * @param {boolean} v
 * @returns {number}
 */
function boolToInt(v) {
  return v ? 1 : 0;
}

/**
 * 整数转布尔值
 * @param {number|boolean} v
 * @returns {boolean}
 */
function intToBool(v) {
  return v === 1 || v === true;
}

/**
 * 日期转 YYYY-MM-DD 字符串
 * @param {string|Date} d - 日期
 * @returns {string}
 */
function dateStr(d) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 获取今天的日期字符串（支持时区偏移）
 * 环境变量 TZ_OFFSET 设置小时偏移，如 '+8' 表示东八区
 * @returns {string}
 */
function todayStr() {
  const offset = process.env.TZ_OFFSET || '+8';
  const hours = parseInt(offset, 10);
  const now = new Date(Date.now() + hours * 3600000);
  return now.toISOString().slice(0, 10);
}

/**
 * 日期加减天数（UTC 避免时区问题）
 * @param {string} dateStrIn 日期字符串
 * @param {number} n 天数（负数为减）
 * @returns {string}
 */
function addDays(dateStrIn, n) {
  const [y, m, d] = dateStrIn.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * 两个日期之间的天数差
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function daysBetween(a, b) {
  return Math.floor((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}

module.exports = {
  UPLOADS_DIR,
  deleteFile,
  deleteImages,
  parseJsonField,
  boolToInt,
  intToBool,
  dateStr,
  todayStr,
  addDays,
  daysBetween,
  encryptText,
  decryptText
};
