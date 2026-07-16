import { frameworkConfig } from '../../framework.config';
import { TestRunnerDefinition, TestSuiteEntry, TestSuiteRegistry, SuiteExecutionMode, SuiteKind } from '../types/suite';

export type SuiteMatrixTestItem = {
  description: string;
  type: 'case' | 'suite';
  suite?: string;
  mode?: SuiteExecutionMode;
  workers?: number;
  testCount: number;
  tests?: SuiteMatrixTestItem[];
};

export type SuiteMatrixItem = {
  suite: string;
  description: string;
  kind: SuiteKind;
  mode: SuiteExecutionMode;
  workers: number;
  testCount: number;
  directSuiteCount: number;
  directCaseCount: number;
  leafCaseCount: number;
  tests: string[];
  testItems: SuiteMatrixTestItem[];
  order: number;
};

export type SuiteMatrix = {
  include: SuiteMatrixItem[];
};

function resolveSuiteMode(mode: SuiteExecutionMode | undefined): SuiteExecutionMode {
  return mode ?? (frameworkConfig.suite.executionMode as SuiteExecutionMode);
}

function resolveSuiteWorkers(mode: SuiteExecutionMode, workers: number | undefined): number {
  return workers ?? (mode === 'parallel' ? frameworkConfig.playwright.workers : 1);
}

function isRunnerEntry(entry: TestSuiteEntry): entry is TestRunnerDefinition {
  return 'test' in entry;
}

function findSuiteForRunner(registry: TestSuiteRegistry, parentSuiteKey: string, runner: TestRunnerDefinition): string | undefined {
  for (const [suiteKey, suite] of Object.entries(registry)) {
    if (suiteKey === parentSuiteKey) continue;
    const onlyEntry = suite.tests[0];
    if (suite.tests.length === 1 && onlyEntry && isRunnerEntry(onlyEntry) && onlyEntry.test === runner.test) return suiteKey;
  }

  return undefined;
}

function buildTestItems(registry: TestSuiteRegistry, suiteKey: string, seenSuiteKeys = new Set<string>()): SuiteMatrixTestItem[] {
  const suite = registry[suiteKey];
  if (!suite || seenSuiteKeys.has(suiteKey)) return [];

  const nextSeenSuiteKeys = new Set(seenSuiteKeys);
  nextSeenSuiteKeys.add(suiteKey);

  return suite.tests.map((entry) => {
    const isExplicitSuiteReference = 'suite' in entry;
    const childSuiteKey = isExplicitSuiteReference ? entry.suite : findSuiteForRunner(registry, suiteKey, entry);
    if (!childSuiteKey || nextSeenSuiteKeys.has(childSuiteKey)) {
      return {
        description: entry.description,
        type: 'case',
        testCount: 1,
      };
    }

    const childSuite = registry[childSuiteKey];
    if (!childSuite) {
      return {
        description: entry.description,
        type: 'case',
        suite: childSuiteKey,
        testCount: 0,
      };
    }

    const isChildSuite = isExplicitSuiteReference || childSuite.tests.length > 1;
    return {
      description: entry.description || childSuite.description,
      type: isChildSuite ? 'suite' : 'case',
      suite: childSuiteKey,
      mode: isChildSuite ? resolveSuiteMode(childSuite.mode) : undefined,
      workers: isChildSuite ? resolveSuiteWorkers(resolveSuiteMode(childSuite.mode), childSuite.workers) : undefined,
      testCount: childSuite.tests.length,
      tests: isChildSuite ? buildTestItems(registry, childSuiteKey, nextSeenSuiteKeys) : undefined,
    };
  });
}

function countDirectItems(testItems: SuiteMatrixTestItem[]): { suites: number; cases: number } {
  return testItems.reduce(
    (total, item) => {
      if (item.type === 'suite') total.suites += 1;
      else total.cases += 1;
      return total;
    },
    { suites: 0, cases: 0 },
  );
}

function countLeafCases(testItems: SuiteMatrixTestItem[]): number {
  return testItems.reduce((total, item) => total + (item.tests?.length ? countLeafCases(item.tests) : 1), 0);
}

