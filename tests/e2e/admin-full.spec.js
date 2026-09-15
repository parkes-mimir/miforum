const { test, expect } = require('@playwright/test');

test('管理面板完整截图', async ({ page }) => {
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

  // 检查各区块
  const sections = ['用户管理', '商品管理', '兑换码', '兑换记录', '邮箱设置', '关于'];
  for (const s of sections) {
    const found = await page.locator('h2:has-text("' + s + '")').isVisible();
    console.log(s + ':', found ? '✅' : '❌');
  }

  // 全页截图
  await page.screenshot({ path: 'test-results/admin-full.png', fullPage: true });
  console.log('Full page screenshot saved');

  // 检查控制台错误
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.waitForTimeout(1000);
  console.log('Console errors:', errors.length > 0 ? errors.join(', ') : 'None');
});
