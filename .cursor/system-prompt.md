# Cursor Project Context

This is a reusable Playwright TypeScript framework for config-driven suite execution.

The framework should remain project-agnostic. Do not add business-specific workflows, real credentials, internal URLs, or private project assumptions to core files.

Key files:

- `framework.config.ts`: centralized framework defaults
- `playwright.config.ts`: Playwright adapter only
- `main.spec.ts`: single Playwright entry point
- `testSuiteConfig.ts`: merged suite registry
- `testSuiteConfig.ui.ts`: UI suite registry
- `testSuiteConfig.api.ts`: API suite registry
- `scripts/doctor.ts`: framework health check
- `templates/`: copy-ready placeholders

Use the rules in `.cursor/rules/`, `AGENTS.md`, `.cursorrules`, and `.github/copilot-instructions.md` when generating or modifying code.
