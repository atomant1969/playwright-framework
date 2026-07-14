import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { frameworkConfig } from '../framework.config';
import { testSuites } from '../testSuiteConfig';

const selectedSuite = process.env.TEST_SUITE || frameworkConfig.suite.testSuite;
const suite = testSuites[selectedSuite];

if (!suite) {
  throw new Error(`Unknown TEST_SUITE key: ${selectedSuite}`);
}

const playwrightBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
const outputDir = process.env.SUITE_SUMMARY_OUTPUT_DIR || 'test-results';

const listResult = spawnSync(playwrightBin, ['test', '--list'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PLAYWRIGHT_JSON_OUTPUT: path.join(outputDir, `${selectedSuite}-list.json`),
  },
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (listResult.status !== 0) {
  if (listResult.stdout) process.stdout.write(listResult.stdout);
  if (listResult.stderr) process.stderr.write(listResult.stderr);
  if (listResult.error) process.stderr.write(`${listResult.error.message}\n`);
  process.exit(listResult.status ?? 1);
}

const testNames = listResult.stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.includes(' › '))
  .map((line) => line.split(' › ').at(-1)?.trim())
  .filter((name): name is string => Boolean(name));

const mode = suite.mode ?? frameworkConfig.suite.executionMode;
const workers = process.env.PLAYWRIGHT_WORKERS || String(suite.workers ?? (mode === 'parallel' ? frameworkConfig.playwright.workers : 1));

const treeLines = testNames.map((testName, index) => {
  const branch = index === testNames.length - 1 ? '`--' : '|--';
  return `${branch} ${testName}`;
});

const markdown = [
  `## Planned tests: ${selectedSuite}`,
  '',
  `- **Description:** ${suite.description}`,
  `- **Kind:** \`${suite.kind}\``,
  `- **Mode:** \`${mode}\``,
  `- **Workers:** \`${workers}\``,
  `- **Tests:** ${testNames.length}`,
  '',
  '```text',
  `${selectedSuite} [${mode}, ${workers} worker${workers === '1' ? '' : 's'}]`,
  ...treeLines,
  '```',
  '',
].join('\n');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, `${selectedSuite}-summary.md`), markdown, 'utf8');

process.stdout.write(markdown);

const githubStepSummary = process.env.GITHUB_STEP_SUMMARY;
if (githubStepSummary) {
  fs.appendFileSync(githubStepSummary, markdown, 'utf8');
}
