# Lifetime Private Purchase Audit

Date: 2026-05-06

Scope: audit the current trial, premium unlock, feature gate, restore, and mobile billing surface for launching the real Lifetime Private one-time purchase. This document does not implement purchases, Family Sync, accounts, Supabase, or backend verification.

## Current State

- The active unlock screen is `src/pages/PlanSync.tsx`. It presents Free, Lifetime Private at `$14.99 once`, and Family Sync as a disabled/coming-later plan in-app.
- The public landing page also describes Free, Lifetime Private at `$14.99 USD once`, and future Family Sync pricing. `README.md` and `BILLING_IMPLEMENTATION_PLAN.md` needed cleanup so the production price, product ID, and active `PlanSync.tsx` screen are aligned.
- `FeatureGateService` is the canonical feature map. It has typed feature IDs, entitlement IDs, legacy feature ID compatibility, and separate future sync gates.
- `TrialContext` is now mostly a React wrapper over `trial-store`, `entitlements`, `billing-service`, and `FeatureGateService`.
- There is no global paywall route lock anymore. Premium features are gated inline or by feature-specific redirects to `/unlock`.
- No Supabase client, account flow, auth UI, or backend runtime dependency is present. Family Sync exists as docs, future feature IDs, and in-app marketing only.

## Real vs Mocked

Real production-shaped code exists for:

- Local entitlement storage in `app_settings`.
- Feature gate resolution from `trial`, `lifetime_private`, future add-ons, and developer-only entitlements.
- A TypeScript billing service and Apple/Google adapter boundary.
- Tauri Rust mobile commands for purchase, restore, and ownership sync.
- iOS StoreKit 2 code in `src-tauri/ios-templates/BillingPlugin.swift`.
- Android Play Billing code in `src-tauri/android-templates/BillingPlugin.kt`.

Mocked or dev-only behavior:

- Desktop development builds simulate purchase by writing `premium_unlocked=1` with platform `debug`.
- Developer Tools in Settings can reset/expire the trial, clear premium, simulate premium unlock, and simulate future add-ons including `sync_addon`.
- Developer feature entitlements are read only in `import.meta.env.DEV`.

Not production-ready yet:

- The store product ID constant needed to move to `com.tinytummy.lifetime_private`; the old ID should remain only as legacy/dev compatibility input.
- Store product metadata is not fetched into the UI; the displayed price is hard-coded.
- The native billing path needs real sandbox/TestFlight/internal-track verification.
- Android billing reproducibility needs tightening: generated `src-tauri/gen/android` currently contains `BillingPlugin.kt` and `billing-ktx`, but that directory is ignored, and `scripts/setup-android.sh` does not copy the billing plugin or add the billing dependency.
- Purchase/restore result types are too coarse for production UX: cancelled, pending, unavailable, offline, and no-owned-purchase all collapse into `ok: false` plus a message.
- There are no focused unit tests for `entitlements.ts` or `billing-service.ts`.

## Lifetime Private Representation

Current internal representation:

- Stored entitlement state: `premium_unlocked`.
- Derived entitlement: `lifetime_private`.
- Provenance/compat entitlement: `store_entitlement` for non-debug store unlocks.
- Debug unlock source: `developer_override`.

`premium_unlocked=1` maps to `lifetime_private` in `FeatureGateService`. That currently unlocks private lifetime features and does not unlock sync features.

## Entitlement Storage

Stored in SQLite `app_settings`:

- `trial_started_at`
- `trial_last_seen_at`
- `premium_unlocked`
- `premium_platform`
- `premium_product_id`
- legacy read/migration support for `app_first_launched_at` and `app_is_premium`
- developer-only `developer_feature_entitlements`

Payment/trial/developer keys are intentionally excluded from backup/export and future sync payloads.

## Trial Behavior

Current behavior:

- Trial length is 14 days.
- `ensureTrialStarted()` starts trial on first entitlement read.
- `trial_last_seen_at` provides a light clock rollback guard.
- `trial_active` grants the same private-lifetime feature category as Lifetime Private, but not Family Sync.
- `trial_expired` becomes Free.
- `null` entitlement is treated as trial-compatible while loading, so startup failures avoid incorrectly hard-locking the app.

Recommendation: **Option B, remove the trial and rely on Free plan for the production Lifetime Private launch.**

Reasoning:

