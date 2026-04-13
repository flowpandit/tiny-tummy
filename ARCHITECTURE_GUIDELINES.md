# Tiny Tummy Architecture Guidelines

## Purpose

These rules define the target code shape for production-readiness refactoring. They are intentionally simple and should be enforced in review even when lint cannot fully encode them yet.

## Layering

### `src/components/ui`

Use for generic UI primitives only.

- no feature-specific data fetching
- no direct DB access
- no route knowledge
- no child-specific domain assumptions unless the component is clearly not generic and should move out of `ui`

### Feature Components

Use for reusable domain components such as logging, sleep, growth, home, episodes, and layout sections.

- may compose `ui` primitives
- may receive prepared domain data via props
- should avoid owning large persistence workflows directly

### `src/pages`

Use for route-level composition only.

- own navigation and route concerns
- compose feature components and hooks
- avoid embedding large business rules or repeated workflow logic
- do not let route files grow into monoliths

### `src/hooks`

Use for stateful logic and side effects.

- good fit for refresh workflows, lifecycle behavior, timers, focus/visibility handling, and storage orchestration
- keep hooks focused
- prefer returning simple state and actions

### `src/lib`

Use for pure logic, formatting, transformations, and shared domain helpers.

- should be the default place for non-UI logic that can be tested without rendering
- avoid importing UI components from here

## Data Access Rules

- Prefer hooks or feature services as the boundary to `db.*`.
- Avoid raw DB calls inside generic UI components.
- If a component needs persistence, ask whether the data flow belongs one layer up.

## Reuse Rules

- Build a shared abstraction only when the behavior is genuinely repeated.
- Keep one-off UI local to a feature instead of prematurely promoting it into shared layers.
- When repetition appears across multiple routes or forms, extract it and give it a single owner.

## Testability Rules

A component or module is considered test-ready when:

- inputs are explicit
- side effects are isolated
- derived values are produced by pure helpers where practical
- storage/network boundaries can be mocked without rendering the whole app shell

## Review Heuristics

When reviewing a change, ask:

1. Does this file own more than one responsibility?
2. Is this logic repeated elsewhere already?
3. Should this behavior be a hook, a pure helper, or a feature component instead?
4. Does this component become easier or harder to test after this change?
