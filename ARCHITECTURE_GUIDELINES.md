# Tiny Tummy Architecture Guidelines

## Purpose

These rules define the expected shape of new code in Tiny Tummy.

The goal is not abstraction for its own sake. The goal is to keep the app:

- testable without heroic setup
- easy to extend without copy-paste changes
- safe to refactor without hidden storage coupling
- readable for the next person who opens the file

Use this document as the default standard for all future feature work.

## Core Principles

### 1. Keep routes thin

A page should mainly:

- own route and navigation concerns
- assemble feature hooks and feature components
- pass explicit props downward

A page should not:

- contain large business-rule blocks
- call `db.*` directly
- duplicate refresh, alert, or reminder workflows
- grow into a multi-responsibility file

### 2. Move logic out of rendering

If logic can be tested without a browser or component tree, it usually belongs in `src/lib`.

Examples:

- date labeling
- summaries and insight calculations
- grouping and sorting timeline items
- chart/view-model shaping
- trial and entitlement calculations

Components should render prepared values, not invent them inline.

### 3. Keep side effects behind focused hooks

If code owns timers, subscriptions, visibility handling, restore flows, loading state, or storage orchestration, prefer a hook.

Hooks should:

- own one coherent behavior
- return simple state and actions
- avoid mixing unrelated responsibilities

### 4. Storage is a boundary, not a convenience

Persistence should sit behind hooks or feature services.

UI should not know:

- where the data is stored
- how the storage call is implemented
- how many storage reads are needed to make the UI work

If a component needs persistence, move that responsibility up one layer.

### 5. Reuse real patterns, not hypothetical ones

Only extract a shared abstraction when:

- behavior is already repeated
- the extracted shape is clearer than the duplicated shape
- there is a clear owner for that abstraction

Do not move something into `ui` just because it looks neat there.

## Layering

### `src/components/ui`

Use for generic UI primitives only.

- no feature-specific data fetching
- no direct DB access
- no route knowledge
- no billing, entitlement, or domain-specific storage logic
- no child-specific assumptions unless the component clearly is not generic and should move out of `ui`

Examples:

- buttons
- cards
- fields
- generic sheet primitives
- basic visual shells

### Feature Components

Use for reusable domain components such as:

- logging
- sleep
- feed
- poop
- growth
- history
- billing
- settings
- layout sections

Feature components may:

- compose `ui` primitives
- receive prepared domain data via props
- call focused hooks if the component truly owns that behavior

Feature components should not:

- own broad app orchestration
- contain raw storage access
- duplicate logic that already exists in shared hooks or `lib`

### `src/pages`

Use for route-level composition only.

- own navigation and route concerns
- compose feature components and hooks
- keep business logic out of JSX as much as possible
- do not let route files become the main implementation of the feature

Target shape:

- page reads feature hooks
- page passes explicit props
- page renders sections

### `src/hooks`

Use for stateful logic and side effects.

Good fit for:

- refresh workflows
- lifecycle behavior
- timers
- focus and visibility handling
- storage orchestration
- billing and entitlement actions
- page-specific async state

Hook rules:

- keep hooks focused
- prefer returning simple state and actions
- keep naming explicit
- avoid returning huge bags of unrelated state

### `src/lib`

Use for pure logic, formatting, transformations, and shared domain helpers.

- this should be the default place for non-UI logic
- prefer small pure functions over page-local helper blocks
- avoid importing UI components from here
- avoid importing React from here unless a file is truly a hook helper and belongs elsewhere

### `src/contexts`

Contexts should be thin provider surfaces.

They may:

- expose app-wide state
- compose hooks

They should not:

- become the primary home for storage logic
- contain large business workflows
- act as a dumping ground for unrelated concerns

## File Ownership Rules

### When to create a new component

Create a component when:

- a section has a clear visual responsibility
- the section is reused
- the parent route becomes materially easier to read by extracting it