- Free is already useful and private, which is the cleanest trial experience for a one-time unlock.
- App Store/Google Play one-time products do not give the same clean, native trial model as subscriptions.
- The local 14-day trial adds clock, copy, QA, and support complexity without store-backed entitlement truth.
- If product wants a preview period later, keep it explicitly app-side and call it a feature preview, not a store trial.

Do not remove the trial in the purchase-wiring PR unless that PR is explicitly scoped to access model simplification.

## Restore Behavior

Current behavior:

- `/unlock` and Settings both expose restore.
- Desktop dev restore only succeeds if local debug premium is already set.
- iOS explicit restore calls `AppStore.sync()` then checks `Transaction.currentEntitlements`.
- iOS startup ownership sync checks `Transaction.currentEntitlements` without calling `AppStore.sync()`.
- Android restore/startup ownership sync uses `queryPurchasesAsync(INAPP)` and filters purchased products.
- Successful restore writes `premium_unlocked=1`, `premium_platform`, and `premium_product_id`.

Recommended production restore:

- Restore Lifetime Private from the store account only; no Tiny Tummy account.
- Treat store ownership as authoritative for reinstall/device change.
- Keep already-unlocked local users unlocked if store checks temporarily fail.
- Do not grant entitlement for Google Play `PENDING` purchases.
- Distinguish cancelled, pending, no purchase found, store unavailable/offline, and product unavailable in result types and UI copy.
- Validate returned product ID exactly equals `com.tinytummy.lifetime_private` before writing local entitlement.

## Offline Behavior

- Already unlocked user stays unlocked from local `premium_unlocked=1`.
- Free user cannot start a new purchase while offline.
- Restore requires store availability and usually internet.
- Startup ownership sync failure must not relock an already unlocked user.
- No app account, backend login, or cloud entitlement service is required.

## Product IDs

Recommended now:

- Apple/Google one-time non-consumable: `com.tinytummy.lifetime_private`

Future only, do not create or wire yet:

- `com.tinytummy.family_sync.monthly`
- `com.tinytummy.family_sync.yearly`

Notes:

- Use the same product ID on both stores if possible.
- Create Lifetime Private as a non-consumable / one-time non-consumable purchase.
- Product IDs are effectively permanent after creation, so do not create Family Sync products until the subscription model is committed.

## Entitlement Mapping

Store product `com.tinytummy.lifetime_private` grants:

- `lifetime_private`

It should unlock:

- `unlimited_history`
- `pediatrician_report`
- `advanced_report_modes`
- `caregiver_handoff_pdf`
- `export_backup`
- `import_backup`
- `multi_child`
- `growth_tracking`
- `symptoms_episodes`
- `advanced_trends`

Current nuance:

- `caregiver_handoff_pdf`, `growth_tracking`, and `symptoms_episodes` are currently available on Free with `futureRequiredEntitlement: "lifetime_private"`. They are still unlocked by Lifetime Private, but they are not currently locked to it.
- `csv_export`, `stool_photo_capture`, and `smart_reminders` are also currently in the lifetime-private category.

Lifetime Private must not grant:

- `sync_addon`
- `family_sync`
- `caregiver_invites`
- `multi_device_sync`
- `cloud_backup`
- `shared_live_today`
- `sync_subscription`

## Existing Feature-Gated Paths

Migrated to `FeatureGateService`/feature IDs:

- Multi-child: Add Child, Settings, All Kids, Header/ScenicHero child switching.
- Unlimited history: History range/date limits.
- Pediatrician reports: Report page.
- Caregiver handoff PDF: Handoff PDF generation.
- Backup/import: Settings backup/restore actions.
- Advanced trends: Dashboard.
- Stool photos: poop and diaper logging forms.
- Smart reminders: Settings reminder rows.
- Future sync features: modeled but not reachable in production.

Broad access still exists mainly for plan status/copy:

- `accessKind`, `isLocked`, `hasFullAccess`, and `daysRemaining` in `TrialContext`.
- Settings access card and `/unlock` header copy.

## Testing Plan

Add focused tests for:

