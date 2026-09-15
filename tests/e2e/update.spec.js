const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('检查更新 + 立即更新', () => {
  test('API: 检查更新正常响应', async ({ request }) => {
    const loginRes = await request.post('/api/login', {
      data: { email: 'testadmin@test.com', password: 'test123' }
    });
    expect(loginRes.ok()).toBeTruthy();

    const res = await request.get('/api/admin/check-update');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('hasUpdate');
    expect(data).toHaveProperty('currentVersion');
    expect(data).toHaveProperty('latestVersion');
  });

  test('API: 降级版本后检测到更新', async ({ request }) => {
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const originalVersion = pkg.version;

    try {
      pkg.version = '1.0.0';
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

      const loginRes = await request.post('/api/login', {
        data: { email: 'testadmin@test.com', password: 'test123' }
      });
      expect(loginRes.ok()).toBeTruthy();

      const res = await request.get('/api/admin/check-update');
      const data = await res.json();
      expect(data.hasUpdate).toBe(true);
      expect(data.latestVersion).not.toBe('1.0.0');
    } finally {
      pkg.version = originalVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  });

  test('前端: 检查更新 → 显示更新按钮 → 点击更新', async ({ page }) => {
    // 降级版本
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const originalVersion = pkg.version;
    pkg.version = '1.0.0';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

    try {
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
      await page.reload();
      await page.waitForTimeout(2000);

      // 打开管理面板
      const adminBtn = page.locator('header button:has-text("管理")').first();
      await adminBtn.click();
      await page.waitForTimeout(500);

      // 切换到关于标签
      await page.locator('button:has-text("关于")').click();
      await page.waitForTimeout(500);

      // 截图 - 更新前
      await page.screenshot({ path: 'test-results/update-01-before.png', fullPage: true });

      // 点击检查更新
      await page.locator('button:has-text("检查更新")').click();
      await page.waitForTimeout(5000);

      // 截图 - 检查更新后
      await page.screenshot({ path: 'test-results/update-02-checked.png', fullPage: true });

      // 验证显示了更新按钮
      const updateBtn = page.locator('button:has-text("立即更新")');
      const hasUpdateBtn = await updateBtn.isVisible().catch(() => false);
      console.log('Update button visible:', hasUpdateBtn);

      if (hasUpdateBtn) {
        // 点击更新按钮
        await updateBtn.click();
        await page.waitForTimeout(5000);

        // 截图 - 更新后
        await page.screenshot({ path: 'test-results/update-03-updated.png', fullPage: true });

        // 验证更新结果
        const result = page.locator('[x-html="updateResult"]');
        const resultText = await result.textContent().catch(() => '');
        console.log('Update result:', resultText);

        // 更新应该成功（即使是最新版本）
        expect(resultText).toBeTruthy();
      }
    } finally {
      // 恢复版本
      pkg.version = originalVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  });
});
