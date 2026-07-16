import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

export type SuiteExecutionMode = 'serial' | 'parallel';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

type FrameworkConfigFile = Record<string, unknown>;

const configPath = path.join(__dirname, 'framework.config.json');

function readConfigFile(): FrameworkConfigFile {
  if (!fs.existsSync(configPath)) return {};

  return JSON.parse(fs.readFileSync(configPath, 'utf8')) as FrameworkConfigFile;
}

const fileConfig = readConfigFile();

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function fileString(name: string, fallback = ''): string {
  return asString(fileConfig[name]) || fallback;
}

function envString(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string' || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseExecutionMode(value: unknown): SuiteExecutionMode {
  return value === 'parallel' ? 'parallel' : 'serial';
}

function parseLogLevel(value: unknown): LogLevel {
  return ['error', 'warn', 'info', 'debug'].includes(String(value)) ? (value as LogLevel) : 'info';
}

function originUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}/`;
  } catch {
    return value;
  }
}

function apiEndpointUrl(value: string): string {
  try {
    return new URL('api/', originUrl(value)).toString();
  } catch {
    return value;
  }
}

const baseURL = envString('BASE_URL', fileString('baseUrl', 'https://example.com'));
const apiBaseURL = envString('API_BASE_URL', fileString('apiBaseUrl', apiEndpointUrl(baseURL)));
const suiteExecutionMode = parseExecutionMode(envString('SUITE_EXECUTION_MODE', fileString('suiteExecutionMode', 'serial')));

export const frameworkConfig = {
  app: {
    baseURL,
    apiBaseURL,
  },

  suite: {
    testSuite: envString('TEST_SUITE', fileString('testSuite', 'smoke')),
    parallelSuiteKeys: envString('PARALLEL_SUITE_KEYS', fileString('parallelSuiteKeys', 'smoke,api_smoke')),
    executionMode: suiteExecutionMode,
  },

  auth: {
    loginEnabled: parseBoolean(process.env.LOGIN_ENABLED ?? fileConfig.loginEnabled, false),
    credentials: {
      username: process.env.LOGIN_USERNAME ?? '',
      password: process.env.LOGIN_PASSWORD ?? '',
      tabel: process.env.LOGIN_TABEL ?? '',
    },
  },

  playwright: {
    headless: parseBoolean(process.env.HEADLESS ?? fileConfig.headless, true),
    timezoneId: envString('TIMEZONE_ID', fileString('timezoneId', 'UTC')),
    actionTimeoutMs: parseNumber(process.env.ACTION_TIMEOUT_MS ?? fileConfig.actionTimeoutMs, 10_000),
    testTimeoutMs: parseNumber(process.env.TEST_TIMEOUT_MS ?? fileConfig.testTimeoutMs, 30_000),
    globalTimeoutMs: parseNumber(process.env.GLOBAL_TIMEOUT_MS ?? fileConfig.globalTimeoutMs, 60 * 60 * 1000),
    workers: parseNumber(process.env.PLAYWRIGHT_WORKERS ?? fileConfig.workers, 3),
    retries: process.env.CI ? 1 : parseNumber(process.env.RETRIES ?? fileConfig.retries, 0),
  },

  logging: {
    level: parseLogLevel(envString('LOG_LEVEL', fileString('logLevel', 'info'))),
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
  PLAYWRIGHT_WORKERS: frameworkConfig.playwright.workers,
  LOG_LEVEL: frameworkConfig.logging.level,
};

export const LOGIN_TEST_CONFIG = {
  TEST_CREDENTIALS: frameworkConfig.auth.credentials,
};
