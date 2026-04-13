# Tiny Tummy Billing And Trial Plan

## Goal

Implement a production-ready access model with:

- a local 14-day trial
- a one-time premium unlock for `$9.99 USD`
- no backend or recurring server dependency
- offline-friendly restore and entitlement behavior
- real-device testing coverage for Apple App Store and Google Play

This plan assumes:

- no subscription model
- no server verification
- acceptable low-risk exposure to device-clock abuse
- preference for simple and reliable UX over aggressive anti-tamper

## Current State

The repo already has a temporary local trial gate:

- [src/contexts/TrialContext.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/contexts/TrialContext.tsx)
- [src/components/billing/Paywall.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/billing/Paywall.tsx)

Current limitations:

- premium unlock is simulated through local settings only
- there is no real store purchase flow
- there is no restore flow
- trial keys are app-specific but not organized behind a dedicated entitlement service
- the current `TrialContext` mixes state, storage, and debug behavior

## Target Model

### Entitlement States

- `trial_active`
- `trial_expired`
- `premium_unlocked`

### Local Storage Keys

Use the existing settings storage in [src/lib/db.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/db.ts).

Suggested keys:

- `trial_started_at`
- `trial_last_seen_at`
- `premium_unlocked`
- `premium_platform`
- `premium_product_id`

### Rules

1. On first launch, store `trial_started_at` if it does not exist.
2. Trial length is exactly 14 days from `trial_started_at`.
3. If `premium_unlocked === "1"`, the app is fully unlocked regardless of trial age.
4. If the trial expires and premium is not unlocked, show paywall and gate premium features.
5. Restore purchases should re-set `premium_unlocked = "1"` locally.
6. Once unlocked, the app must continue working offline.

### Optional Soft Clock Guard

Store `trial_last_seen_at` and compare on launch:

- if device time is earlier than the last seen time by a meaningful amount, do not extend the trial from the rolled-back clock
- do not hard-lock the app for this
- keep it as a soft sanity check only

This is optional and should stay lightweight.

## Architecture Changes

## Phase A: Local Entitlement Service

### Goal

Replace the current `TrialContext` logic with a small, testable entitlement layer.

### New Files

- `src/lib/entitlements.ts`
- `src/hooks/useEntitlement.ts`

### Responsibilities

`src/lib/entitlements.ts`

- read and write entitlement keys from settings
- start trial if missing
- compute days remaining
- compute current entitlement state
- mark premium unlocked
- clear premium for debug
- expose pure-ish helpers for trial calculation

`src/hooks/useEntitlement.ts`

- load entitlement state for UI
- refresh entitlement
- expose purchase and restore actions from billing service
- keep components/pages free of storage details

### Suggested API

```ts
type EntitlementState =
  | { kind: "trial_active"; daysRemaining: number }
  | { kind: "trial_expired"; daysRemaining: 0 }
  | { kind: "premium_unlocked"; platform: "apple" | "google" | "debug" | "unknown" };

async function ensureTrialStarted(): Promise<void>;
async function getEntitlementState(now?: Date): Promise<EntitlementState>;
async function markPremiumUnlocked(input: { platform: string; productId: string }): Promise<void>;
async function clearPremiumUnlock(): Promise<void>;
```

### Files To Replace Or Refactor

- [src/contexts/TrialContext.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/contexts/TrialContext.tsx)

### Exit Criteria

- entitlement logic exists in one place
- the UI consumes entitlement state through a hook
- trial logic is testable without rendering the whole app

## Phase B: Billing Adapters

### Goal

Introduce platform billing behind a thin abstraction so the app never talks to Apple/Google APIs directly from UI.

### New Files

- `src/lib/billing/types.ts`
- `src/lib/billing/index.ts`
- `src/lib/billing/apple.ts`
- `src/lib/billing/google.ts`

### Suggested API

```ts
interface BillingPurchaseResult {
  success: boolean;
  platform: "apple" | "google";
  productId: string | null;
  restored?: boolean;
}

interface BillingAdapter {
  purchasePremium(): Promise<BillingPurchaseResult>;
  restorePremium(): Promise<BillingPurchaseResult>;
  checkOwnedPremium(): Promise<BillingPurchaseResult>;
}
```

### Product IDs

Use the same product ID on both platforms if possible:

- `premium_unlock`

### Important Rule

The billing adapter should only answer:

- purchase succeeded
- restore succeeded
- ownership exists

The entitlement layer decides how that affects access.

### Exit Criteria

- store-specific code is isolated
- UI only uses a shared billing service

## Phase C: Billing Service

### Goal

Create one app-facing service that joins billing results to local entitlement updates.

### New File

- `src/lib/billing-service.ts`

### Responsibilities

