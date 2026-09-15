const { test } = require('@playwright/test');

test('管理面板截图', async ({ page }) => {
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

  await page.screenshot({ path: 'test-results/admin-panel.png', fullPage: true });
  console.log('Admin panel screenshot saved');
});
