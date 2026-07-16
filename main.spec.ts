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

    const registerEntries = (ownerSuiteKey: string, ownerSuite: TestSuiteDefinition, seenSuiteKeys = new Set<string>()) => {
      if (seenSuiteKeys.has(ownerSuiteKey)) {
        logger.error(`Nested suite cycle detected at "${ownerSuiteKey}".`);
        return;
      }

      const nextSeenSuiteKeys = new Set(seenSuiteKeys);
      nextSeenSuiteKeys.add(ownerSuiteKey);

      for (const entry of ownerSuite.tests) {
        const entryLabel = 'suite' in entry ? `${entry.suite} - ${entry.description}` : entry.description;
        if ('suite' in entry) {
          const childSuite = testSuites[entry.suite];
          if (!childSuite) {
            logger.error(`Nested suite "${entry.suite}" referenced by "${ownerSuiteKey}" is not registered.`);
            continue;
          }

          const childMode = childSuite.mode ?? ENV.SUITE_EXECUTION_MODE;
          const childDescribe = childMode === 'parallel' ? test.describe.parallel : test.describe.serial;
          childDescribe(entryLabel, () => {
            registerEntries(entry.suite, childSuite, nextSeenSuiteKeys);
          });
          continue;
        }

        if (typeof entry.test !== 'function') {
          throw new Error(`Suite "${ownerSuiteKey}" has an invalid runner: ${entry.description}`);
        }

        test.describe.serial(entryLabel, () => {
          entry.test();
        });
      }
    };

    registerEntries(suiteKey, suite);
  });
}

const selectedSuiteKeys = getSelectedSuiteKeys();
validateSelectedSuites(testSuites, selectedSuiteKeys);

for (const suiteKey of selectedSuiteKeys) {
  registerSuite(suiteKey, testSuites[suiteKey]);
}