- call platform purchase flow
- on success call `markPremiumUnlocked(...)`
- run restore flow
- run startup ownership sync
- normalize user-facing failure/success results

### Suggested API

```ts
async function purchasePremium(): Promise<{ ok: boolean; restored?: boolean; message?: string }>;
async function restorePurchases(): Promise<{ ok: boolean; restored: boolean; message?: string }>;
async function syncOwnedPurchase(): Promise<void>;
```

### Exit Criteria

- purchase and restore logic are owned outside components
- successful purchases update local premium state immediately

## Native Integration Map

The repo does not currently include a billing plugin or native purchase bridge.

Current native surface:

- Rust app entry and plugin registration live in [src-tauri/src/lib.rs](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/src/lib.rs)
- Android custom mobile plugins already exist in:
  - [src-tauri/src/statusbar.rs](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/src/statusbar.rs)
  - [src-tauri/src/downloads.rs](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/src/downloads.rs)
  - [src-tauri/android-templates/StatusBarPlugin.kt](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/android-templates/StatusBarPlugin.kt)
  - [src-tauri/android-templates/DownloadsPlugin.kt](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/android-templates/DownloadsPlugin.kt)
- There is no equivalent iOS billing bridge in the repo yet.

Recommended approach:

1. Keep desktop and dev simulation exactly as-is in:
   - [src/lib/billing/index.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/billing/index.ts)
   - [src/lib/billing-service.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/billing-service.ts)
2. Add one native mobile billing bridge per platform.
3. Keep the TypeScript billing adapter API unchanged so the UI does not churn again.

### Android Bridge

Add a dedicated Android billing plugin using the same pattern as the existing custom plugins.

Files to add:

- `src-tauri/src/billing.rs`
- `src-tauri/android-templates/BillingPlugin.kt`

Rust side responsibilities:

- register the Android plugin in `run()` alongside `downloads` and `statusbar`
- expose Tauri commands:
  - `billing_purchase_premium`
  - `billing_restore_premium`
  - `billing_check_owned_premium`

Kotlin side responsibilities:

- initialize Play Billing client
- query one-time product details for `premium_unlock`
- launch billing flow
- acknowledge completed purchases
- query owned purchases for restore and startup sync
- return normalized payloads back to Rust and TypeScript

Preferred purchase rules:

- only treat `PURCHASED` items as unlocks
- acknowledge the purchase before resolving success
- use `queryPurchasesAsync` for owned one-time purchases during restore and startup sync

### iOS Bridge

Add a small iOS billing plugin for StoreKit 2.

Files to add:

- `src-tauri/src/billing.rs`
- an iOS Swift plugin file under the Tauri mobile iOS plugin location generated for this app

Rust side responsibilities:

- register the iOS billing plugin
- expose the same command surface as Android:
  - `billing_purchase_premium`
  - `billing_restore_premium`
  - `billing_check_owned_premium`

Swift side responsibilities:

- fetch the `premium_unlock` product
- purchase it via StoreKit 2
- inspect verified transactions
- use current entitlements or latest transactions for restore and ownership checks
- finish transactions after successful handling

Preferred purchase rules:

- only unlock from verified transactions
- use `AppStore.sync()` only for explicit restore
- do not trigger credential-prompting restore logic automatically on app launch
- use current entitlements for silent ownership sync

### TypeScript Adapter Contract

Keep the existing files and only replace the stub internals:

- [src/lib/billing/apple.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/billing/apple.ts)
- [src/lib/billing/google.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/billing/google.ts)

Each adapter should:

- call the native bridge through Tauri
- return:
  - `ok`
  - `restored`
  - `platform`
  - `productId`
  - `message`
- never write entitlement storage directly

## Phase C.1: Native Billing Bridge

### Goal

Replace the Apple and Google adapter stubs with native purchase bridges while preserving desktop dev simulation.

### Files To Add

- `src-tauri/src/billing.rs`
- `src-tauri/android-templates/BillingPlugin.kt`
- iOS Swift billing plugin file in the generated mobile project

### Files To Update

- [src-tauri/src/lib.rs](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/src/lib.rs)
- [src/lib/billing/apple.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/billing/apple.ts)
- [src/lib/billing/google.ts](/Users/nikhilmehral/dev/tiny-tummy/src/lib/billing/google.ts)

### Exit Criteria

- iOS adapter performs real StoreKit purchase, restore, and ownership sync
- Android adapter performs real Play Billing purchase, restore, and ownership sync
- desktop dev still uses simulated billing when running locally

## Phase D: Replace Paywall Simulation

### Goal

Wire the existing paywall to real billing instead of the simulated unlock button.

### Files To Update

- [src/components/billing/Paywall.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/billing/Paywall.tsx)
- wherever the paywall is gated in app shell or routes

### Required UX

