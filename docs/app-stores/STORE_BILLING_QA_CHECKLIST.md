# Store Billing QA Checklist

Date: 2026-05-06

Scope: practical store setup and billing QA for real Lifetime Private purchase testing. This document is intentionally documentation-only. It does not add Family Sync products, subscriptions, accounts, Supabase, backend receipt validation, sync, or code behavior changes.

## Product Contract

- Product name: Lifetime Private
- Product ID: `com.tinytummy.lifetime_private`
- Apple type: non-consumable In-App Purchase
- Google Play type: one-time product with a non-consumable entitlement
- Base price: `$14.99 USD`
- Localized prices: generated and displayed by the stores when available
- Entitlement: `lifetime_private`
- Restore source: App Store / Google Play account ownership only
- Tiny Tummy account: not required
- Family Sync: future only, coming later, not configured in either store

Before creating anything in a store console, copy the product ID from this document and verify the app only queries `com.tinytummy.lifetime_private`.

## App Store Connect Checklist

- [ ] Open App Store Connect, select Tiny Tummy, then go to Monetization > In-App Purchases.
- [ ] Create a new In-App Purchase with type `Non-Consumable`.
- [ ] Set Product ID exactly to `com.tinytummy.lifetime_private`. Treat this as permanent after saving.
- [ ] Set Reference Name to `Lifetime Private` or `Tiny Tummy Lifetime Private`. This is internal only.
- [ ] Add at least the primary localization:
  - Display Name: `Lifetime Private`
  - Description: `Unlock private local features once.`
- [ ] Do not add Family Sync products.
- [ ] Do not add subscriptions, non-renewing subscriptions, subscription groups, trials, introductory offers, or offer codes for this launch.
- [ ] Add App Review notes:
  - The purchase is a one-time non-consumable upgrade.
  - Product ID is `com.tinytummy.lifetime_private`.
  - The app has no Tiny Tummy account or login.
  - The upgrade unlocks local private features on device.
  - Restore Purchases is available from the unlock screen and Settings.
  - Family Sync is visibly coming later and is not purchasable.
  - Provide exact navigation to the purchase screen.
- [ ] Upload the App Review screenshot for the IAP if App Store Connect requires it. Use a screenshot that clearly shows the Lifetime Private offer in app. A separate promotional IAP image is only needed if promoting the IAP on the App Store product page.
- [ ] Set pricing before review:
  - Confirm the Paid Apps Agreement, tax, and banking setup are complete.
  - Use United States as the base storefront if appropriate.
  - Select the `$14.99 USD` price point.
  - Let Apple generate equivalent localized storefront prices unless product explicitly wants manual overrides.
- [ ] Set availability:
  - Make the IAP available in the same countries or regions as the app for real release testing.
  - If submitting only for review without release, use Apple's Remove from Sale path deliberately and record that choice in release notes.
- [ ] Wait for product metadata to propagate before debugging sandbox failures. Apple notes metadata changes can take up to 1 hour to appear in sandbox.
- [ ] Confirm the IAP status reaches `Ready to Submit` before attaching it to the app version.
- [ ] For the first Tiny Tummy IAP, attach the IAP to a new app version submission in App Store Connect.
- [ ] Upload a build for TestFlight. TestFlight and development-signed builds use the sandbox purchase environment.
- [ ] Create sandbox Apple Accounts in Users and Access > Sandbox:
  - Use email addresses that have not been used as production Apple Accounts.
  - Create at least one US tester and one non-US storefront tester for localized price checks.
  - Enable Developer Mode on physical test devices.
  - Sign into the Sandbox Apple Account in iOS sandbox settings, not as the primary production Apple Account.
- [ ] For repeat testing, clear sandbox purchase history for the tester, then sign out and back into the Sandbox Apple Account on the device.
- [ ] Test restore:
  - Buy Lifetime Private with sandbox/TestFlight.
  - Delete or reinstall the app.
  - Tap Restore Purchases.
  - Verify `Transaction.currentEntitlements` returns only an owned, non-revoked transaction for `com.tinytummy.lifetime_private`.
- [ ] Test restore with no purchase:
  - Use a clean sandbox tester or clear purchase history.
  - Tap Restore Purchases.
  - Verify no entitlement is granted and the app shows gentle no-purchase copy.
