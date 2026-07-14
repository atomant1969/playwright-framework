import { frameworkConfig } from '../../framework.config';
import { TestSuiteRegistry, SuiteExecutionMode, SuiteKind } from '../types/suite';

export type SuiteMatrixItem = {
  suite: string;
  description: string;
  kind: SuiteKind;
  mode: SuiteExecutionMode;
  workers: number;
  order: number;
};

export type SuiteMatrix = {
  include: SuiteMatrixItem[];
};

function resolveSuiteMode(mode: SuiteExecutionMode | undefined): SuiteExecutionMode {
  return mode ?? frameworkConfig.suite.executionMode;
}

function resolveSuiteWorkers(mode: SuiteExecutionMode, workers: number | undefined): number {
  return workers ?? (mode === 'parallel' ? frameworkConfig.playwright.workers : 1);
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

    return {
      suite: suiteKey,
      description: suite.description,
      kind: suite.kind,
      mode,
      workers: resolveSuiteWorkers(mode, suite.workers),
      order: index + 1,
    } satisfies SuiteMatrixItem;
  });

  return { include };
}

export function renderSuiteMatrixMarkdown(matrix: SuiteMatrix, selectedSuite: string): string {
  const lines: string[] = [];

  lines.push('# Suite Matrix');
  lines.push('');
  lines.push(`- **Selected suite input:** \`${selectedSuite}\``);
  lines.push(`- **Suite jobs:** ${matrix.include.length}`);
  lines.push('');
  lines.push('| Order | Suite | Kind | Mode | Workers | Description |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const item of matrix.include) {
    lines.push(`| ${item.order} | \`${item.suite}\` | \`${item.kind}\` | \`${item.mode}\` | ${item.workers} | ${item.description} |`);
  }

  return lines.join('\n') + '\n';
}
