# Playwright Suite Framework

A base Playwright framework with centralized configuration and config-driven suite execution.

## Install

Use either pnpm or Bun.

```bash
pnpm i
```

```bash
bun i
```

The `postinstall` script runs `playwright install`, so dependencies and Playwright browsers are installed together. On Linux CI machines you may still need system browser dependencies; the included GitHub workflow uses `playwright install --with-deps` for that.

## Use In An Existing Project

Use this framework as an overlay when you already have Playwright tests and want centralized suite execution.

For a detailed migration checklist, see `docs/ADOPTION_CHECKLIST.md`.

### 1. Copy Framework Files

Copy these files and folders into the existing project root:

```text
framework.config.ts
framework.config.json
config.ts
main.spec.ts
playwright.config.ts
testSuiteConfig.ts
testSuiteConfig.ui.ts
testSuiteConfig.api.ts
setup.ts
lib/types/suite.ts
lib/utils/logger.ts
lib/utils/suiteSelection.ts
lib/utils/suiteMatrix.ts
scripts/validate-suites.ts
scripts/doctor.ts
scripts/generate-suite-matrix.ts
templates/
```

Also copy these quality/setup files if the project does not already have equivalents:

```text
eslint.config.mjs
.prettierrc
.prettierignore
.editorconfig
.env.example
.github/workflows/playwright.yml
```

Do not blindly overwrite an existing `playwright.config.ts`, `.env`, `framework.config.json`, or CI workflow. Compare first, then move project-specific runtime values into `framework.config.json` and secrets into `.env`.

### 2. Install Dependencies

Merge the `devDependencies` and `scripts` from this framework's `package.json` into the existing project's `package.json`.

Then install with either package manager:

```bash
pnpm i
```

```bash
bun i
```

### 3. Centralize Config

Move scattered runtime defaults from old config files into `framework.config.json`:

- base URLs
- API URLs
- headless mode
- timeouts
- retries
- timezone
- login settings
- default suite key
- parallel suite keys

Keep `.env` only for credentials, secrets, and machine-specific overrides.

### 4. Convert Existing Specs To Runners

Existing Playwright specs should export runner functions instead of being discovered directly.

Before:

```ts
import { test } from '@playwright/test';

test('existing test', async ({ page }) => {
  await page.goto('/');
});
```

After:

```ts
import { test } from '@playwright/test';

export const runExistingFeature = () => {
  test('existing test', async ({ page }) => {
    await page.goto('/');
  });
};
```

### 5. Register Suites

Import runner functions into `testSuiteConfig.ui.ts` or `testSuiteConfig.api.ts` and assign each one to a suite key.

```ts
import { runExistingFeature } from './testcases/ui/existing-feature.spec';

export const uiSuites = {
  existing_feature: {
    description: 'Existing feature regression suite.',
    kind: 'ui',
    mode: 'serial',
    tests: [{ test: runExistingFeature, description: 'Existing feature checks.' }],
  },
};
```

### 6. Restrict Playwright Discovery

The framework expects Playwright to execute only `main.spec.ts`.

```ts
testMatch: 'main.spec.ts';
```

This prevents duplicate execution: once directly by Playwright and once through the suite registry.

### 7. Validate Migration

Run the framework checks:

```bash
pnpm doctor
pnpm validate:suites
pnpm typecheck
pnpm format:check
pnpm lint
```

Or with Bun:

```bash
bun run doctor
bun run validate:suites
bun run typecheck
bun run format:check
bun run lint
```

Then run one migrated suite:

```bash
TEST_SUITE=existing_feature pnpm test
```

### Migration Rule Of Thumb

If a value affects how the framework normally runs, put the default in `framework.config.json`. If a value is a secret or changes per machine, user, CI job, or environment, put it in `.env` or CI environment variables.

## Centralized Config

Admin-managed framework configuration lives in one file:

```text
framework.config.json
```

A dummy `.env` is committed so a fresh clone has placeholder credential keys. Use `.env` for credentials, secrets, and deliberate environment overrides only. Keep real secrets in ignored local files such as `.env.local` or CI environment variables.

## Run

Run the default suite from `framework.config.json`:

```bash
pnpm test
bun run test
```

Run a specific suite:

```bash
TEST_SUITE=smoke pnpm test
TEST_SUITE=account_flow pnpm test
TEST_SUITE=api_smoke pnpm test
```

Run hybrid parallel mode:

```bash
PARALLEL_SUITE_KEYS=smoke,api_smoke TEST_SUITE=parallel pnpm test
```

In hybrid mode, Playwright runs selected suites across workers. Each suite still controls its internal mode with `mode: 'serial'` or `mode: 'parallel'`.

## Built-In Examples

The framework includes two explicitly named example targets. They are safe, fast, and self-contained, so you can use them to understand suite registration and the admin dashboard without connecting to a real application.

### Basic Example

`example_basic` demonstrates the smallest useful suite shape:

- one suite key
- one runner function
- two simple Playwright tests
- serial execution

Run it from the console:

```bash
TEST_SUITE=example_basic pnpm test
```

Or select `example_basic` in the Admin Dashboard Run target field.

### Complicated Example

`example_complicated` demonstrates the framework features used by larger projects:

