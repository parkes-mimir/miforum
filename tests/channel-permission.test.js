const request = require('supertest');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'test-channel.db');
process.env.DB_PATH = TEST_DB;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

const { createApp, registerRoutes } = require('../src/server');
const { getDb, closeDb } = require('../src/database');

let app;
let db;
let userAgent;
let adminAgent;

beforeAll(async () => {
  const testDbPath = path.join(__dirname, 'test-channel.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  db = getDb();
  app = createApp();
  registerRoutes(app, db);

  userAgent = request.agent(app);
  adminAgent = request.agent(app);

  // 登录管理员
  await adminAgent.post('/api/login').send({ email: 'root@miforum.local', password: '123456' });

  // 注册普通用户
  await request(app)
    .post('/api/register')
    .send({ username: 'testuser', email: 'testuser@test.com', password: '123456' });

  await userAgent.post('/api/login').send({ email: 'testuser@test.com', password: '123456' });
});

afterAll(() => {
  closeDb();
  const testDbPath = path.join(__dirname, 'test-channel.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

describe('创建频道权限限制', () => {
  test('新用户签到和积分不足时无法创建频道', async () => {
    const res = await userAgent.post('/api/channels').send({ name: 'testchannel', label: '测试频道' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('签到天数不足');
  });

  test('签到满10天但积分不足时无法创建频道', async () => {
    const userId = db.prepare('SELECT id FROM profiles WHERE email = ?').get('testuser@test.com').id;

    // 插入10条签到记录
    for (let i = 1; i <= 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      db.prepare('INSERT OR IGNORE INTO check_ins (user_id, check_in_date) VALUES (?, ?)').run(userId, dateStr);
    }

    const res = await userAgent.post('/api/channels').send({ name: 'testchannel', label: '测试频道' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('积分不足');
  });

  test('签到满10天且积分>=500时可以创建频道', async () => {
    const userId = db.prepare('SELECT id FROM profiles WHERE email = ?').get('testuser@test.com').id;

    // 设置积分到500
    db.prepare('UPDATE profiles SET points = 500 WHERE id = ?').run(userId);

    const res = await userAgent.post('/api/channels').send({ name: 'testchannel', label: '测试频道' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.channel.name).toBe('testchannel');

    // 验证积分被扣除
    const updatedUser = db.prepare('SELECT points FROM profiles WHERE id = ?').get(userId);
    expect(updatedUser.points).toBe(0);
  });

  test('管理员同样受限制', async () => {
    const res = await adminAgent.post('/api/channels').send({ name: 'adminchannel', label: '管理员频道' });

    // 管理员默认没有签到记录，应该被拒绝
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('签到天数不足');
  });
});
