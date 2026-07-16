import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import { frameworkConfig } from '../framework.config';
import { testSuites } from '../testSuiteConfig';
import { buildSuiteMatrix, parseSuiteKeysFromInput, SuiteMatrix } from '../lib/utils/suiteMatrix';

type AdminConfig = Record<string, unknown>;
type ValidationResult = {
  errors: string[];
  warnings: string[];
};
type RunJobStatus = 'running' | 'passed' | 'failed';
type RunEvent = {
  type: 'begin' | 'end';
  title: string;
  titlePath: string[];
  status?: string;
  duration?: number;
  error?: string;
  timestamp: string;
};
type RunJob = {
  id: string;
  action: string;
  command: string;
  args: string[];
  status: RunJobStatus;
  startedAt: string;
  finishedAt?: string;
  code: number | null;
  output: string;
  matrix?: SuiteMatrix;
  events: RunEvent[];
  eventsFile?: string;
  config: {
    testSuite: string;
    parallelSuiteKeys: string;
    workers: string;
    retries: string;
    headless: string;
  };
};

const root = process.cwd();
const port = Number(process.env.ADMIN_CONSOLE_PORT || 4317);
const staticDir = path.join(root, 'admin-console');
const configPath = path.join(root, 'framework.config.json');
const legacyConfigPath = path.join(root, 'test-admin.config.json');
const runJobs = new Map<string, RunJob>();
const maxFinishedJobs = 20;

function recommendedParallelSuiteKeys(): string {
  return Object.entries(testSuites)
    .filter(([, suite]) => suite.recommendedParallelTarget)
    .map(([key]) => key)
    .join(',');
}

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};
const runControlEnvKeys = new Set([
  'BASE_URL',
  'API_BASE_URL',
  'TEST_SUITE',
  'PARALLEL_SUITE_KEYS',
  'SUITE_EXECUTION_MODE',
  'HEADLESS',
  'PLAYWRIGHT_WORKERS',
  'RETRIES',
  'ACTION_TIMEOUT_MS',
  'TEST_TIMEOUT_MS',
  'GLOBAL_TIMEOUT_MS',
  'TIMEZONE_ID',
  'LOG_LEVEL',
]);

function readEnvFile(relativePath: string): Record<string, string> {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return {};

  return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatEnvValue(value: string): string {
  if (!value) return '';
  if (/[\s#"'\\=\r\n]/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function writeEnvValues(updates: Record<string, string>): void {
  const envPath = path.join(root, '.env');
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = existing ? existing.split(/\r?\n/) : [];
  const pending = new Map(Object.entries(updates));
  const nextLines = lines.map((line) => {
    const match = line.match(/^([\w.-]+)\s*=/);
    if (!match || !pending.has(match[1])) return line;

    const name = match[1];
    const value = pending.get(name) || '';
    pending.delete(name);
    return `${name}=${formatEnvValue(value)}`;
  });

  if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') {
    nextLines.push('');
  }
  for (const [name, value] of pending) {
    nextLines.push(`${name}=${formatEnvValue(value)}`);
  }

  fs.writeFileSync(envPath, `${nextLines.join('\n').replace(/\n+$/, '')}\n`, 'utf8');
}

function currentEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...readEnvFile('.env'),
  };
}

