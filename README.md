# Tiny Tummy

A smart baby bowel health tracker for iOS and Android. Helps parents track their baby's poop patterns with age-adjusted intelligence, so they know what's normal and when to pay attention.

**100% offline. 100% on-device. No accounts. No cloud. No tracking.**

## What It Does

- **Quick logging** — log poop (type, color, size, photo) and meals in seconds
- **Age-adjusted intelligence** — knows what's normal for your baby's age and feeding type (breast, formula, mixed, solids) using the BITSS scale
- **Smart alerts** — warns when patterns fall outside normal range, flags concerning stool colors (white, red, black)
- **Trend charts** — daily frequency, consistency trends, color distribution, diet correlation timeline
- **Multi-child support** — track unlimited children, switch instantly via header avatars
- **Pediatrician reports** — generate PDF summaries with date range picker
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

## Mobile Setup

### iOS

```bash
# Initialize iOS project (one-time)
npm run tauri ios init

# Run on iOS Simulator
npm run tauri ios dev

# Build for release
npm run tauri ios build
```

The `.ipa` is generated in `src-tauri/gen/apple/build/`. Upload to App Store Connect via Xcode or Transporter.

### Android

```bash
# Initialize Android project (one-time)
npm run tauri android init

# Run on Android Emulator or connected device
npm run tauri android dev

# Build for release
npm run tauri android build
```

The `.aab` (Android App Bundle) is generated in `src-tauri/gen/android/app/build/outputs/bundle/`. Upload to Google Play Console.

### Signing

| Platform | What you need |
|----------|--------------|
| iOS | Apple Developer certificate + provisioning profile. Configure in Xcode project at `src-tauri/gen/apple/` |
| Android | Keystore file for release signing. Configure in `src-tauri/gen/android/app/build.gradle.kts` |

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
| Price | Free or $2.99 one-time | Free or $2.99 one-time |
| Store fee | 15% (Small Business) or 30% | 15% on first $1M |
| Min target | iOS 16 | Android 7.0 (SDK 24) |
| App size | ~5-10 MB | ~5-10 MB |

App store metadata (description, keywords, screenshots) is in `APP_STORE.md`.

## License

Private — all rights reserved.
