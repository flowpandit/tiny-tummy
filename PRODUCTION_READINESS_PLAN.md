# Tiny Tummy Production Readiness Plan

## Purpose

This document is the concrete engineering plan to move Tiny Tummy into a production-ready shape with:

- clean, testable architecture
- minimal repetition
- extensible components and feature modules
- no dead code
- stronger static quality gates

This plan intentionally focuses on code shape before broad test expansion. The goal is to make the app easy to verify, not to pile tests on top of brittle structure.

## How To Use This Document

Status key:

- `[Todo]` not started
- `[In Progress]` actively being worked on
- `[Done]` completed and merged
- `[Blocked]` cannot proceed yet

Suggested workflow:

1. Update the status on the active phase.
2. Check off completed tasks inside that phase.
3. Add notes under the phase if scope changes.
4. Only move to the test-expansion phase after the structural phases are complete.

## Current Problems Confirmed In Review

These are the concrete issues this plan addresses:

- Dead code exists in the repo.
- Several route pages are monoliths and mix UI, side effects, and business logic.
- Logging flows repeat the same lifecycle patterns in multiple files.
- Reminder refresh and alert refresh flows are duplicated across pages.
- DB access is spread directly through route/page components.
- Static quality gates are too weak for safe refactoring.
- Asset loading and bundle shape need cleanup for production readiness.
- Automated tests currently cover only a narrow slice of logic.

## Definition Of Done Before Broad Testing

Do not treat the codebase as structurally ready until all of the following are true:

- No confirmed dead files or dead exports remain in active app code.
- Route pages are primarily composition/orchestration layers.
- Shared workflows are centralized instead of copied across pages.
- Logging forms share common lifecycle and reusable form primitives.
- Business logic is mostly isolated in pure functions or focused hooks.
- UI components can be rendered with mocked inputs and without implicit storage coupling.
- Typecheck, build, lint, and dead-code checks pass cleanly.

---

## Phase 0: Baseline And Guardrails

Status: `[Done]`

### Goal

Lock in the current baseline and add the static guardrails that will keep cleanup work from regressing.

### Tasks

- [x] Add ESLint configuration for TypeScript + React.
- [x] Add an `npm run lint` script.
- [x] Add unused import and unused variable enforcement.
- [x] Add a dead-export or dead-file detection step suitable for this repo.
- [x] Add a lightweight architecture note describing allowed layering:
  `ui -> feature components -> pages`, `hooks/lib` as shared logic.
- [x] Add a CI-ready local checklist command set:
  `build`, `test`, `lint`, and dead-code scan.
- [x] Capture current bundle output as the baseline before cleanup.

### Files Likely Touched

- [package.json](/Users/nikhilmehral/dev/tiny-tummy/package.json)
- new `eslint` config in project root
- optional new architecture doc in project root

### Exit Criteria

- Lint exists and runs locally.
- Static checks catch unused code patterns before merge.
- Refactor work can proceed with consistent standards.
- Phase 1 dead-code removals are still required before `check:all` will pass cleanly.

---

## Phase 1: Dead Code Audit And Removal

Status: `[Done]`

### Goal

Remove confirmed dead code first so the rest of the refactor happens against the real system, not stale leftovers.

### Tasks

- [x] Verify and remove unused home components:
  [src/components/home/ChildSwitcherCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/home/ChildSwitcherCard.tsx),
  [src/components/home/EpisodeCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/home/EpisodeCard.tsx),
  [src/components/home/StatusCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/home/StatusCard.tsx),
  [src/components/home/WeeklyPatternCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/home/WeeklyPatternCard.tsx)
- [x] Verify and remove unused hook alias:
  [src/hooks/useDietLogs.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useDietLogs.ts)
- [x] Verify and remove unused report HTML path:
  [src/lib/report-export.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/report-export.ts)
- [ ] Remove unused DB wrapper/helper code:
  [src/lib/db.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/db.ts)
