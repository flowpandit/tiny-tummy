# Lock Screen Spike

Reviewed on March 29, 2026.

## Goal

Evaluate the practical path for a Tiny Tummy lock-screen or live-status surface on the current Tauri stack.

## Current Repo State

- The app already uses Tauri mobile and has an Android project in [src-tauri/gen/android](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/gen/android).
- There is no committed Apple project under `src-tauri/gen/apple` in the current repo snapshot.
- There is already one custom Android mobile plugin path in [src-tauri/src/statusbar.rs](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/src/statusbar.rs) and [src-tauri/android-templates/StatusBarPlugin.kt](/Users/nikhilmehral/dev/tiny-tummy/src-tauri/android-templates/StatusBarPlugin.kt).

## What The Platform Supports

### Tauri

Tauri 2 mobile plugins can run native Kotlin or Swift code, and the official mobile plugin guide describes Android and iOS plugin projects as the way to expose native functionality back to Rust or JavaScript.

Source:
- https://v2.tauri.app/develop/plugins/develop-mobile/

### iOS

Apple’s ActivityKit is the official path for Live Activities. Apple documents Live Activities as appearing on the Lock Screen and other glanceable system surfaces. That means an iOS lock-screen implementation for Tiny Tummy would be a native ActivityKit feature, not a web-only Tauri view.

Source:
- https://developer.apple.com/documentation/ActivityKit/

### Android

Android’s official notifications guidance documents lock-screen notification visibility and privacy levels. For Tiny Tummy, the realistic Android lock-screen path is an ongoing or frequently updated notification with careful privacy defaults, not an iOS-style Live Activity equivalent.

Sources:
- https://developer.android.com/design/ui/mobile/guides/home-screen/notifications
- https://developer.android.com/reference/android/app/Notification.html

## Feasibility Assessment

### iOS Live Activity

Feasibility: medium, but only with native iOS work.

What would be required:

- initialize and commit the iOS Tauri project
- add a native Swift plugin or bridge for starting, updating, and ending a Live Activity
- add the native iOS extension or ActivityKit-specific app target needed by the Apple implementation path
- define a compact Tiny Tummy lock-screen model such as:
  - last poop time
  - last feed time
  - current status
  - active episode
  - current alert state
- define update triggers from the existing logging flows

Main constraint:

This is not a normal React feature. It is a native iOS feature with Tauri acting as the host app and bridge.

### Android Lock-Screen Surface

Feasibility: high for a notification-based version, lower for anything more ambitious.

What would be required:

- decide the Android surface:
  - ongoing summary notification
  - event-triggered reminder notification
- add a native Android plugin if the existing notification plugin is not enough for richer updates
- design privacy-safe collapsed content for locked devices
- update notifications when poop, feed, symptom, or episode state changes

Main constraint:

Android does not map cleanly to the iOS Live Activity model, so this should be treated as a separate platform UX.

## Product Recommendation

Do not treat "lock screen" as one cross-platform feature.

Instead:

1. Ship an Android lock-screen summary as a privacy-safe ongoing notification.
2. Treat iOS Live Activity as a separate premium polish feature after the iOS native project is committed and stable.

This is the lowest-risk sequence because Android can validate the value of glanceable status without forcing the full iOS native extension work first.

## Recommended Scope For A Proof Of Concept

### POC 1: Android

Build a native-updated ongoing notification that shows:

- child name
- last poop
- last feed
- active episode, if any
- current status label

Success criteria:

- updates after logging
- hides sensitive detail on locked devices by default
- survives normal app backgrounding

### POC 2: iOS

After the iOS project exists in-repo, build a minimal Live Activity showing:

- child name
- time since last poop
- last feed
- active episode

Success criteria:

- can start from the app
- updates after new logs
- can end cleanly when disabled

## Decision

Recommended next move:

- do not build full lock-screen support in the current Wave 1 branch
- if we want to continue immediately, start with an Android ongoing-summary notification proof of concept
- schedule iOS Live Activity only after native iOS scaffolding is added to the repo
