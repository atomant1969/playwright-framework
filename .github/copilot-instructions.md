# Copilot Instructions

This repository is a reusable Playwright TypeScript framework with config-driven suite execution.

When suggesting code:

- Keep configuration centralized in `framework.config.ts`.
- Do not create additional config sources for environment defaults.
- Keep `playwright.config.ts` as an adapter only.
- Preserve the `main.spec.ts` single-entry runner model.
- New test files should export runner functions, then be registered in `testSuiteConfig.ui.ts` or `testSuiteConfig.api.ts`.
- Use `mode: 'serial'` for stateful suites and `mode: 'parallel'` for independent suites.
- Prefer semantic Playwright locators and web-first assertions.
- Do not use fixed sleeps unless there is no reasonable event or state to await.
- Do not introduce real credentials or secrets. The committed `.env` must remain dummy-only.
- Package scripts should work with both pnpm and Bun.
- Update documentation when changing setup, migration, or execution behavior.

Expected checks:

```bash
pnpm doctor
pnpm validate:suites
pnpm typecheck
pnpm format:check
pnpm lint
```