- [x] Run dead-code scan again after each removal batch.
- [x] Check for unused assets after component deletion.
- [x] Update imports and docs if deleted modules were mentioned anywhere.

### Notes

Only remove files after confirming they are not referenced dynamically or reserved for an active in-progress migration.

### Exit Criteria

- No confirmed dead app modules remain in `src/`.
- Build, test, lint, and dead-code checks still pass.

---

## Phase 2: Shared Workflow Extraction

Status: `[Done]`

### Goal

Centralize repeated side-effect workflows so behavior is consistent and reusable across routes.

### Current Duplication Targets

- refresh + alert checks + reminder sync
- refresh after logging
- visibility/focus refresh patterns
- delayed close/reset behavior

### Tasks

- [x] Extract a shared post-log workflow for pages that currently do some version of:
  refresh data, run alert engine, refresh alerts, sync reminders.
- [x] Extract reminder synchronization helpers used across:
  [src/pages/Home.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Home.tsx),
  [src/pages/Diaper.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Diaper.tsx),
  [src/pages/Poop.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Poop.tsx),
  [src/pages/Breastfeed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Breastfeed.tsx)
- [x] Extract visibility/focus refresh logic into a reusable hook where patterns repeat.
- [ ] Extract timer cleanup helpers for close/reset flows.
- [x] Replace ad hoc page-level copies with the shared implementation.

### Suggested New Modules

- `src/hooks/usePostLogActions.ts`
- `src/hooks/useVisibilityRefresh.ts`
- `src/lib/form-lifecycle.ts`

Adjust names if a better fit emerges during implementation.

### Exit Criteria

- Repeated workflow logic is owned in one place.
- Pages call shared hooks/actions instead of re-implementing side effects.

---

## Phase 3: Logging Form Foundation

Status: `[Done]`

### Goal

Refactor the app’s logging forms into a clean, reusable, testable foundation.

### Primary Refactor Targets

- [src/components/logging/LogForm.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/logging/LogForm.tsx)
- [src/components/logging/DiaperLogForm.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/logging/DiaperLogForm.tsx)
- [src/components/logging/DietLogForm.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/logging/DietLogForm.tsx)
- related edit sheets and supporting pickers

### Tasks

- [x] Create a shared form-shell abstraction for open/reset/close lifecycle.
- [x] Centralize delayed close/reset behavior with cleanup on unmount.
- [x] Create a shared photo field helper for preview, revoke, remove, and file input reset.
- [x] Reuse a shared date/time block instead of repeating the same section markup.
- [x] Standardize submit-state handling and error reporting.
- [x] Keep feature-specific inputs separate from generic lifecycle behavior.
- [ ] Review edit sheets for the same duplication pattern and fold them into the shared primitives where practical.

### Suggested New Modules

- `src/components/logging/LogSheetFrame.tsx`
- `src/hooks/useLogFormLifecycle.ts`
- `src/hooks/usePhotoField.ts`
- `src/components/logging/LogDateTimeFields.tsx`

### Exit Criteria

- Common lifecycle code exists once.
- Each form is feature-specific and significantly thinner.
- Form logic is easy to mount in tests with mocked callbacks.

---

## Phase 4: Page Decomposition

Status: `[Done]`

### Goal

Break oversized route pages into feature modules so they become maintainable and testable.

### Priority Order

1. [src/pages/Home.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Home.tsx)
2. [src/pages/Poop.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Poop.tsx)
3. [src/pages/Feed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Feed.tsx)
4. [src/pages/History.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/History.tsx)
5. [src/pages/Sleep.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Sleep.tsx)
6. [src/pages/Breastfeed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Breastfeed.tsx)
7. [src/pages/Settings.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Settings.tsx)
8. [src/pages/Diaper.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Diaper.tsx)

### For Each Page

