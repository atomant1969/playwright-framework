export type SuiteExecutionMode = 'serial' | 'parallel';
export type SuiteKind = 'ui' | 'api' | 'mixed';
export type SuiteRunner = () => void;

export type TestRunnerDefinition = {
  test: SuiteRunner;
  description: string;
};

export type TestSuiteDefinition = {
  description: string;
  kind: SuiteKind;
  mode?: SuiteExecutionMode;
  workers?: number;
  tags?: string[];
  owner?: string;
  tests: TestRunnerDefinition[];
};

export type TestSuiteRegistry = Record<string, TestSuiteDefinition>;
