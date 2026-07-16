# AI Coding Instructions

These rules apply to the whole repository.

## Framework Principles

- Keep admin-managed runtime configuration centralized in `framework.config.json`.
- Treat `.env` as committed dummy secrets only. Real secrets belong in `.env.local`, `.env.*.local`, or CI variables.
- Do not duplicate environment defaults in `playwright.config.ts`, suite registries, setup files, or tests.
- `framework.config.ts` loads `framework.config.json` and environment overrides; `playwright.config.ts` adapts that normalized config into Playwright's config shape.
- Playwright should discover only `main.spec.ts`; suite execution is controlled by the registry.
- Add new tests as exported runner functions and register them in `testSuiteConfig.ui.ts` or `testSuiteConfig.api.ts`.
- Preserve support for serial, parallel, and hybrid suite execution.

## Suite Pattern

A test file should export a runner function:

```ts
export const runFeatureName = () => {
  test('feature behavior', async ({ page }) => {
    await page.goto('/');
  });
};
```

Then register it:

```ts
feature_suite: {
  description: 'Feature suite description.',
  kind: 'ui',
  mode: 'serial',
  tests: [{ test: runFeatureName, description: 'Feature behavior.' }],
}
```

Use `mode: 'serial'` for stateful workflows. Use `mode: 'parallel'` only for independent tests.

## Quality Rules

- Use TypeScript strict mode; avoid `any` unless there is a documented reason.
- Prefer Playwright locators: `getByRole`, `getByLabel`, `getByTestId`, and stable semantic locators.
- Avoid arbitrary sleeps. Prefer web-first assertions and explicit waits for user-visible state.
- Keep tests readable and business-oriented; move repeated mechanics into pages, fixtures, or helpers.
- Do not add real credentials, tokens, internal URLs, customer data, or production secrets.
- Do not edit generated reports or dependency folders.
- Keep templates as `.template.*` files so they are not compiled or executed accidentally.
- Update README or `docs/ADOPTION_CHECKLIST.md` when changing setup, migration, or framework behavior.

## Required Checks

Before considering work complete, run:

```bash
pnpm doctor
pnpm validate:suites
pnpm typecheck
pnpm format:check
pnpm lint
```

If using Bun, the equivalent commands are:

```bash
bun run doctor
bun run validate:suites
bun run typecheck
bun run format:check
bun run lint
```

## Repository Boundaries

- Do not remove the committed dummy `.env` unless the README and install flow are changed accordingly.
- Do not make package scripts depend on one package manager only; scripts must work through `pnpm run` and `bun run`.
- Do not bypass `scripts/validate-suites.ts` when adding or changing suite registry behavior.
