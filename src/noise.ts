// Default noise patterns to hide in RN apps
// These match against the full raw logcat line
const NOISE_PATTERNS: RegExp[] = [
  // Android system noise
  /Background concurrent mark compact GC/,
  /Background young concurrent copying GC/,
  /Explicit concurrent mark compact GC/,
  /hiddenapi: Accessing hidden/,
  /nativeloader: Load /,
  /ProfileInstaller:/,
  /Choreographer.*Skipped.*frames/,
  /AudioSystem:/,

  // RN dev server polling
  /\[EventSource\]\[onreadystatechange\]/,
  /Error occurred, shutting down websocket connection/,
  /Failed to connect to \/10\.0\.2\.2:8081/,
  /Couldn't connect to "ws:\/\/10\.0\.2\.2:8081/,
  /Cannot connect to Metro/,
  /Ensure that Metro is running/,
  /Ensure that your device\/emulator/,
  /If you're on a physical device/,
  /If your device is on the same Wi-Fi/,
  /Debug server host & port for device/,
  /URL: 10\.0\.2\.2:8081/,
  /Error: null$/,
  /Calling JS function after bridge has been destroyed/,

  // ViewManager warnings
  /Could not find generated setter for class/,

  // iOS system noise
  /\[com\.apple\.network:/,
  /\[com\.apple\.CFNetwork:/,
  /\[com\.apple\.BackBoard:/,
  /\[com\.apple\.UIKit:/,
  /\[com\.apple\.KeyboardArbiter:/,
  /\[com\.apple\.locationd/,
  /nw_connection/,
  /nw_endpoint/,
  /nw_flow/,
  /nw_protocol/,
  /nw_association/,
  /nw_context/,
];

export function createNoiseFilter(): (line: string) => boolean {
  return (line: string) => !NOISE_PATTERNS.some((re) => re.test(line));
}
