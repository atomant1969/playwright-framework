import { TestSuiteRegistry } from './lib/types/suite';
import { runDemoParallelBeta, runDemoSerialAlpha, runDemoSerialGamma } from './testcases/demo/complex-suite-demo.spec';
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

  demo_serial_alpha: {
    description: 'Demo suite A with three internal tests that run sequentially.',
    kind: 'ui',
    mode: 'serial',
    tags: ['demo', 'serial'],
    tests: [{ test: runDemoSerialAlpha, description: 'Three serial demo tests.' }],
  },

  demo_parallel_beta: {
    description: 'Demo suite B with three internal tests that may run in parallel.',
    kind: 'ui',
    mode: 'parallel',
    workers: 3,
    tags: ['demo', 'parallel'],
    tests: [{ test: runDemoParallelBeta, description: 'Three parallel demo tests.' }],
  },

  demo_serial_gamma: {
    description: 'Demo suite C with three internal tests that run sequentially.',
    kind: 'ui',
    mode: 'serial',
    tags: ['demo', 'serial'],
    tests: [{ test: runDemoSerialGamma, description: 'Three serial demo tests.' }],
  },
};
