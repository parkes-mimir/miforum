const { test, expect } = require('@playwright/test');

test.describe('频道功能完整测试', () => {
  test('频道展开显示板块', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 点击官方频道展开
    const channelBtn = page.locator('button:has-text("官方频道")').first();
    if (await channelBtn.isVisible()) {
      await channelBtn.click();
      // 等待板块加载（API 调用需要时间）
      await page.waitForTimeout(2000);

      // 检查板块
      const techBoard = page.locator('button:has-text("技术")');
      const lifeBoard = page.locator('button:has-text("生活")');
      const techVisible = await techBoard.isVisible();
      const lifeVisible = await lifeBoard.isVisible();
      console.log('技术板块可见:', techVisible);
      console.log('生活板块可见:', lifeVisible);

      await page.screenshot({ path: 'test-results/channel-expand.png', fullPage: true });

      // 如果板块不可见，检查控制台错误
      if (!techVisible) {
        const sidebarText = await page.locator('aside').textContent();
        console.log('侧边栏内容片段:', sidebarText.substring(0, 500));
      }
    }
  });

  test('频道创建弹窗', async ({ page }) => {
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

    // 找到创建频道按钮
    const addBtn = page.locator('button[title="创建频道"]');
    console.log('创建频道按钮可见:', await addBtn.isVisible());

    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);

      // 检查弹窗
      const modal = page.locator('[aria-label="频道设置"]');
      const modalVisible = await modal.isVisible();
      console.log('频道创建弹窗可见:', modalVisible);

      if (modalVisible) {
        // 填写表单
        await page.locator('input[placeholder*="gaming"]').fill('test-channel');
        await page.locator('input[placeholder*="游戏频道"]').fill('测试频道');

        await page.screenshot({ path: 'test-results/channel-create-modal.png', fullPage: true });
      }
    }
  });
});
