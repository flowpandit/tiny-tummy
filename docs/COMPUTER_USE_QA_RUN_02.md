# Computer Use QA Run 02

Date: `2026-04-24`  
Tester: `Codex via Computer Use`  
Execution target: [Tiny Tummy.app](</Users/nikhilmehral/dev/tiny-tummy/src-tauri/target/release/bundle/macos/Tiny Tummy.app>)  
Launch mode: clean packaged app run using `TAURI_E2E_RESET=1`  
Related baseline: [docs/COMPUTER_USE_QA_RUN_01.md](/Users/nikhilmehral/dev/tiny-tummy/docs/COMPUTER_USE_QA_RUN_01.md)

## Retest Scope

This run was a targeted validation pass for the three issues recorded in Run 01:

1. exact 2-month-old profile showing `1 month old`
2. same-day logs grouped under `Yesterday` in History
3. Breastfeed summary wording implying saved totals even though the rings reset after saving a session

## Validation Result

### 1. Age label regression: fixed

- Retest steps:
  1. Launch the packaged app from a clean reset.
  2. Create child `Luna` with DOB `24 Feb 2026`, sex `Girl`, feeding type `Breastfed`.
  3. Continue to the onboarding normal-range card and then inspect downstream child headers.
- Verified result:
  - The onboarding card now shows `2 months old`.
  - Diaper and History also show `2 months old`.
- Status:
  - `Resolved`

### 2. History same-day grouping regression: fixed

- Retest steps:
  1. From the same clean run, create one wet diaper log, one manual nap, and one timed breastfeeding session.
  2. Open `History`.
- Verified result:
  - The grouped section now renders as `Today`.
  - The date field shows `24 Apr 2026` and the section summary correctly reads `1 diaper 1 feed 1 sleep`.
- Status:
  - `Resolved`

### 3. Breastfeed summary mismatch: resolved as UX clarification

- Review outcome:
  - The code review showed the Breastfeed rings are current-session values, not persisted historical totals.
  - The confusing part was the label wording, not the reset-after-save behavior itself.
- Change made:
  - `Left total` was changed to `Left session`
  - `Right total` was changed to `Right session`
- Retest steps:
  1. Open `Breastfeed`.
  2. Start the left-side timer.
  3. Confirm the page shows `LEFT SESSION`, `CURRENT SESSION`, and `RIGHT SESSION`.
  4. Save the session.
- Verified result:
  - Before save, the labels clearly describe session-only values.
  - After save, the rings reset to `0`, while recent history correctly shows the saved feed.
  - The wording now matches the behavior and removes the misleading “total” implication from Run 01.
- Status:
  - `Resolved`

## Verification

- `npm test` passed: `68/68`
- `npm run lint` passed
- `npm run build` passed
- `pnpm tauri build` rebuilt the packaged `.app`
- DMG bundling still fails in `bundle_dmg.sh`, but the rebuilt macOS app bundle was produced successfully and used for this retest

## Notes

- No new issues were observed in the targeted replay path used for this validation.
- This was a focused retest, not a full rerun of the master QA matrix.
