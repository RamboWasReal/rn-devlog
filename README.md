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

# JS logs only, exclude noisy patterns
rn-devlog --js --exclude "timer" "polling"

# Only logs from the last 5 minutes
rn-devlog --since 5m

# Show last 50 lines then keep following
rn-devlog --tail 50 -f

# Use regex patterns
rn-devlog --filter "Error|Warning" --regex

# Save logs to file
rn-devlog --save
```

## Options

| Flag                     | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| **Platform**             |                                                             |
| `--android`              | Force Android platform                                      |
| `--ios`                  | Force iOS platform                                          |
| `--appId <id>`           | Manual app identifier override                              |
| `--all`                  | Show all device logs without app filtering                  |
| **Log level**            |                                                             |
| `--error`                | Show errors only                                            |
| `--warn`                 | Show warnings and above                                     |
| `--info`                 | Show info and above                                         |
| `--debug`                | Show debug and above                                        |
| **Filtering**            |                                                             |
| `--filter <pattern...>`  | Filter by text pattern (multiple allowed, case insensitive) |
| `--exclude <pattern...>` | Exclude lines matching pattern (opposite of `--filter`)     |
| `--regex`                | Treat `--filter` and `--exclude` patterns as regex          |
| `--js`                   | Show only JavaScript logs (ReactNativeJS)                   |
| `--native`               | Show only native logs (skip JS)                             |
| `--since <duration>`     | Show logs from the last duration (`5m`, `30s`, `1h`, `2d`)  |
| `--verbose`              | Show all logs including system noise (GC, metro polling)    |
| `--no-dedup`             | Show duplicate consecutive lines (default: collapsed)       |
| **Output**               |                                                             |
| `--save [path]`          | Save logs to file (default: `./logs/<timestamp>.log`)       |
| `--clear`                | Delete saved log files                                      |
| `--tail <n>`             | Show last N lines then exit                                 |
| `-f, --follow`           | Keep listening after `--tail` (default without `--tail`)    |
| `--no-stats`             | Hide session stats on exit                                  |

## Config File

Create a `.devlogrc` file in your project root to set default options:

```json
{
  "android": true,
  "js": true,
  "exclude": ["timer", "polling"],
  "since": "10m"
}
```

CLI flags override `.devlogrc` values.

## Auto-Detection

When no `--appId` is provided, the app identifier is detected automatically by scanning the project:

1. `app.json` — reads the `name` field (Expo / React Native)
2. `android/app/build.gradle` — reads `applicationId`
3. `ios/*.xcodeproj/project.pbxproj` — reads `PRODUCT_BUNDLE_IDENTIFIER`

Run from your React Native project root for auto-detection to work.

## Platform Support

| Platform      | Transport       | Notes                         |
| ------------- | --------------- | ----------------------------- |
| Android       | `adb logcat`    | Filters by app package name   |
| iOS Simulator | `xcrun simctl`  | Streams from booted simulator |
| iOS Device    | `idevicesyslog` | Requires libimobiledevice     |

## Prerequisites

- **Android**: `adb` — included with Android SDK Platform Tools
- **iOS Simulator**: Xcode Command Line Tools (`xcode-select --install`)
- **iOS Device**: libimobiledevice (`brew install libimobiledevice`)

## Troubleshooting

### Android

**`adb: command not found`**
Install Android SDK Platform Tools and add them to your PATH:

```bash
# macOS (with Homebrew)
brew install android-platform-tools

# Or add the SDK path manually
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
```

**`error: no devices/emulators found`**
Make sure your device is connected or an emulator is running:

```bash
adb devices   # Should list at least one device
```

**`Could not detect app identifier`**
Run from your React Native project root, or specify manually:

```bash
rn-devlog --appId com.myapp
```

### iOS

**`xcrun: error: unable to find utility "simctl"`**
Install Xcode Command Line Tools:

```bash
xcode-select --install
```

**`No booted simulator found`**
Launch a simulator first:

```bash
open -a Simulator
# or
xcrun simctl boot "iPhone 16"
```

**`idevicesyslog: command not found`** (physical device)
Install libimobiledevice:

```bash
brew install libimobiledevice
```

### General

**Logs are empty / no output**

- Check that your app is actually running on the device/emulator
- Try `--all` to see all device logs (not filtered by app)
- Try `--verbose` to include system noise that is hidden by default
- Use `--debug` to lower the minimum log level

**Too much noise**

- Use `--error` or `--warn` to raise the minimum log level
- Use `--filter <keyword>` to only show relevant logs
- Use `--exclude <keyword>` to hide specific patterns
- Use `--js` to only show JavaScript logs

## License

MIT
