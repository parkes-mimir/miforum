const { test, expect } = require('@playwright/test');

test.describe('前端显示检查', () => {
  test('论坛首页截图', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/display-01-forum.png', fullPage: true });
    console.log('Forum page screenshot saved');
  });

  test('商店页面截图', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/display-02-shop.png', fullPage: true });
    console.log('Shop page screenshot saved');
  });

  test('消息页面截图', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/display-03-messages.png', fullPage: true });
    console.log('Messages page screenshot saved');
  });

  test('帖子详情截图', async ({ page }) => {
    // 先获取一个帖子ID
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/posts?limit=1');
      return r.json();
    });
    const postId = res.posts?.[0]?.id;
    if (postId) {
      await page.goto('/post.html?id=' + postId);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/display-04-post.png', fullPage: true });
      console.log('Post page screenshot saved');
    }
  });

  test('侧边栏频道结构', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 检查侧边栏内容
    const sidebar = page.locator('aside');
    const sidebarText = await sidebar.textContent();
    console.log('Sidebar content preview:', sidebarText.substring(0, 500));

    // 检查频道相关元素
    const channelButtons = await page.locator('button:has-text("官方频道")').count();
    console.log('Official channel buttons found:', channelButtons);

    await page.screenshot({ path: 'test-results/display-05-sidebar.png', fullPage: true });
  });

  test('检查控制台错误', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    console.log('Console errors:', errors.length > 0 ? errors.join('\n') : 'None');
    await page.screenshot({ path: 'test-results/display-06-console.png', fullPage: true });
  });
});