- [ ] Test refund/revocation where possible:
  - Use sandbox refund/revocation tooling if available for the account and OS version.
  - Verify a later ownership sync no longer sees a refunded or revoked transaction in current entitlements.
  - Because Tiny Tummy has no backend receipt validation, do not expect server notifications or server-side revocation handling.
- [ ] Account deletion note for review: not applicable to Lifetime Private because Tiny Tummy does not require a Tiny Tummy account.

## Google Play Console Checklist

- [ ] Open Play Console for Tiny Tummy.
- [ ] Confirm the app has a payments profile and Google Play Billing setup available for the developer account.
- [ ] Confirm Play App Signing is accepted and configured.
- [ ] Build and upload an Android App Bundle (`.aab`) for internal testing. Use APKs only for local sideload smoke tests, not Play billing QA.
- [ ] Create an internal testing track release:
  - Add the signed `.aab`.
  - Include release notes.
  - Add tester emails or Google Groups.
  - Roll out the internal test and wait until testers can install from Google Play.
- [ ] Configure license testers in Settings > License testing:
  - Add the same Gmail accounts used for internal testing.
  - Confirm testers opt into the internal test and install the Play-distributed build.
  - Use Google test instruments for successful, cancelled, and delayed payment flows.
- [ ] Go to Monetize with Play > Products > One-time products.
- [ ] Create exactly one one-time product.
- [ ] Set Product ID exactly to `com.tinytummy.lifetime_private`.
- [ ] Set Name to `Lifetime Private`.
- [ ] Set Description to `Unlock private local features once.`
- [ ] Configure tax, compliance, and program fields as required by the current Play Console UI.
- [ ] If the current UI shows the newer one-time product model, create a `Buy` purchase option:
  - Use a permanent/non-consumable entitlement.
  - Do not use `Rent`.
  - Do not add pre-order offers.
  - Do not add discount offers for the first real billing test unless product explicitly scopes a promo QA pass.
  - If Play asks for a backwards-compatible buy option for Play Billing Library 7 clients, make the standard buy option backwards compatible.
- [ ] Do not create a subscription base plan. Base plans are for subscriptions, while this product is a one-time product.
- [ ] Activate the one-time product and its buy purchase option. Draft or inactive purchase options are not returned by Play Billing Library.
- [ ] Set pricing:
  - Base price: `$14.99 USD`.
  - Let Google generate localized regional pricing unless product explicitly wants manual overrides.
  - Confirm target regions are available.
- [ ] Confirm the product can be returned by `queryProductDetailsAsync()` as `ProductType.INAPP`.
- [ ] Confirm restore/query ownership uses `queryPurchasesAsync(INAPP)`.
- [ ] Confirm pending purchases are enabled and tested. Tiny Tummy must not unlock Lifetime Private until Google reports `PURCHASED`.
- [ ] Confirm acknowledgement succeeds for `PURCHASED` non-consumable purchases. License-tester purchases can be refunded automatically if not acknowledged.
- [ ] Confirm billing dependency and generated Android setup before upload:
  - Run `source scripts/use-jdk17.sh`.
  - Run `./scripts/verify-android-kotlin.sh`.
  - Confirm `src-tauri/gen/android/app/build.gradle.kts` contains `implementation("com.android.billingclient:billing-ktx:7.1.1")` after setup.
  - Inspect Play Console warnings for Play Billing Library version policy before production release. Do not update billing libraries as part of this checklist unless a separate implementation task is opened.
  - If Play Console reports missing billing capability, inspect the merged release manifest for `com.android.vending.BILLING` and Play Billing client metadata.
- [ ] Test cancellation/refund behavior:
  - Cancel from the purchase sheet and verify no unlock.
  - Refund and revoke the test order from Play Console when needed to repurchase the non-consumable.
  - Verify a later query does not unlock if Play no longer reports an owned purchase.
  - Do not clear an already-unlocked local user on transient store/network failure.

## Billing QA Matrix

Use real store builds for this matrix: TestFlight or development-signed sandbox on iOS, and Google Play internal testing on Android. Record device, OS version, storefront/country, build number, tester account, and observed localized price for every pass.

