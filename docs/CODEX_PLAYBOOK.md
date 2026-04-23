# Codex Playbook

This document explains the standard way to work with Codex in this repository so future tasks do not depend on repeated prompt coaching.

## Purpose
Use Codex as a pair programmer that can inspect the repo, make bounded changes, run verification, and explain the result. Codex works best when the task is concrete and the repo docs encode the stable rules.

## Source Of Truth
When Codex needs project context, use this order:
1. `AGENTS.md`
2. `docs/CODEX_PLAYBOOK.md`
3. `README.md`
4. `ARCHITECTURE_GUIDELINES.md`
5. Focused implementation plans or subsystem docs that are still current

If a document becomes stale, update or remove it quickly. Incorrect context is worse than missing context.

## What To Put In A Prompt
Most successful prompts include four parts:

```text
Goal: the user-visible or developer-visible change
Context: the files, routes, hooks, or docs to inspect first
Constraints: architectural rules, non-goals, and boundaries
Verification: the checks Codex should run before handing off
```

Recommended prompt template:

```text
Goal: <what should change>
Context: AGENTS.md, docs/CODEX_PLAYBOOK.md, <relevant files>
Constraints:
- <important rule 1>
- <important rule 2>
- <explicit non-goal>
Verification:
- <command 1>
- <command 2>
```

## Prompt Patterns

### Implement A Feature

```text
Goal: Add <feature>.
Context: AGENTS.md, docs/CODEX_PLAYBOOK.md, src/pages/<Page>.tsx, related hooks and lib modules.
Constraints:
- Keep route files thin.
- Put business logic in src/lib or focused hooks.
- Do not change unrelated flows.
Verification:
- npm test
- npm run lint
```

### Refactor Safely

```text
Goal: Refactor <area> for clarity without changing behavior.
Context: AGENTS.md, docs/CODEX_PLAYBOOK.md, <current files>, related tests.
Constraints:
- Preserve behavior.
- Remove superseded code in the same change.
- Keep persistence out of pages and presentational components.
Verification:
- npm test
- npm run check:dead-code
```

### Review Only

```text
Review this change for bugs, regressions, and missing tests.
Context: AGENTS.md, docs/CODEX_PLAYBOOK.md, <files or PR scope>.
Constraints:
- Findings first, ordered by severity.
- Include file references.
- Do not make code changes.
```

### Investigate Before Changing

```text
Goal: Understand why <bug or behavior> happens.
Context: AGENTS.md, docs/CODEX_PLAYBOOK.md, <suspect files>.
Constraints:
- Inspect first.
- Explain root cause before editing.
- Only patch if the cause is clear.
Verification:
- Describe what you checked.
```

## Boundaries That Matter In This Repo
- Keep page files focused on composition, navigation, and explicit props.
- Move pure logic, formatting, and view-model shaping into `src/lib/`.
- Put async orchestration, timers, refresh logic, and storage-backed behavior into focused hooks under `src/hooks/`.
- Avoid raw persistence calls from `src/pages`, `src/components`, and usually `src/contexts`.
- Reuse existing hooks and workflows before creating new patterns.
- Remove or update obsolete files during refactors.

## How To Get More Accurate Results
- Name the exact files Codex should inspect first.
- State what should not change.
- Say whether the task is implementation, review, refactor, or investigation.
- Ask for verification explicitly.
- Point to the relevant doc if the task has domain-specific rules.

High-signal example:

```text
Goal: Add an empty state to the sleep timeline.
Context: AGENTS.md, docs/CODEX_PLAYBOOK.md, src/pages/Sleep.tsx, src/hooks/useSleepLogs.ts, related components in src/components/sleep/.
Constraints:
- Reuse existing empty-state styling patterns.
- Do not change logging behavior.
- Keep data loading in hooks.
Verification:
- npm test
- npm run lint
```

Low-signal example:

```text
Make the sleep page better.
```

## When To Update Docs Instead Of Repeating Yourself
If you find yourself repeating any of these in prompts, move them into docs:
- architecture boundaries
- preferred commands
- naming conventions
- review expectations
- platform gotchas
- stable product constraints

Prefer updating repo docs when the rule should apply again later. Prefer chat-only instructions when the rule is one-off for the current task.

## Verification Expectations
Use the lightest verification that still matches the risk of the change.

Common checks:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run check:dead-code`
- `npm run check:all`

For review requests, findings are the primary output. For implementation requests, a change is not complete until verification is reported or any skipped checks are called out clearly.

## Recommended Maintenance
Keep these files current:
- `AGENTS.md`
- `docs/CODEX_PLAYBOOK.md`
- `README.md`
- any subsystem docs that describe architecture or setup

When project structure or commands change, update the docs in the same change if they affect how Codex should work in the repo.
