const { test, expect } = require('@playwright/test');

test.describe('频道显示检查', () => {
  test('侧边栏频道和板块', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 检查侧边栏内容
    const sidebar = page.locator('aside');
    const sidebarText = await sidebar.textContent();
    console.log('=== 侧边栏内容 ===');
    console.log(sidebarText.substring(0, 1000));

    // 检查是否有"官方频道"
    const hasOfficial = sidebarText.includes('官方频道');
    console.log('\n是否有官方频道:', hasOfficial);

    // 检查是否有板块
    const hasTech = sidebarText.includes('技术');
    const hasLife = sidebarText.includes('生活');
    console.log('是否有技术板块:', hasTech);
    console.log('是否有生活板块:', hasLife);

    // 截图
    await page.screenshot({ path: 'test-results/channel-sidebar.png', fullPage: true });
    console.log('\n截图已保存');
  });

  test('检查频道展开', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 点击官方频道展开
    const channelBtn = page.locator('button:has-text("官方频道")').first();
    if (await channelBtn.isVisible()) {
      await channelBtn.click();
      await page.waitForTimeout(1000);

      // 检查板块是否显示
      const boards = page.locator('button:has-text("技术")');
      const boardCount = await boards.count();
      console.log('展开后技术板块数量:', boardCount);

      await page.screenshot({ path: 'test-results/channel-expanded.png', fullPage: true });
      console.log('展开截图已保存');
    }
  });
});
