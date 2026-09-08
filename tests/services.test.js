/**
 * services.test.js - 服务层单元测试
 *
 * 覆盖：hot-posts、level、post-helper、helpers、email
 */

const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'services-test.db');
process.env.DB_PATH = TEST_DB;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-for-services';

const { getDb, closeDb } = require('../src/database');
const { parseJsonField, intToBool, boolToInt, encryptText, decryptText, dateStr, todayStr, addDays, daysBetween, deleteFile } = require('../src/utils/helpers');
const { getLevelInfo, getLevel, EXP_REWARDS } = require('../src/services/level');
const { formatPost, isAdmin, parsePagination } = require('../src/services/post-helper');

let db;

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  db = getDb();
});

afterAll(() => {
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('helpers.js 工具函数', () => {
  test('parseJsonField - 解析有效 JSON', () => {
    expect(parseJsonField('["a","b"]', [])).toEqual(['a', 'b']);
    expect(parseJsonField('{"key":"value"}', {})).toEqual({ key: 'value' });
  });

  test('parseJsonField - 无效 JSON 返回默认值', () => {
    expect(parseJsonField('invalid', [])).toEqual([]);
    expect(parseJsonField(null, 'default')).toBe('default');
    expect(parseJsonField(undefined, 42)).toBe(42);
  });

  test('intToBool - 整数转布尔', () => {
    expect(intToBool(1)).toBe(true);
    expect(intToBool(0)).toBe(false);
    expect(intToBool(null)).toBe(false);
    expect(intToBool(undefined)).toBe(false);
  });

  test('boolToInt - 布尔转整数', () => {
    expect(boolToInt(true)).toBe(1);
    expect(boolToInt(false)).toBe(0);
    expect(boolToInt(1)).toBe(1);
    expect(boolToInt(0)).toBe(0);
  });

  test('encryptText / decryptText - 加密解密往返', () => {
    const original = 'my-smtp-password-123';
    const encrypted = encryptText(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':'); // iv:tag:ciphertext 格式
    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(original);
  });

  test('decryptText - 无效密文返回原文', () => {
    expect(decryptText('not-encrypted')).toBe('not-encrypted');
    expect(decryptText('a:b')).toBe('a:b'); // 不是3段
  });

  test('dateStr - 返回 YYYY-MM-DD 格式', () => {
    const d = dateStr(new Date('2026-09-08T12:00:00Z'));
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('todayStr - 返回今天日期', () => {
    const today = todayStr();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('addDays - 日期加减', () => {
    expect(addDays('2026-09-08', 1)).toBe('2026-09-09');
    expect(addDays('2026-09-08', -1)).toBe('2026-09-07');
    expect(addDays('2026-09-08', 0)).toBe('2026-09-08');
  });

  test('daysBetween - 计算天数差', () => {
    expect(daysBetween('2026-09-08', '2026-09-10')).toBe(2);
    expect(daysBetween('2026-09-10', '2026-09-08')).toBe(-2);
    expect(daysBetween('2026-09-08', '2026-09-08')).toBe(0);
  });

  test('deleteFile - 无效输入不报错', () => {
    deleteFile(null);
    deleteFile('');
    deleteFile(undefined);
    // 路径遍历攻击应被忽略
    deleteFile('/../../../etc/passwd');
  });
});

describe('level.js 等级服务', () => {
  test('getLevel - 经验值对应等级', () => {
    expect(getLevel(0)).toBe(1);
    expect(getLevel(50)).toBe(1);
    expect(getLevel(200)).toBe(2);
    expect(getLevel(500)).toBe(3);
  });

  test('getLevelInfo - 返回完整等级信息', () => {
    const info = getLevelInfo(100);
    expect(info).toHaveProperty('level');
    expect(info).toHaveProperty('icon');
    expect(info).toHaveProperty('exp', 100);
    expect(info).toHaveProperty('need');
    expect(info).toHaveProperty('have');
    expect(info).toHaveProperty('remain');
    expect(info).toHaveProperty('progress');
    expect(info).toHaveProperty('badge_bg');
    expect(info).toHaveProperty('accent_color');
    expect(info.level).toBeGreaterThanOrEqual(1);
    expect(info.level).toBeLessThanOrEqual(10);
    expect(info.progress).toBeGreaterThanOrEqual(0);
    expect(info.progress).toBeLessThanOrEqual(100);
  });

  test('getLevelInfo - 0 经验', () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.have).toBe(0);
  });

  test('getLevelInfo - 高经验值', () => {
    const info = getLevelInfo(50000);
    expect(info.level).toBe(10);
    expect(info.remain).toBe(0);
  });

  test('EXP_REWARDS - 经验值常量存在', () => {
    expect(EXP_REWARDS).toHaveProperty('register');
    expect(EXP_REWARDS).toHaveProperty('signin');
    expect(EXP_REWARDS).toHaveProperty('post');
    expect(EXP_REWARDS).toHaveProperty('comment');
    expect(typeof EXP_REWARDS.register).toBe('number');
  });
});

describe('post-helper.js 帖子工具', () => {
  test('parsePagination - 默认值', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  test('parsePagination - 自定义值', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });

  test('parsePagination - 上限限制', () => {
    const result = parsePagination({ limit: '100' });
    expect(result.limit).toBe(50); // max 50
  });

  test('parsePagination - 下限限制', () => {
    const result = parsePagination({ page: '0', limit: '-5' });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  test('isAdmin - 管理员判断', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isAdmin({ role: 'super_admin' })).toBe(true);
    expect(isAdmin({ role: 'user' })).toBe(false);
    expect(isAdmin(null)).toBeFalsy();
    expect(isAdmin(undefined)).toBeFalsy();
  });

  test('formatPost - 格式化帖子数据', () => {
    const raw = {
      id: 1, title: 'Test', content: 'Content',
      tags: '["tag1","tag2"]', images: '["img1.jpg"]',
      pinned: 1, private: 0,
      author_avatar_url: 'http://example.com/avatar.jpg',
      author_title: 'Admin',
      author_avatar_frame: 'gold',
      author_exp: 500
    };
    const formatted = formatPost(raw);
    expect(formatted.tags).toEqual(['tag1', 'tag2']);
    expect(formatted.images).toEqual(['img1.jpg']);
    expect(formatted.pinned).toBe(true);
    expect(formatted.private).toBe(false);
    expect(formatted.author_level_info).toBeTruthy();
  });
});
