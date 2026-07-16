import { TestSuiteRegistry } from './lib/types/suite';
import { runDemoParallelBeta, runDemoSerialAlpha, runDemoSerialGamma } from './testcases/demo/complex-suite-demo.spec';
import {
  runExampleBasicFirstCheck,
  runExampleBasicSecondCheck,
  runExampleComplicatedCleanupArchive,
  runExampleComplicatedCleanupVerify,
  runExampleComplicatedParallelCheckA,
  runExampleComplicatedParallelCheckB,
  runExampleComplicatedParallelCheckC,
  runExampleComplicatedSetupCreateData,
  runExampleComplicatedSetupVerifyData,
} from './testcases/examples/framework-examples.spec';
import { runAccountFlow } from './testcases/ui/account-flow.spec';
import { runUiSmoke } from './testcases/ui/smoke.spec';

export const uiSuites: TestSuiteRegistry = {
  example_basic: {
    description: 'EXAMPLE - Basic suite: two simple checks in one serial suite.',
    kind: 'ui',
    mode: 'serial',
    tags: ['example', 'basic'],
    parallelSafety: 'readOnly',
    dataNamespace: 'example-basic',
    tests: [
      { test: runExampleBasicFirstCheck, description: 'Basic example case 1: assertion-only check.' },
      { test: runExampleBasicSecondCheck, description: 'Basic example case 2: second assertion-only check.' },
    ],
  },

  example_complicated: {
    description: 'EXAMPLE - Complicated suite: nested serial and parallel child suites running as separate lanes.',
    kind: 'mixed',
    mode: 'parallel',
    workers: 3,
    tags: ['example', 'complicated', 'nested'],
    parallelSafety: 'safe',
    parallelGroup: 'examples',
    dataNamespace: 'example-complicated-*',
    recommendedParallelTarget: true,
    tests: [
      { suite: 'example_complicated_setup', description: 'Nested serial child suite for ordered setup-style checks.' },
      { suite: 'example_complicated_parallel_checks', description: 'Nested check suite allows its internal tests to run in parallel.' },
      { suite: 'example_complicated_cleanup', description: 'Nested serial child suite for ordered cleanup-style checks.' },
    ],
  },

  example_complicated_setup: {
    description: 'EXAMPLE CHILD - Complicated setup suite with serial setup checks.',
    kind: 'ui',
    mode: 'serial',
    workers: 1,
    tags: ['example', 'complicated', 'setup'],
    parallelSafety: 'safe',
    parallelGroup: 'examples',
    dataNamespace: 'example-complicated-setup',
    tests: [
      { test: runExampleComplicatedSetupCreateData, description: 'Create isolated example prerequisites.' },
      { test: runExampleComplicatedSetupVerifyData, description: 'Verify setup prerequisites.' },
    ],
  },

  example_complicated_parallel_checks: {
    description: 'EXAMPLE CHILD - Complicated parallel checks suite.',
    kind: 'ui',
    mode: 'parallel',
    workers: 3,
    tags: ['example', 'complicated', 'parallel'],
    parallelSafety: 'readOnly',
    parallelGroup: 'examples',
    dataNamespace: 'example-complicated-readonly',
    tests: [
      { test: runExampleComplicatedParallelCheckA, description: 'Independent parallel check A.' },
      { test: runExampleComplicatedParallelCheckB, description: 'Independent parallel check B.' },
      { test: runExampleComplicatedParallelCheckC, description: 'Independent parallel check C.' },
    ],
  },

  example_complicated_cleanup: {
    description: 'EXAMPLE CHILD - Complicated cleanup suite with serial cleanup checks.',
    kind: 'ui',
    mode: 'serial',
    workers: 1,
    tags: ['example', 'complicated', 'cleanup'],
    parallelSafety: 'safe',
    parallelGroup: 'examples',
    dataNamespace: 'example-complicated-cleanup',
    tests: [
      { test: runExampleComplicatedCleanupArchive, description: 'Archive generated example data.' },
      { test: runExampleComplicatedCleanupVerify, description: 'Verify cleanup left no residue.' },
    ],
  },

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
