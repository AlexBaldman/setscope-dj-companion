# SetScope Architecture Audit

## Current Shape

- `index.html`: static app shell and semantic UI structure.
- `audio-lab.html`: standalone tuner and oscilloscope Listening Lab surface.
- `pitch-gates.html`: standalone musician-helper arcade surface.
- `src/styles.css`: visual system, responsive layout, vinyl/sampler/car/CD skin styling.
- `src/app.js`: app bootstrap and event wiring.
- `src/state.js`: browser state, hydration, persistence, selected-track state, track mutation helpers.
- `src/render.js`: timeline, inspector, summary, capture log, archive list, and current-track rendering.
- `src/set-map.js`: canvas set-map drawing and nearest-track selection.
- `src/audio.js`: imported-audio decoding and BPM estimation.
- `src/audio-lab.js` and `src/audio-lab.css`: tuner/oscilloscope tool built on shared audio modules.
- `src/audio-session.js`: reusable browser audio source lifecycle for toolbelt modules.
- `src/audio-widgets.js`: reusable tuner presets, level analysis, zero-crossing trigger helpers, and practice stat persistence.
- `src/capture.js`: browser mic window recording and API-ready audio payload creation.
- `src/pitch-analysis.js`: Pitchy-backed pitch frames and musical pitch helpers.
- `src/performance-events.js`: structured toolbelt practice/game event persistence.
- `src/pitch-gates.js`: pitch detector inputs, canvas game loop, scoring, and timeline event output.
- `src/pitch-gates.css`: arcade-lab game surface and responsive controls.
- `src/vendor/pitchy.js`: locally bundled Pitchy detector used without a CDN runtime dependency.
- `src/theme.js` and `src/theme.css`: persisted cross-surface theme control and light-mode treatment.
- `src/tool-registry.js`: shared SetScope tool rack and registered tool metadata.
- `assets/theme/lightning-bulb-toggle-ui.png`: original inked lightning-filament theme-toggle illustration.
- `src/workflows.js`: recognition loop, archive save/load, export/copy, mic capture, new-set workflow.
- `src/dom.js`: DOM element references for the main app.
- `src/utils.js`: small shared browser utilities.
- `src/api.js`: frontend API client.
- `src/fixtures.js`: shared demo track metadata used by frontend defaults and backend stub recognition.
- `server.mjs`: no-dependency local server bootstrap.
- `server/env.mjs`: tiny local `.env` loader for development secrets.
- `server/routes.mjs`: API route dispatch.
- `server/static.mjs`: static app file serving.
- `server/archive-store.mjs`: file-backed set archive.
- `server/journal-store.mjs`: markdown journal persistence.
- `server/audd-provider.mjs`: AudD recognition adapter and result mapper.
- `server/provider-schema.mjs`: validation for normalized provider matches.
- `server/provider-normalizer.mjs`: shared provider-to-SetScope match normalization.
- `server/recognition-provider.mjs`: stub recognition provider, track analysis, and provider response normalization.
- `server/json.mjs`: JSON request/response helpers.
- `data/sets.json`: created on demand by the archive API.

## What Is Working

- The app has a useful end-to-end prototype loop: detect/mock-recognize, inspect, edit, tag, archive, export, and reload saved sets.
- Frontend and backend now share fixture data, removing the most obvious duplicate metadata source.
- API concerns are isolated in `src/api.js`, which makes a real recognition adapter easier to introduce.
- The no-dependency server keeps local development simple and avoids premature framework decisions.
- Browser smoke checks cover layout overflow and the recognition flow.
- Provider responses now pass through a normalized match shape before reaching the frontend.
- The browser can now capture short mic windows with `MediaRecorder` and submit sanitized audio-window metadata through `/api/recognize`.
- AudD can be enabled with `AUDD_API_TOKEN` while the stub recognizer remains the local no-token fallback.
- `/api/health` now returns recognition provider status so the UI can show whether the app is running on the stub, AudD, or the planned native adapter slot.
- `/api/providers/diagnostics` performs a dry provider setup check without sending audio.
- The browser can generate a short synthetic WAV to test the provider pipeline without mic permission.
- Pitch Gates exercises real-time monophonic pitch analysis using mic, selected shared audio, or files, with an automatic silent demo path for smoke testing.
- Pitch Gates completion writes an `instrument` audio event into the same durable browser timeline as recognition and crate tagging.
- Shared toolbelt modules now separate browser source lifecycle, pitch analysis frames, and structured performance-event persistence.
- Audio Lab proves those shared modules on a second utility surface and writes `analysis` snapshots into the toolbelt timeline.
- A shared tool registry now gives each surface the same navigation rack.
- Audio Lab now includes reusable widget primitives: tuner presets, level metering, zero-crossing trigger behavior, daily practice streaks, and set-track attachment.

## Main Risks

- The main frontend has been split into modules, which removes the largest immediate maintainability issue.
- Backend concerns have been split into route, static, archive, journal, and recognition-provider modules.
- Archive persistence is JSON-file based. This is fine for local prototyping, but concurrent writes, larger archives, and search/filtering should move to SQLite.
- Provider matches are normalized, clamped, and schema-validated at the server boundary.
- The frontend state currently mixes durable set data with UI-only state. A small store module would make save/load behavior easier to reason about.
- Web audio-source capture is permission-scoped: arbitrary computer playback cannot be silently sampled, and shared system-audio choices vary by browser/OS.

## Recommended Next Refactor

1. Keep the provider layer native-app ready.
   - Web can use AudD or future AcoustID/ACRCloud adapters behind `/api/recognize`.
   - iOS can use ShazamKit behind the same normalized match contract.
   - Keep API keys and vendor details outside the UI and archive schema.

2. Replace JSON archive with SQLite once saved sets become more than a local demo.

3. Expand schema validation to archived sets and audio events before migrating storage.

4. Promote the reusable Audio Lab controls into smaller component modules as the next musician helpers arrive.

5. Preserve portable schemas and challenge definitions for a native SwiftUI/ShazamKit iOS application and a Tauri-first desktop capture spike; see `docs/PLATFORM_STRATEGY.md`.

## Recognition Adapter Contract

```js
{
  cursor: 1,
  detectedAt: "2026-05-23T00:00:00.000Z",
  match: {
    time: "04:26",
    title: "Palm Trees At Noon",
    artist: "The Lowpass District",
    bpm: 96,
    key: "9A",
    transition: "Loop tease",
    confidence: 87,
    provider: "setscope-stub",
    status: "matched",
    needsReview: false,
    raw: {}
  }
}
```

The UI should depend on this normalized shape, not on any individual provider response.

## Provider Strategy

- Local development without secrets uses `setscope-stub`.
- Web recognition can use AudD by setting `AUDD_API_TOKEN`.
- iOS should use ShazamKit as a sibling adapter that maps Apple matches into the same normalized `match` object.
- Apple does not currently advertise a separate public ShazamKit per-recognition fee in the docs we checked, but distributing an iOS app generally requires the Apple Developer Program, which Apple lists at 99 USD per year.
- The main UI includes a Recognition Stack panel fed by `/api/health`, keeping provider setup visible without coupling controls to vendor-specific fields.
- Provider diagnostics are intentionally non-secret: they report whether configuration exists, not token values.
- Provider diagnostics include normalized-match schema readiness.
- The sample-provider test uses the same `/api/recognize` contract as mic capture, which keeps provider testing aligned with real listening.
