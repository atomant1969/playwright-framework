import fs from 'node:fs';
import path from 'node:path';
import { frameworkConfig } from '../framework.config';
import { testSuites, PARALLEL_SUITE_KEYS } from '../testSuiteConfig';

const root = process.cwd();
const errors: string[] = [];
const warnings: string[] = [];

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(root, relativePath));
}

function checkRequiredFiles(): void {
  const requiredFiles = [
    'package.json',
    'framework.config.ts',
    'config.ts',
    'playwright.config.ts',
    'main.spec.ts',
    'testSuiteConfig.ts',
    'testSuiteConfig.ui.ts',
    'testSuiteConfig.api.ts',
    'tsconfig.json',
    'eslint.config.mjs',
    '.prettierrc',
    '.env.example',
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) errors.push(`Missing required file: ${file}`);
  }
}

function checkRecommendedFolders(): void {
  const recommendedFolders = ['testcases', 'templates', 'lib', 'scripts', 'pages', 'fixtures', 'testdata', 'docs'];

  for (const folder of recommendedFolders) {
    if (!exists(folder)) warnings.push(`Recommended folder is missing: ${folder}`);
  }
}

function checkSuiteRegistry(): void {
  const suiteKeys = Object.keys(testSuites);
  if (suiteKeys.length === 0) errors.push('No suites are registered.');

  for (const [suiteKey, suite] of Object.entries(testSuites)) {
    if (!suite.description.trim()) errors.push(`${suiteKey}: missing description.`);
    if (!suite.tests.length) errors.push(`${suiteKey}: has no test runners.`);

    for (const [index, entry] of suite.tests.entries()) {
      if (!entry.description.trim()) errors.push(`${suiteKey}.tests[${index}]: missing runner description.`);

      if ('suite' in entry) {
        if (!testSuites[entry.suite]) errors.push(`${suiteKey}.tests[${index}]: nested suite "${entry.suite}" is not registered.`);
        continue;
      }

      if (typeof entry.test !== 'function') errors.push(`${suiteKey}.tests[${index}]: runner is not a function.`);
    }
  }

  const selectedSuite = frameworkConfig.suite.testSuite;
  if (selectedSuite !== 'parallel' && !testSuites[selectedSuite]) {
    errors.push(`TEST_SUITE=${selectedSuite} is not registered.`);
  }

  for (const suiteKey of PARALLEL_SUITE_KEYS) {
    if (!testSuites[suiteKey]) errors.push(`PARALLEL_SUITE_KEYS contains unknown suite: ${suiteKey}`);
  }
}

function checkEnvironmentShape(): void {
  if (!frameworkConfig.app.baseURL) errors.push('BASE_URL is empty.');
  if (!frameworkConfig.app.apiBaseURL) warnings.push('API_BASE_URL is empty. API tests may fail.');

  if (frameworkConfig.auth.loginEnabled) {
    const { username, password } = frameworkConfig.auth.credentials;
    if (!username || !password) errors.push('LOGIN_ENABLED=true requires LOGIN_USERNAME and LOGIN_PASSWORD.');
  }
}

function printResult(): void {
  if (warnings.length > 0) {
    console.warn('\nWarnings:');
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  if (errors.length > 0) {
    console.error('\nErrors:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Framework doctor passed. Registered suites: ${Object.keys(testSuites).length}.`);
}

checkRequiredFiles();
checkRecommendedFolders();
checkSuiteRegistry();
checkEnvironmentShape();
printResult();