- [x] Extract derived data into pure helpers.
- [x] Extract page-local effects into dedicated hooks where needed.
- [x] Extract large UI sections into feature components.
- [x] Keep route file focused on composition, navigation, and high-level state ownership.
- [x] Remove duplicated inline helper logic once the new abstractions exist.

### Suggested Structure Pattern

For a given page, move toward:

- `src/pages/PageName.tsx`
- `src/components/<feature>/...`
- `src/hooks/use<PageName>State.ts`
- `src/lib/<feature>-view-model.ts`

### Progress

- [x] `Home` decomposed into route composition plus focused hooks and feature components:
  [src/pages/Home.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Home.tsx),
  [src/hooks/useHomePageState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useHomePageState.ts),
  [src/hooks/useHomeBreastfeedingState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useHomeBreastfeedingState.ts),
  [src/hooks/useHomeStickyChildBar.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useHomeStickyChildBar.ts),
  [src/hooks/useHomeEffects.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useHomeEffects.ts),
  [src/components/home/HomeQuickActions.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/home/HomeQuickActions.tsx),
  [src/components/home/HomeCaregiverNoteCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/home/HomeCaregiverNoteCard.tsx),
  [src/components/home/HomeSheets.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/home/HomeSheets.tsx)
- [x] `Poop` decomposed into route composition, pure prediction/risk helpers, and feature sections:
  [src/pages/Poop.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Poop.tsx),
  [src/lib/poop-insights.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/poop-insights.ts),
  [src/components/poop/PoopQuickLogCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/poop/PoopQuickLogCard.tsx),
  [src/components/poop/PoopWeeklyPatternCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/poop/PoopWeeklyPatternCard.tsx),
  [src/components/poop/PoopHealthInsightCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/poop/PoopHealthInsightCard.tsx),
  [src/components/poop/PoopRecentHistorySection.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/poop/PoopRecentHistorySection.tsx),
  [src/components/poop/PoopRelatedLinks.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/poop/PoopRelatedLinks.tsx),
  [src/components/poop/PoopPresetIcon.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/poop/PoopPresetIcon.tsx)
- [x] `Feed` decomposed into route composition, pure feed rhythm helpers, and feature sections:
  [src/pages/Feed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Feed.tsx),
  [src/lib/feed-insights.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/feed-insights.ts),
  [src/components/feed/FeedQuickStartCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/feed/FeedQuickStartCard.tsx),
  [src/components/feed/FeedStatusCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/feed/FeedStatusCard.tsx),
  [src/components/feed/FeedWeeklyPatternCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/feed/FeedWeeklyPatternCard.tsx),
  [src/components/feed/FeedLogList.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/feed/FeedLogList.tsx)
- [x] `History` decomposed into route composition, pure timeline helpers, and a dedicated timeline renderer:
  [src/pages/History.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/History.tsx),
  [src/lib/history-timeline.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/history-timeline.ts),
  [src/components/history/HistoryTimeline.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/history/HistoryTimeline.tsx)
