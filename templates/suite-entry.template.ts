import { TestSuiteRegistry } from '../lib/types/suite';
import { runFeatureUi } from '../testcases/ui/feature.spec';

/**
 * Template: suite registry entry.
 * Paste the object entry into testSuiteConfig.ui.ts or testSuiteConfig.api.ts.
 */
export const exampleSuites: TestSuiteRegistry = {
  feature_suite: {
    description: 'Describe the suite in business language.',
    kind: 'ui',
    mode: 'serial',
    tags: ['feature', 'regression'],
    owner: 'team-or-person',
    tests: [
      {
        test: runFeatureUi,
        description: 'Describe what this runner covers.',
      },
    ],
  },
};
