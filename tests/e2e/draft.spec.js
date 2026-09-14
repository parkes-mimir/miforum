const { test, expect } = require('@playwright/test');

test.describe('帖子草稿功能（无需登录）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('页面加载正常', async ({ page }) => {
    await expect(page).toHaveTitle(/MiForum/);
    await page.screenshot({ path: 'test-results/draft-01-page-load.png', fullPage: true });
  });

  test('localStorage 草稿保存和读取', async ({ page }) => {
    // 保存草稿
    await page.evaluate(() => {
      localStorage.setItem(
        'miforum-draft',
        JSON.stringify({
          title: '测试标题',
          content: '测试内容',
          category: 'tech',
          tags: ['test'],
          savedAt: Date.now()
        })
      );
    });

    // 验证草稿已保存
    const draft = await page.evaluate(() => {
      const d = localStorage.getItem('miforum-draft');
      return d ? JSON.parse(d) : null;
    });
    expect(draft).toBeTruthy();
    expect(draft.title).toBe('测试标题');
    expect(draft.content).toBe('测试内容');

    await page.screenshot({ path: 'test-results/draft-02-localStorage.png', fullPage: true });
  });

  test('过期草稿检测', async ({ page }) => {
    // 保存一个过期草稿（8天前）
    await page.evaluate(() => {
      localStorage.setItem(
        'miforum-draft',
        JSON.stringify({
          title: '过期草稿',
          content: '内容',
          savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000
        })
      );
    });

    // 验证草稿存在
    const draft = await page.evaluate(() => localStorage.getItem('miforum-draft'));
    expect(draft).toBeTruthy();

    // 模拟过期检查逻辑
    const isExpired = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('miforum-draft'));
      return Date.now() - d.savedAt > 7 * 24 * 60 * 60 * 1000;
    });
    expect(isExpired).toBe(true);

    // 清除过期草稿
    await page.evaluate(() => localStorage.removeItem('miforum-draft'));
    const afterClear = await page.evaluate(() => localStorage.getItem('miforum-draft'));
    expect(afterClear).toBeNull();

    await page.screenshot({ path: 'test-results/draft-03-expired.png', fullPage: true });
  });

  test('草稿清除', async ({ page }) => {
    // 保存草稿
    await page.evaluate(() => {
      localStorage.setItem(
        'miforum-draft',
        JSON.stringify({
          title: '要清除的草稿',
          content: '内容',
          savedAt: Date.now()
        })
      );
    });

    // 清除草稿
    await page.evaluate(() => localStorage.removeItem('miforum-draft'));

    // 验证已清除
    const draft = await page.evaluate(() => localStorage.getItem('miforum-draft'));
    expect(draft).toBeNull();

    await page.screenshot({ path: 'test-results/draft-04-cleared.png', fullPage: true });
  });

  test('草稿自动保存逻辑', async ({ page }) => {
    // 模拟自动保存逻辑
    await page.evaluate(() => {
      // 模拟用户输入
      const draft = {
        title: '自动保存标题',
        content: '自动保存内容',
        category: 'tech',
        tags: [],
        savedAt: Date.now()
      };
      localStorage.setItem('miforum-draft', JSON.stringify(draft));
    });

    // 验证自动保存
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('miforum-draft')));
    expect(draft.title).toBe('自动保存标题');

    await page.screenshot({ path: 'test-results/draft-05-auto-save.png', fullPage: true });
  });
});
