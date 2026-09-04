const request = require('supertest');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, 'api-test.db');
process.env.DB_PATH = TEST_DB;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

const { createApp, registerRoutes } = require('../src/server');
const { getDb, closeDb } = require('../src/database');

let app, db;
let userAgent, adminAgent;
let userId, postId, commentId;

const randomSuffix = String(Date.now()).slice(-6);
const randomEmail = `at-${randomSuffix}@test.com`;
const randomUsername = `au${randomSuffix}`;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  db = getDb();
  app = createApp();
  registerRoutes(app, db);

  await request(app)
    .post('/api/register')
    .send({ username: randomUsername, email: randomEmail, password: '123456' });

  userAgent = request.agent(app);
  await userAgent.post('/api/login').send({ email: randomEmail, password: '123456' });

  const meRes = await userAgent.get('/api/me');
  userId = meRes.body.user?.id;

  adminAgent = request.agent(app);
  const adminLogin = await adminAgent
    .post('/api/login')
    .send({ email: 'root@miforum.local', password: '123456' });

  if (adminLogin.body.user?.force_password_change) {
    await adminAgent
      .post('/api/change-password')
      .send({ old_password: '123456', new_password: 'admin123' });
    await adminAgent
      .post('/api/login')
      .send({ email: 'root@miforum.local', password: 'admin123' });
  }
});

afterAll(() => {
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('帖子高级功能', () => {
  test('POST /api/posts - 创建帖子', async () => {
    const res = await userAgent.post('/api/posts').send({ title: 'ApiTest Post', content: 'Content for search', category: 'tech', tags: ['js', 'search'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('postId');
    postId = res.body.postId;
  });

  test('GET /api/posts - 搜索帖子', async () => {
    const res = await request(app).get('/api/posts?search=ApiTest');
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeGreaterThan(0);
    expect(res.body.posts.some(p => p.title.includes('ApiTest'))).toBe(true);
  });

  test('GET /api/posts - 分类筛选', async () => {
    const res = await request(app).get('/api/posts?category=tech');
    expect(res.status).toBe(200);
    expect(res.body.posts.every(p => p.category === 'tech')).toBe(true);
  });

  test('GET /api/posts - 标签筛选', async () => {
    const res = await request(app).get('/api/posts?tag=search');
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeGreaterThan(0);
  });

  test('GET /api/posts - 分页参数上限校验', async () => {
    const res = await request(app).get('/api/posts?page=0&limit=100');
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBeLessThanOrEqual(50);
  });

  test('GET /api/posts - 空搜索返回空', async () => {
    const res = await request(app).get('/api/posts?search=nonexistent_xyz_12345');
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBe(0);
  });
});

describe('评论高级功能', () => {
  test('POST /api/posts/:id/comments - 创建评论', async () => {
    const res = await userAgent.post(`/api/posts/${postId}/comments`).send({ content: 'Advanced test comment' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('commentId');
    commentId = res.body.commentId;
  });

  test('GET /api/posts/:id/comments - 分页', async () => {
    const res = await request(app).get(`/api/posts/${postId}/comments?page=1&limit=10`);
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('pages');
  });

  test('PUT /api/comments/:id/pin - 置顶评论', async () => {
    const res = await userAgent.put(`/api/comments/${commentId}/pin`);
    expect(res.status).toBe(200);
    expect(res.body.pinned).toBe(true);
  });

  test('DELETE /api/comments/:id - 删除评论', async () => {
    const res = await userAgent.delete(`/api/comments/${commentId}`);
    expect(res.status).toBe(200);
  });
});

describe('商店高级功能', () => {
  test('POST /api/shop/exchange - 商品不存在', async () => {
    const res = await userAgent.post('/api/shop/exchange').send({ itemId: 99999 });
    expect(res.status).toBe(404);
  });

  test('POST /api/shop/exchange - 缺少商品ID', async () => {
    const res = await userAgent.post('/api/shop/exchange').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/shop/equip - 未购买', async () => {
    const items = await request(app).get('/api/shop/items');
    const titleItem = items.body.items.find(i => i.type === 'title');
    if (titleItem) {
      const res = await userAgent.post('/api/shop/equip').send({ itemId: titleItem.id });
      expect(res.status).toBe(403);
    }
  });

  test('POST /api/shop/unequip - 无效类型', async () => {
    const res = await userAgent.post('/api/shop/unequip').send({ type: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('GET /api/shop/orders - 订单列表', async () => {
    const res = await userAgent.get('/api/shop/orders');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
  });
});

describe('管理员高级功能', () => {
  test('PUT /api/admin/users/:id/points/add - 奖励积分', async () => {
    const res = await adminAgent.put(`/api/admin/users/${userId}/points/add`).send({ amount: 50, reason: 'test reward' });
    expect(res.status).toBe(200);
    expect(res.body.points).toBeGreaterThanOrEqual(50);
  });

  test('PUT /api/admin/users/:id/points/add - 无效金额(负数)', async () => {
    const res = await adminAgent.put(`/api/admin/users/${userId}/points/add`).send({ amount: -1 });
    expect(res.status).toBe(400);
  });

  test('PUT /api/admin/users/:id/points/add - 无效金额(零)', async () => {
    const res = await adminAgent.put(`/api/admin/users/${userId}/points/add`).send({ amount: 0 });
    expect(res.status).toBe(400);
  });

  test('POST /api/categories - 创建分类', async () => {
    const res = await adminAgent.post('/api/categories').send({ name: 'apitestcat', label: 'APITest Category' });
    expect(res.status).toBe(200);
    expect(res.body.category).toHaveProperty('id');
  });

  test('POST /api/categories - 重复分类', async () => {
    const res = await adminAgent.post('/api/categories').send({ name: 'apitestcat', label: 'Duplicate' });
    expect(res.status).toBe(400);
  });

  test('PUT /api/categories/:id - 更新分类', async () => {
    const cats = await request(app).get('/api/categories');
    const cat = cats.body.categories.find(c => c.name === 'apitestcat');
    if (cat) {
      const res = await adminAgent.put(`/api/categories/${cat.id}`).send({ label: 'Updated Label' });
      expect(res.status).toBe(200);
      expect(res.body.category.label).toBe('Updated Label');
    }
  });

  test('DELETE /api/categories/:id - 删除分类', async () => {
    const cats = await request(app).get('/api/categories');
    const cat = cats.body.categories.find(c => c.name === 'apitestcat');
    if (cat) {
      const res = await adminAgent.delete(`/api/categories/${cat.id}`);
      expect(res.status).toBe(200);
    }
  });

  test('GET /api/leaderboard/level - 排行榜', async () => {
    const res = await request(app).get('/api/leaderboard/level');
    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toBeDefined();
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
  });
});

describe('安全测试补充', () => {
  test('CSRF - 跨域 POST 被拒绝', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Origin', 'https://evil.com')
      .send({ title: 'xss', content: 'xss' });
    expect(res.status).toBe(403);
  });

  test('速率限制头存在', async () => {
    const res = await request(app).get('/api/posts');
    const hasRateLimitHeader = res.headers['ratelimit-limit'] !== undefined
      || res.headers['ratelimit-remaining'] !== undefined
      || res.headers['x-ratelimit-limit'] !== undefined;
    expect(hasRateLimitHeader).toBe(true);
  });
});