### iOS

| ID | Scenario | Setup | Steps | Expected result |
| --- | --- | --- | --- | --- |
| IOS-01 | Metadata loads localized price | Sandbox/TestFlight build, IAP approved or ready in sandbox, tester storefront set | Open unlock screen and Settings purchase area | Store price replaces fallback when available; product ID is `com.tinytummy.lifetime_private`; no entitlement is granted by metadata load |
| IOS-02 | Purchase success unlocks Lifetime Private | Clean sandbox tester with no previous purchase | Buy Lifetime Private | StoreKit purchase succeeds, transaction is verified, app unlocks `lifetime_private`, purchase is finished, Family Sync remains coming later |
| IOS-03 | Purchase cancelled does not unlock | Clean tester | Start purchase, cancel from Apple sheet | No entitlement is granted; cancellation is treated as a non-error user action |
| IOS-04 | Restore success unlocks | Tester has purchased Lifetime Private; local app state is free | Tap Restore Purchases | App calls store restore/sync, finds current entitlement for exact product ID, unlocks Lifetime Private |
| IOS-05 | Restore with no purchase found | Clean tester or cleared purchase history | Tap Restore Purchases | No unlock; gentle copy explains no Lifetime Private purchase was found |
| IOS-06 | Reinstall plus restore | Tester purchased, app removed and reinstalled | Launch, verify free state if local data cleared, then restore | Lifetime Private unlocks from App Store ownership; no Tiny Tummy account is requested |
| IOS-07 | Offline while already unlocked stays unlocked | User already unlocked locally | Enable airplane mode, relaunch, navigate gated features | Local Lifetime Private access remains; store sync failure does not relock |
| IOS-08 | Wrong product ID does not unlock | QA/debug negative path or code review of bridge response | Attempt metadata/purchase/restore for any product other than `com.tinytummy.lifetime_private` | Native bridge rejects the product and no entitlement is written |
| IOS-09 | Family Sync remains coming later | Any tester, free or Lifetime Private | Inspect unlock screen and settings | Family Sync is not purchasable, no Family Sync product is queried, Lifetime Private does not grant sync entitlement |

### Android

| ID | Scenario | Setup | Steps | Expected result |
| --- | --- | --- | --- | --- |
| AND-01 | Metadata loads localized price | Internal testing build installed from Play, one-time product active, tester licensed | Open unlock screen and Settings purchase area | Google Play localized price replaces fallback when available; metadata load does not grant entitlement |
| AND-02 | Purchase success unlocks Lifetime Private | Licensed tester, clean purchase state | Buy Lifetime Private with approving test payment | Purchase returns `PURCHASED`, app acknowledges purchase, unlocks `lifetime_private`, Family Sync remains coming later |
| AND-03 | Purchase cancelled does not unlock | Licensed tester | Start purchase and cancel from Play sheet | No entitlement is granted; cancellation is not shown as a scary error |
| AND-04 | Pending purchase does not unlock | Licensed tester with slow payment method | Buy with delayed payment that remains pending | App reports pending state, does not acknowledge while pending, and does not unlock |
| AND-05 | Pending purchase later completes and unlocks | Same pending purchase with slow approving test method | Wait for Play to complete, reopen or resume app | Query/listener sees `PURCHASED`, app acknowledges, Lifetime Private unlocks |
| AND-06 | Restore/query purchases success unlocks | Tester owns Lifetime Private, app local state is free | Tap Restore Purchases or relaunch ownership sync | `queryPurchasesAsync(INAPP)` returns exact product ID in `PURCHASED`; app unlocks |
| AND-07 | Restore no purchase found | Clean tester or revoked/refunded test order | Tap Restore Purchases | No unlock; gentle copy explains no Lifetime Private purchase was found |
| AND-08 | Reinstall plus restore | Tester purchased from Play, app removed and reinstalled | Install from internal test track, restore | Lifetime Private unlocks from Google Play ownership; no Tiny Tummy account is requested |
| AND-09 | Offline while already unlocked stays unlocked | User already unlocked locally | Enable airplane mode, relaunch, navigate gated features | Local Lifetime Private access remains; transient store failure does not relock |
| AND-10 | Wrong product ID does not unlock | QA/debug negative path or code review of bridge response | Attempt metadata/purchase/restore for any product other than `com.tinytummy.lifetime_private` | Native bridge rejects the product and no entitlement is written |
| AND-11 | Family Sync remains coming later | Any tester, free or Lifetime Private | Inspect unlock screen and settings | Family Sync is not purchasable, no Family Sync product is queried, Lifetime Private does not grant sync entitlement |

