/**
 * auth.test.js - 认证 API 测试
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

const { createApp, registerRoutes } = require('../src/server');
const { getDb, closeDb } = require('../src/database');

let app;
let db;
let agent;

beforeAll(() => {
  // 使用内存数据库进行测试
  const testDbPath = path.join(__dirname, 'test.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  db = getDb();
  app = createApp();
  registerRoutes(app, db);
  agent = request.agent(app);
});

afterAll(() => {
  closeDb();
  const testDbPath = path.join(__dirname, 'test.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

describe('认证 API', () => {
  const randomSuffix = Date.now();
  const randomEmail = `test-${randomSuffix}@test.com`;
  const randomUsername = `user-${randomSuffix}`;

  test('POST /api/register - 注册成功', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: randomUsername, email: randomEmail, password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('display_id');
    expect(res.body.user.username).toBe(randomUsername);
    expect(res.body.user.email).toBe(randomEmail);
    expect(res.body.user).toHaveProperty('exp');
    expect(res.body.user).toHaveProperty('level_info');
  });

  test('POST /api/register - 用户名过短', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'a', email: 'test2@test.com', password: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('用户名');
  });

  test('POST /api/register - 邮箱格式错误', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'testuser2', email: 'invalid', password: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('邮箱');
  });

  test('POST /api/register - 密码过短', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'testuser2', email: 'test2@test.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('密码');
  });

  test('POST /api/register - 邮箱重复', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'testuser2', email: 'test@test.com', password: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('邮箱已被注册');
  });

  test('POST /api/login - 登录成功', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'test@test.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe('test@test.com');
  });

  test('POST /api/login - 密码错误', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'test@test.com', password: 'wrong' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('邮箱或密码错误');
  });

  test('GET /api/me - 获取用户信息', async () => {
    const loginRes = await request(app)
      .post('/api/login')
      .send({ email: 'test@test.com', password: '123456' });

    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .get('/api/me')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.user).not.toBeNull();
    expect(res.body.user.email).toBe('test@test.com');
    expect(res.body.user).toHaveProperty('level_info');
  });

  test('GET /api/me - 未登录返回 null', async () => {
    const res = await request(app).get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  test('POST /api/logout - 退出成功', async () => {
    const loginRes = await request(app)
      .post('/api/login')
      .send({ email: 'test@test.com', password: '123456' });

    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/logout')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('帖子 API', () => {
  let cookie;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/login')
      .send({ email: 'test@test.com', password: '123456' });
    cookie = loginRes.headers['set-cookie'];
  });

  test('POST /api/posts - 发帖成功', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', cookie)
      .send({ title: '测试帖子', content: '测试内容', category: 'tech' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('postId');
    expect(res.body).toHaveProperty('points');
    expect(res.body).toHaveProperty('exp');
  });

  test('GET /api/posts - 获取帖子列表', async () => {
    const res = await request(app).get('/api/posts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('posts');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('total');
  });

  test('GET /api/posts/:id - 获取帖子详情', async () => {
    const res = await request(app).get('/api/posts/1');

    expect(res.status).toBe(200);
    expect(res.body.post).toHaveProperty('id');
    expect(res.body.post).toHaveProperty('author_level_info');
  });

  test('GET /api/posts/:id - 帖子不存在', async () => {
    const res = await request(app).get('/api/posts/999');

    expect(res.status).toBe(404);
  });
});

describe('商店 API', () => {
  test('GET /api/shop/items - 获取商品列表', async () => {
    const res = await request(app).get('/api/shop/items');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  test('GET /api/leaderboard/level - 等级排行榜', async () => {
    const res = await request(app).get('/api/leaderboard/level');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('leaderboard');
  });
});
