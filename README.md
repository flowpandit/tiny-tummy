# Tiny Tummy

A smart baby bowel health tracker for iOS and Android. Helps parents track their baby's poop patterns with age-adjusted intelligence, so they know what's normal and when to pay attention.

**100% offline. 100% on-device. No accounts. No cloud. No tracking.**

## What It Does

- **Quick logging** — log poop (type, color, size, photo) and meals in seconds
- **Age-adjusted intelligence** — knows what's normal for your baby's age and feeding type (breast, formula, mixed, solids) using the Bristol Stool Scale
- **Smart alerts** — warns when patterns fall outside normal range, flags concerning stool colors (white, red, black)
- **Trend charts** — daily frequency, consistency trends, color distribution, diet correlation timeline
- **Multi-child support** — track unlimited children, switch instantly via header avatars
- **Doctor reports** — generate PDF summaries with date range picker
- **Evidence-based guidance** — categorized tips for common concerns (solids transition, constipation, when to call the doctor)
- **Photo avatars** — upload and crop child photos with a circle positioning tool
- **History** — day-by-day timeline with search, edit, and delete
- **Dark mode** — system/light/dark toggle, full token-based theming
- **Daily reminders** — local notification scheduling

All data is stored locally in SQLite. The app makes zero network requests — ever.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| App Framework | [Tauri 2](https://tauri.app) (Rust backend + WebView frontend) |
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animations | Framer Motion |
| Charts | Recharts |
| Routing | react-router-dom v7 |
| Database | SQLite via `tauri-plugin-sql` |
| File Storage | `tauri-plugin-fs` (photos, avatars) |
| Notifications | `tauri-plugin-notification` (local only) |
| Fonts | Lora + Raleway (bundled, no CDN) |
| Intelligence | Rust engine for age-adjusted thresholds + alert detection |

## Project Structure

```
tiny-tummy/
├── src/                          # React frontend
│   ├── components/
│   │   ├── ui/                   # Base components (button, card, sheet, date-picker, etc.)
│   │   ├── layout/               # AppShell, Header, BottomNav
│   │   ├── logging/              # LogForm, DietLogForm, EditPoopSheet, EditMealSheet
│   │   ├── home/                 # TimeSinceIndicator, StatusCard, RecentActivity
│   │   ├── dashboard/            # FrequencyChart, ConsistencyTrend, ColorDistribution
│   │   ├── onboarding/           # Welcome, AddChildStep, NormalRangeIntro
│   │   ├── child/                # Avatar, AvatarUpload, AvatarCropper
│   │   └── empty-states/         # NoLogsYet
│   ├── pages/                    # Route pages (Home, History, Dashboard, etc.)
│   ├── hooks/                    # Custom hooks (usePoopLogs, useAlerts, useStats, etc.)
│   ├── contexts/                 # ChildContext, ThemeContext
│   ├── lib/                      # DB layer, Tauri API, types, utils, constants
│   ├── styles/                   # globals.css, tokens.css
│   └── assets/                   # Fonts, logo
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri commands + plugin registration
│   │   ├── main.rs               # Desktop entry point
│   │   └── engine/
│   │       ├── normal_range.rs   # Age-adjusted frequency thresholds
│   │       └── guidance.rs       # Evidence-based guidance content
│   ├── migrations/
│   │   └── 001_initial.sql       # SQLite schema
│   ├── Cargo.toml
│   └── tauri.conf.json
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── IMPLEMENTATION_PLAN.md
├── APP_STORE.md                  # App store metadata + keywords
└── README.md
```

## Prerequisites

- **Node.js** >= 18
- **Rust** >= 1.70 (install via [rustup](https://rustup.rs))
- **npm** >= 8

### For iOS builds

- macOS with Xcode 15+
- Apple Developer account ($99/year)
- iOS 16+ target

### For Android builds

- Android Studio with SDK 33+ and NDK
- Android SDK 24+ target (Android 7.0)
- JDK 17+

## Local Development Setup

```bash
# Clone the repo
git clone <repo-url>
cd tiny-tummy

# Install frontend dependencies
npm install

# Run in desktop dev mode (hot-reload)
npm run tauri dev
```

This starts both the Vite dev server (frontend) and the Tauri Rust backend. A desktop window opens at 390x844 (phone-sized) for development.

### Useful commands

```bash
# TypeScript type check
npx tsc --noEmit

# Frontend-only dev server (no Tauri)
npm run dev

# Production build (frontend only)
npm run build

# Rust check
cd src-tauri && cargo check
```

## Tauri E2E Smoke Tests

Tiny Tummy includes a Tauri WebDriver smoke test that launches the compiled desktop app, creates a child, reloads the app, and verifies the child still exists after the SQLite-backed refresh.

```bash
# One-time driver install
cargo install tauri-driver --locked

# Run the Tauri smoke suite
npm run test:e2e:tauri
```

Notes:

- The suite uses WebdriverIO with `tauri-driver`, matching Tauri's documented WebDriver test approach.
- `npm run test:e2e:tauri` builds the release Tauri binary before launching the spec.
- Set `TAURI_DRIVER_PATH` if `tauri-driver` is not installed in `~/.cargo/bin`.
- Set `TAURI_E2E_APP_PATH` if you want to point the suite at a prebuilt binary.
- Official Tauri desktop WebDriver support currently covers Windows and Linux, not macOS. Run this suite in CI or another non-mac desktop environment.

## Building for Mobile Testing

### Android

```bash
# 1. Install the Tauri CLI (one-time)
cargo install tauri-cli

# 2. Initialize Android project (one-time per machine)
cargo tauri android init

# 3. Apply custom Android config (icons, status bar fix)
./scripts/setup-android.sh

# 4. Build a release APK for testing
cargo tauri android build --apk
```

The release APK is at:
```
src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk
```

**To install on your phone:**

```bash
# Sign the APK first (Android requires it)
# Create a keystore (one-time):
keytool -genkey -v -keystore ~/tiny-tummy.keystore -alias tiny-tummy -keyalg RSA -keysize 2048 -validity 10000

# Sign:
apksigner sign --ks ~/tiny-tummy.keystore --ks-key-alias tiny-tummy \
  src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk

# Install via USB:
adb install src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk
```

Alternatively, skip signing by building a debug APK (larger file, ~140 MB for single arch):
```bash
cargo tauri android build --apk --debug --target aarch64
```

### iOS

```bash
# 1. Initialize iOS project (one-time per machine)
cargo tauri ios init

# 2. Run the project iOS Rust build helper
./scripts/build-rust-ios.sh

# 3. Boot the simulator you want to use
xcrun simctl boot "iPad (A16)"

# 4. Run the app on the booted simulator
cargo tauri ios dev

# Run on a physical iPhone connected via USB
cargo tauri ios dev --device
```

After the initial `cargo tauri ios init`, the usual simulator flow is:

```bash
./scripts/build-rust-ios.sh
xcrun simctl boot "iPad (A16)"
cargo tauri ios dev
```

If the simulator is already booted, you can just run `cargo tauri ios dev`.

If you want to run the Android simulator at the same time as the iPhone/iPad simulator, start Android with:

```bash
cargo tauri android dev -c '{"build":{"beforeDevCommand":"true"}}'
```

That skips re-running the shared frontend dev command, which is useful when iOS dev is already using it.

> **Note:** Testing on a physical iPhone requires an Apple Developer account and a provisioning profile configured in the Xcode project at `src-tauri/gen/apple/`.

## Building for Production (Store Submission)

### Android (Google Play)

Google Play requires `.aab` (Android App Bundle) format — not `.apk`. Google generates device-optimized APKs from the bundle, so users get smaller downloads.

```bash
# 1. Build the AAB (release mode)
cargo tauri android build

# Output is at:
# src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab
```

**Before submitting, you must sign the AAB:**

```bash
# Sign with your upload keystore (same one used for APK testing, or a dedicated one)
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore ~/tiny-tummy.keystore \
  src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab \
  tiny-tummy
```

Then upload the signed `.aab` to [Google Play Console](https://play.google.com/console/).

> **Note:** Use the same keystore for every release. If you lose it, you cannot push updates to your app. Back it up securely.

### iOS (App Store)

```bash
cargo tauri ios build
```

The `.ipa` is generated in `src-tauri/gen/apple/build/`. Upload to [App Store Connect](https://appstoreconnect.apple.com/) via Xcode or Transporter.

### Signing

| Platform | What you need |
|----------|--------------|
| iOS | Apple Developer certificate + provisioning profile. Configure in Xcode project at `src-tauri/gen/apple/` |
| Android | Keystore file for release signing. Configure in `src-tauri/gen/android/app/build.gradle.kts` |

## Gotchas

### Android-specific

- **Status bar overlap**: Android WebView doesn't support `env(safe-area-inset-top)`. The app detects Android via user agent in `index.html` and sets `--safe-area-top: 36px` as a CSS variable. If content still overlaps the status bar on a specific device, adjust this value.

- **App icon shows Tauri default**: Rerun `./scripts/setup-android.sh`. It regenerates Android icons from `src-tauri/icons/icon-manifest.json` into a temporary folder and copies them into `src-tauri/gen/android/app/src/main/res/`.

- **Status bar icon color (light/dark)**: Tauri's default `enableEdgeToEdge()` installs an `OnPreDrawListener` that continuously overrides status bar icon appearance, making it impossible to control via XML themes or `WindowInsetsController`. The fix has two parts, both applied by `./scripts/setup-android.sh`:

  1. **Custom `MainActivity.kt`** — replaces `enableEdgeToEdge()` with manual edge-to-edge setup (transparent bars without the persistent listener). Handles system theme changes via `onConfigurationChanged`.
  2. **Custom `StatusBarPlugin.kt`** — a Tauri plugin that bridges TypeScript → Kotlin, letting the app's `ThemeContext` call `WindowInsetsControllerCompat` whenever the user toggles the theme in Settings. This means both system theme changes AND manual in-app theme toggles update the status bar icons correctly.

  The Rust side (`src-tauri/src/statusbar.rs`) registers the plugin and exposes the `set_status_bar_style` command. The TypeScript wrapper is at `src/lib/statusbar.ts`. Templates for the Kotlin files are in `src-tauri/android-templates/`.

- **Photos/avatars not loading**: The CSP in `tauri.conf.json` must include `blob:` in `img-src`. This is already configured but worth checking if photos break after config changes.

- **APK is 50+ MB**: Make sure you're building release, not debug. The release profile in `Cargo.toml` enables `strip`, `lto`, `opt-level = "s"`, and `panic = "abort"` — bringing the APK down to ~15-28 MB.

- **`cargo: no such command: tauri`**: Install the CLI first: `cargo install tauri-cli`

- **Unsigned APK won't install**: Android refuses unsigned APKs with `INSTALL_PARSE_FAILED_NO_CERTIFICATES`. Either sign with `apksigner` or build debug (`--debug` flag).

### iOS-specific

- **Safe areas**: iOS Safari WebView supports `env(safe-area-inset-top)` natively via `@supports` in CSS. No manual offsets needed.

### General

- **SVG logos in Android WebView**: Android WebView can't render SVG `<text>` elements with custom fonts. The app uses an inline React SVG component (`Logo.tsx`) without text elements to avoid this.

- **Bottom sheet scroll conflicts**: The sheet component (`sheet.tsx`) restricts drag-to-close to the handle area only. Content inside the sheet scrolls normally with `overscroll-contain`. If a new sheet has scroll issues, ensure content is inside the sheet's scrollable child div.

- **Calendar picker size jumps**: The date picker always renders 6 rows (42 cells) to prevent layout shifts when switching between months with different row counts.

- **`gen/` directories are machine-specific**: `src-tauri/gen/android/` and `src-tauri/gen/apple/` are generated per machine and should be in `.gitignore`. Run `cargo tauri android init` / `cargo tauri ios init` on each new machine.

## Database

SQLite database stored at the platform's app data directory:
- **iOS**: `~/Library/Containers/<bundle-id>/Data/`
- **Android**: `/data/data/<package>/`
- **macOS** (dev): `~/Library/Application Support/com.nikhilmehral.tinytummy/`

### Schema

5 tables: `children`, `poop_logs`, `diet_logs`, `alerts`, `app_settings`. See `src-tauri/migrations/001_initial.sql` for full schema.

## Privacy

- Zero network requests — no analytics, no crash reporting, no telemetry
- No accounts or login
- All data on-device in app sandbox
- Photos stored locally, never uploaded
- Notifications are local only
- `tauri.conf.json` does not grant network permissions
- Uninstalling the app deletes all data

See the in-app privacy policy at `/privacy` for the full text.

## Distribution

| | iOS | Android |
|--|-----|---------|
| Price | 14-day free trial, then $9.99 one-time | 14-day free trial, then $9.99 one-time |
| Store fee | 15% (Small Business) or 30% | 15% on first $1M |
| Min target | iOS 16 | Android 7.0 (SDK 24) |
| App size | ~5-10 MB | ~15-28 MB |

App store metadata (description, keywords, screenshots) is in `APP_STORE.md`.

## License

Private — all rights reserved.