function formatContents(suites: number, cases: number): string {
  const parts: string[] = [];
  if (suites > 0) parts.push(`${suites} suite${suites === 1 ? '' : 's'}`);
  if (cases > 0) parts.push(`${cases} case${cases === 1 ? '' : 's'}`);
  return parts.join(', ') || '0 cases';
}

export function parseSuiteKeysFromInput(rawSuite: string, rawParallelSuiteKeys: string): string[] {
  if (rawSuite === 'parallel') {
    return rawParallelSuiteKeys
      .split(/[,\s]+/)
      .map((suite) => suite.trim())
      .filter(Boolean);
  }

  return rawSuite
    .split(/[,\s]+/)
    .map((suite) => suite.trim())
    .filter(Boolean);
}

export function buildSuiteMatrix(registry: TestSuiteRegistry, suiteKeys: string[]): SuiteMatrix {
  const include = suiteKeys.map((suiteKey, index) => {
    const suite = registry[suiteKey];
    if (!suite) {
      throw new Error(`Unknown suite key: ${suiteKey}`);
    }
    const mode = resolveSuiteMode(suite.mode);
    const testItems = buildTestItems(registry, suiteKey);
    const directItems = countDirectItems(testItems);

    return {
      suite: suiteKey,
      description: suite.description,
      kind: suite.kind,
      mode,
      workers: resolveSuiteWorkers(mode, suite.workers),
      testCount: suite.tests.length,
      directSuiteCount: directItems.suites,
      directCaseCount: directItems.cases,
      leafCaseCount: countLeafCases(testItems),
      tests: suite.tests.map((entry) => entry.description),
      testItems,
      order: index + 1,
    } satisfies SuiteMatrixItem;
  });

  return { include };
}

export function renderSuiteMatrixMarkdown(matrix: SuiteMatrix, selectedSuite: string): string {
  const lines: string[] = [];
  const totalWorkers = matrix.include.reduce((total, item) => total + item.workers, 0);
  const serialSuites = matrix.include.filter((item) => item.mode === 'serial').length;
  const parallelSuites = matrix.include.filter((item) => item.mode === 'parallel').length;

  lines.push('# Selected Suites');
  lines.push('');
  lines.push(`- **Selected suite input:** \`${selectedSuite}\``);
  lines.push(`- **Suite jobs:** ${matrix.include.length}`);
  lines.push(`- **Serial suites:** ${serialSuites}`);
  lines.push(`- **Parallel suites:** ${parallelSuites}`);
  lines.push(`- **Allocated workers:** ${totalWorkers}`);
  lines.push('');
  lines.push('| Order | Suite | Kind | Mode | Workers | Contents | Total cases | Description |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

  function renderTestItems(testItems: SuiteMatrixTestItem[], depth = 0): void {
    for (const [index, testItem] of testItems.entries()) {
      const indent = '  '.repeat(depth);
      const suiteLabel = testItem.suite ? ` \`${testItem.suite}\`` : '';
      const countLabel =
        testItem.type === 'suite'
          ? ` (${testItem.testCount} cases, ${testItem.mode}, ${testItem.workers} worker${testItem.workers === 1 ? '' : 's'})`
          : '';
      lines.push(`${indent}${index + 1}. [${testItem.type}]${suiteLabel}${countLabel} - ${testItem.description}`);
      if (testItem.tests?.length) renderTestItems(testItem.tests, depth + 1);
    }
  }

  for (const item of matrix.include) {
    lines.push(
      `| ${item.order} | \`${item.suite}\` | \`${item.kind}\` | \`${item.mode}\` | ${item.workers} | ${formatContents(item.directSuiteCount, item.directCaseCount)} | ${item.leafCaseCount} | ${item.description} |`,
    );
    if (item.testItems.length > 0) {
      lines.push('');
      lines.push(
        `Contents of \`${item.suite}\`: ${formatContents(item.directSuiteCount, item.directCaseCount)} (${item.leafCaseCount} total cases)`,
      );
      renderTestItems(item.testItems);
      lines.push('');
    }
  }

  return lines.join('\n') + '\n';
}
