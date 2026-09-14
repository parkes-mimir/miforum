const { test, expect } = require('@playwright/test');

test.describe('商店页面测试', () => {
  test('商店页面加载', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForTimeout(2000);
    await expect(page).toHaveTitle(/积分商店/);
    await page.screenshot({ path: 'test-results/shop-01-page.png', fullPage: true });
  });

  test('商品列表显示', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/shop-02-items.png', fullPage: true });
  });

  test('API 商品列表', async ({ request }) => {
    const res = await request.get('/api/shop/items');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.items.length).toBeGreaterThan(0);
  });
});

test.describe('管理面板测试', () => {
  test('管理面板 API 未登录返回 401', async ({ request }) => {
    const res = await request.get('/api/admin/shop/items');
    expect(res.status()).toBe(401);
  });

  test('兑换记录 API 未登录返回 401', async ({ request }) => {
    const res = await request.get('/api/admin/shop/orders');
    expect(res.status()).toBe(401);
  });
});
