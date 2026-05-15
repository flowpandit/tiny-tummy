# Store Setup TODO

Short operator checklist for real Lifetime Private store testing.

Source docs:

- `docs/STORE_BILLING_QA_CHECKLIST.md`
- `docs/BILLING_QA_RESULTS_TEMPLATE.md`

## Product To Create

- [ ] Product name: `Lifetime Private`
- [ ] Product ID: `com.tinytummy.lifetime_private`
- [ ] Base price: `$14.99 USD`
- [ ] Apple type: non-consumable In-App Purchase
- [ ] Google Play type: one-time product with a non-consumable entitlement
- [ ] Localized prices: handled by App Store / Google Play

Copy the product ID exactly. Do not create alternate IDs for this launch.

## Do Not Create Yet

- [ ] Do not create Family Sync products.
- [ ] Do not create subscriptions or subscription base plans.
- [ ] Do not create Tiny Tummy accounts or login flows.
- [ ] Do not add Supabase.
- [ ] Do not add backend receipt validation or backend sync.
- [ ] Do not add cloud sync, cloud backup, shared live today, caregiver invites, or Family Sync checkout.

## App Store Connect

- [ ] Open App Store Connect > Tiny Tummy > Monetization > In-App Purchases.
- [ ] Create a new `Non-Consumable` In-App Purchase.
- [ ] Set Product ID exactly to `com.tinytummy.lifetime_private`.
- [ ] Set Reference Name to `Lifetime Private` or `Tiny Tummy Lifetime Private`.
- [ ] Add primary localization:
  - Display Name: `Lifetime Private`
  - Description: `Unlock private local features once.`
- [ ] Set price to the `$14.99 USD` price point and let Apple localize other storefront prices.
- [ ] Set availability to the same countries/regions intended for Tiny Tummy testing.
- [ ] Add App Review notes:
  - One-time non-consumable upgrade.
  - Product ID is `com.tinytummy.lifetime_private`.
  - No Tiny Tummy account or login is required.
  - Restore Purchases is available from unlock and Settings.
  - Family Sync is coming later and is not purchasable.
  - Include navigation steps to the purchase screen.
- [ ] Upload an IAP review screenshot if App Store Connect asks for one.
- [ ] Confirm the IAP reaches `Ready to Submit`.
- [ ] Attach the first Tiny Tummy IAP to a new app version submission when required.
- [ ] Create sandbox Apple Accounts under Users and Access > Sandbox.
- [ ] Upload a build for TestFlight.
- [ ] Wait for IAP metadata propagation before investigating missing sandbox metadata.

## Google Play Console

- [ ] Open Play Console > Tiny Tummy.
- [ ] Confirm payments profile and Google Play Billing setup are available.
- [ ] Confirm Play App Signing is enabled.
- [ ] Go to Monetize with Play > Products > One-time products.
- [ ] Create exactly one one-time product.
- [ ] Set Product ID exactly to `com.tinytummy.lifetime_private`.
- [ ] Set Name to `Lifetime Private`.
- [ ] Set Description to `Unlock private local features once.`
- [ ] If the current Play Console UI asks for purchase options, create a standard `Buy` purchase option.
- [ ] Do not create a `Rent` option.
- [ ] Do not create subscription base plans.
- [ ] Set base price to `$14.99 USD` and let Google generate localized prices.
- [ ] Activate the one-time product and its buy purchase option.
- [ ] Add license testers under Play Console Settings > License testing.
- [ ] Create an internal testing release with the signed Android App Bundle.
- [ ] Add tester emails or Google Groups to the internal testing track.
- [ ] Roll out the internal test and confirm testers install from Google Play, not a sideloaded APK.

## Build Commands

Run from the repository root unless noted.

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

Android:

```bash
source scripts/use-jdk17.sh
./scripts/verify-android-kotlin.sh
cargo tauri android build
```

Android AAB output:

```text
src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab
```

iOS:

```bash
npm run fix:ios-xcodeproj
cargo tauri ios build
```

Use Xcode/TestFlight when archive, signing, or upload needs manual control:

```bash
open -n src-tauri/gen/apple/tiny-tummy.xcodeproj
```

## Upload Targets

- [ ] Android: upload the signed AAB to Play Console > Testing > Internal testing > Create new release.
- [ ] Do not use a sideloaded APK for real Google Play Billing QA.
- [ ] iOS: upload the iOS archive/build to App Store Connect for TestFlight through Xcode or Transporter.
- [ ] Confirm the store build number and git commit before starting paid-flow QA.

## Record QA Results

- [ ] Copy or fill in `docs/BILLING_QA_RESULTS_TEMPLATE.md`.
- [ ] Record build number, git commit, platform, device model, OS version, app version, tester account/storefront, product ID, and localized price shown.
- [ ] Fill iOS scenarios `IOS-01` through `IOS-09`.
- [ ] Fill Android scenarios `AND-01` through `AND-11`.
- [ ] Attach screenshots/video links for purchase, cancel, restore, pending, reinstall restore, and offline-unlocked checks.
- [ ] Link follow-up bugs for any failed, blocked, or ambiguous result.

## Final Pre-Test Checklist

- [ ] App Store product ID is exactly `com.tinytummy.lifetime_private`.
- [ ] Google Play product ID is exactly `com.tinytummy.lifetime_private`.
- [ ] App Store product is non-consumable.
- [ ] Google Play product is one-time / non-consumable equivalent.
- [ ] Store price is `$14.99 USD` before localization.
- [ ] Store metadata is active or ready for sandbox/internal testing.
- [ ] Sandbox Apple Accounts are ready.
- [ ] Google license testers are ready.
- [ ] TestFlight build is installed for iOS QA.
- [ ] Play internal testing build is installed from Google Play for Android QA.
- [ ] Android AAB uploaded to internal testing, not only sideloaded.
- [ ] QA results will be recorded in `docs/BILLING_QA_RESULTS_TEMPLATE.md`.
- [ ] Family Sync remains coming later and is not purchasable.
- [ ] No subscriptions, accounts, Supabase, backend validation, or backend sync were added.
- [ ] Ready to start real store billing QA.
