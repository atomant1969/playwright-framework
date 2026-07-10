# Framework Templates

These files are placeholders for adding new framework pieces without guessing the local conventions.

They use `.template.*` extensions so Playwright and TypeScript do not execute or compile them by accident.

## Typical Flow

1. Copy `ui-runner.spec.template.ts` or `api-runner.spec.template.ts` into `testcases/ui` or `testcases/api`.
2. Rename the exported runner function.
3. Add the runner to `testSuiteConfig.ui.ts` or `testSuiteConfig.api.ts` using `suite-entry.template.ts` as the shape.
4. Run `pnpm validate:suites`.
5. Run `pnpm typecheck`.

## Execution Modes

- Use `mode: 'serial'` for stateful workflows where test order matters.
- Use `mode: 'parallel'` for independent tests that can run at the same time.
- Use `TEST_SUITE=parallel` plus `PARALLEL_SUITE_KEYS=a,b,c` for hybrid execution across suites.
