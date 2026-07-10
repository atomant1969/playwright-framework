# AI IDE Setup

This framework is designed to work with any AI-assisted IDE or coding agent.

## Canonical Rules

The canonical rules live in:

```text
AGENTS.md
```

Use `AGENTS.md` as the source of truth for any AI tool that supports project instructions, repository instructions, agent rules, or custom context files.

Tool-specific files are adapters only:

- `.cursorrules`
- `.cursor/rules/*.mdc`
- `.cursor/system-prompt.md`
- `.github/copilot-instructions.md`

If these files ever conflict with `AGENTS.md`, update the adapter files to match `AGENTS.md`.

## Antigravity

For Antigravity, use `AGENTS.md` as the project instruction source.

Recommended setup:

1. Open the repository in Antigravity.
2. Add or reference `AGENTS.md` as the project-level instruction/context file if the IDE offers that option.
3. Keep terminal command approval enabled for commands that modify files, install packages, push to git, or access environment files.
4. Do not allow agents to read `.env.local`, `.env.*.local`, CI secrets, or private credential files.
5. Ask the agent to run the standard quality gates before finishing work:

```bash
pnpm doctor
pnpm validate:suites
pnpm typecheck
pnpm format:check
pnpm lint
```

Bun equivalents are also valid:

```bash
bun run doctor
bun run validate:suites
bun run typecheck
bun run format:check
bun run lint
```

## Any Other IDE Or Agent

If the tool supports repository instructions, point it to `AGENTS.md`.

If the tool only supports pasted custom instructions, paste the contents of `AGENTS.md` into that setting.

If the tool supports multiple rule files, use this priority order:

1. `AGENTS.md`
2. tool-specific adapter file
3. README and docs
4. code patterns in the repository

## Security Expectations

AI tools must treat these files as sensitive/private even if they exist locally:

- `.env.local`
- `.env.*.local`
- CI secret dumps
- private key files
- cloud credential files
- customer or production data

The committed `.env` is dummy-only and exists so fresh clones can run immediately.
