/**
 * helpers.js - 通用工具函数
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENC_ALGO = 'aes-256-gcm';
function getEncKey() {
  const secret = process.env.SESSION_SECRET || 'miforum-default-key-change-me';
  return crypto.createHash('sha256').update(secret).digest();
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
  try { return JSON.parse(val); } catch (e) { return fallback; }
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
 * 日期转字符串（YYYY-MM-DD）
 * @param {Date|string} d
 * @returns {string}
 */
function dateStr(d) {
  return new Date(d).toLocaleDateString('sv-SE');
}

/**
 * 获取今天的日期字符串
 * @returns {string}
 */
function todayStr() {
  return dateStr(new Date());
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

function sanitizeText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
  decryptText,
  sanitizeText
};
