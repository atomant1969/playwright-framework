import { test } from '@playwright/test';
import { ENV } from './config';
import { runSetup } from './setup';
import { testSuites } from './testSuiteConfig';
import { TestSuiteDefinition } from './lib/types/suite';
import { getSelectedSuiteKeys, validateSelectedSuites } from './lib/utils/suiteSelection';
import logger from './lib/utils/logger';

function registerSuite(suiteKey: string, suite: TestSuiteDefinition): void {
  const mode = suite.mode ?? ENV.SUITE_EXECUTION_MODE;
  const describe = mode === 'parallel' ? test.describe.parallel : test.describe.serial;

  describe(`Suite: ${suiteKey} - ${suite.description}`, () => {
    runSetup(suite.kind);

    test.beforeAll(() => {
      logger.info(`Starting suite=${suiteKey}, kind=${suite.kind}, mode=${mode}`);
    });

    for (const runner of suite.tests) {
      if (typeof runner.test !== 'function') {
        throw new Error(`Suite "${suiteKey}" has an invalid runner: ${runner.description}`);
      }
      runner.test();
    }
  });
}

const selectedSuiteKeys = getSelectedSuiteKeys();
validateSelectedSuites(testSuites, selectedSuiteKeys);

for (const suiteKey of selectedSuiteKeys) {
  registerSuite(suiteKey, testSuites[suiteKey]);
}