function readConfig(): AdminConfig {
  const readableConfigPath = fs.existsSync(configPath) ? configPath : legacyConfigPath;
  if (!fs.existsSync(readableConfigPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(readableConfigPath, 'utf8'));
}

function writeConfig(config: AdminConfig): void {
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
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

function normalizeConfig(config: AdminConfig): AdminConfig {
  const baseUrl = asString(config.baseUrl);
  return {
    ...config,
    apiBaseUrl: asString(config.apiBaseUrl) || apiEndpointUrl(baseUrl),
  };
}

function validateConfig(config: AdminConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const testSuite = asString(config.testSuite);
  const baseUrl = asString(config.baseUrl);
  const executionMode = asString(config.suiteExecutionMode);

  if (!testSuite) {
    errors.push('testSuite is required.');
  } else if (testSuite !== 'parallel' && !testSuites[testSuite]) {
    errors.push(`Unknown testSuite: ${testSuite}`);
  }

  if (testSuite === 'parallel') {
    const parallelKeys = asString(config.parallelSuiteKeys)
      .split(/[,\s]+/)
      .map((key) => key.trim())
      .filter(Boolean);
    if (parallelKeys.length === 0) {
      errors.push('parallelSuiteKeys is required when testSuite is parallel.');
    }
    for (const key of parallelKeys) {
      if (!testSuites[key]) errors.push(`Unknown parallel suite key: ${key}`);
    }
    for (const key of parallelKeys) {
      const suite = testSuites[key];
      if (!suite || suite.parallelSafety === 'safe') continue;
      warnings.push(`${key} is marked ${suite?.parallelSafety || 'unknown'} for parallel runs.`);
    }
    if (parallelKeys.includes('U004') && parallelKeys.some((key) => /^U004_\d+$/.test(key))) {
      warnings.push('Do not run U004 together with U004_1..U004_9; choose the group target or the split targets, not both.');
    }
    const duplicateNamespaces = new Map<string, string[]>();
    for (const key of parallelKeys) {
      const namespace = testSuites[key]?.dataNamespace;
      if (!namespace) continue;
      duplicateNamespaces.set(namespace, [...(duplicateNamespaces.get(namespace) || []), key]);
    }
    for (const [namespace, keys] of duplicateNamespaces) {
      if (keys.length > 1 && namespace !== 'read-only validation') {
        warnings.push(`Parallel targets ${keys.join(', ')} share data namespace ${namespace}.`);
      }
    }
  }

  for (const [field, value] of Object.entries({
    workers: config.workers,
    actionTimeoutMs: config.actionTimeoutMs,
    testTimeoutMs: config.testTimeoutMs,
    globalTimeoutMs: config.globalTimeoutMs,
  })) {
    const numberValue = asNumber(value);
    if (!Number.isInteger(numberValue) || numberValue < 1) {
      errors.push(`${field} must be a positive integer.`);
    }
  }

  const retries = asNumber(config.retries);
  if (!Number.isInteger(retries) || retries < 0) {
    errors.push('retries must be a non-negative integer.');
  }

  try {
    new URL(baseUrl);
  } catch {
    errors.push('baseUrl must be a valid URL.');
  }

  if (asString(config.apiBaseUrl)) {
    try {
      new URL(asString(config.apiBaseUrl));
    } catch {
      errors.push('apiBaseUrl must be a valid URL.');
    }
  }

  if (!['serial', 'parallel'].includes(executionMode)) {
    errors.push('suiteExecutionMode must be serial or parallel.');
  }

  if (asString(config.logLevel) && !['error', 'warn', 'info', 'debug'].includes(asString(config.logLevel))) {
    errors.push('logLevel must be error, warn, info, or debug.');
  }

  return { errors, warnings };
}

function sendJson(response: http.ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(data));
}

function sendText(
  response: http.ServerResponse,
  status: number,
  text: string,
  contentType = 'text/plain; charset=utf-8',
  headers: http.OutgoingHttpHeaders = {},
): void {
  response.writeHead(status, { 'Content-Type': contentType, ...headers });
  response.end(text);
}

async function readBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function suiteSummary() {
  return Object.entries(testSuites)
    .map(([key, suite]) => ({
      key,
      description: suite.description,
      kind: suite.kind,
      targetType: key.startsWith('ERP_') ? 'bug' : suite.tests.length > 1 ? 'suite' : 'testCase',
      parallelSafety: suite.parallelSafety,
      parallelGroup: suite.parallelGroup,
      dataNamespace: suite.dataNamespace,
      recommendedParallelTarget: Boolean(suite.recommendedParallelTarget),
      mode: suite.mode,
      workers: suite.workers,
      tests: suite.tests.length,
    }))
    .sort((first, second) => first.key.localeCompare(second.key));
}

function secretStatus() {
  const fileEnv = readEnvFile('.env');
  const env = currentEnvironment();
  const keys = new Set(Object.keys(fileEnv).filter((key) => !runControlEnvKeys.has(key)));

  return [...keys].sort().map((name) => ({
    name,
    value: env[name] ?? '',
    present: env[name] !== undefined && env[name] !== '',
    editable: true,
    source: name in process.env && !(name in fileEnv) ? 'process env' : '.env',
  }));
}

function activeOverrideNames() {
  const env = currentEnvironment();
  return [...runControlEnvKeys].filter((key) => Boolean(env[key]));
}

function buildEnv(config: AdminConfig): NodeJS.ProcessEnv {
  const normalizedConfig = normalizeConfig(config);
  return {
    ...currentEnvironment(),
    BASE_URL: String(normalizedConfig.baseUrl || ''),
    API_BASE_URL: String(normalizedConfig.apiBaseUrl || ''),
    TEST_SUITE: String(normalizedConfig.testSuite || ''),
    PARALLEL_SUITE_KEYS: String(normalizedConfig.parallelSuiteKeys || ''),
    SUITE_EXECUTION_MODE: String(normalizedConfig.suiteExecutionMode || 'serial'),
    HEADLESS: String(Boolean(normalizedConfig.headless)),
    PLAYWRIGHT_WORKERS: String(normalizedConfig.workers || 1),
    RETRIES: String(normalizedConfig.retries || 0),
    ACTION_TIMEOUT_MS: String(normalizedConfig.actionTimeoutMs || 10000),
    TEST_TIMEOUT_MS: String(normalizedConfig.testTimeoutMs || 30000),
    GLOBAL_TIMEOUT_MS: String(normalizedConfig.globalTimeoutMs || 3600000),
    TIMEZONE_ID: String(normalizedConfig.timezoneId || 'Europe/Budapest'),
    LOG_LEVEL: String(normalizedConfig.logLevel || 'warn'),
  };
}

function commandForAction(action: string): { command: string; args: string[] } {
  if (action === 'doctor') return { command: 'pnpm', args: ['run', 'doctor'] };
  if (action === 'validate') return { command: 'pnpm', args: ['run', 'validate:suites'] };
  if (action === 'matrix') return { command: 'pnpm', args: ['run', 'matrix'] };
  if (action === 'run') return { command: 'npx', args: ['playwright', 'test'] };
  throw new Error(`Unknown action: ${action}`);
}

function trimFinishedJobs(): void {
  const finishedJobs = Array.from(runJobs.values()).filter((job) => job.status !== 'running');
  for (const job of finishedJobs.slice(0, Math.max(finishedJobs.length - maxFinishedJobs, 0))) {
    runJobs.delete(job.id);
  }
}

function readRunEvents(job: RunJob): RunEvent[] {
  if (!job.eventsFile || !fs.existsSync(job.eventsFile)) return job.events;

  job.events = fs
    .readFileSync(job.eventsFile, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as RunEvent];
      } catch {
        return [];
      }
    });

  return job.events;
}

