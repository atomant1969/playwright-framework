import 'dotenv/config';

export type SuiteExecutionMode = 'serial' | 'parallel';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseExecutionMode(value: string | undefined): SuiteExecutionMode {
  return value === 'parallel' ? 'parallel' : 'serial';
}

export const frameworkConfig = {
  app: {
    baseURL: process.env.BASE_URL || 'https://example.com',
    apiBaseURL: process.env.API_BASE_URL || 'https://api.example.com',
  },

  suite: {
    testSuite: process.env.TEST_SUITE || 'smoke',
    parallelSuiteKeys: process.env.PARALLEL_SUITE_KEYS || 'smoke,api_smoke',
    executionMode: parseExecutionMode(process.env.SUITE_EXECUTION_MODE),
  },

  auth: {
    loginEnabled: parseBoolean(process.env.LOGIN_ENABLED, false),
    credentials: {
      username: process.env.LOGIN_USERNAME ?? '',
      password: process.env.LOGIN_PASSWORD ?? '',
      tabel: process.env.LOGIN_TABEL ?? '',
    },
  },

  playwright: {
    headless: parseBoolean(process.env.HEADLESS, true),
    timezoneId: process.env.TIMEZONE_ID || 'UTC',
    actionTimeoutMs: parseNumber(process.env.ACTION_TIMEOUT_MS, 10_000),
    testTimeoutMs: parseNumber(process.env.TEST_TIMEOUT_MS, 30_000),
    globalTimeoutMs: parseNumber(process.env.GLOBAL_TIMEOUT_MS, 60 * 60 * 1000),
    retries: process.env.CI ? 1 : parseNumber(process.env.RETRIES, 0),
  },

  logging: {
    level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  },
} as const;

/** Compatibility aliases for concise imports in tests/helpers. */
export const ENV = {
  BASE_URL: frameworkConfig.app.baseURL,
  API_BASE_URL: frameworkConfig.app.apiBaseURL,
  HEADLESS: frameworkConfig.playwright.headless,
  TIMEZONE_ID: frameworkConfig.playwright.timezoneId,
  TEST_SUITE: frameworkConfig.suite.testSuite,
  PARALLEL_SUITE_KEYS: frameworkConfig.suite.parallelSuiteKeys,
  SUITE_EXECUTION_MODE: frameworkConfig.suite.executionMode,
  LOGIN_ENABLED: frameworkConfig.auth.loginEnabled,
  ACTION_TIMEOUT_MS: frameworkConfig.playwright.actionTimeoutMs,
  TEST_TIMEOUT_MS: frameworkConfig.playwright.testTimeoutMs,
  GLOBAL_TIMEOUT_MS: frameworkConfig.playwright.globalTimeoutMs,
  LOG_LEVEL: frameworkConfig.logging.level,
};

export const LOGIN_TEST_CONFIG = {
  TEST_CREDENTIALS: frameworkConfig.auth.credentials,
};
