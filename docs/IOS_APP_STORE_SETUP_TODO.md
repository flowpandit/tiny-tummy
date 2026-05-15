# iOS App Store Setup TODO

Tiny Tummy's iOS app Bundle ID must be:

```text
au.tinytummy.app
```

The Lifetime Private in-app purchase product ID is separate and must remain:

```text
com.tinytummy.lifetime_private
```

Do not upload a build to any App Store Connect app record that is attached to a different Bundle ID. After the first build upload, Apple does not allow changing the Bundle ID for that app record.

## Apple Developer

- [ ] Register or confirm the explicit App ID / Identifier `au.tinytummy.app`.
- [ ] Confirm required capabilities for the app identifier before creating profiles.
- [ ] Create or refresh provisioning profiles for `au.tinytummy.app`.
- [ ] In Xcode, select the correct signing team for `au.tinytummy.app`.
- [ ] Confirm the selected provisioning profile matches `au.tinytummy.app`.

## App Store Connect App Record

- [ ] Create a new app record or select the existing Tiny Tummy record with Bundle ID `au.tinytummy.app`.
- [ ] Do not upload any TestFlight build to the dummy app record if it has the wrong Bundle ID.
- [ ] Confirm SKU, app name, primary language, and platform metadata before upload.
- [ ] Confirm no build has already been uploaded to a record with the wrong Bundle ID.

## In-App Purchase

- [ ] Create one non-consumable in-app purchase.
- [ ] Set Product ID exactly to `com.tinytummy.lifetime_private`.
- [ ] Do not create Family Sync products.
- [ ] Do not create subscriptions.
- [ ] Do not change pricing as part of Bundle ID setup.
- [ ] Do not add Supabase, accounts, backend sync, or Family Sync dependencies.

## Sandbox Testing

- [ ] Create or select App Store Connect sandbox tester accounts.
- [ ] Use sandbox testers only for store purchase QA.
- [ ] Verify metadata loads for `com.tinytummy.lifetime_private`.
- [ ] Verify purchase and restore unlock only the local `lifetime_private` entitlement.
- [ ] Verify wrong product IDs do not unlock anything.

## Local Project Checklist

- [ ] `src-tauri/tauri.conf.json` has `"identifier": "au.tinytummy.app"`.
- [ ] Generated Xcode project has `PRODUCT_BUNDLE_IDENTIFIER = au.tinytummy.app`.
- [ ] Generated Xcode project has `IPHONEOS_DEPLOYMENT_TARGET = 16.0`.
- [ ] Generated Xcode project has `TARGETED_DEVICE_FAMILY = "1,2"` so the app installs as Universal on iPhone and iPad.
- [ ] Generated `Info.plist` keeps `CFBundleIdentifier` as `$(PRODUCT_BUNDLE_IDENTIFIER)`.
- [ ] Run `npm run fix:ios-xcodeproj` after regenerating the iOS project.

## TestFlight Upload Checklist

- [ ] Run the repo verification commands before opening Xcode for release work.
- [ ] Build fresh assets with `npm run build`.
- [ ] Run `npm run fix:ios-xcodeproj`.
- [ ] Open the generated iOS project with `open -n src-tauri/gen/apple/tiny-tummy.xcodeproj`.
- [ ] In Xcode, confirm signing team and Bundle ID are correct before archiving.
- [ ] Archive only after confirming the destination App Store Connect app record uses `au.tinytummy.app`.
- [ ] Upload only a fresh archive built after the Bundle ID check.
