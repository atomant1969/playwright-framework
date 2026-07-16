import { testSuites } from '../testSuiteConfig';
import { getSelectedSuiteKeys, validateSelectedSuites } from '../lib/utils/suiteSelection';

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

  for (const [index, entry] of suite.tests.entries()) {
    if (!entry.description?.trim()) errors.push(`${suiteKey}.tests[${index}]: missing description.`);

    if ('suite' in entry) {
      if (!entry.suite?.trim()) errors.push(`${suiteKey}.tests[${index}]: missing nested suite key.`);
      else if (!testSuites[entry.suite]) errors.push(`${suiteKey}.tests[${index}]: unknown nested suite "${entry.suite}".`);
      else if (entry.suite === suiteKey) errors.push(`${suiteKey}.tests[${index}]: nested suite cannot reference itself.`);
      continue;
    }

    if (typeof entry.test !== 'function') errors.push(`${suiteKey}.tests[${index}]: test is not a function.`);
  }
}

try {
  const selectedSuiteKeys = getSelectedSuiteKeys();
  validateSelectedSuites(testSuites, selectedSuiteKeys);
  console.log(`Selected suite key(s): ${selectedSuiteKeys.join(', ')}`);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Suite registry valid: ${suiteKeys.length} suite(s).`);
