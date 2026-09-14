const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  projects: [
    {
      name: 'api',
      use: {},
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
        headless: true,
        screenshot: 'on',
      },
    },
  ],
  webServer: {
    command: 'node src/server.js',
    port: 3000,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
