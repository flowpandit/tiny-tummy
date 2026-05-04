# Repository Guidelines

## Source of Truth

For Codex-assisted work, use these files in this order when instructions overlap:

1. `AGENTS.md` for repository-specific implementation and verification rules.
2. `docs/CODEX_PLAYBOOK.md` for how to prompt Codex, how tasks should be scoped, and what context to provide.
3. `README.md` for setup, commands, and high-level product and platform context.
4. `ARCHITECTURE_GUIDELINES.md` and focused implementation docs for deeper subsystem decisions.

When repo docs and ad hoc prompts conflict, prefer the repo docs unless the user explicitly asks to override them for the current task.

## Project Structure & Module Organization

`src/` contains the React + TypeScript frontend. Keep route-level pages in `src/pages/`, shared UI in `src/components/ui/`, and feature-specific components in folders such as `src/components/feed/` or `src/components/sleep/`. Business logic and persistence helpers live in `src/lib/`, reusable state is in `src/hooks/` and `src/contexts/`, and global styles are in `src/styles/`. Native Tauri code, SQLite migrations, and mobile/desktop packaging config live in `src-tauri/`. Tests are in `tests/`. Shipped assets belong in `public/` or `src/assets/`; editable design source files are kept in `affinity-assets/`.

## Build, Test, and Development Commands

Use `npm run dev` for the Vite frontend only. Use `npm run tauri dev` when you need the desktop shell. Run `npm run build` for a production frontend build, `npm test` for the Node test suite, and `npm run lint` for ESLint. `npm run check:dead-code` scans for unused code, and `npm run check:all` runs the main verification chain before a handoff. For desktop smoke coverage, run `npm run test:e2e:tauri`.

## Coding Style & Naming Conventions

Write TypeScript with 2-space indentation and follow the existing semicolon-free style. Components, pages, and context providers use `PascalCase` filenames such as `Home.tsx` or `ThemeContext.tsx`; hooks use `camelCase` with a `use` prefix, such as `useFeedPageState.ts`. Keep utility modules narrowly scoped and colocate feature code by domain. The repo uses strict TypeScript, ESLint, and Vite; fix lint and type errors before submitting.

## Implementation Rules

Keep route files thin: pages should handle navigation, compose hooks/components, and pass explicit props. Put pure business logic, formatters, view-model shaping, and reusable transformations in `src/lib/`, not inline in JSX. Put timers, async orchestration, visibility handling, refresh flows, and storage-backed behavior in focused hooks under `src/hooks/`. Treat persistence as a boundary: avoid raw `db.*` calls in `src/pages`, `src/components`, and usually `src/contexts`; prefer `lib` for pure transforms, a hook or feature service for loading/saving, and UI that only renders prepared data. Reuse existing workflow hooks before adding new ad hoc patterns. When refactoring, remove or update superseded modules, components, hooks, and helpers in the same change; do not leave orphaned files behind if their callers have been removed.

## Code quality constraints

•⁠  ⁠Prefer parse-don’t-validate: convert raw input into typed/domain objects at boundaries.
•⁠  ⁠Do not pass untrusted raw strings/JSON deeper into business logic.
•⁠  ⁠Invalid states should be unrepresentable where practical.
•⁠  ⁠Add or update tests for parsing/constructor failures.
•⁠  ⁠Before finishing, run typecheck, lint, and tests.

## Testing Guidelines

Tests use Node’s built-in test runner with `tsx` and Testing Library where DOM rendering is needed. Add new tests under `tests/` with the `*.test.ts` naming pattern, for example `tests/feed-insights.test.ts`. Prefer focused unit tests for `src/lib/` logic and hook/component tests for user-visible behavior. Run `npm test` locally before opening a PR. For refactors, add or update tests when behavior or view-model shaping changes, and run `npm run check:dead-code` whenever files or component boundaries move so orphaned modules are cleaned up before handoff.

## Commit & Pull Request Guidelines

Recent history follows short conventional commits such as `feat: ...` and `refactor: ...`; keep that format for new work. PRs should explain the user-visible change, note any data-model or Tauri impact, link the relevant issue, and include screenshots or recordings for UI changes. Before requesting review, run `npm run check:all` and mention any skipped verification explicitly. Treat a clean `npm run check:dead-code` result as required for refactor PRs, not optional.

## Codex Workflow

Treat Codex as an implementation partner, not a source of unstated product decisions. Good requests are concrete and include the goal, constraints, relevant files, and verification expectations.

Prefer prompts in this shape:

```text
Goal: <what should change>
Context: <files, routes, hooks, docs to inspect first>
Constraints: <architecture, UX, platform, or non-goals>
Verification: <commands to run or checks to perform>
```

Examples:

```text
Goal: Add validation to the child creation flow.
Context: AGENTS.md, docs/CODEX_PLAYBOOK.md, src/pages/AddChild.tsx, related hooks and lib modules.
Constraints: Keep route files thin. Put business logic in hooks or src/lib. Do not change the Tauri layer.
Verification: Run npm test and npm run lint.
```

```text
Goal: Review the report flow for regressions.
Context: AGENTS.md, docs/CODEX_PLAYBOOK.md, src/pages/Report.tsx, src/hooks/useReportPageState.ts, tests/report-view-model.test.ts.
Constraints: Findings first, ordered by severity, with file references.
Verification: No code changes unless I ask for them.
```

If a task depends on a specific workflow or hidden constraint, put it in repo docs rather than relying on repeated chat instructions.
