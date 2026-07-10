import { TestSuiteRegistry } from './lib/types/suite';
import { runApiSmoke } from './testcases/api/api-smoke.spec';

export const apiSuites: TestSuiteRegistry = {
  api_smoke: {
    description: 'Fast API smoke suite.',
    kind: 'api',
    mode: 'parallel',
    tags: ['smoke', 'api'],
    tests: [{ test: runApiSmoke, description: 'Verify API base endpoint responds.' }],
  },
};
