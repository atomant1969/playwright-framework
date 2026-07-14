import fs from 'node:fs';
import path from 'node:path';
import { frameworkConfig } from '../framework.config';
import { buildSuiteMatrix, parseSuiteKeysFromInput, renderSuiteMatrixMarkdown } from '../lib/utils/suiteMatrix';
import { testSuites } from '../testSuiteConfig';

const selectedSuite = process.env.TEST_SUITE || frameworkConfig.suite.testSuite;
const parallelSuiteKeys = process.env.PARALLEL_SUITE_KEYS || frameworkConfig.suite.parallelSuiteKeys;
const outputDir = process.env.MATRIX_OUTPUT_DIR || 'test-results';

const suiteKeys = parseSuiteKeysFromInput(selectedSuite, parallelSuiteKeys);
const matrix = buildSuiteMatrix(testSuites, suiteKeys);
const markdown = renderSuiteMatrixMarkdown(matrix, selectedSuite);
const compactJson = JSON.stringify(matrix);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'suite-matrix.json'), `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputDir, 'suite-matrix.compact.json'), `${compactJson}\n`, 'utf8');
fs.writeFileSync(path.join(outputDir, 'suite-matrix.md'), markdown, 'utf8');

process.stdout.write(markdown);
process.stdout.write(`\nMatrix JSON: ${compactJson}\n`);

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  fs.appendFileSync(githubOutput, `suite_matrix=${compactJson}\n`, 'utf8');
  fs.appendFileSync(githubOutput, `suite_count=${matrix.include.length}\n`, 'utf8');
}

const githubStepSummary = process.env.GITHUB_STEP_SUMMARY;
if (githubStepSummary) {
  fs.appendFileSync(githubStepSummary, `${markdown}\n`, 'utf8');
}