Do not create a component just to move 20 lines elsewhere.

### When to create a new hook

Create a hook when:

- a component or page is mixing rendering with async/stateful behavior
- the same lifecycle or workflow exists in multiple places
- the behavior needs isolated tests

### When to create a new `lib` file

Create a `lib` module when:

- logic is pure or mostly pure
- the logic shapes data for multiple consumers
- the logic is currently embedded inside a route/component and hard to test

## Data Access Rules

- Prefer hooks or feature services as the boundary to `db.*`.
- Avoid raw DB calls inside `src/pages`, `src/components`, and `src/contexts`.
- If a UI file needs persistence, that is usually a sign to extract a hook.
- A storage-backed hook should translate storage behavior into app behavior, not leak raw query details.

Preferred pattern:

1. `lib` provides pure transformation logic
2. hook performs loading, saving, refresh, and error handling
3. component/page renders the result

## Shared Workflow Rules

When the same workflow appears in more than one place, extract it.

Examples already standardized in this repo:

- post-log refresh and reminder sync
- visibility refresh
- logging sheet lifecycle
- photo field behavior
- entitlement and billing actions

Do not re-implement these patterns ad hoc in new features.

Before adding similar code, first check whether an existing hook or helper already owns that behavior.

## Form Rules

Forms should follow the shared logging foundation where possible.

Expected form shape:

- generic lifecycle and date/time behavior stays shared
- feature-specific inputs stay local
- submit and close behavior is explicit
- timers and delayed reset cleanup are centralized

Avoid:

- form-local timeout cleanup logic if shared behavior already exists
- repeated preview/remove/reset file handling
- mixing UI markup with storage orchestration

## Billing And Entitlement Rules

Billing should follow the same architecture discipline as the rest of the app.

- UI components should call hooks/services, not store APIs directly
- entitlement state should stay local to the entitlement layer
- platform billing adapters should only report purchase, restore, and ownership results
- desktop dev simulation should remain isolated from mobile store logic

Do not let paywall or settings components become store-integration files.

## Assets And Imports

- organize assets by purpose, not just file format
- prefer small import surfaces for asset families
- keep feature-only assets close to their feature when reuse is unlikely
- avoid deep path imports when a local asset index makes intent clearer

## Testability Rules

A component or module is considered test-ready when:

- inputs are explicit
- side effects are isolated
- derived values are produced by pure helpers where practical
- storage and platform boundaries can be mocked without rendering the whole app shell

### What to test where

- `src/lib`: unit tests first
- hooks: hook tests with mocked dependencies
- components: render and behavior tests with explicit props
- routes: only light integration coverage unless the route owns meaningful composition behavior

### A change is not testable enough if

- it requires the whole app to mount to verify one behavior
- it hides important state in closures with no external seam
- it performs storage work as a side effect of rendering
- it mixes business logic and JSX so tightly that unit coverage becomes impractical

## Extensibility Rules

When adding a new feature, prefer this order:

1. define the domain logic and state boundaries
2. extract pure helpers for calculations and shaping
3. add a storage-backed hook if needed
4. build feature components on top of explicit props
5. compose the route last

This keeps the route from becoming the feature’s real implementation.

## Review Checklist

When reviewing a change, ask:

1. Does this file own more than one responsibility?
2. Is this logic repeated elsewhere already?
3. Should this behavior be a hook, a pure helper, or a feature component instead?
4. Is storage crossing into UI where it should not?
5. Is this abstraction real reuse or speculative reuse?
6. Does this component become easier or harder to test after this change?
7. Would the next developer know where to add a similar feature?

## Practical Defaults

If unsure, prefer:

- a pure helper over inline derived logic
- a focused hook over page-level side effects
- a feature component over a bloated route section
- local feature ownership over over-generalized shared components
- explicit props over hidden context coupling

These defaults have produced the cleanest results in this codebase and should remain the standard.
