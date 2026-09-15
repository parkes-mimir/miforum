# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: channel-create-limit.spec.js >> 创建频道权限限制测试 >> API 测试 - 签到和积分不足时无法创建频道
- Location: tests/e2e/channel-create-limit.spec.js:4:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 401
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('创建频道权限限制测试', () => {
  4  |   test('API 测试 - 签到和积分不足时无法创建频道', async ({ request }) => {
  5  |     // 注册新用户
  6  |     const registerRes = await request.post('/api/register', {
  7  |       data: { username: 'newuser', email: 'newuser@test.com', password: 'test123', captcha: '000000' }
  8  |     });
  9  |     console.log('注册结果:', registerRes.status());
  10 | 
  11 |     // 登录
  12 |     const loginRes = await request.post('/api/login', {
  13 |       data: { email: 'newuser@test.com', password: 'test123' }
  14 |     });
  15 |     console.log('登录结果:', loginRes.status());
  16 | 
  17 |     // 尝试创建频道
  18 |     const createRes = await request.post('/api/channels', {
  19 |       data: { name: 'testchannel', label: '测试频道' }
  20 |     });
  21 |     const createData = await createRes.json();
  22 |     console.log('创建频道结果:', createRes.status(), createData);
  23 | 
> 24 |     expect(createRes.status()).toBe(403);
     |                                ^ Error: expect(received).toBe(expected) // Object.is equality
  25 |     expect(createData.error).toContain('签到天数不足');
  26 |   });
  27 | 
  28 |   test('PC端截图', async ({ page }) => {
  29 |     await page.goto('/');
  30 |     await page.waitForTimeout(2000);
  31 |     await page.setViewportSize({ width: 1280, height: 800 });
  32 |     await page.screenshot({ path: 'test-results/channel-limit-pc.png', fullPage: true });
  33 |   });
  34 | 
  35 |   test('移动端截图', async ({ page }) => {
  36 |     await page.goto('/');
  37 |     await page.waitForTimeout(2000);
  38 |     await page.setViewportSize({ width: 375, height: 812 });
  39 |     await page.screenshot({ path: 'test-results/channel-limit-mobile.png', fullPage: true });
  40 |   });
  41 | });
  42 | 
```