function startRunAction(action: string, config: AdminConfig): RunJob {
  const { command, args } = commandForAction(action);
  const env = buildEnv(config);
  const suiteKeys = parseSuiteKeysFromInput(String(env.TEST_SUITE || ''), String(env.PARALLEL_SUITE_KEYS || ''));
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = path.join(root, 'test-results', 'admin-runs', id);
  const eventsFile = action === 'run' ? path.join(runDir, 'events.jsonl') : undefined;
  if (eventsFile) {
    fs.mkdirSync(runDir, { recursive: true });
    env.ADMIN_RUN_EVENTS_FILE = eventsFile;
    env.PLAYWRIGHT_JSON_OUTPUT = path.join(runDir, 'playwright-results.json');
  }

  const job: RunJob = {
    id,
    action,
    command,
    args,
    status: 'running',
    startedAt: new Date().toISOString(),
    code: null,
    output: '',
    matrix: action === 'run' ? buildSuiteMatrix(testSuites, suiteKeys) : undefined,
    events: [],
    eventsFile,
    config: {
      testSuite: String(env.TEST_SUITE || ''),
      parallelSuiteKeys: String(env.PARALLEL_SUITE_KEYS || ''),
      workers: String(env.PLAYWRIGHT_WORKERS || ''),
      retries: String(env.RETRIES || ''),
      headless: String(env.HEADLESS || ''),
    },
  };
  runJobs.set(job.id, job);

  const child = spawn(command, args, {
    cwd: root,
    env,
    shell: process.platform === 'win32',
  });

  child.stdout.on('data', (chunk) => {
    job.output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    job.output += chunk.toString();
  });
  child.on('error', (error) => {
    job.output += `\nFailed to start: ${error.message}\n`;
    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    trimFinishedJobs();
  });
  child.on('close', (code) => {
    readRunEvents(job);
    job.code = code;
    job.status = code === 0 ? 'passed' : 'failed';
    job.finishedAt = new Date().toISOString();
    trimFinishedJobs();
  });

  return job;
}

