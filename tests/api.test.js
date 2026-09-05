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

describe('通知 API', () => {
  let notificationId;

  test('POST /api/like/:postId - 触发点赞通知', async () => {
    // 先用管理员发一个帖子
    const postRes = await adminAgent.post('/api/posts').send({ title: 'Notify Test Post', content: 'For notification test', category: 'tech' });
    const adminPostId = postRes.body.postId;

    // 用户点赞管理员的帖子 -> 管理员应收到通知
    const res = await userAgent.post(`/api/like/${adminPostId}`);
    expect(res.status).toBe(200);
  });

  test('GET /api/notifications - 管理员有通知', async () => {
    const res = await adminAgent.get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBeGreaterThan(0);
    notificationId = res.body.notifications[0].id;
  });

  test('GET /api/notifications - 按类型筛选', async () => {
    const res = await adminAgent.get('/api/notifications?type=like');
    expect(res.status).toBe(200);
    expect(res.body.notifications.every(n => n.type === 'like')).toBe(true);
  });

  test('GET /api/notifications/unread-count - 未读数量', async () => {
    const res = await adminAgent.get('/api/notifications/unread-count');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('unread');
    expect(res.body).toHaveProperty('likes');
    expect(res.body).toHaveProperty('comments');
    expect(res.body).toHaveProperty('bookmarks');
  });

  test('PUT /api/notifications/:id/read - 标记单条已读', async () => {
    const res = await adminAgent.put(`/api/notifications/${notificationId}/read`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('PUT /api/notifications/:id/read - 无权操作', async () => {
    const res = await userAgent.put(`/api/notifications/${notificationId}/read`);
    expect(res.status).toBe(403);
  });

  test('PUT /api/notifications/read-all - 全部已读', async () => {
    const res = await adminAgent.put('/api/notifications/read-all');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('PUT /api/notifications/read-all?type=like - 按类型全部已读', async () => {
    const res = await adminAgent.put('/api/notifications/read-all?type=like');
    expect(res.status).toBe(200);
  });
});

describe('私信 API', () => {
  let conversationId;

  test('POST /api/conversations - 创建会话', async () => {
    const res = await userAgent.post('/api/conversations').send({ userId: 1 }); // 发给超管
    expect(res.status).toBe(200);
    expect(res.body.conversation).toHaveProperty('id');
    conversationId = res.body.conversation.id;
  });

  test('POST /api/conversations - 重复会话返回已有', async () => {
    const res = await userAgent.post('/api/conversations').send({ userId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.conversation.id).toBe(conversationId);
  });

  test('POST /api/conversations - 无效用户ID', async () => {
    const res = await userAgent.post('/api/conversations').send({ userId: userId }); // 自己
    expect(res.status).toBe(400);
  });

  test('POST /api/conversations/:id/messages - 发送消息', async () => {
    const res = await userAgent.post(`/api/conversations/${conversationId}/messages`).send({ content: '你好！' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('messageId');
  });

  test('POST /api/conversations/:id/messages - 空消息', async () => {
    const res = await userAgent.post(`/api/conversations/${conversationId}/messages`).send({ content: '' });
    expect(res.status).toBe(400);
  });

  test('GET /api/conversations/:id/messages - 获取消息', async () => {
    const res = await userAgent.get(`/api/conversations/${conversationId}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThan(0);
    expect(res.body.messages[0]).toHaveProperty('content');
    expect(res.body.messages[0]).toHaveProperty('sender_name');
  });

  test('GET /api/conversations - 会话列表', async () => {
    const res = await userAgent.get('/api/conversations');
    expect(res.status).toBe(200);
    expect(res.body.conversations.length).toBeGreaterThan(0);
  });

  test('GET /api/messages/unread-count - 未读消息数', async () => {
    const res = await userAgent.get('/api/messages/unread-count');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('unread');
  });

  test('GET /api/conversations/:id/messages - 非参与者拒绝', async () => {
    // 创建另一个用户
    const otherRes = await request(app).post('/api/register').send({ username: 'othermsg', email: 'othermsg@test.com', password: '123456' });
    const otherAgent = request.agent(app);
    await otherAgent.post('/api/login').send({ email: 'othermsg@test.com', password: '123456' });

    const res = await otherAgent.get(`/api/conversations/${conversationId}/messages`);
    expect(res.status).toBe(403);
  });
});

describe('私密帖子', () => {
  let privatePostId;

  test('POST /api/posts - 创建私密帖子', async () => {
    const res = await userAgent.post('/api/posts').send({ title: 'Private Post', content: 'Secret content', category: 'tech', private: true });
    expect(res.status).toBe(200);
    privatePostId = res.body.postId;
  });

  test('GET /api/posts/:id - 作者可查看私密帖子', async () => {
    const res = await userAgent.get(`/api/posts/${privatePostId}`);
    expect(res.status).toBe(200);
    expect(res.body.post.private).toBe(true);
  });

  test('GET /api/posts/:id - 管理员可查看私密帖子', async () => {
    const res = await adminAgent.get(`/api/posts/${privatePostId}`);
    expect(res.status).toBe(200);
  });

  test('GET /api/posts/:id - 其他用户不可查看私密帖子', async () => {
    const otherAgent = request.agent(app);
    await otherAgent.post('/api/login').send({ email: 'othermsg@test.com', password: '123456' });
    const res = await otherAgent.get(`/api/posts/${privatePostId}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/posts - 私密帖子在列表中被过滤', async () => {
    const otherAgent = request.agent(app);
    await otherAgent.post('/api/login').send({ email: 'othermsg@test.com', password: '123456' });
    const res = await otherAgent.get('/api/posts');
    const found = res.body.posts.find(p => p.id === privatePostId);
    expect(found).toBeUndefined();
  });
});

describe('帖子排序', () => {
  test('GET /api/posts?sort=newest - 最新排序', async () => {
    const res = await request(app).get('/api/posts?sort=newest');
    expect(res.status).toBe(200);
    const posts = res.body.posts;
    if (posts.length >= 2) {
      expect(new Date(posts[0].created_at).getTime()).toBeGreaterThanOrEqual(new Date(posts[1].created_at).getTime());
    }
  });

  test('GET /api/posts?sort=most_liked - 最多赞排序', async () => {
    const res = await request(app).get('/api/posts?sort=most_liked');
    expect(res.status).toBe(200);
  });

  test('GET /api/posts?sort=oldest - 最早排序', async () => {
    const res = await request(app).get('/api/posts?sort=oldest');
    expect(res.status).toBe(200);
  });
});

describe('用户资料 API 补充', () => {
  test('GET /api/users/:id/posts - 用户帖子列表', async () => {
    const res = await request(app).get(`/api/users/${userId}/posts`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('posts');
    expect(res.body).toHaveProperty('pagination');
  });

  test('GET /api/users/:id/likes - 用户点赞列表', async () => {
    const res = await userAgent.get(`/api/users/${userId}/likes`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('posts');
  });

  test('GET /api/users/999999 - 用户不存在', async () => {
    const res = await request(app).get('/api/users/999999');
    expect(res.status).toBe(404);
  });

  test('PUT /api/profile - 更新资料', async () => {
    const res = await userAgent.put('/api/profile').send({ bio: '测试简介', location: '测试地点' });
    expect(res.status).toBe(200);
    expect(res.body.user.bio).toBe('测试简介');
  });
});

describe('签到补签', () => {
  test('POST /api/checkin/retroactive - 缺少日期', async () => {
    const res = await userAgent.post('/api/checkin/retroactive').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('日期');
  });

  test('POST /api/checkin/retroactive - 未来日期', async () => {
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const res = await userAgent.post('/api/checkin/retroactive').send({ date: future });
    expect(res.status).toBe(400);
  });
});

describe('管理员用户管理', () => {
  test('PUT /api/admin/users/:id/mute - 禁言用户', async () => {
    const res = await adminAgent.put(`/api/admin/users/${userId}/mute`);
    expect(res.status).toBe(200);
    expect(res.body.muted).toBe(true);
  });

  test('PUT /api/admin/users/:id/mute - 取消禁言', async () => {
    const res = await adminAgent.put(`/api/admin/users/${userId}/mute`);
    expect(res.status).toBe(200);
    expect(res.body.muted).toBe(false);
  });

  test('PUT /api/posts/:id/pin - 置顶帖子', async () => {
    const posts = await userAgent.get('/api/posts');
    const post = posts.body.posts[0];
    if (post) {
      const res = await adminAgent.put(`/api/posts/${post.id}/pin`);
      expect(res.status).toBe(200);
      expect(res.body.pinned).toBe(true);
    }
  });

  test('GET /api/admin/smtp - SMTP 配置', async () => {
    const res = await adminAgent.get('/api/admin/smtp');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('smtp_host');
    expect(res.body).toHaveProperty('configured');
  });

  test('GET /api/admin/version - 版本信息', async () => {
    const res = await adminAgent.get('/api/admin/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('name');
  });

  test('GET /api/tags - 标签列表', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tags');
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