- main CTA triggers real store purchase
- restore button triggers restore flow
- purchase success unlocks immediately
- restore success unlocks immediately
- failure shows actionable error copy

### Copy Updates

Replace temporary restore text:

- current: `Restore will connect once native billing is wired.`
- target: real restore behavior with success/error toast

### Exit Criteria

- paywall is connected to real billing
- simulated timeout-based unlock is removed

## Phase E: Access Gating

### Goal

Gate the right parts of the app consistently.

### Recommended Locked Areas

- reports and exports
- premium dashboards and analytics
- continued logging after trial expiry
- advanced history/edit flows if you want stronger conversion pressure

### Recommended Unlocked Areas

- app launch
- viewing the paywall
- settings
- restore purchases

### Requirement

Do not block the app just because store ownership check is temporarily unavailable.

Local unlocked entitlement should continue to work offline.

### Exit Criteria

- gating is consistent and centralized
- unlocked users are never spuriously relocked by transient store failures

## Phase F: Restore And Startup Sync

### Goal

Restore owned purchases cleanly after reinstall or device change on the same store account.

### On App Startup

1. Load local entitlement.
2. If already premium, allow app access immediately.
3. In the background, run `syncOwnedPurchase()`.
4. If owned premium is found, keep `premium_unlocked = "1"`.

### Settings Entry

Add a visible `Restore Purchases` action in settings.

Likely file:

- [src/components/settings/SettingsSections.tsx](/Users/nikhilmehral/dev/tiny-tummy/src/components/settings/SettingsSections.tsx)

### Exit Criteria

- reinstall on the same account can recover premium
- restore is accessible from both paywall and settings

## Phase G: Debug Entitlement Tools

### Goal

Make local QA and real-device testing fast without waiting 14 actual days.

### Add In Dev Builds Only

- reset trial
- set trial start to now
- set trial start to 13 days ago
- set trial start to 15 days ago
- clear premium
- simulate premium unlocked
- run restore purchases
- show current raw entitlement state

### Suggested Placement

- hidden debug section in settings
- only compiled for dev or internal builds

### Exit Criteria

- trial and premium states can be simulated on-device in seconds

## Real Device Testing Plan

## Apple App Store

### Product Setup

- create a `Non-Consumable` IAP
- product ID: `premium_unlock`
- price: `$9.99 USD`

### Test Environments

- local device build with sandbox Apple account
- TestFlight build with sandbox purchase testing

### Test Cases

- fresh install starts 14-day trial
- trial countdown persists across app relaunches
- forced expired trial shows paywall
- purchase unlocks immediately
- kill and relaunch app, still unlocked
- airplane mode after unlock, still unlocked
- reinstall app, use restore purchases, unlock returns
- restore from settings works
- restore from paywall works

### Nice-To-Have

- test canceling purchase flow
- test repeated restore on already-owned product

## Google Play

### Product Setup

- create a one-time product
- product ID: `premium_unlock`
- price: `$9.99 USD`

### Test Environments

- internal testing track
- real Android device
- tester account / license tester

### Test Cases

- fresh install starts 14-day trial
- trial persists across relaunches
- forced expired trial shows paywall
- purchase unlocks immediately
- kill and relaunch app, still unlocked
- airplane mode after unlock, still unlocked
- reinstall app, restore/query owned purchases returns unlock
- restore from settings works
- restore from paywall works

### Nice-To-Have

- test canceled purchase
- test already-owned purchase flow

## Suggested Engineering Order

1. Extract entitlement logic out of `TrialContext`.
2. Add `useEntitlement`.
3. Add billing adapter interfaces and stub implementations.
4. Update paywall to use billing service instead of simulated unlock.
5. Add restore actions in settings and paywall.
6. Add dev-only entitlement debug tools.
7. Wire Apple billing.
8. Wire Google billing.
9. Run full real-device test matrix.
10. Remove old simulated trial-only code paths.

## Definition Of Done

- local 14-day trial starts exactly once
- one-time purchase unlock works on iPhone and Android
- restore works after reinstall on both platforms
- unlocked users retain access offline
- no backend dependency exists
- paywall uses real billing flow
- settings includes restore purchases
- dev/internal builds include entitlement debug tools
- full device test checklist has been executed

## Open Product Decisions

These should be decided before implementation starts:

1. What exact features lock after trial expiry?
2. Should viewing old logs remain free after expiry?
3. Should export/report generation be premium-only?
4. Should history editing be premium-only?
5. Should there be a small grace UX after expiry, or immediate paywall?

## Notes

- Since this is a low-cost app with no backend, local enforcement is an acceptable tradeoff.
- Do not optimize for stopping determined attackers. Optimize for reliable UX for normal users.
- Store purchase and restore flows should improve access, not create fragility.
