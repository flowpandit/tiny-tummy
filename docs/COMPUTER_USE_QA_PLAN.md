# Computer Use QA Plan

## Overview

This document defines the manual QA plan for exercising Tiny Tummy through the native Tauri app with [Computer Use](plugin://computer-use@openai-bundled). It is designed to cover:

- user-facing app flows
- local-dev-only access and trial states reachable from in-app Developer Tools
- app-to-OS boundary flows such as notifications, file save dialogs, share/copy, and photo selection

This plan uses a layered-exhaustive strategy:

1. Exhaust every branch-driving option inside each feature flow.
2. Apply pairwise coverage across cross-cutting global modifiers.
3. Run full targeted combinations for the highest-risk scenarios.

### Computer Use Rules

- Test the native Tauri app only. Do not substitute a browser run unless the suite explicitly says the native app is blocked.
- Drive the product as a user would. Do not edit code or use non-UI data mutation to force feature state unless the suite explicitly uses Developer Tools or a launch/reset prerequisite.
- If a flow crosses into macOS or Tauri system UI, verify both the system interaction and the return to Tiny Tummy.
- If a test cannot be completed, classify it and continue:
  - `AI`: app-internal defect
  - `SB`: system-boundary issue
  - `EN`: environment-only blocker

### Evidence Standard

Each executed test must capture:

- `Test ID`
- pass, fail, or blocked
- at least one screenshot or equivalent visible-state capture using `SS-<Test ID>-<n>`
- defect classification when failed or blocked
- short defect note with repro point and current screen

### Verified Pass Standard

A test counts as verified only when all of the following are true:

- the intended UI action completes without crash, freeze, or navigation corruption
- the expected visible state is shown
- any persisted data survives the required reload or relaunch check
- at least one downstream consumer is checked when the flow writes data

## Environment

### Execution Target

Primary target:

- a packaged or otherwise attachable local Tauri app instance that Computer Use can control

Fallback target:

- a release binary or packaged `.app` launched directly if `pnpm tauri dev` is not attachable by Computer Use

### Reset Workflow

Preferred clean-start workflow:

1. Close the app.
2. Relaunch with `TAURI_E2E_RESET=1`.
3. Confirm the app starts with an empty database and follows the expected startup route.

Fallback manual data reset on macOS dev:

- App data location: `~/Library/Application Support/com.nikhilmehral.tinytummy/`
- Database file: `tinytummy.db`

Use the fallback only if the environment-variable reset path is unavailable.

### Reset Rules

- Reset before every new profile family (`A` through `F`).
- Reset before every access-profile family (`AP1` through `AP4`).
- Reset before persistence-only confirmation passes if the prior suite changed unrelated state.
- Do not assume notification permission state resets with DB reset; prepare allowed and denied runs separately at the OS level.
- Do not assume system share targets or file-dialog state resets with DB reset; treat them as boundary-local state.

### Launch Preconditions

Before running any suite, confirm:

- Computer Use can attach to the running native app window.
- Developer Tools are visible in Settings for local-dev access-state testing.
- The app is using the intended clean or seeded profile state.
- Screenshot capture naming is ready for the current run.

## Profiles

### Child and Data Profiles

| Profile | Setup | Required Seed State | Primary Coverage Goal | Persistence Check |
| --- | --- | --- | --- | --- |
| `A` | Fresh install, no children | None | onboarding and zero-state startup only | verify no child exists after relaunch |
| `B` | One infant under 6 months, breastfed, sex set | No logs | infant routing, diaper-first UX, breastfeed timer availability | child and settings persist |
| `C` | One 2-month formula or mixed infant, sex set | Minimal diaper, sleep, and feed logs; at least one stool entry capable of raising an alert | infant seeded flows, diaper insights, alert surfacing | seeded logs persist |
| `D` | One 6 to 8 month mixed-fed child | Active breastfeeding history, bottle history, solids-transition eligible | feed plus breastfeed coexistence and started-solids transition | feed state and route persist |
| `E` | One 12+ month solids-fed child | Rich poop, feed, sleep, growth, milestone, symptom, episode, alert, and report history | mature child full-app coverage | all entry types persist |
| `F` | Multi-child household | One `B`-style infant and one `E`-style older child | child switching, route switching, cross-child isolation | active child and all data persist |

### Access Profiles

| Access Profile | State | Entry Method | Primary Coverage Goal |
| --- | --- | --- | --- |
| `AP1` | Active trial | clean reset or Developer Tools reset-to-today | standard unlocked app behavior |
| `AP2` | 13 days left in trial | Developer Tools set trial to 13 days ago | near-expiry messaging and still-unlocked behavior |
| `AP3` | Trial expired | Developer Tools simulate expiration | paywall routing and locked-mode exceptions |
| `AP4` | Premium unlocked | Developer Tools simulate premium unlock | unlocked behavior after expiry and restore/unlock flows |

## Global Modifiers

### Modifier Dimensions

| Modifier | Values | Notes |
| --- | --- | --- |
| Theme | `system`, `light`, `dark` | verify visible style change and persistence |
| Units | `metric`, `imperial` | verify all value displays and form placeholders that depend on units |
| Notifications | `allowed`, `denied` | verify daily check-in and smart reminder toggles plus denial messaging |
| Report Save | `accept`, `cancel` | applicable to Report and file-dialog recovery suites |
| Photo Flow | `accept+save`, `cancel`, `accept+remove` | applicable to avatar and elimination-photo flows |
| Access State | `AP1`, `AP2`, `AP3`, `AP4` | overlay where relevant |

### Pairwise Modifier Bundles

Use these bundles when a suite includes the relevant surfaces. Run the suite baseline first, then apply the applicable modifier bundles.

| Bundle | Theme | Units | Notifications | Report Save | Photo Flow | Access |
| --- | --- | --- | --- | --- | --- | --- |
| `MB0` | system | metric | allowed | n/a | n/a | `AP1` |
| `MB1` | dark | imperial | allowed | n/a | n/a | `AP1` |
| `MB2` | light | metric | denied | n/a | n/a | `AP1` |
| `MB3` | system | imperial | allowed | accept | accept+save | `AP4` |
| `MB4` | dark | metric | allowed | cancel | cancel | `AP2` |
| `MB5` | light | imperial | allowed | accept | accept+remove | `AP3` |

### Coverage Rule

- Exhaust every option that changes routing, visible controls, persistence shape, alert generation, or derived insights.
- Apply modifier bundles only to suites where the modifier is relevant.
- Run the high-risk targeted combinations in addition to the suite tables below.

## High-Risk Targeted Combinations

| ID | Scenario | Profile | Modifiers | Suites |
| --- | --- | --- | --- | --- |
| `HR1` | infant elimination route remains diaper-first even after older-child preference activity | `F` | `MB0` | `S03`, `S05` |
| `HR2` | older child switches between `auto`, `diaper`, and `poop` without route-loop or stale label | `E` | `MB1` | `S03`, `S05` |
| `HR3` | breastfeeding-to-mixed transition changes route behavior and unlocks Feed correctly | `D` | `MB0`, `MB3` | `S08` |
| `HR4` | expired trial still allows Settings and Privacy while other routes paywall | `E` | `MB5` | `S01`, `S03`, `S12` |
| `HR5` | no-data report versus rich seeded report | `B`, `E` | `MB3`, `MB4` | `S12`, `S13` |
| `HR6` | multi-child switching preserves active child boundaries and correct elimination route | `F` | `MB1` | `S03`, `S04`, `S05` |
| `HR7` | OS accept and cancel flows always return to a usable app state | `E` | `MB3`, `MB4`, `MB5` | `S12`, `S13` |
| `HR8` | every saved entry type survives relaunch and appears in secondary consumers | `E` | `MB0` | `S06` through `S12` |

## Route Coverage Map

| Route | Surface | Covered In |
| --- | --- | --- |
| `/onboarding` | onboarding flow | `S01`, `S02` |
| `/` | Home | `S04` |
| `/poop` | Poop | `S05`, `S06` |
| `/diaper` | Diaper | `S05`, `S07` |
| `/feed` | Feed | `S08`, `S12` |
| `/breastfeed` | Breastfeed timer | `S08` |
| `/sleep` | Sleep | `S09`, `S12` |
| `/dashboard` | Trends | `S12` |
| `/history` | History | `S12` |
| `/growth` | Growth | `S11`, `S12` |
| `/milestones` | Milestones | `S11`, `S12` |
| `/guidance` | Guidance | `S12` |
| `/settings` | Settings | `S01`, `S03` |
| `/report` | Report | `S12`, `S13` |
| `/add-child` | Add child | `S02`, `S03` |
| `/all-kids` | All Kids | `S03` |
| `/privacy` | Privacy | `S01`, `S12` |
| paywall wildcard | locked-mode paywall | `S01` |

## Primary Surface Inventory

| Surface | Type | Named Test IDs |
| --- | --- | --- |
| Welcome `Get Started` | CTA | `CU-S02-01` |
| Add Child submit and validation | screen CTA | `CU-S02-02` to `CU-S02-05` |
| Avatar upload and crop | photo boundary | `CU-S02-06` to `CU-S02-08` |
| Edit Child sheet | sheet | `CU-S03-01` |
| Delete child confirm | destructive action | `CU-S03-02`, `CU-S03-03` |
| Theme segmented control | segmented control | `CU-S03-05` |
| Unit segmented control | segmented control | `CU-S03-06` |
| Main tracking page segmented control | segmented control | `CU-S03-07` |
| Notification toggles | switch + permission boundary | `CU-S03-08`, `CU-S13-01`, `CU-S13-02` |
| Poop log form | sheet | `CU-S06-01` to `CU-S06-09` |
| Edit Poop sheet | sheet + delete | `CU-S06-08`, `CU-S06-09`, `CU-S12-06` |
| Diaper log form | sheet | `CU-S07-01` to `CU-S07-06` |
| Edit Diaper sheet | sheet + delete | `CU-S07-07`, `CU-S07-08`, `CU-S12-06` |
| Diet log form | sheet | `CU-S08-01` to `CU-S08-07` |
| Breastfeed solids transition dialog | dialog | `CU-S08-10` |
| Sleep log sheet | sheet | `CU-S09-01` to `CU-S09-06` |
| Edit Sleep sheet | sheet + delete | `CU-S09-07`, `CU-S09-08`, `CU-S12-06` |
| Episode sheet | sheet | `CU-S10-01` to `CU-S10-05` |
| Symptom sheet | sheet | `CU-S10-06`, `CU-S10-07` |
| Milestone log sheet | sheet | `CU-S11-01`, `CU-S11-02` |
| Growth log sheet | sheet + delete | `CU-S11-03` to `CU-S11-07` |
| Report generate and save | CTA + file dialog | `CU-S12-07`, `CU-S12-08`, `CU-S13-03`, `CU-S13-04` |

## Suite Matrix

### S01 Startup and Access

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S01-01` | `A` | clean reset | Launch app | App lands on onboarding welcome, no child routes exposed, no crash | `SS-CU-S01-01-1` |  |
| `CU-S01-02` | environment-prepared | startup-blocked environment prepared outside app | Launch app, tap `Retry startup` | Startup blocked card appears, retry is visible, retry either recovers or preserves message cleanly | `SS-CU-S01-02-1` | mark `EN` if preparation fails |
| `CU-S01-03` | `AP3` + seeded child | app locked via Developer Tools or prepared expired state | Launch app from cold start | Non-settings routes land on paywall | `SS-CU-S01-03-1` |  |
| `CU-S01-04` | `AP3` | locked state active | From paywall open Settings | Settings opens while app remains otherwise locked | `SS-CU-S01-04-1` |  |
| `CU-S01-05` | `AP3` | locked state active | From paywall open Privacy | Privacy route opens and returns safely | `SS-CU-S01-05-1` |  |
| `CU-S01-06` | `AP3` | locked state active | Tap `Restore purchases` | Success or graceful failure toast; app remains stable | `SS-CU-S01-06-1` | classify `SB` if store boundary only |
| `CU-S01-07` | `AP3` | locked state active, Developer Tools available in Settings | Simulate premium unlock, relaunch | Full app unlocks after relaunch | `SS-CU-S01-07-1` |  |
| `CU-S01-08` | `AP1` to `AP3` | active trial state | Set trial to 13 days ago, then simulate expiration | Near-expiry and expired states render correct messaging without route corruption | `SS-CU-S01-08-1` |  |
| `CU-S01-09` | `AP4` | premium unlocked | Relaunch from cold start | Premium-unlocked state persists | `SS-CU-S01-09-1` |  |

### S02 Onboarding and Add Child

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S02-01` | `A` | onboarding visible | Tap `Get Started` | Moves from Welcome to Add Child step | `SS-CU-S02-01-1` |  |
| `CU-S02-02` | `A` | Add Child visible | Leave fields blank | Submit remains disabled or validation prevents progress | `SS-CU-S02-02-1` |  |
| `CU-S02-03` | `A` | Add Child visible | Fill name only, then name plus DOB only | Partial state still blocked until required fields complete | `SS-CU-S02-03-1` |  |
| `CU-S02-04` | `A` | Add Child visible | Attempt future DOB | Future date rejected or impossible to select | `SS-CU-S02-04-1` |  |
| `CU-S02-05` | `A` | Add Child visible | Create one child success pass for each feeding type and both sex options across repeated clean runs | Child creation succeeds, Normal Range intro appears, `Start Tracking` lands on Home | `SS-CU-S02-05-1` | run once per feeding type |
| `CU-S02-06` | `A` | Add Child visible, photo boundary applicable | Open avatar picker, accept image, crop, save | Cropped avatar preview appears and persists into created child | `SS-CU-S02-06-1` | `SB` if picker blocked |
| `CU-S02-07` | `A` | Add Child visible | Open avatar picker then cancel | App returns to Add Child with no broken state | `SS-CU-S02-07-1` |  |
| `CU-S02-08` | `A` | Avatar preview exists | Remove or replace avatar before submit | Preview updates or clears cleanly, fallback avatar still valid | `SS-CU-S02-08-1` |  |
| `CU-S02-09` | `A` | onboarding or `/add-child` | Use back navigation where available | Back path is stable and does not lose unrelated state unexpectedly | `SS-CU-S02-09-1` |  |
| `CU-S02-10` | newly created `B` or `C` | child created | Relaunch app | Child persists and app skips onboarding | `SS-CU-S02-10-1` |  |

### S03 Settings and Child Management

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S03-01` | `F` | multiple children seeded | Edit child name, DOB, sex, feeding type, avatar color | Changes save and appear in Settings, headers, and downstream profile surfaces | `SS-CU-S03-01-1` |  |
| `CU-S03-02` | `F` | multiple children seeded | Start delete child flow then cancel | Child remains, no unintended active-child change | `SS-CU-S03-02-1` |  |
| `CU-S03-03` | `F` | multiple children seeded | Confirm delete on non-active child, then on active child in separate clean run | Child is removed, active-child fallback behaves correctly | `SS-CU-S03-03-1` |  |
| `CU-S03-04` | `F` | All Kids available | Open `/all-kids`, switch active child, return home | Active child changes globally and summary data is isolated correctly | `SS-CU-S03-04-1` |  |
| `CU-S03-05` | `E` | Settings open | Switch Theme through `system`, `light`, `dark` | Visible theme changes and persists after relaunch | `SS-CU-S03-05-1` |  |
| `CU-S03-06` | `E` | Settings open, seeded values exist | Switch Units between metric and imperial | Forms, placeholders, and value displays update consistently | `SS-CU-S03-06-1` |  |
| `CU-S03-07` | `F` | one infant and one older child seeded | Verify `Main tracking page` options on infant versus older child; change older-child option among `auto`, `diaper`, `poop` | Infant never exposes contradictory `Poop` override; older child routing follows selection and persists | `SS-CU-S03-07-1` |  |
| `CU-S03-08` | `E` | notification boundary prepared | Toggle daily check-in and each smart reminder in both allow and deny states | Success path updates switch state; denied path shows error and keeps app stable | `SS-CU-S03-08-1` | `SB` if permission prompt blocks |
| `CU-S03-09` | `E` | Settings open | Toggle Night mode schedule, edit start and end times | Schedule UI expands, values save, and summary text updates | `SS-CU-S03-09-1` |  |
| `CU-S03-10` | `AP1` to `AP4` | Developer Tools visible | Run reset trial, set 13 days ago, simulate expiration, clear premium, simulate premium unlock | Each tool shows success feedback and results in the correct access state on next route check | `SS-CU-S03-10-1` |  |

### S04 Home and Quick Actions

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S04-01` | `B` | no logs | Open Home | Zero-state view is correct for infant profile and `Log diaper` path opens the right sheet | `SS-CU-S04-01-1` |  |
| `CU-S04-02` | `E` | seeded data | Open Home | Populated summary cards, recent activity, and care tools render without overlap or stale data | `SS-CU-S04-02-1` |  |
| `CU-S04-03` | `F` | seeded data and multiple children | Scroll Home to reveal sticky child bar, switch child from bar | Sticky child bar appears cleanly and switching child refreshes data | `SS-CU-S04-03-1` |  |
| `CU-S04-04` | `E` | active alerts exist | Dismiss alerts from Home | Alert dismissal updates banner state without breaking downstream surfaces | `SS-CU-S04-04-1` |  |
| `CU-S04-07` | `B` and `E` | Home open | Use every quick action: elimination, feed, breastfeed, sleep, episode, symptom | Each quick action opens the correct sheet or route for the current child profile | `SS-CU-S04-07-1` |  |
| `CU-S04-08` | `E` | recent activity seeded | Open edit entry point for poop, diaper, feed, and sleep from recent activity across repeated runs | Correct edit sheet opens with current record data | `SS-CU-S04-08-1` |  |

### S05 Elimination Routing and Navigation

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S05-01` | `B` | infant active | Observe bottom nav and open elimination route | Nav label is `Diaper`, route is `/diaper`, page is stable | `SS-CU-S05-01-1` |  |
| `CU-S05-02` | `E` | older child active | Observe bottom nav and open elimination route | Nav label is `Poop` or configured override, route is stable, no redirect loop | `SS-CU-S05-02-1` |  |
| `CU-S05-03` | `F` | infant and older child seeded | Switch children while on elimination route | Route and label update to child-specific mode without stale content | `SS-CU-S05-03-1` |  |
| `CU-S05-04` | `E` | older child active | Change main tracking page in Settings, then use bottom nav and direct route transitions | `auto`, `diaper`, and `poop` all route correctly and persist | `SS-CU-S05-04-1` |  |
| `CU-S05-05` | `B` | infant active, older child previously used `poop` | Relaunch and reopen elimination flow | Infant remains diaper-first and does not inherit stale `poop` preference | `SS-CU-S05-05-1` |  |
| `CU-S05-06` | `B` and `E` | elimination pages populated | Use related links and header/back paths | History, Guidance, and Growth links open correctly and return safely | `SS-CU-S05-06-1` |  |
| `CU-S05-07` | `E` | bottom-nav routes available | Swipe left and right across bottom-nav routes | Swipe navigation uses correct neighboring routes and returns stable content | `SS-CU-S05-07-1` |  |

### S06 Poop Flow Matrix

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S06-01` | `E` | Poop page open | Use every quick preset tile | Preset creates a log, shows feedback, and updates recent/history surfaces | `SS-CU-S06-01-1` |  |
| `CU-S06-02` | `E` | at least one prior normal poop exists | Use `Repeat last` | New log matches prior pattern and appears in Home, History, and Report consumers | `SS-CU-S06-02-1` |  |
| `CU-S06-03` | `E` | Poop form open | Sweep stool types `1` through `7` across repeated entries | Every stool type is selectable, savable, and rendered correctly in UI summaries | `SS-CU-S06-03-1` |  |
| `CU-S06-04` | `E` | Poop form open | Sweep normal stool colors `yellow`, `green`, `brown`, `orange` | Colors save and display consistently in Poop, History, and Report preview | `SS-CU-S06-04-1` |  |
| `CU-S06-05` | `E` | Poop form open | Sweep red-flag colors `black`, `red`, `white` on otherwise valid logs | Appropriate alerts, emphasis, and downstream status changes appear without crash | `SS-CU-S06-05-1` |  |
| `CU-S06-06` | `E` | Poop form open | Add photo, save, reopen, remove photo in edit flow across repeated runs | Photo boundary succeeds, preview is correct, remove path is stable | `SS-CU-S06-06-1` | `SB` if picker blocked |
| `CU-S06-07` | `E` | Poop form open | Add notes and sweep sizes `small`, `medium`, `large` | Notes and size persist and render in entry detail surfaces | `SS-CU-S06-07-1` |  |
| `CU-S06-08` | `E` | seeded poop history exists | Navigate weekly pattern older and newer, inspect recent history, open edit sheet | Trend navigation and recent-history interactions stay in sync with logs | `SS-CU-S06-08-1` |  |
| `CU-S06-09` | `E` | editable poop exists | Edit then delete a poop log | Changes propagate everywhere; delete removes entry from origin and secondary consumers | `SS-CU-S06-09-1` |  |
| `CU-S06-10` | `E` seeded or environment-prepared | auto-generated or seeded no-poop day exists | Verify Home, History, and Report surfaces for no-poop day | No-poop day renders correctly wherever surfaced; if not reachable, mark blocked not failed | `SS-CU-S06-10-1` | `EN` if no reachable setup path |

### S07 Diaper Flow Matrix

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S07-01` | `C` or `E` | Diaper page open | Log `wet` diaper and sweep urine colors `pale`, `normal`, `dark` | Urine-only fields behave correctly and save without stool controls | `SS-CU-S07-01-1` |  |
| `CU-S07-02` | `C` or `E` | Diaper page open | Log `dirty` diaper with stool type, color, and size sweeps across repeated runs | Stool-only fields appear correctly and persist | `SS-CU-S07-02-1` |  |
| `CU-S07-03` | `C` or `E` | Diaper page open | Log `mixed` diaper and verify both urine and stool fields | Combined field set saves and renders correctly | `SS-CU-S07-03-1` |  |
| `CU-S07-04` | `C` or `E` | Diaper page open | Sweep stool colors, including red-flag colors, through dirty or mixed diaper entries | Alerts and linked elimination behavior are correct | `SS-CU-S07-04-1` |  |
| `CU-S07-05` | `C` or `E` | dirty or mixed form open | Add photo then save | Photo is accepted only when stool fields are relevant and app returns stable | `SS-CU-S07-05-1` | `SB` if picker blocked |
| `CU-S07-06` | `C` or `E` | dirty or mixed photo preview exists | Cancel picker and remove existing photo across repeated runs | Cancel and remove flows leave the form usable | `SS-CU-S07-06-1` |  |
| `CU-S07-07` | `C` or `E` | seeded diaper logs exist | Edit wet, dirty, and mixed entries across repeated runs | Conditional fields reopen correctly for each diaper type | `SS-CU-S07-07-1` |  |
| `CU-S07-08` | `C` or `E` | editable diaper exists | Delete a diaper entry | Entry disappears from origin, Home, History, and Report consumers | `SS-CU-S07-08-1` |  |
| `CU-S07-09` | `C` or `E` | diaper logs and linked stool data seeded | Cross-check linked elimination data in Home, History, and Report | Linked views stay internally consistent and do not duplicate or drop data unexpectedly | `SS-CU-S07-09-1` |  |

### S08 Feed and Breastfeed Matrix

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S08-01` | `E` | Feed form open | Sweep all feed types: `Breastfeed`, `Formula`, `Bottle`, `Pumping`, `Solids`, `Water`, `Other` | Each type is selectable and reveals the correct conditional fields | `SS-CU-S08-01-1` |  |
| `CU-S08-02` | `E` | Feed form open | For `Bottle`, sweep contents `Breast milk`, `Formula`, `Mixed` and amount entry | Bottle-specific fields save and render correctly | `SS-CU-S08-02-1` |  |
| `CU-S08-03` | `E` | Feed form open | For `Breastfeed`, sweep breast sides `Left`, `Right`, `Both` and duration entry | Breast-side data saves and appears in feed history correctly | `SS-CU-S08-03-1` |  |
| `CU-S08-04` | `E` | Feed form open | For `Formula`, `Pumping`, and `Water`, verify amount fields and pumping duration | Conditional amount and duration logic behaves correctly | `SS-CU-S08-04-1` |  |
| `CU-S08-05` | `E` | Feed form open | For `Solids` and `Other`, verify food name, constipation-support toggle, reaction notes, and general notes | All conditional controls save and render as expected | `SS-CU-S08-05-1` |  |
| `CU-S08-06` | `E` | Feed page seeded | Use quick presets and `Repeat last` | New entries appear immediately and update Home, Trends, and History | `SS-CU-S08-06-1` |  |
| `CU-S08-07` | `E` | seeded feed week exists | Navigate weekly pattern older and newer, inspect status and week entries | Aggregates and entry list remain in sync | `SS-CU-S08-07-1` |  |
| `CU-S08-08` | `D` | Breastfeed route available | Start timer on left, pause, resume on right, switch sides, save session | Timer state, suggested side, saved feed, and recent history remain correct | `SS-CU-S08-08-1` |  |
| `CU-S08-09` | `D` | Breastfeed timer available | Start timer then cancel instead of saving | Timer is removed cleanly and app stays usable | `SS-CU-S08-09-1` |  |
| `CU-S08-10` | `D` | solids-transition CTA visible | Open `Mark started solids`, test cancel and confirm across repeated runs | Confirm creates milestone, updates feeding type to mixed, and routes to Feed; cancel leaves state unchanged | `SS-CU-S08-10-1` |  |
| `CU-S08-11` | `E` solids-only | Breastfeed route opened for non-breastfed child | Verify hidden timer state and messaging | App explains why timer is unavailable and remains stable | `SS-CU-S08-11-1` |  |

### S09 Sleep Matrix

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S09-01` | `E` | Sleep sheet open | Use timer mode for `Nap`: start, observe running state, stop and save | Timer summary, saved log, and page overview update correctly | `SS-CU-S09-01-1` |  |
| `CU-S09-02` | `E` | Sleep sheet open | Use timer mode for `Night`: start, observe running state, stop and save | Night timer follows same rules without corrupting nap metrics | `SS-CU-S09-02-1` |  |
| `CU-S09-03` | `E` | timer mode open | Start timer then cancel | Timer disappears and no phantom log remains | `SS-CU-S09-03-1` |  |
| `CU-S09-04` | `E` | manual mode open | Sweep `Nap` and `Night` manual logs | Manual logs save with correct type and page summaries | `SS-CU-S09-04-1` |  |
| `CU-S09-05` | `E` | manual mode open | Test invalid ranges: future end, end before start, impossible combination | Save is blocked or validation feedback appears without corrupting page metrics | `SS-CU-S09-05-1` |  |
| `CU-S09-06` | `E` | timer or manual log exists | Add notes and verify page timer summary plus recent-history display | Notes save correctly and timer summary entry point reopens the sheet | `SS-CU-S09-06-1` |  |
| `CU-S09-07` | `E` | editable sleep log exists | Edit nap and night entries across repeated runs | Edited values propagate to overview and history | `SS-CU-S09-07-1` |  |
| `CU-S09-08` | `E` | editable sleep log exists | Delete a sleep entry | Entry is removed from Sleep, History, Home, and any report consumer | `SS-CU-S09-08-1` |  |
| `CU-S09-09` | `E` | seeded sleep data exists | Relaunch app and reopen Sleep | Latest summary, recent history, and timer-free state persist | `SS-CU-S09-09-1` |  |

### S10 Episode and Symptom Matrix

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S10-01` | `E` | Episode sheet open | Start `Constipation` episode | Episode creates successfully with correct badge and summary | `SS-CU-S10-01-1` |  |
| `CU-S10-02` | `E` | Episode sheet open in clean reset | Start `Diarrhoea` episode | Episode creates successfully with correct badge and summary | `SS-CU-S10-02-1` |  |
| `CU-S10-03` | `E` | active episode exists | Add one update for each event type: `Symptom`, `Hydration`, `Food`, `Intervention`, `Progress` | Timeline renders every event type correctly | `SS-CU-S10-03-1` |  |
| `CU-S10-04` | `E` | active episode exists | Add title-only update, notes-only update, and titled+noted update across repeated runs | Validation and default-label behavior stay correct | `SS-CU-S10-04-1` |  |
| `CU-S10-05` | `E` | active episode with updates exists | Resolve episode | Active-episode state clears and summary surfaces update correctly | `SS-CU-S10-05-1` |  |
| `CU-S10-06` | `E` | Symptom sheet open, no active episode | Sweep every symptom type at every severity across repeated runs | Each symptom logs successfully and displays correctly in alerts and concern surfaces | `SS-CU-S10-06-1` |  |
| `CU-S10-07` | `E` | active episode exists | Log symptoms with `Linked` and `Not linked` states across repeated runs | Linked symptoms appear in episode context; unlinked symptoms remain standalone | `SS-CU-S10-07-1` |  |

### S11 Milestones and Growth Matrix

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S11-01` | `E` | Milestone sheet open | Sweep every milestone type with and without notes across repeated runs | Each milestone saves and appears in milestone activity and supporting consumers | `SS-CU-S11-01-1` |  |
| `CU-S11-02` | `D` or `E` | milestone history exists | Verify milestone summary board, activity list, and add-first empty state where applicable | Empty and seeded milestone states are both correct | `SS-CU-S11-02-1` |  |
| `CU-S11-03` | `E` | Growth sheet open | Save weight-only entry | Entry saves, trend and latest-weight card update | `SS-CU-S11-03-1` |  |
| `CU-S11-04` | `E` | Growth sheet open | Save length-only and head-only entries across repeated runs | Single-metric growth entries remain valid and render correctly | `SS-CU-S11-04-1` |  |
| `CU-S11-05` | `E` | Growth sheet open | Save each two-metric combination and one all-three-metric entry across repeated runs | Any valid metric combination saves and renders without requiring all fields | `SS-CU-S11-05-1` |  |
| `CU-S11-06` | `E` and sex-missing variant | Growth history exists | Toggle units, inspect percentile and sex-missing messaging | Unit conversion is consistent and missing-sex messaging appears only when appropriate | `SS-CU-S11-06-1` |  |
| `CU-S11-07` | `E` | editable growth entry exists | Edit and delete growth entries | Changes propagate and delete fully removes the entry | `SS-CU-S11-07-1` |  |

### S12 Dashboard, History, Report, Guidance, Privacy

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S12-01` | `B` and `E` | no-data and seeded states available | Open Dashboard in both states | Empty state appears for no-data; seeded state renders summary tiles and panels | `SS-CU-S12-01-1` |  |
| `CU-S12-02` | `E` | seeded trends exist | Sweep trend periods `7`, `14`, `30` days and tabs `Overview`, `Feed`, `Sleep`, `Diaper`, `Poop` | Charts and narratives update without stale or mismatched data | `SS-CU-S12-02-1` |  |
| `CU-S12-03` | `E` | History seeded across entry types | Sweep quick ranges `7`, `14`, `30`, search by date, clear search | Timeline grouping, expansion, and search behavior remain correct | `SS-CU-S12-03-1` |  |
| `CU-S12-04` | `E` | History seeded | Verify timeline cards for poop, diaper, feed, sleep, symptoms, milestones, growth, and episodes if present | All supported history card types render correctly | `SS-CU-S12-04-1` |  |
| `CU-S12-05` | `E` | History seeded | Open edit sheet from History for poop, diaper, feed, and sleep across repeated runs | Correct edit sheet opens with correct record | `SS-CU-S12-05-1` |  |
| `CU-S12-06` | `E` | History seeded | Delete poop, diaper, feed, and sleep from History across repeated clean runs | Deletions fully remove entries from origin and secondary surfaces | `SS-CU-S12-06-1` |  |
| `CU-S12-07` | `B` and `E` | Report route open | Generate report for no-data and seeded ranges; toggle include chips | No-data warning behaves correctly; seeded preview renders and options update preview | `SS-CU-S12-07-1` |  |
| `CU-S12-08` | `E` | seeded report preview exists | Run save flow once with accept and once with cancel | File dialog accept saves successfully; cancel returns cleanly with no broken UI | `SS-CU-S12-08-1` | `SB` if file dialog blocked |
| `CU-S12-11` | `E` | Guidance route open | Sweep filter chips and expand/collapse multiple tips | Filtering and expansion are stable with no stuck state | `SS-CU-S12-11-1` |  |
| `CU-S12-12` | any unlocked or locked state | open Privacy via Settings and locked paywall path | Verify privacy route content and return navigation | Privacy is reachable in both allowed contexts and returns safely | `SS-CU-S12-12-1` |  |

### S13 OS Boundary and Recovery

| Test ID | Profile | Preconditions | Actions | Expected | Evidence | Defect Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CU-S13-01` | `E` | notification permission set to `allowed` | Toggle daily check-in and smart reminders | Permission path succeeds and Tiny Tummy reflects enabled state | `SS-CU-S13-01-1` |  |
| `CU-S13-02` | `E` | notification permission set to `denied` | Toggle daily check-in and smart reminders | Tiny Tummy shows denial feedback and remains stable | `SS-CU-S13-02-1` |  |
| `CU-S13-03` | `E` | report preview exists | Accept file-save dialog | App shows save success and returns to usable Report screen | `SS-CU-S13-03-1` |  |
| `CU-S13-04` | `E` | report preview exists | Cancel file-save dialog | App returns to Report with no frozen overlay or stale loading state | `SS-CU-S13-04-1` |  |
| `CU-S13-05` | `A` or `E` | avatar or elimination photo flow open | Accept image picker and save selection | Preview appears and app remains interactive | `SS-CU-S13-05-1` |  |
| `CU-S13-06` | `A` or `E` | avatar or elimination photo flow open | Cancel image picker | App returns to prior screen with no broken state | `SS-CU-S13-06-1` |  |
| `CU-S13-07` | `A` or `E` | photo preview exists | Remove selected photo before save or during edit | Removal succeeds and control can be reused | `SS-CU-S13-07-1` |  |

## Persistence Requirements

The following data writes must each include at least one relaunch-persistence confirmation:

- child creation
- child edit
- poop log
- diaper log
- feed log
- breastfeed saved session
- sleep log
- milestone
- growth entry
- symptom log
- episode start, update, and resolution
- theme
- units
- elimination main-page preference
- access profile state after dev-tool change

## Exit Criteria

This plan is complete only when all of the following are true:

- every route in `src/App.tsx` is executed or explicitly marked blocked with reason
- every primary CTA, sheet, dialog, segmented control, and destructive action listed in the Primary Surface Inventory has a recorded test result
- every saved entry type is verified in its origin screen, in History, and in at least one secondary consumer such as Home, Dashboard, or Report
- every profile includes at least one relaunch-persistence pass
- every access state confirms forward and backward navigation, including the locked-mode exception that still exposes Settings and Privacy
- every blocked item is classified as `AI`, `SB`, or `EN` and includes evidence

## Assumptions and Defaults

- Default save location for this plan is `docs/COMPUTER_USE_QA_PLAN.md`.
- Use the native Tauri app only; if `pnpm tauri dev` is not attachable by Computer Use, use a packaged `.app` or equivalent attachable local build.
- Use `TAURI_E2E_RESET=1` as the default clean-start mechanism.
- Use the macOS app-data path only as the reset fallback.
- Dev-only `Developer Tools` in Settings are in scope and are the approved route for trial and premium state testing.
- Actual store billing and long-delay notification delivery are boundary-limited unless the local build exposes a directly testable simulation.
- No direct UI control currently guarantees a no-poop day entry on demand; verify that state when auto-generated or pre-seeded, and mark unavailable setup as environment-blocked rather than product-failed.
