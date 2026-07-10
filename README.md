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
scripts/validate-suites.ts
scripts/doctor.ts
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

Do not blindly overwrite an existing `playwright.config.ts`, `.env`, or CI workflow. Compare first, then move project-specific values into `framework.config.ts` or `.env`.

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

Move scattered defaults from old config files into `framework.config.ts`:

- base URLs
- API URLs
- headless mode
- timeouts
- retries
- timezone
- login settings
- default suite key
- parallel suite keys

Keep `.env` only for environment-specific overrides and secrets.

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

If a value affects how the framework runs, put the default in `framework.config.ts`. If a value changes per machine, user, CI job, or environment, put it in `.env` or CI environment variables.

## Centralized Config

Framework configuration lives in one file:

```text
framework.config.ts
```

A dummy .env is committed so a fresh clone can run immediately. Keep real secrets in ignored local files such as .env.local or CI environment variables. Do not define framework defaults in multiple places.

`.env` is only for runtime overrides such as `TEST_SUITE`, `BASE_URL`, credentials, and headless mode. Do not define framework defaults in multiple places.

## Run

Run the default suite from `.env`:

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

CI runs the framework doctor, typecheck, suite validation, format check, lint, browser install with system dependencies, and the smoke suite.

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

This repo includes guidance files for AI-assisted coding:

- `AGENTS.md` for general coding agents
- `.cursorrules` for Cursor legacy project rules
- `.cursor/rules/*.mdc` for Cursor project rules
- `.cursor/system-prompt.md` for Cursor project context
- `.github/copilot-instructions.md` for GitHub Copilot

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
