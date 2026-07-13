import fs from 'node:fs';
import {
  buildExecutionPlan,
  renderExecutionPlanMarkdown,
  renderExecutionPlanText,
  writeExecutionPlanArtifacts,
} from '../lib/utils/executionPlan';
import { getSelectedSuiteKeys, validateSelectedSuites } from '../lib/utils/suiteSelection';
import { testSuites } from '../testSuiteConfig';

const selectedSuiteKeys = getSelectedSuiteKeys();
validateSelectedSuites(testSuites, selectedSuiteKeys);

const plan = buildExecutionPlan(testSuites, selectedSuiteKeys);
const text = renderExecutionPlanText(plan);
const markdown = renderExecutionPlanMarkdown(plan);

process.stdout.write(text);
writeExecutionPlanArtifacts(plan);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  fs.appendFileSync(summaryPath, `${markdown}\n`, 'utf8');
}