- [x] `Sleep` decomposed into route composition, pure wake-window helpers, and dedicated feature sections:
  [src/pages/Sleep.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Sleep.tsx),
  [src/lib/sleep-insights.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/sleep-insights.ts),
  [src/components/sleep/SleepStatusCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/sleep/SleepStatusCard.tsx),
  [src/components/sleep/SleepWeeklyPatternCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/sleep/SleepWeeklyPatternCard.tsx),
  [src/components/sleep/SleepLogList.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/sleep/SleepLogList.tsx)
 - [x] `Breastfeed` decomposed into route composition, pure timing/history helpers, and dedicated timer/history/pattern sections:
  [src/pages/Breastfeed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Breastfeed.tsx),
  [src/lib/breastfeed-insights.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/breastfeed-insights.ts),
  [src/components/breastfeed/BreastSideButton.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/breastfeed/BreastSideButton.tsx),
  [src/components/breastfeed/BreastfeedRecentHistorySection.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/breastfeed/BreastfeedRecentHistorySection.tsx),
  [src/components/breastfeed/BreastfeedPatternCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/breastfeed/BreastfeedPatternCard.tsx)
 - [x] `Settings` decomposed into route composition with dedicated sections and edit sheet modules:
  [src/pages/Settings.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Settings.tsx),
  [src/components/settings/SettingsSections.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/settings/SettingsSections.tsx),
  [src/components/settings/EditChildSheet.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/settings/EditChildSheet.tsx)
 - [x] `Diaper` decomposed into route composition, pure hydration/rhythm helpers, and dedicated feature sections:
  [src/pages/Diaper.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Diaper.tsx),
  [src/lib/diaper-insights.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/diaper-insights.ts),
  [src/components/diaper/DiaperQuickLogCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/diaper/DiaperQuickLogCard.tsx),
  [src/components/diaper/DiaperStatusCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/diaper/DiaperStatusCard.tsx),
  [src/components/diaper/DiaperRecentHistorySection.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/diaper/DiaperRecentHistorySection.tsx),
  [src/components/diaper/DiaperPatternCard.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/diaper/DiaperPatternCard.tsx),
  [src/components/diaper/DiaperRelatedLinks.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/diaper/DiaperRelatedLinks.tsx)

### Current Outcomes

- [x] `Home` route reduced to 301 lines and focused on composition/navigation.
- [x] `Poop` route reduced from 1409 lines to 401 lines, with prediction and risk logic isolated in a pure helper module.
- [x] `Feed` route reduced from 1224 lines to 452 lines, with feed rhythm and status logic isolated in a pure helper module.
- [x] `History` route reduced from 978 lines to 329 lines, with timeline grouping isolated in a pure helper module and rendering isolated in a dedicated timeline component.
- [x] `Sleep` route reduced from 972 lines to 331 lines, with wake-window logic isolated in a pure helper module and major sections extracted into dedicated components.
- [x] `Breastfeed` route reduced from 851 lines to 495 lines, with timer/history/pattern helpers isolated and large sections extracted into dedicated feature components.
- [x] `Settings` route reduced from 766 lines to 98 lines, with section rendering and child editing isolated in dedicated feature modules.
- [x] `Diaper` route reduced from 748 lines to 236 lines, with hydration/rhythm logic isolated in a pure helper module and large sections extracted into dedicated feature components.

### Exit Criteria

- No major route page remains a monolith.
- Large pages are broken into clear, named subunits with simpler props.

---

## Phase 5: Business Logic Isolation

Status: `[Done]`

### Goal

Move logic out of UI components so behavior is testable without rendering the whole app.

### Tasks

- [x] Extract derived summary logic from route pages into pure `lib` modules.
- [x] Extract prediction/status formatting logic where it is currently embedded in page files.
- [x] Move report shaping logic behind pure functions and stable interfaces.
- [x] Review timeline/history grouping logic for separation from rendering.
- [x] Review formatting helpers for duplication across features.
- [x] Ensure pure helpers do not import UI components.

### Hotspots

- [src/pages/Poop.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Poop.tsx)
- [src/pages/Feed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Feed.tsx)
- [src/pages/Home.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Home.tsx)
- [src/pages/History.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/History.tsx)
- [src/lib/reporting.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/reporting.ts)

### Exit Criteria

- Most non-trivial behavior can be tested through pure functions or focused hooks.
- UI files mainly map prepared data into markup.

### Progress

