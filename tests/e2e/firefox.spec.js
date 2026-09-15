const { test, expect } = require('@playwright/test');

test.describe('Firefox 兼容性检查', () => {
  test('Firefox 首页截图', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/firefox-01-forum.png', fullPage: true });
    console.log('Firefox forum screenshot saved');
  });

  test('Firefox 侧边栏', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const sidebar = page.locator('aside');
    const isVisible = await sidebar.isVisible();
    console.log('Sidebar visible:', isVisible);

    const sidebarText = await sidebar.textContent().catch(() => 'N/A');
    console.log('Sidebar content:', sidebarText.substring(0, 300));

    await page.screenshot({ path: 'test-results/firefox-02-sidebar.png', fullPage: true });
  });

  test('Firefox 控制台错误', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(3000);

    console.log('Firefox console errors:', errors.length > 0 ? errors.join('\n') : 'None');
    await page.screenshot({ path: 'test-results/firefox-03-errors.png', fullPage: true });
  });
});
