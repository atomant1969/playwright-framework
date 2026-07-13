import fs from 'node:fs';
import path from 'node:path';
import { frameworkConfig } from '../../framework.config';
import { TestSuiteDefinition, TestSuiteRegistry, SuiteExecutionMode, SuiteKind } from '../types/suite';

export type ExecutionPlanRunMode = 'serial' | 'parallel' | 'hybrid';

export type ExecutionPlanTest = {
  order: number;
  description: string;
  runnerName: string;
};

export type ExecutionPlanSuite = {
  order: number;
  key: string;
  description: string;
  kind: SuiteKind;
  mode: SuiteExecutionMode;
  tags: string[];
  owner?: string;
  tests: ExecutionPlanTest[];
};

export type ExecutionPlan = {
  generatedAt: string;
  selectedSuite: string;
  runMode: ExecutionPlanRunMode;
  selectedSuites: ExecutionPlanSuite[];
};

export function getRunnerName(runner: unknown): string {
  if (typeof runner !== 'function') return 'unknownRunner';
  return runner.name || 'anonymousRunner';
}

function resolveSuiteMode(suite: TestSuiteDefinition): SuiteExecutionMode {
  return suite.mode ?? frameworkConfig.suite.executionMode;
}

function resolveRunMode(selectedSuite: string, suites: ExecutionPlanSuite[]): ExecutionPlanRunMode {
  if (selectedSuite === 'parallel') return 'hybrid';
  return suites[0]?.mode ?? frameworkConfig.suite.executionMode;
}

export function buildExecutionPlan(registry: TestSuiteRegistry, selectedKeys: string[]): ExecutionPlan {
  const selectedSuites = selectedKeys.map((suiteKey, suiteIndex) => {
    const suite = registry[suiteKey];
    if (!suite) {
      throw new Error(`Unknown suite key in execution plan: ${suiteKey}`);
    }

    return {
      order: suiteIndex + 1,
      key: suiteKey,
      description: suite.description,
      kind: suite.kind,
      mode: resolveSuiteMode(suite),
      tags: suite.tags ?? [],
      owner: suite.owner,
      tests: suite.tests.map((runner, runnerIndex) => ({
        order: runnerIndex + 1,
        description: runner.description,
        runnerName: getRunnerName(runner.test),
      })),
    } satisfies ExecutionPlanSuite;
  });

  return {
    generatedAt: new Date().toISOString(),
    selectedSuite: frameworkConfig.suite.testSuite,
    runMode: resolveRunMode(frameworkConfig.suite.testSuite, selectedSuites),
    selectedSuites,
  };
}

export function renderExecutionPlanText(plan: ExecutionPlan): string {
  const lines: string[] = [];

  lines.push('Execution Plan');
  lines.push('==============');
  lines.push(`Generated: ${plan.generatedAt}`);
  lines.push(`Selected suite: ${plan.selectedSuite}`);
  lines.push(`Run mode: ${plan.runMode}`);
  lines.push(`Suites: ${plan.selectedSuites.map((suite) => suite.key).join(', ')}`);
  lines.push('');

  for (const suite of plan.selectedSuites) {
    const suiteHeader = `${suite.order}. [${suite.mode}] ${suite.key} (${suite.kind}) - ${suite.description}`;
    lines.push(suiteHeader);

    if (suite.tags.length > 0) lines.push(`   tags: ${suite.tags.join(', ')}`);
    if (suite.owner) lines.push(`   owner: ${suite.owner}`);

    for (const test of suite.tests) {
      lines.push(`   ${suite.order}.${test.order}. ${test.description} [${test.runnerName}]`);
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function renderExecutionPlanMarkdown(plan: ExecutionPlan): string {
  const lines: string[] = [];

  lines.push('# Execution Plan');
  lines.push('');
  lines.push(`- **Generated:** ${plan.generatedAt}`);
  lines.push(`- **Selected suite:** \`${plan.selectedSuite}\``);
  lines.push(`- **Run mode:** \`${plan.runMode}\``);
  lines.push(`- **Suites:** ${plan.selectedSuites.map((suite) => `\`${suite.key}\``).join(', ')}`);
  lines.push('');

  for (const suite of plan.selectedSuites) {
    lines.push(`## ${suite.order}. ${suite.key}`);
    lines.push('');
    lines.push(`- **Description:** ${suite.description}`);
    lines.push(`- **Kind:** \`${suite.kind}\``);
    lines.push(`- **Mode:** \`${suite.mode}\``);
    if (suite.tags.length > 0) lines.push(`- **Tags:** ${suite.tags.map((tag) => `\`${tag}\``).join(', ')}`);
    if (suite.owner) lines.push(`- **Owner:** ${suite.owner}`);
    lines.push('');
    lines.push('| Order | Runner | Description |');
    lines.push('| :--- | :--- | :--- |');
    for (const test of suite.tests) {
      lines.push(`| ${suite.order}.${test.order} | \`${test.runnerName}\` | ${test.description} |`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function writeExecutionPlanArtifacts(plan: ExecutionPlan, outputDir = 'test-results'): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'execution-plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'execution-plan.md'), renderExecutionPlanMarkdown(plan), 'utf8');
}
