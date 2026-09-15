const { test, expect } = require('@playwright/test');

test.describe('频道创建弹窗测试', () => {
  test('登录后创建频道', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 登录
    await page.evaluate(async () => {
      await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'testadmin@test.com', password: 'test123' })
      });
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // 检查登录状态
    const logoutBtn = page.locator('button:has-text("退出")');
    console.log('退出按钮可见:', await logoutBtn.isVisible());

    // 找到创建频道按钮
    const addBtn = page.locator('button[title="创建频道"]');
    console.log('创建频道按钮可见:', await addBtn.isVisible());

    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);

      // 检查弹窗
      const modal = page.locator('[aria-label="创建频道"]');
      console.log('创建频道弹窗可见:', await modal.isVisible());

      await page.screenshot({ path: 'test-results/channel-create.png', fullPage: true });
    }
  });
});
