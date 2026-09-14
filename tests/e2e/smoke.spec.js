const { test, expect } = require('@playwright/test');

// API 测试（不需要浏览器）
test.describe('API 冒烟测试', () => {
  test('GET /api/categories - 获取分类列表', async ({ request }) => {
    const res = await request.get('/api/categories');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.categories.length).toBeGreaterThan(0);
  });

  test('POST /api/register - 注册缺少字段返回 400', async ({ request }) => {
    const res = await request.post('/api/register', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /api/login - 登录缺少字段返回 400', async ({ request }) => {
    const res = await request.post('/api/login', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('GET /api/shop/items - 获取商品列表', async ({ request }) => {
    const res = await request.get('/api/shop/items');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('items');
  });

  test('GET /api/leaderboard/level - 获取排行榜', async ({ request }) => {
    const res = await request.get('/api/leaderboard/level');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('leaderboard');
  });

  test('GET /api/tags - 获取标签', async ({ request }) => {
    const res = await request.get('/api/tags');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('tags');
  });

  test('GET /api/notifications/unread-count - 未登录返回 401', async ({ request }) => {
    const res = await request.get('/api/notifications/unread-count');
    expect(res.status()).toBe(401);
  });

  test('GET /api/preferences - 未登录返回默认值', async ({ request }) => {
    const res = await request.get('/api/preferences');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.theme).toBe('auto');
    expect(data.themeColor).toBe('purple');
  });

  test('GET /api/posts - 获取帖子列表', async ({ request }) => {
    const res = await request.get('/api/posts');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('posts');
    expect(data).toHaveProperty('pagination');
  });

  test('GET /不存在的接口 - 返回 404', async ({ request }) => {
    const res = await request.get('/api/nonexistent');
    expect(res.status()).toBe(404);
  });
});

// 注册+登录+操作完整流程测试
test.describe('用户注册登录流程', () => {
  test('登录缺少字段返回 400', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: { email: 'test@example.com' }
    });
    expect(res.status()).toBe(400);
  });

  test('注册缺少字段返回 400', async ({ request }) => {
    const res = await request.post('/api/register', {
      data: { username: 'test' }
    });
    expect(res.status()).toBe(400);
  });

  test('登录密码错误返回 400', async ({ request }) => {
    const res = await request.post('/api/login', {
      data: { email: 'nonexistent@example.com', password: 'wrongpassword' }
    });
    expect(res.status()).toBe(400);
  });
});
