import { defineConfig } from '@playwright/test';
import { frameworkConfig } from './framework.config';
import { PARALLEL_SUITE_KEYS, testSuites } from './testSuiteConfig';

const isHybridParallelRun = frameworkConfig.suite.testSuite === 'parallel';
const selectedSuiteKeys = isHybridParallelRun ? PARALLEL_SUITE_KEYS : [frameworkConfig.suite.testSuite];

function resolveSuiteWorkers(suiteKey: string): number {
  const suite = testSuites[suiteKey];
  const mode = suite?.mode ?? frameworkConfig.suite.executionMode;
  return suite?.workers ?? (mode === 'parallel' ? frameworkConfig.playwright.workers : 1);
}

function resolveWorkerCount(): number {
  if (isHybridParallelRun) {
    return Math.max(
      selectedSuiteKeys.reduce((total, suiteKey) => total + resolveSuiteWorkers(suiteKey), 0),
      1,
    );
  }

  return Math.max(resolveSuiteWorkers(frameworkConfig.suite.testSuite), 1);
}

export default defineConfig({
  testDir: '.',
  testMatch: 'main.spec.ts',
  timeout: frameworkConfig.playwright.testTimeoutMs,
  globalTimeout: frameworkConfig.playwright.globalTimeoutMs,
  workers: resolveWorkerCount(),
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