- [x] Home sleep summary shaping moved out of [src/pages/Home.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Home.tsx) into [src/lib/home-insights.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/home-insights.ts)
- [x] Report source fetching separated from report shaping in [src/lib/reporting.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/reporting.ts) via `fetchReportSourceData` and pure `buildReportData`
- [x] Report preview/date/platform view-model logic extracted from [src/pages/Report.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Report.tsx) into [src/lib/report-view-model.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/report-view-model.ts)
- [x] Report page async setup and generation flow extracted from [src/pages/Report.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Report.tsx) into [src/hooks/useReportPageState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useReportPageState.ts)
- [x] Existing route-level insight modules remain in place for `poop`, `feed`, `sleep`, `diaper`, and `breastfeed`, reducing logic inside UI sections
- [x] Shared relative-day labeling extracted into [src/lib/date-labels.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/date-labels.ts) and reused across `poop`, `diaper`, and `breastfeed`
- [x] History range/display/emptiness calculations extracted from [src/pages/History.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/History.tsx) into [src/lib/history-timeline.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/history-timeline.ts)
- [x] Shared weekly range helpers extracted into [src/lib/tracker.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/tracker.ts) and reused by `poop`, `feed`, and `sleep`
- [x] Weekly summary formatting moved out of [src/pages/Feed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Feed.tsx) and [src/pages/Sleep.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Sleep.tsx) into [src/lib/feed-insights.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/feed-insights.ts) and [src/lib/sleep-insights.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/sleep-insights.ts)
- [x] `src/lib` and focused data/view-model hooks were verified to avoid UI component imports, keeping pure logic independent from rendering

---

## Phase 6: Data Access Boundary Cleanup

Status: `[Done]`

### Goal

Reduce direct storage coupling inside UI and create cleaner seams for mocking and testing.

### Tasks

- [x] Audit direct `db.*` usage inside pages and components.
- [x] Move page-specific storage orchestration into hooks or feature service modules.
- [x] Keep raw DB calls out of generic UI components.
- [x] Standardize return shapes and error handling for storage-backed hooks.
- [x] Review context providers for clear ownership and minimal side effects.

### Likely Areas

- [src/pages/Home.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Home.tsx)
- [src/pages/Feed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Feed.tsx)
- [src/pages/Breastfeed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Breastfeed.tsx)
- [src/pages/Report.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Report.tsx)
- [src/contexts/ChildContext.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/contexts/ChildContext.tsx)
- [src/lib/db.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/db.ts)

### Exit Criteria

- Components can be rendered with controlled inputs and mocked callbacks.
- Storage behavior is easier to stub in tests.

### Progress

- [x] Report page storage-backed orchestration moved behind [src/hooks/useReportPageState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useReportPageState.ts)
- [x] Breastfeeding timer/session persistence and storage-backed history loading moved out of [src/pages/Breastfeed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Breastfeed.tsx) into [src/hooks/useBreastfeedingTimerState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useBreastfeedingTimerState.ts)
- [x] Feed preset loading/saving, breastfeeding-session lookup, and quick-feed logging moved out of [src/pages/Feed.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Feed.tsx) into [src/hooks/useFeedPageState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useFeedPageState.ts)
- [x] History range-based loading and delete flows moved out of [src/pages/History.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/History.tsx) into [src/hooks/useHistoryPageState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useHistoryPageState.ts)
- [x] Poop preset hydration, quick-log creation, and preset persistence moved out of [src/pages/Poop.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/pages/Poop.tsx) into [src/hooks/usePoopPageState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/usePoopPageState.ts)
- [x] Theme preference storage loading and persistence moved out of [src/contexts/ThemeContext.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/contexts/ThemeContext.tsx) into [src/hooks/useThemePreferences.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useThemePreferences.ts)
- [x] Unit-system storage loading and persistence moved out of [src/contexts/UnitsContext.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/contexts/UnitsContext.tsx) into [src/hooks/useUnitsState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useUnitsState.ts)
- [x] Child loading, timeout handling, and active-child reconciliation moved out of [src/contexts/ChildContext.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/contexts/ChildContext.tsx) into [src/hooks/useChildrenState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useChildrenState.ts)
- [x] Sleep timer restore, persistence, and save flows moved out of [src/components/sleep/SleepLogSheet.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/sleep/SleepLogSheet.tsx) into [src/hooks/useSleepLogSheetState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useSleepLogSheetState.ts)
- [x] Poop edit persistence moved out of [src/components/logging/EditPoopSheet.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/logging/EditPoopSheet.tsx) into [src/hooks/useEditPoopSheetState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useEditPoopSheetState.ts)
- [x] Diaper edit persistence moved out of [src/components/logging/EditDiaperSheet.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/logging/EditDiaperSheet.tsx) into [src/hooks/useEditDiaperSheetState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useEditDiaperSheetState.ts)
- [x] Sleep edit persistence moved out of [src/components/sleep/EditSleepSheet.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/sleep/EditSleepSheet.tsx) into [src/hooks/useEditSleepSheetState.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useEditSleepSheetState.ts)
- [x] Logging, growth, milestone, symptom, meal, episode, child-management, and sleep-preview storage calls were moved behind focused hooks or feature actions
- [x] Direct `db.*` usage was eliminated from `src/pages`, `src/components`, and `src/contexts`, leaving storage access owned by focused hooks/actions instead of render layers

