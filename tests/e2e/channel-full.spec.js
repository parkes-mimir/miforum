const { test, expect } = require('@playwright/test');

test.describe('频道功能完整测试', () => {
  test('频道列表和板块显示', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const sidebar = page.locator('aside');
    const sidebarText = await sidebar.textContent();

    console.log('=== 侧边栏内容 ===');
    console.log('官方频道:', sidebarText.includes('官方频道'));
    console.log('技术板块:', sidebarText.includes('技术'));
    console.log('生活板块:', sidebarText.includes('生活'));

    // 截图
    await page.screenshot({ path: 'test-results/channel-01-sidebar.png', fullPage: true });
  });

  test('频道展开显示板块', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 点击官方频道
    const channelBtn = page.locator('button:has-text("官方频道")').first();
    if (await channelBtn.isVisible()) {
      await channelBtn.click();
      await page.waitForTimeout(1000);

      // 检查板块
      const techBoard = page.locator('button:has-text("技术")');
      const lifeBoard = page.locator('button:has-text("生活")');
      console.log('技术板块可见:', await techBoard.isVisible());
      console.log('生活板块可见:', await lifeBoard.isVisible());

      await page.screenshot({ path: 'test-results/channel-02-expanded.png', fullPage: true });
    }
  });

  test('频道设置按钮可见性', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 检查频道设置按钮（齿轮图标）
    const settingsBtns = page.locator('button[title="频道设置"]');
    const count = await settingsBtns.count();
    console.log('频道设置按钮数量:', count);

    await page.screenshot({ path: 'test-results/channel-03-settings-btn.png', fullPage: true });
  });

  test('频道创建弹窗', async ({ page }) => {
    // 先登录
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.evaluate(async () => {
      await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'testadmin@test.com', password: 'test123' })
      });
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // 找到频道标题旁的加号按钮
    const addBtn = page.locator('button[title="创建频道"]');
    const isVisible = await addBtn.isVisible().catch(() => false);
    console.log('创建频道按钮可见:', isVisible);

    if (isVisible) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // 检查弹窗是否出现
      const modal = page.locator('[aria-label="频道设置"]');
      const modalVisible = await modal.isVisible().catch(() => false);
      console.log('频道创建弹窗可见:', modalVisible);

      await page.screenshot({ path: 'test-results/channel-04-create-modal.png', fullPage: true });
    }
  });

  test('API 频道列表', async ({ request }) => {
    const res = await request.get('/api/channels');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log('频道数量:', data.channels?.length);
    data.channels?.forEach((ch) => {
      console.log('  -', ch.name, ch.label, '成员:', ch.member_count, '板块:', ch.board_count);
    });
  });

  test('API 频道板块', async ({ request }) => {
    // 获取频道列表
    const res = await request.get('/api/channels');
    const data = await res.json();
    const channelId = data.channels?.[0]?.id;

    if (channelId) {
      const boardsRes = await request.get(`/api/channels/${channelId}/boards`);
      expect(boardsRes.ok()).toBeTruthy();
      const boards = await boardsRes.json();
      console.log('频道', channelId, '板块数量:', boards.boards?.length);
      boards.boards?.forEach((b) => {
        console.log('  -', b.name, b.label, b.section_type);
      });
    }
  });
});
