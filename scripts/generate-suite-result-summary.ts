import fs from 'node:fs';
import path from 'node:path';
import { frameworkConfig } from '../framework.config';
import { testSuites } from '../testSuiteConfig';

type JsonResult = {
  status?: string;
  duration?: number;
  error?: {
    message?: string;
  };
};

type JsonTest = {
  title: string;
  outcome?: string;
  results?: JsonResult[];
};

type JsonSpec = {
  title: string;
  tests?: JsonTest[];
};

type JsonSuite = {
  title: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
};

type JsonReport = {
  suites?: JsonSuite[];
};

type TestResultRow = {
  title: string;
  status: string;
  durationMs: number;
  error: string;
};

const selectedSuite = process.env.TEST_SUITE || frameworkConfig.suite.testSuite;
const suite = testSuites[selectedSuite];
const resultPath = process.env.PLAYWRIGHT_JSON_OUTPUT || path.join('test-results', 'playwright-results.json');
const outputDir = process.env.SUITE_SUMMARY_OUTPUT_DIR || 'test-results';

if (!suite) {
  throw new Error(`Unknown TEST_SUITE key: ${selectedSuite}`);
}

function normalizeStatus(status: string | undefined): string {
  switch (status) {
    case 'expected':
    case 'passed':
      return 'PASS';
    case 'unexpected':
    case 'failed':
    case 'timedOut':
      return 'FAIL';
    case 'flaky':
      return 'FLAKY';
    case 'skipped':
      return 'SKIP';
    default:
      return status?.toUpperCase() || 'UNKNOWN';
  }
}

function cleanCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function collectRowsFromSuite(jsonSuite: JsonSuite, rows: TestResultRow[]): void {
  for (const spec of jsonSuite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const lastResult = test.results?.at(-1);
      rows.push({
        title: test.title || spec.title,
        status: normalizeStatus(test.outcome || lastResult?.status),
        durationMs: test.results?.reduce((total, result) => total + (result.duration ?? 0), 0) ?? 0,
        error: lastResult?.error?.message ?? '',
      });
    }
  }

  for (const childSuite of jsonSuite.suites ?? []) {
    collectRowsFromSuite(childSuite, rows);
  }
}

function collectRows(report: JsonReport): TestResultRow[] {
  const rows: TestResultRow[] = [];
  for (const jsonSuite of report.suites ?? []) {
    collectRowsFromSuite(jsonSuite, rows);
  }
  return rows;
}

if (!fs.existsSync(resultPath)) {
  const markdown = [
    `## run-suite (${selectedSuite}) results`,
    '',
    `No Playwright JSON result file was found at \`${resultPath}\`.`,
    '',
  ].join('\n');

  process.stdout.write(markdown);
  const githubStepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (githubStepSummary) fs.appendFileSync(githubStepSummary, markdown, 'utf8');
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as JsonReport;
const rows = collectRows(report);
const passed = rows.filter((row) => row.status === 'PASS').length;
const failed = rows.filter((row) => row.status === 'FAIL').length;
const skipped = rows.filter((row) => row.status === 'SKIP').length;

const lines = [
  `## run-suite (${selectedSuite}) results`,
  '',
  `- **Passed:** ${passed}`,
  `- **Failed:** ${failed}`,
  `- **Skipped:** ${skipped}`,
  '',
  '| Status | Test | Duration | Error |',
  '| :--- | :--- | ---: | :--- |',
];

for (const row of rows) {
  lines.push(`| ${row.status} | ${cleanCell(row.title)} | ${row.durationMs} ms | ${cleanCell(row.error)} |`);
}

lines.push('');

const markdown = lines.join('\n');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, `${selectedSuite}-results.md`), markdown, 'utf8');

process.stdout.write(markdown);

const githubStepSummary = process.env.GITHUB_STEP_SUMMARY;
if (githubStepSummary) {
  fs.appendFileSync(githubStepSummary, markdown, 'utf8');
}
