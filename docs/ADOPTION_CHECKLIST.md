# Existing Project Adoption Checklist

Use this checklist when adding the framework to an existing Playwright project.

## Before Copying

- Identify existing Playwright config files.
- Identify existing environment/config files.
- Identify current package manager: pnpm, Bun, npm, or yarn.
- List current test folders and naming conventions.
- Decide whether existing specs should be migrated all at once or suite by suite.

## Copy Framework Files

Copy the framework files into the project root:

- `framework.config.ts`
- `config.ts`
- `main.spec.ts`
- `playwright.config.ts`
- `testSuiteConfig.ts`
- `testSuiteConfig.ui.ts`
- `testSuiteConfig.api.ts`
- `setup.ts`
- `lib/types/suite.ts`
- `lib/utils/logger.ts`
- `lib/utils/suiteSelection.ts`
- `scripts/validate-suites.ts`
- `scripts/doctor.ts`
- `templates/`

Copy quality files if the project does not already have equivalents:

- `eslint.config.mjs`
- `.prettierrc`
- `.prettierignore`
- `.editorconfig`
- `.env.example`

## Merge Package Setup

Merge scripts and dev dependencies from `package.json`.

Required scripts:

- `postinstall`
- `test`
- `test:parallel`
- `test:ui`
- `typecheck`
- `validate:suites`
- `doctor`
- `lint`
- `format`
- `format:check`

## Centralize Config

Move framework defaults to `framework.config.ts`:

- base URL
- API base URL
- default suite
- parallel suite keys
- suite execution mode
- headless mode
- timezone
- timeouts
- retries
- logging level
- login enabled/default credential names

Keep `.env` and CI variables for environment-specific values only.

## Convert Tests Gradually

Convert existing specs into runner functions:

```ts
export const runFeature = () => {
  test('feature behavior', async ({ page }) => {
    await page.goto('/');
  });
};
```

Register runners in `testSuiteConfig.ui.ts` or `testSuiteConfig.api.ts`.

## Prevent Duplicate Execution

Make sure Playwright discovers only the framework entry point:

```ts
testMatch: 'main.spec.ts';
```

Existing spec files should run through registered suite runners, not direct discovery.

## Validate

Run:

```bash
pnpm doctor
pnpm validate:suites
pnpm typecheck
pnpm format:check
pnpm lint
```

Or:

```bash
bun run doctor
bun run validate:suites
bun run typecheck
bun run format:check
bun run lint
```

Then run one migrated suite:

```bash
TEST_SUITE=your_suite_key pnpm test
```
