export type SuiteExecutionMode = 'serial' | 'parallel';
export type SuiteKind = 'ui' | 'api' | 'mixed';
export type ParallelSafety = 'safe' | 'readOnly' | 'unsafe' | 'unknown';
export type SuiteRunner = (...args: unknown[]) => void;

export type TestRunnerDefinition = {
  test: SuiteRunner;
  description: string;
};

export type SuiteReferenceDefinition = {
  suite: string;
  description: string;
};

export type TestSuiteEntry = TestRunnerDefinition | SuiteReferenceDefinition;

export type TestSuiteDefinition = {
  description: string;
  kind: SuiteKind;
  mode?: SuiteExecutionMode;
  workers?: number;
  tags?: string[];
  owner?: string;
  parallelSafety?: ParallelSafety;
  parallelGroup?: string;
  dataNamespace?: string;
  recommendedParallelTarget?: boolean;
  tests: TestSuiteEntry[];
};

export type TestSuiteRegistry = Record<string, TestSuiteDefinition>;