---

## Phase 7: Component Layering And API Cleanup

Status: `[Done]`

### Goal

Make component APIs consistent, reusable, and predictable across the repo.

### Tasks

- [x] Audit `ui/` primitives and ensure they stay generic.
- [x] Move domain-specific styling/behavior out of generic primitives.
- [x] Normalize prop naming patterns across repeated component families.
- [x] Remove components that exist only for one page if they should instead be local feature sections.
- [x] Promote repeated local sections into reusable feature components only when there is real reuse.
- [x] Add short documentation comments only where the API contract is not obvious.

### Progress

- [x] Added a shared `SheetVisibilityProps` contract in
  [src/components/ui/sheet.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/ui/sheet.tsx)
  and reused it across sheet-style components to standardize the `open` / `onClose` API.
- [x] Moved repeated cross-page sections out of `home` into better-owned feature layers:
  [src/components/care/CareToolsSection.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/care/CareToolsSection.tsx),
  [src/components/presets/QuickPresetEditorSheet.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/presets/QuickPresetEditorSheet.tsx),
  [src/components/tracking/TimeSinceIndicator.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/tracking/TimeSinceIndicator.tsx)
- [x] Revalidated imports, lint, build, tests, and dead-code scan after the layering cleanup.
- [x] Moved route-specific components out of overly generic layers:
  [src/components/billing/Paywall.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/billing/Paywall.tsx),
  [src/components/home/NoLogsYet.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/home/NoLogsYet.tsx)

### Exit Criteria

- Reusable components are truly reusable.
- One-off components are kept local instead of polluting shared layers.

---

## Phase 8: Asset And Bundle Readiness

Status: `[Todo]`

### Goal

Improve startup and production asset loading now that structure is cleaner.

### Tasks

- [ ] Audit large SVG assets imported at startup.
- [ ] Review eager imports in:
  [src/components/layout/ScenicHero.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/layout/ScenicHero.tsx)
- [ ] Replace oversized assets with optimized variants where quality allows.
- [ ] Consider lazy-loading non-critical artwork for lower-priority screens.
- [ ] Re-check build output after cleanup and record the delta.

### Exit Criteria

- Heavy assets are intentional and justified.
- Bundle output is improved or at minimum documented and accepted.

---

## Phase 9: Structural Readiness Review

Status: `[Todo]`

### Goal

Verify that the codebase is actually in a testable shape before broad test expansion begins.

### Tasks

- [ ] Re-run dead-code scan.
- [ ] Re-run build, test, and lint.
- [ ] Review biggest files by line count again and confirm the largest hotspots have been decomposed.
- [ ] Confirm major feature flows are implemented through shared abstractions rather than duplication.
- [ ] Confirm storage-dependent UI is mockable.
- [ ] Confirm no structural blockers remain for broad testing.

