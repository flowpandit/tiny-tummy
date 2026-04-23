# Computer Use QA Run 01

Date: `2026-04-24`  
Tester: `Codex via Computer Use`  
Execution target: [Tiny Tummy.app](</Users/nikhilmehral/dev/tiny-tummy/src-tauri/target/release/bundle/macos/Tiny Tummy.app>)  
Launch mode: clean packaged app run using `TAURI_E2E_RESET=1`  
Plan source: [docs/COMPUTER_USE_QA_PLAN.md](/Users/nikhilmehral/dev/tiny-tummy/docs/COMPUTER_USE_QA_PLAN.md)

## Findings

### 1. [P1] History groups same-day logs under `Yesterday`

- Severity: `P1`
- Classification: `AI`
- Related plan coverage: `CU-S12-03`, `CU-S12-04`
- Exact repro steps:
  1. Launch the packaged app from a clean reset.
  2. Create a child with:
     - name `Luna`
     - DOB `24 Feb 2026`
     - sex `Girl`
     - feeding type `Breastfed`
  3. Save one wet diaper log from the Diaper page.
  4. Save one manual nap from the Sleep page.
  5. Start and save one breastfeeding session from the Breastfeed page.
  6. Open `History` on `24 Apr 2026`.
- Expected result:
  - The three logs created on `24 Apr 2026` should be grouped under `Today` or under a matching `24 Apr 2026` day section.
- Actual result:
  - The page-level date shows `24 Apr 2026`, but the grouped section is labeled `Yesterday`.
  - The `Yesterday` group contains the same-day sleep, diaper, and breastfeed entries.
- Affected screen/feature:
  - `History`
  - day-grouping logic for sleep, diaper, and feed entries

### 2. [P2] Exact 2-month-old child is displayed as `1 month old`

- Severity: `P2`
- Classification: `AI`
- Related plan coverage: `CU-S02-05`, `CU-S04-01`, `CU-S05-01`
- Exact repro steps:
  1. Launch the packaged app from a clean reset.
  2. Create a child with DOB `24 Feb 2026`.
  3. Continue onboarding and land on the normal-range intro card on `24 Apr 2026`.
  4. Continue into the app and inspect the child header on Home, Diaper, Settings, Privacy, and History.
- Expected result:
  - A child born on `24 Feb 2026` and viewed on `24 Apr 2026` should display as `2 months old`.
- Actual result:
  - The app consistently displays `1 month old`.
- Affected screen/feature:
  - onboarding success card
  - Home header
  - Diaper header
  - Settings child summary
  - Privacy header
  - History header

### 3. [P2] Breastfeed summary rings reset to zero immediately after saving a timed session

- Severity: `P2`
- Classification: `AI`
- Related plan coverage: `CU-S08-05`
- Exact repro steps:
  1. Create the same breastfed infant profile described above.
  2. Open `Breastfeed`.
  3. Start the left-side timer.
  4. Let it run briefly until the UI shows a saved duration of about `1 min`.
  5. Save the breastfeeding session.
- Expected result:
  - The saved session should be reflected in the Breastfeed summary, especially `Left total`.
  - The page summary and recent history should agree.
- Actual result:
  - The recent-history area shows `Today: Left side · 1 min`.
  - `History` also shows a saved breastfeeding record.
  - The top summary rings reset to `0 mins LEFT TOTAL`, `0 mins CURRENT SESSION`, and `0 mins RIGHT TOTAL`.
- Affected screen/feature:
  - `Breastfeed` summary/dashboard state after save

## Coverage Summary

This first run was a baseline pass, not the full matrix sweep from the master plan. The goal was to verify the clean packaged app path, create an infant profile, and exercise the earliest major flows end to end before deeper permutations.

### Sections Covered This Run

| Suite | Status | Notes |
| --- | --- | --- |
| `S01 Startup and Access` | `Partial` | Clean launch to onboarding verified. Locked and premium states not yet exercised. |
| `S02 Onboarding and Add Child` | `Partial` | Welcome, blank-state disabled continue, partial-state disabled continue, future-date prevention via disabled future days, and one successful infant creation path verified. |
| `S03 Settings and Child Management` | `Partial` | Infant settings inspected. `Main tracking page` correctly showed only `Auto` and `Diaper` for this infant profile. Edit-child sheet opened successfully. |
| `S04 Home and Quick Actions` | `Partial` | Zero-state Home and later populated Home verified. Diaper, Sleep, and Breastfeed entry paths exercised. |
| `S05 Elimination Routing and Navigation` | `Partial` | Infant bottom-nav elimination route correctly labeled and opened as `Diaper`. |
| `S07 Diaper Flow Matrix` | `Partial` | Wet quick preset opened the correct sheet and saved successfully. |
| `S08 Feed and Breastfeed Matrix` | `Partial` | Breastfeed timer start and save flow exercised, with one summary-state defect found. Bottle/feed sheet not yet covered. |
| `S09 Sleep Matrix` | `Partial` | Manual nap flow saved successfully and produced sane page metrics on this run. |
| `S12 Dashboard, History, Report, Guidance, Handoff, Privacy` | `Partial` | Trends opened successfully, Privacy route opened and returned safely, History opened and revealed a grouping defect. |

### Verified Pass Notes

- Clean packaged app launch reached onboarding without a crash.
- `Get Started` correctly opened Add Child.
- `Continue` stayed disabled with blank fields.
- `Continue` also stayed disabled with only the name filled.
- The date picker prevented future DOB selection by disabling future days and disabling forward navigation past the current month.
- The infant elimination route correctly landed on `Diaper`.
- Settings did not expose an infant-only contradictory `Poop` override.
- Privacy Policy was reachable from Settings and back navigation returned safely.
- A default manual nap save produced sane-looking sleep metrics on this run.

## Untested Areas

- Startup-blocked recovery flow
- trial warning, expired trial, restore purchases, and premium unlock states
- avatar picker accept, cancel, crop, remove, and persistence
- multi-child creation, switching, and delete flows
- older-child `Poop` routing and override behavior
- dirty and mixed diaper permutations
- bottle/formula/other feed flows
- episode and symptom flows
- growth and milestone logging
- report generation and save/cancel
- guidance filters
- notifications allow/deny behavior
- share and clipboard boundary flows
- relaunch persistence pass after this seeded run

## Assumptions

- This run used the packaged native macOS app because Computer Use can attach to that bundle reliably.
- The app was launched with a clean reset before testing began.
- Findings are limited to behaviors directly observed in this run.