- Free access map keeps Family Sync locked.
- `lifetime_private` unlocks the intended local features.
- `lifetime_private` does not grant `sync_addon` or Family Sync features.
- Trial access if retained, or absence of trial access if removed.
- Store product ID maps only to `lifetime_private`.
- Unknown/wrong product IDs do not unlock.
- Purchase success marks premium with platform and product ID.
- Purchase cancelled does not unlock and shows non-error cancellation copy.
- Google pending purchase does not unlock and can complete later.
- Restore success marks premium.
- Restore no-purchase/failure/offline does not unlock.
- Startup ownership sync unlocks when the store reports owned.
- Startup ownership sync failure does not clear existing local unlock.
- Backup/export excludes payment, trial, and developer entitlement keys.

Native/manual store tests:

- Apple sandbox/TestFlight purchase, restore, reinstall restore, device change restore, refund/revocation behavior.
- Google internal testing purchase, pending payment, cancellation, acknowledgement, restore via `queryPurchasesAsync`, reinstall/device change behavior.
- Airplane mode after successful unlock.

## Roadmap

1. Clean entitlement storage and mapping.
   - Add explicit product-to-entitlement mapping.
   - Rename product ID constant to Lifetime Private.
   - Preserve legacy `premium_unlock` only as migration/compat input if needed.
   - Add unit tests around entitlement parsing and feature mapping.

2. Wire Lifetime Private product metadata.
   - Introduce `LIFETIME_PRIVATE_PRODUCT_ID = "com.tinytummy.lifetime_private"`.
   - Fetch localized title/price/availability from StoreKit/ProductDetails where available.
   - Keep Family Sync product IDs documented but not in runtime product queries.

3. Add purchase button behavior.
   - Route Lifetime CTA through the billing service.
   - Validate product ID before granting local unlock.
   - Preserve desktop dev simulation behind dev-only checks.
   - Add result codes for success, cancelled, pending, unavailable, offline, and failed.

4. Add restore purchases.
   - Keep restore on `/unlock` and Settings.
   - Use store account purchase state only.
   - Never require Tiny Tummy account.
   - Do not clear existing local unlock on transient failure.

5. Harden platform-specific purchase handling.
   - iOS: listen for `Transaction.updates`, keep `currentEntitlements` sync, handle revoked/refunded transactions deliberately.
   - Android: make billing plugin/dependency reproducible from source templates, handle pending completion on resume/startup, acknowledge only purchased items.
   - Verify all clean generated projects build.

6. Add tests.
   - Unit-test entitlement mapping, billing service behavior, and feature gates.
   - Component-test `/unlock` and Settings restore/purchase states.
   - Native smoke-test Apple/Google store flows.

7. Production checklist.
   - App Store Connect non-consumable configured and submitted with the app.
   - Google Play one-time non-consumable product configured with a buy purchase option.
   - Price set to `$14.99 USD` with expected localized store prices.
   - Privacy copy confirms no account/cloud for Lifetime Private.
   - Restore reviewed on both stores.
   - Refund/revocation policy and support copy decided.

## Risks

- Stale docs can cause wrong store setup if they drift from the `$14.99 USD` Lifetime Private product ID and price.
- Current app-side trial may confuse Free vs Lifetime behavior and increases support/debug surface.
- Local-only entitlement storage is correct for offline use but cannot detect refunds/revocations while offline. Decide whether to keep access until a later successful store check or to relock only on explicit confirmed revocation.
- Without a backend, purchase verification relies on StoreKit/Play Billing client APIs. That is acceptable for a simple local-first app but weaker than server verification.
- Android generated billing setup may not be reproducible after a clean `cargo tauri android init`.
- UI currently hard-codes the price; stores can localize price/tax. Production UI should either display store metadata or lock store configuration to match copy.
- Family Sync simulator entitlements in Developer Tools can unlock future sync gates in dev. Keep this out of production builds.

## Sources Checked

- Apple StoreKit `Transaction.currentEntitlements`: https://developer.apple.com/documentation/storekit/transaction/currententitlements
- Apple In-App Purchase overview: https://developer.apple.com/documentation/storekit/in-app-purchase
- Apple App Store Connect product ID rules: https://developer.apple.com/help/app-store-connect/reference/in-app-purchase-information
- Apple non-consumable creation: https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-consumable-or-non-consumable-in-app-purchases
- Google Play one-time products: https://developer.android.com/google/play/billing/one-time-products
- Google Play Billing integration and pending purchases: https://developer.android.com/google/play/billing/integrate
- Google Play product ID rules: https://support.google.com/googleplay/android-developer/answer/1153481
