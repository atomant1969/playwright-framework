import { testSuites, PARALLEL_SUITE_KEYS } from '../testSuiteConfig';

const errors: string[] = [];
const suiteKeys = Object.keys(testSuites);

if (suiteKeys.length === 0) {
  errors.push('No suites are registered.');
}

for (const [suiteKey, suite] of Object.entries(testSuites)) {
  if (!suite.description?.trim()) errors.push(`${suiteKey}: missing description.`);
  if (!['ui', 'api', 'mixed'].includes(suite.kind)) errors.push(`${suiteKey}: invalid kind "${suite.kind}".`);
  if (suite.mode && !['serial', 'parallel'].includes(suite.mode)) errors.push(`${suiteKey}: invalid mode "${suite.mode}".`);
  if (suite.workers !== undefined && (!Number.isInteger(suite.workers) || suite.workers < 1)) {
    errors.push(`${suiteKey}: workers must be a positive integer.`);
  }
  if (!Array.isArray(suite.tests) || suite.tests.length === 0) errors.push(`${suiteKey}: must define at least one runner.`);

  for (const [index, runner] of suite.tests.entries()) {
    if (typeof runner.test !== 'function') errors.push(`${suiteKey}.tests[${index}]: test is not a function.`);
    if (!runner.description?.trim()) errors.push(`${suiteKey}.tests[${index}]: missing description.`);
  }
}

for (const suiteKey of PARALLEL_SUITE_KEYS) {
  if (!testSuites[suiteKey]) errors.push(`PARALLEL_SUITE_KEYS contains unknown suite "${suiteKey}".`);
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Suite registry valid: ${suiteKeys.length} suite(s).`);
