# Platform Strategy

## Recommendation

Keep building SetScope as a browser-first product and portable TypeScript domain model now. For native applications:

- Build the serious iPhone audio experience as a native SwiftUI app using ShazamKit and AVAudioEngine.
- Explore desktop packaging with Tauri first, using the existing web frontend and native plugins where audio capture demands them.
- Keep Electron as a pragmatic desktop fallback if browser/Chromium capture behavior, third-party JavaScript audio tooling, or fastest possible web parity becomes more important than footprint and native integration.

This is a recommendation, not an irreversible commitment. The next architectural work should make any shell possible by isolating contracts and audio adapters.

## Why iOS Should Be Native

The future iOS version is not merely a web screen in an app shell. Its differentiating needs are audio permissions, low-latency input, device routing, background/session behavior, Shazam recognition, smooth haptics, and polished musical interactions.

Apple's current documentation says ShazamKit can match against Shazam's catalog or custom catalogs, provides where in a song the match was found, and runs across Apple's platforms. AVAudioEngine provides the real-time audio-node graph needed for microphone analysis, playback, and future tuner/game inputs.

Suggested iOS stack:

- SwiftUI for app surfaces and tactile interaction.
- ShazamKit adapter producing the same normalized SetScope recognition match used on web.
- AVAudioEngine input pipeline producing shared analysis frames for pitch, onset, waveform, and later DSP.
- SwiftData or SQLite-backed persistence for sets, tracks, audio events, and performance events.

## Why Tauri First For Desktop

Tauri 2 can host an existing HTML/CSS/JavaScript frontend, targets desktop and mobile platforms, and supports native integrations through Rust and Swift/Kotlin plugin paths. That makes it a sensible first desktop experiment while SetScope's frontend is already web-shaped.

The caution is audio capture: desktop system/audio-source capture is the product-critical proof, not package size. Before committing, build a spike that tests macOS system-audio permissions, microphone plus loopback routing, latency, and real-time analysis reliability.

## When Electron Wins

Electron may be the better desktop choice if we need the most direct Chromium behavior and its desktop capture APIs. Electron's current `desktopCapturer` documentation includes audio loopback capture and notes the macOS `NSAudioCaptureUsageDescription` requirement for CoreAudio Tap based capture on newer Electron/Chromium paths.

Make the choice from measured audio behavior:

| Need | Favor |
| --- | --- |
| Small desktop footprint and native plugin control | Tauri |
| Closest behavior to the existing Chromium web audio flow | Electron |
| Best iPhone music-recognition/audio UX | Native SwiftUI |
| Quick installable mobile prototype before full native work | Tauri/Capacitor-style experiment, not final audio architecture |

## Share Contracts, Not Entire Screens

Keep these portable between web, desktop, and iOS:

- Recognition match schema.
- Audio-event and future performance-event schemas.
- Challenge definitions, scoring rules, difficulty metadata, and export format.
- Design tokens, artwork, sound identity, journal content, and educational copy.

Let each platform own the audio plumbing and interaction polish it is best at. Trying to force all audio behavior through one webview risks making the most magical part of the product feel unreliable.

## Next Architecture Move

Extract four contracts from Pitch Gates before creating another audio-heavy tool:

1. `AudioInputSession`: mic/file/shared/generated source lifecycle.
2. `AnalysisFrame`: pitch and confidence now; onset, beat phase, and energy later.
3. `PerformanceEvent`: prompt/hit/miss/streak/completion data.
4. `RecognitionAdapter`: existing provider shape, with ShazamKit as a future sibling.

## Sources Checked On 2026-05-25

- [Apple ShazamKit](https://developer.apple.com/shazamkit/)
- [Apple AVAudioEngine](https://developer.apple.com/documentation/AVFAudio/AVAudioEngine)
- [Tauri 2.0](https://v2.tauri.app/)
- [Tauri frontend configuration](https://v2.tauri.app/start/frontend/)
- [Tauri mobile plugin development](https://v2.tauri.app/develop/plugins/develop-mobile/)
- [Electron desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer)
