import { ENV } from '../../config';
import { TestSuiteRegistry } from '../types/suite';

export function parseParallelSuiteKeys(): string[] {
  return ENV.PARALLEL_SUITE_KEYS.split(/[,\s]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

export function getSelectedSuiteKeys(): string[] {
  if (ENV.TEST_SUITE === 'parallel') return parseParallelSuiteKeys();
  return ENV.TEST_SUITE.split(/[,\s]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

export function validateSelectedSuites(registry: TestSuiteRegistry, selectedKeys: string[]): void {
  const unknownKeys = selectedKeys.filter((key) => !registry[key]);
  if (unknownKeys.length > 0) {
    const knownKeys = Object.keys(registry).sort().join(', ');
    throw new Error(`Unknown TEST_SUITE key(s): ${unknownKeys.join(', ')}. Known keys: ${knownKeys}`);
  }
}
