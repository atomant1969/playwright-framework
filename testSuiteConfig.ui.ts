import { TestSuiteRegistry } from './lib/types/suite';
import { runAccountFlow } from './testcases/ui/account-flow.spec';
import { runUiSmoke } from './testcases/ui/smoke.spec';

export const uiSuites: TestSuiteRegistry = {
  smoke: {
    description: 'Fast UI smoke suite.',
    kind: 'ui',
    mode: 'parallel',
    tags: ['smoke', 'ui'],
    tests: [{ test: runUiSmoke, description: 'Open the application and verify the page responds.' }],
  },

  account_flow: {
    description: 'Example stateful UI flow. Internal tests run sequentially.',
    kind: 'ui',
    mode: 'serial',
    tags: ['regression', 'ui'],
    tests: [{ test: runAccountFlow, description: 'Example multi-step account flow.' }],
  },

  regression: {
    description: 'Example composed UI regression suite.',
    kind: 'ui',
    mode: 'serial',
    tags: ['regression'],
    tests: [
      { test: runUiSmoke, description: 'Smoke pre-check.' },
      { test: runAccountFlow, description: 'Stateful account flow.' },
    ],
  },
};
