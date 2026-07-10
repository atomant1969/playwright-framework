import { defineConfig } from '@playwright/test';
import { frameworkConfig } from './framework.config';
import { PARALLEL_SUITE_KEYS } from './testSuiteConfig';

const isHybridParallelRun = frameworkConfig.suite.testSuite === 'parallel';

export default defineConfig({
  testDir: '.',
  testMatch: 'main.spec.ts',
  timeout: frameworkConfig.playwright.testTimeoutMs,
  globalTimeout: frameworkConfig.playwright.globalTimeoutMs,
  workers: isHybridParallelRun ? Math.max(PARALLEL_SUITE_KEYS.length, 1) : 1,
  fullyParallel: isHybridParallelRun,
  retries: frameworkConfig.playwright.retries,
  reporter: [['line'], ['html', { open: 'never' }], ['allure-playwright']],
  use: {
    baseURL: frameworkConfig.app.baseURL,
    headless: frameworkConfig.playwright.headless,
    actionTimeout: frameworkConfig.playwright.actionTimeoutMs,
    ignoreHTTPSErrors: true,
    timezoneId: frameworkConfig.playwright.timezoneId,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