### Exit Criteria

- The repo meets the “Definition Of Done Before Broad Testing” section above.

---

## Phase 10: Testing Expansion

Status: `[Todo]`

### Goal

Only after the refactor phases are complete, expand testing aggressively across logic and UI flows.

### Tasks

- [ ] Add unit tests for extracted pure helpers and feature view-model logic.
- [ ] Add hook tests for shared workflow hooks and form lifecycle hooks.
- [ ] Add component tests for reusable form primitives and feature sections.
- [ ] Add integration tests for key route flows with mocked storage boundaries.
- [ ] Add regression coverage for reminders, alerts, reports, and logging flows.
- [ ] Add smoke coverage for the largest user-critical paths:
  onboarding, logging, history editing, report generation, child switching.

### Exit Criteria

- Test coverage reflects the actual product risk areas.
- The app is both structurally clean and meaningfully verified.

---

## Recommended Execution Sequence

1. Phase 0: Baseline And Guardrails
2. Phase 1: Dead Code Audit And Removal
3. Phase 2: Shared Workflow Extraction
4. Phase 3: Logging Form Foundation
5. Phase 4: Page Decomposition
6. Phase 5: Business Logic Isolation
7. Phase 6: Data Access Boundary Cleanup
8. Phase 7: Component Layering And API Cleanup
9. Phase 8: Asset And Bundle Readiness
10. Phase 9: Structural Readiness Review
11. Phase 10: Testing Expansion

## First Milestone

The best first milestone is:

- add lint and dead-code guardrails
- remove confirmed dead files
- extract shared post-log workflow
- build the shared logging form foundation
- refactor `Home` first as the template for page decomposition

If that milestone lands cleanly, the rest of the repo cleanup becomes much more systematic.

## Tracking Notes

Use this section to leave short notes while executing the plan.

- Phase 0 baseline recorded on 2026-04-13.
- New guardrails added: `npm run lint`, `npm run check:dead-code`, `npm run check:all`.
- Architecture note added in [ARCHITECTURE_GUIDELINES.md](/Users/nikhilmehral/dev/tiny-tummy/ARCHITECTURE_GUIDELINES.md).
- `npm run lint` currently passes with warnings only.
- `npm run check:dead-code` now passes after Phase 1 dead-code removal.
- Build baseline from `npm run build`:
  main JS `dist/assets/index-DhATCDUN.js` about `493.62 kB` gzip `139.44 kB`
  main CSS `dist/assets/index-B_EJWjWG.css` about `97.40 kB` gzip `17.15 kB`
  large asset hotspot `dist/assets/sun-C6YRZu9c.svg` about `1,150.99 kB` gzip `363.63 kB`
- Phase 1 removed orphaned modules:
  `ChildSwitcherCard`, `EpisodeCard`, `StatusCard`, `WeeklyPatternCard`,
  `SleepDurationChart`, `Skeleton`, `useBackButton`, `useDietLogs`, `report-export`.
- Phase 2 added shared workflow hooks:
  [src/hooks/useChildWorkflowActions.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useChildWorkflowActions.ts)
  and [src/hooks/useVisibilityRefresh.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useVisibilityRefresh.ts).
- Phase 2 replaced duplicated post-log/reminder/visibility flows in `Home`, `Diaper`, `Poop`, `Breastfeed`, `Feed`, and `SleepLogSheet`.
- Phase 3 added shared logging form building blocks:
  [src/hooks/useLoggingSheetLifecycle.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/useLoggingSheetLifecycle.ts),
  [src/hooks/usePhotoField.ts](/Users/nikhilmehral/dev/tiny-tummy/src/hooks/usePhotoField.ts),
  and [src/components/logging/LogDateTimeFields.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/logging/LogDateTimeFields.tsx).
- Phase 3 refactored `LogForm`, `DiaperLogForm`, and `DietLogForm` onto the shared lifecycle foundation.