## Local Build Commands

Run from the repository root unless noted.

### General

```bash
npm test
npm run lint
npm run build
npm run check:dead-code
```

Run Rust checks from `src-tauri/`:

```bash
cargo test
cargo clippy -- -D warnings
```

### Android

Use JDK 17 for the current generated Android project:

```bash
source scripts/use-jdk17.sh
./scripts/verify-android-kotlin.sh
```

Build an App Bundle for Google Play internal testing:

```bash
cargo tauri android build
```

Expected AAB path:

```text
src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab
```

Optional local sideload smoke build only:

```bash
cargo tauri android build --apk
```

Do not use a sideloaded APK as the source of truth for real Google Play Billing QA. Real billing QA should use a Play-distributed internal testing build.

### iOS

Patch the generated Xcode project if the generated files were recreated or Xcode blocks the pre-build script:

```bash
npm run fix:ios-xcodeproj
```

Build with Tauri when the local signing setup is ready:

```bash
cargo tauri ios build
```

Expected build output is under:

```text
src-tauri/gen/apple/build/
```

For TestFlight, use Xcode when archive/signing/export needs manual control:

```bash
npm run tauri ios open
```

Then in Xcode, select a real iOS device or generic iOS device destination, archive, and distribute to App Store Connect/TestFlight. TestFlight purchase tests still use Apple's sandbox environment.

## Known Caveats

- Family Sync is future only. Do not create Family Sync store products and do not query Family Sync product IDs.
- Lifetime Private is a one-time purchase only. Do not create subscriptions or subscription base plans for this launch.
- No backend receipt validation exists. Tiny Tummy trusts StoreKit and Play Billing client APIs for this local-first Lifetime Private entitlement.
- Without a backend, refund/revocation detection happens only when the client later receives authoritative store state. Already-unlocked local users should not be relocked on transient store, network, or metadata failure.
- Localized price should come from the store when available. The in-app fallback should remain `$14.99 USD` once.
- Photos stay local by default.
- No Tiny Tummy account is needed for Lifetime Private purchase, restore, reinstall restore, or offline local access.
- Google Play Console and Play Billing Library policy can change. Before production release, inspect Play Console warnings for billing dependency/version requirements and open a separate implementation task if an upgrade is required.

## Official References

- Apple: [Create consumable or non-consumable In-App Purchases](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-consumable-or-non-consumable-in-app-purchases/)
- Apple: [In-App Purchase information](https://developer.apple.com/help/app-store-connect/reference/in-app-purchase-information/)
- Apple: [Set a price for an In-App Purchase](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/set-a-price-for-an-in-app-purchase/)
- Apple: [Set availability for In-App Purchases](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/set-availability-for-in-app-purchases/)
- Apple: [Submit an In-App Purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase)
- Apple: [Testing In-App Purchases with sandbox](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox)
- Apple: [Create a Sandbox Apple Account](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/create-a-sandbox-apple-account/)
- Apple: [Transaction.currentEntitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements)
- Google: [Overview of one-time products](https://support.google.com/googleplay/android-developer/answer/16430488)
- Google: [Understand product types and catalog considerations](https://support.google.com/googleplay/android-developer/answer/16431770)
- Google: [One-time products](https://developer.android.com/google/play/billing/one-time-products)
- Google: [Integrate the Google Play Billing Library](https://developer.android.com/google/play/billing/integrate)
- Google: [Test your Google Play Billing Library integration](https://developer.android.com/google/play/billing/billing_testing)
- Google: [Test in-app billing with application licensing](https://support.google.com/googleplay/android-developer/answer/6062777)
- Google: [Set up an internal test](https://support.google.com/googleplay/android-developer/answer/9845334)
- Google: [Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
