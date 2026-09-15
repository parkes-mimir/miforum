const { test, expect } = require('@playwright/test');

test('管理面板详细检查', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  // 登录
  await page.goto('/');
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testadmin@test.com', password: 'test123' })
    });
  });

  // 访问管理页面
  await page.goto('/admin');
  await page.waitForTimeout(3000);

  // 检查页面结构
  const body = await page.locator('body').textContent();
  console.log('Page content length:', body.length);
  console.log('Has 用户管理:', body.includes('用户管理'));
  console.log('Has 商品管理:', body.includes('商品管理'));
  console.log('Has 兑换码:', body.includes('兑换码'));

  // 检查标签页
  const tabs = await page
    .locator(
      'button:has-text("用户管理"), button:has-text("商品管理"), button:has-text("兑换码"), button:has-text("兑换记录"), button:has-text("邮箱设置"), button:has-text("关于")'
    )
    .count();
  console.log('Tab buttons found:', tabs);

  // 检查用户列表
  const userCards = await page.locator('.bg-white.rounded-xl.border').count();
  console.log('User cards found:', userCards);

  // 截图
  await page.screenshot({ path: 'test-results/admin-detail.png', fullPage: true });

  // 控制台错误
  if (errors.length > 0) {
    console.log('Console errors:', errors.join('\n'));
  } else {
    console.log('No console errors');
  }
});
