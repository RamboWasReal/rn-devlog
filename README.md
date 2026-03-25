# rn-devlog

Stream filtered Android and iOS device logs for React Native apps.

## Install

```bash
# Zero install
npx rn-devlog

# Global install
npm i -g rn-devlog
```

## Quick Start

```bash
# Auto-detect platform and app, stream logs
rn-devlog

# Android only, errors only
rn-devlog --android --error

# iOS, filter by tag
rn-devlog --ios --filter ReactNative bridge

# Save logs to file
rn-devlog --save
```

## Options

| Flag | Description |
|------|-------------|
| `--android` | Force Android platform |
| `--ios` | Force iOS platform |
| `--appId <id>` | Manual app identifier override |
| `--error` | Show errors only |
| `--warn` | Show warnings and above |
| `--info` | Show info and above |
| `--debug` | Show debug and above |
| `--filter <pattern...>` | Filter by text pattern (multiple allowed, case insensitive) |
| `--save [path]` | Save logs to file (default: `./logs/<timestamp>.log`) |
| `--clear` | Delete saved log files |
| `--all` | Show all device logs without app filtering |

## Auto-Detection

When no `--appId` is provided, the app identifier is detected automatically by scanning the project:

1. `app.json` — reads the `name` field (Expo / React Native)
2. `android/app/build.gradle` — reads `applicationId`
3. `ios/*.xcodeproj/project.pbxproj` — reads `PRODUCT_BUNDLE_IDENTIFIER`

Run from your React Native project root for auto-detection to work.

## Platform Support

| Platform | Transport | Notes |
|----------|-----------|-------|
| Android | `adb logcat` | Filters by app package name |
| iOS Simulator | `xcrun simctl` | Streams from booted simulator |
| iOS Device | `idevicesyslog` | Requires libimobiledevice |

## Prerequisites

- **Android**: `adb` — included with Android SDK Platform Tools
- **iOS Simulator**: Xcode Command Line Tools (`xcode-select --install`)
- **iOS Device**: libimobiledevice (`brew install libimobiledevice`)

## License

MIT
