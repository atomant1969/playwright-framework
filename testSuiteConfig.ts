import { apiSuites } from './testSuiteConfig.api';
import { uiSuites } from './testSuiteConfig.ui';
import { TestSuiteRegistry } from './lib/types/suite';
import { parseParallelSuiteKeys } from './lib/utils/suiteSelection';

export const testSuites: TestSuiteRegistry = {
  ...uiSuites,
  ...apiSuites,
};

export const PARALLEL_SUITE_KEYS = parseParallelSuiteKeys();