- a parent suite
- nested child suite references
- serial child suites
- a parallel child suite with its own worker count
- metadata for parallel safety, grouping, and data namespace
- matrix expansion that shows child suites and leaf cases
- live Admin Dashboard status for nested cases

Run it from the console:

```bash
TEST_SUITE=example_complicated pnpm test
```

Inspect its structure without running tests:

```bash
TEST_SUITE=example_complicated pnpm matrix
```

In the Admin Dashboard, select `example_complicated` and click Matrix to see the nested suite tree before clicking Run.

## Quality Gates

The framework includes TypeScript checks, suite registry validation, ESLint, and Prettier by default.

```bash
pnpm doctor
pnpm typecheck
pnpm validate:suites
pnpm format:check
pnpm lint
```

The same commands work through Bun:

```bash
bun run doctor
bun run typecheck
bun run validate:suites
bun run format:check
bun run lint
```

Auto-fix formatting and simple lint issues:

```bash
pnpm format
pnpm lint:fix
```

CI runs the framework doctor, typecheck, suite validation, format check, lint, generates a GitHub suite matrix, and runs each selected suite as its own realtime GitHub Actions job.

## GitHub Suite Matrix

GitHub Actions is config-first. Push, pull request, and manual runs use committed `framework.config.json` values by default:

```text
TEST_SUITE
PARALLEL_SUITE_KEYS
PLAYWRIGHT_WORKERS
```

Manual workflow inputs are optional overrides only. Leave `test_suite_override` and `parallel_suite_keys_override` blank to run exactly what the project config selects.

The framework can convert the selected suite configuration into a GitHub Actions matrix:

```bash
pnpm matrix
bun run matrix
```

The matrix includes:

- suite key
- suite order
- suite kind: `ui`, `api`, or `mixed`
- suite mode: `serial` or `parallel`
- suite description

The command writes artifacts to:

```text
test-results/suite-matrix.json
test-results/suite-matrix.compact.json
test-results/suite-matrix.md
```

In GitHub Actions, the workflow uses this matrix so each selected suite appears as a separate realtime job:

```text
select-suites
suite 1 - smoke [parallel, 3 workers]
suite 2 - api_smoke [parallel, 3 workers]
```

For `TEST_SUITE=parallel`, every key in `PARALLEL_SUITE_KEYS` becomes its own `suite ...` job. Inside each job, the suite still controls whether its internal tests run serially or in parallel.

Each suite job also writes a Markdown test tree to the GitHub job summary:

```text
demo_parallel_beta [parallel, 3 workers]
|-- beta parallel test 1
|-- beta parallel test 2
`-- beta parallel test 3
```

Use `pnpm suite:summary` locally to generate the same summary for the selected `TEST_SUITE`.

After the suite runs, the workflow appends a result table to the same job summary:

```text
PASS | beta parallel test 1 | 721 ms
FAIL | beta parallel test 2 | 704 ms | Expected ...
PASS | beta parallel test 3 | 719 ms
```

Use `pnpm suite:results` locally after `pnpm test` to generate the same PASS/FAIL table from the Playwright JSON report.

## Suite Model

Suites live in `testSuiteConfig.ui.ts` and `testSuiteConfig.api.ts`.

```ts
export const uiSuites = {
  account_flow: {
    description: 'Stateful UI flow.',
    kind: 'ui',
    mode: 'serial',
    tests: [{ test: runAccountFlow, description: 'Account flow.' }],
  },
};
```

## Execution Modes

- `mode: 'serial'`: tests inside the suite run sequentially.
- `mode: 'parallel'`: tests inside the suite may run in parallel.
- `TEST_SUITE=parallel`: multiple suite keys from `PARALLEL_SUITE_KEYS` are registered together and distributed across workers.

## Add a New Suite

1. Create a runner in `testcases/ui` or `testcases/api`.
2. Export a function that registers Playwright tests.
3. Import it in the matching `testSuiteConfig.*.ts` file.
4. Add a suite entry with `description`, `kind`, `mode`, and `tests`.
5. Run `pnpm validate:suites` or `bun run validate:suites`.

## AI Coding Rules

This repo includes guidance files for AI-assisted coding. The canonical, IDE-agnostic source of truth is:

- `AGENTS.md`

Tool-specific adapters are also included:

- `.cursorrules` for Cursor legacy project rules
- `.cursor/rules/*.mdc` for Cursor project rules
- `.cursor/system-prompt.md` for Cursor project context
- `.github/copilot-instructions.md` for GitHub Copilot

For Antigravity and other IDEs, use `AGENTS.md` as the project instruction source. See `docs/AI_IDE_SETUP.md` for setup guidance.

These files describe the framework architecture, suite registration pattern, centralized config rule, secret-handling expectations, and required quality gates. Keep them updated when the framework conventions change.

## Templates

Copy-ready placeholders live in `templates/`:

- `ui-runner.spec.template.ts`
- `api-runner.spec.template.ts`
- `suite-entry.template.ts`
- `page-object.template.ts`
- `helper.template.ts`
- `test-data.template.json`
- `env.template`
- `workflow-smoke.template.yml`

They use `.template.*` extensions so they are not executed by Playwright or compiled by TypeScript until copied and renamed.