async function handleApi(request: http.IncomingMessage, response: http.ServerResponse, pathname: string): Promise<void> {
  if (request.method === 'GET' && pathname === '/api/state') {
    const config = readConfig();
    sendJson(response, 200, {
      config,
      effective: {
        baseUrl: frameworkConfig.app.baseURL,
        apiBaseUrl: frameworkConfig.app.apiBaseURL,
        testSuite: frameworkConfig.suite.testSuite,
        parallelSuiteKeys: frameworkConfig.suite.parallelSuiteKeys,
        suiteExecutionMode: frameworkConfig.suite.executionMode,
        headless: frameworkConfig.playwright.headless,
        workers: frameworkConfig.playwright.workers,
        retries: frameworkConfig.playwright.retries,
        actionTimeoutMs: frameworkConfig.playwright.actionTimeoutMs,
        testTimeoutMs: frameworkConfig.playwright.testTimeoutMs,
        globalTimeoutMs: frameworkConfig.playwright.globalTimeoutMs,
        timezoneId: frameworkConfig.playwright.timezoneId,
        logLevel: frameworkConfig.logging.level,
      },
      suites: suiteSummary(),
      secrets: secretStatus(),
      overrides: activeOverrideNames(),
      recommendedParallelSuiteKeys: recommendedParallelSuiteKeys(),
      validation: validateConfig(config),
    });
    return;
  }

  if (request.method === 'PUT' && pathname === '/api/config') {
    const body = await readBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(response, 400, { error: 'Config must be an object.' });
      return;
    }

    const normalizedConfig = normalizeConfig(body as AdminConfig);
    const validation = validateConfig(normalizedConfig);
    if (validation.errors.length > 0) {
      sendJson(response, 400, { error: 'Config validation failed.', validation });
      return;
    }

    writeConfig(normalizedConfig);
    sendJson(response, 200, { config: readConfig(), validation });
    return;
  }

  if (request.method === 'PUT' && pathname === '/api/secrets') {
    const body = await readBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(response, 400, { error: 'Secrets payload must be an object.' });
      return;
    }

    const updates = (body as { secrets?: unknown }).secrets;
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      sendJson(response, 400, { error: 'secrets must be an object.' });
      return;
    }

    const allowedNames = new Set(secretStatus().map((secret) => secret.name));
    const normalizedUpdates: Record<string, string> = {};
    for (const [name, value] of Object.entries(updates as Record<string, unknown>)) {
      if (!allowedNames.has(name)) {
        sendJson(response, 400, { error: `Unknown secret key: ${name}` });
        return;
      }
      normalizedUpdates[name] = String(value ?? '');
    }

    writeEnvValues(normalizedUpdates);
    sendJson(response, 200, { secrets: secretStatus(), overrides: activeOverrideNames() });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/run') {
    const body = await readBody(request);
    const action = body && typeof body === 'object' && 'action' in body ? String((body as { action: unknown }).action) : '';
    const config = readConfig();
    const validation = validateConfig(config);
    if (validation.errors.length > 0) {
      sendJson(response, 400, { error: 'Config validation failed.', validation });
      return;
    }

    const job = startRunAction(action, config);
    sendJson(response, 202, job);
    return;
  }

  const runJobMatch = pathname.match(/^\/api\/run\/([^/]+)$/);
  if (request.method === 'GET' && runJobMatch) {
    const job = runJobs.get(decodeURIComponent(runJobMatch[1]));
    if (!job) {
      sendJson(response, 404, { error: 'Run job not found.' });
      return;
    }

    readRunEvents(job);
    sendJson(response, 200, job);
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}

function serveStatic(response: http.ServerResponse, pathname: string): void {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(staticDir, relativePath);
  if (!filePath.startsWith(staticDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(response, 404, 'Not found');
    return;
  }

  sendText(response, 200, fs.readFileSync(filePath, 'utf8'), contentTypes[path.extname(filePath)] || 'text/plain; charset=utf-8', {
    'Cache-Control': 'no-store',
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://localhost:${port}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url.pathname);
      return;
    }

    serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`Admin dashboard: http://localhost:${port}`);
});
