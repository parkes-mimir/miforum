/**
 * auth.test.js - MiForum API 全面测试
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
let userAgent;
let adminAgent;

const randomSuffix = Date.now();
const randomEmail = `test-${randomSuffix}@test.com`;
const randomUsername = `user-${randomSuffix}`;

// 存储测试数据
let userId = null;
let postId = null;
let commentId = null;

beforeAll(async () => {
  const testDbPath = path.join(__dirname, 'test.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  db = getDb();
  app = createApp();
  registerRoutes(app, db);

  // 注册测试用户
  await request(app)
    .post('/api/register')
    .send({ username: randomUsername, email: randomEmail, password: '123456' });

  // 创建用户 agent（保持 cookie）
  userAgent = request.agent(app);
  await userAgent
    .post('/api/login')
    .send({ email: randomEmail, password: '123456' });

  // 创建管理员 agent
  adminAgent = request.agent(app);
  const adminLogin = await adminAgent
    .post('/api/login')
    .send({ email: 'root@miforum.local', password: '123456' });
  
  // 如果超管需要改密，先改密再重新登录
  if (adminLogin.body.user?.force_password_change) {
    await adminAgent
      .post('/api/change-password')
      .send({ old_password: '123456', new_password: 'admin123' });
    await adminAgent
      .post('/api/login')
      .send({ email: 'root@miforum.local', password: 'admin123' });
  }

  // 获取用户ID
  const meRes = await userAgent.get('/api/me');
  userId = meRes.body.user?.id;
});

afterAll(() => {
  closeDb();
  const testDbPath = path.join(__dirname, 'test.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

// ============================================================
// 认证 API
// ============================================================
describe('认证 API', () => {
  test('POST /api/register - 注册成功', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'newuser', email: `new-${randomSuffix}@test.com`, password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('display_id');
    expect(res.body.user).toHaveProperty('exp');
    expect(res.body.user).toHaveProperty('level_info');
  });

  test('POST /api/register - 用户名过短', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'a', email: 'a@t.com', password: '123456' });
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
      .send({ username: 'testuser2', email: 't@t.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('密码');
  });

  test('POST /api/register - 邮箱重复', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'testuser2', email: randomEmail, password: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('邮箱已被注册');
  });

  test('POST /api/login - 登录成功', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: randomEmail, password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(randomEmail);
    expect(res.body.user).toHaveProperty('force_password_change');
  });

  test('POST /api/login - 密码错误', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: randomEmail, password: 'wrong' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('邮箱或密码错误');
  });

  test('GET /api/me - 获取用户信息', async () => {
    const res = await userAgent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.user).not.toBeNull();
    expect(res.body.user.email).toBe(randomEmail);
    expect(res.body.user).toHaveProperty('level_info');
    expect(res.body.user).toHaveProperty('display_id');
  });

  test('GET /api/me - 未登录返回 null', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  test('POST /api/logout - 退出成功', async () => {
    const agent = request.agent(app);
    await agent.post('/api/login').send({ email: randomEmail, password: '123456' });
    const res = await agent.post('/api/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ============================================================
// 签到 API
// ============================================================
describe('签到 API', () => {
  test('POST /api/checkin/auto - 自动签到', async () => {
    const res = await userAgent.post('/api/checkin/auto');
    expect(res.status).toBe(200);
    expect(res.body.checkedIn).toBe(true);
    expect(res.body).toHaveProperty('points');
    expect(res.body).toHaveProperty('exp');
  });

  test('POST /api/checkin/auto - 重复签到', async () => {
    const res = await userAgent.post('/api/checkin/auto');
    expect(res.status).toBe(200);
    expect(res.body.newCheckin).toBe(false);
  });

  test('GET /api/checkin/today - 今日签到状态', async () => {
    const res = await userAgent.get('/api/checkin/today');
    expect(res.status).toBe(200);
    expect(res.body.checkedIn).toBe(true);
  });

  test('GET /api/checkin/history - 签到历史', async () => {
    const res = await userAgent.get('/api/checkin/history');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('checkinDates');
    expect(res.body).toHaveProperty('currentStreak');
    expect(res.body).toHaveProperty('totalDays');
  });
});

// ============================================================
// 帖子 API
// ============================================================
describe('帖子 API', () => {
  test('POST /api/posts - 发帖成功', async () => {
    const res = await userAgent
      .post('/api/posts')
      .send({ title: '测试帖子', content: '测试内容', category: 'tech', tags: ['js', 'test'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('postId');
    expect(res.body).toHaveProperty('points');
    expect(res.body).toHaveProperty('exp');
    postId = res.body.postId;
  });

  test('POST /api/posts - 未登录', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ title: 'test', content: 'test' });
    expect(res.status).toBe(401);
  });

  test('GET /api/posts - 帖子列表', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('posts');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('total');
  });

  test('GET /api/posts - 分页', async () => {
    const res = await request(app).get('/api/posts?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.limit).toBe(1);
  });

  test('GET /api/posts/:id - 帖子详情', async () => {
    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.post).toHaveProperty('id');
    expect(res.body.post).toHaveProperty('author_level_info');
    expect(res.body.post).toHaveProperty('author_display_id');
  });

  test('GET /api/posts/:id - 帖子不存在', async () => {
    const res = await request(app).get('/api/posts/999');
    expect(res.status).toBe(404);
  });

  test('PUT /api/posts/:id - 编辑帖子', async () => {
    const res = await userAgent
      .put(`/api/posts/${postId}`)
      .send({ title: '修改后标题', content: '修改后内容', category: 'life' });
    expect(res.status).toBe(200);
  });
});

// ============================================================
// 评论 API
// ============================================================
describe('评论 API', () => {
  test('POST /api/posts/:id/comments - 发评论', async () => {
    const res = await userAgent
      .post(`/api/posts/${postId}/comments`)
      .send({ content: '好帖子！' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('commentId');
    commentId = res.body.commentId;
  });

  test('POST /api/posts/:id/comments - 帖子不存在', async () => {
    const res = await userAgent
      .post('/api/posts/999/comments')
      .send({ content: 'test' });
    expect(res.status).toBe(404);
  });

  test('GET /api/posts/:id/comments - 评论列表', async () => {
    const res = await request(app).get(`/api/posts/${postId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('comments');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.comments.length).toBeGreaterThan(0);
  });

  test('PUT /api/comments/:id - 编辑评论', async () => {
    const res = await userAgent
      .put(`/api/comments/${commentId}`)
      .send({ content: '修改后评论' });
    expect(res.status).toBe(200);
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

// ============================================================
// 点赞/收藏 API
// ============================================================
describe('点赞/收藏 API', () => {
  test('POST /api/like/:id - 点赞', async () => {
    const res = await userAgent.post(`/api/like/${postId}`);
    expect(res.status).toBe(200);
  });

  test('POST /api/like/:id - 重复点赞', async () => {
    const res = await userAgent.post(`/api/like/${postId}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('已点赞');
  });

  test('GET /api/likes - 点赞列表', async () => {
    const res = await userAgent.get('/api/likes');
    expect(res.status).toBe(200);
    expect(res.body.ids).toContain(postId);
  });

  test('DELETE /api/like/:id - 取消点赞', async () => {
    const res = await userAgent.delete(`/api/like/${postId}`);
    expect(res.status).toBe(200);
  });

  test('POST /api/bookmark/:id - 收藏', async () => {
    const res = await userAgent.post(`/api/bookmark/${postId}`);
    expect(res.status).toBe(200);
  });

  test('GET /api/bookmark/:id - 检查收藏', async () => {
    const res = await userAgent.get(`/api/bookmark/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.isBookmarked).toBe(true);
  });

  test('GET /api/bookmarks - 收藏列表', async () => {
    const res = await userAgent.get('/api/bookmarks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('posts');
    expect(res.body).toHaveProperty('pagination');
  });

  test('DELETE /api/bookmark/:id - 取消收藏', async () => {
    const res = await userAgent.delete(`/api/bookmark/${postId}`);
    expect(res.status).toBe(200);
  });
});

// ============================================================
// 商店 API
// ============================================================
describe('商店 API', () => {
  test('GET /api/shop/items - 商品列表', async () => {
    const res = await request(app).get('/api/shop/items');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  test('GET /api/shop/items/:id - 商品详情', async () => {
    const res = await request(app).get('/api/shop/items/1');
    expect(res.status).toBe(200);
    expect(res.body.item).toHaveProperty('name');
  });

  test('POST /api/shop/exchange - 积分不足', async () => {
    const res = await userAgent
      .post('/api/shop/exchange')
      .send({ itemId: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('积分');
  });

  test('POST /api/shop/exchange - 商品不存在', async () => {
    const res = await userAgent
      .post('/api/shop/exchange')
      .send({ itemId: 999 });
    expect(res.status).toBe(404);
  });
});

// ============================================================
// 用户资料 API
// ============================================================
describe('用户资料 API', () => {
  test('GET /api/users/:id - 用户资料', async () => {
    const res = await request(app).get(`/api/users/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('display_id');
    expect(res.body.user).toHaveProperty('level_info');
  });

  test('GET /api/users/:id - 用户不存在', async () => {
    const res = await request(app).get('/api/users/999');
    expect(res.status).toBe(404);
  });

  test('GET /api/users/:id/posts - 用户帖子', async () => {
    const res = await request(app).get(`/api/users/${userId}/posts`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('posts');
    expect(res.body).toHaveProperty('pagination');
  });
});

// ============================================================
// 标签/分类 API
// ============================================================
describe('标签/分类 API', () => {
  test('GET /api/tags - 标签列表', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tags');
  });

  test('GET /api/categories - 分类列表', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 管理员 API
// ============================================================
describe('管理员 API', () => {
  test('GET /api/admin/status - 管理员状态', async () => {
    const res = await adminAgent.get('/api/admin/status');
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);
  });

  test('GET /api/admin/users - 用户列表', async () => {
    const res = await adminAgent.get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body.users[0]).toHaveProperty('display_id');
  });

  test('PUT /api/admin/users/:id/mute - 禁言', async () => {
    const res = await adminAgent.put(`/api/admin/users/${userId}/mute`);
    expect(res.status).toBe(200);
    expect(res.body.muted).toBe(true);
  });

  test('PUT /api/admin/users/:id/mute - 取消禁言', async () => {
    const res = await adminAgent.put(`/api/admin/users/${userId}/mute`);
    expect(res.status).toBe(200);
    expect(res.body.muted).toBe(false);
  });

  test('PUT /api/admin/users/:id/points - 设置积分', async () => {
    const res = await adminAgent
      .put(`/api/admin/users/${userId}/points`)
      .send({ points: 500 });
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(500);
  });

  test('GET /api/leaderboard/level - 等级排行榜', async () => {
    const res = await request(app).get('/api/leaderboard/level');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('leaderboard');
  });
});

// ============================================================
// 安全测试
// ============================================================
describe('安全测试', () => {
  test('普通用户不能访问管理员接口', async () => {
    const res = await userAgent.get('/api/admin/users');
    expect(res.status).toBe(403);
  });

  test('未登录不能发帖', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ title: 'test', content: 'test' });
    expect(res.status).toBe(401);
  });

  test('安全头存在', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
