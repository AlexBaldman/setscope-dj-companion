# SetScope Dev Journal

## 2026-05-03 - Concept Prototype

We started with the core idea: a DJ set watching companion that can identify songs during a set, collect timestamps, BPM, transition notes, and music-history context. The first prototype was a single-file browser app with a vinyl-inspired cockpit, track timeline, inspector panel, editable metadata, local storage, JSON export, imported-audio BPM estimation, and a recognition-demo loop.

Key decisions:

- Vinyl became the MVP visual anchor.
- Sampler, car stereo, and CD player treatments became future skins.
- Track moments became the central data object: timestamp, artist, title, BPM, key, transition, confidence, notes.

## 2026-05-04 - Visual Direction And Research

We researched adjacent products and found that the exact niche is still open. Existing tools cover pieces of the workflow: Shazam-style recognition, DJ tracklist databases, setlist archives, and DJ production analysis tools. The product direction sharpened around music culture rather than plain identification.

Key decisions:

- Position the app as a live set companion for crate diggers.
- Emphasize hip-hop, funk, soul, disco, breaks, pop culture, nostalgia, and sample lineage.
- Make the interface feel like tactile music hardware rather than a generic streaming utility.

## 2026-05-05 - Set Intelligence Pass

The prototype gained more useful set intelligence: timeline search, review mode, Set Pulse summary, Music DNA, Crate Facts, sampler-pad transition tagging, a clickable set map, and one-click readable setlist copy.

Key decisions:

- Review mode is important because recognition confidence will never be perfect.
- The set map should be both an overview and a navigation surface.
- Music DNA should explain why a transition or record choice matters, not just identify a track.

## 2026-05-22 - App Foundation

The one-file prototype was split into a small app structure. CSS moved to `src/styles.css`, browser logic moved to `src/app.js`, and a no-dependency Node server was added in `server.mjs`.

Key additions:

- `GET /api/health`
- `POST /api/recognize`
- `POST /api/analyze`
- `npm run dev`
- `npm run check`

The recognition demo started calling the local API instead of only cycling local state.

## 2026-05-23 - Shared Fixtures And Archive

The frontend and backend were cleaned up to share demo track metadata from `src/fixtures.js`. A frontend API client was added in `src/api.js`, and the app gained an API status indicator plus a recognition capture log.

The app also gained a file-backed archive API and UI:

- `GET /api/sets`
- `POST /api/sets`
- `GET /api/sets/:id`

Archived sets can now be saved, listed, and loaded back into the UI. An architecture audit was added in `docs/ARCHITECTURE.md`.

Key architecture note:

`src/app.js` is now the main pressure point. The next refactor should split state, rendering, audio analysis, set-map drawing, and workflows into separate modules before integrating a real recognition provider.

## 2026-05-23 - Dev Journal System

We added this journal as a markdown source of truth and built the first frontend journal reader/editor. The goal is to keep development history easy to review while exploring a second product idea: beautiful markdown documentation rendered as tactile notebooks, binders, sketchbooks, graph paper, and other physical writing surfaces.

Initial journal features:

- Markdown as the editable source format.
- Animated page-turn navigation.
- Notebook, graph, and sketch starter paper types.
- Entry reordering and editing.
- Later: richer skins, drag-and-drop sections, multiple source files, and export/share modes.

## 2026-05-23 - Frontend Architecture Split

We split the DJ companion frontend out of the growing `src/app.js` monolith. The app entrypoint now handles bootstrap and event wiring, while focused modules own state, rendering, audio analysis, set-map drawing, workflows, DOM references, and utilities.

New frontend modules:

- `src/state.js`
- `src/render.js`
- `src/set-map.js`
- `src/audio.js`
- `src/workflows.js`
- `src/dom.js`
- `src/utils.js`

Why this matters:

- Real recognition provider work can now land without threading through one giant file.
- Rendering and state mutation are easier to reason about separately.
- BPM/audio work can evolve independently from UI rendering.
- The set-map canvas is isolated enough to become richer without destabilizing the app.

Next architecture domino:

Split `server.mjs` into route, static-file, archive-store, and recognition-provider modules, then add a provider response normalizer before integrating a real recognition service.

## 2026-05-23 - Backend Architecture Split

We split the Node backend out of the single `server.mjs` file. The server entrypoint now only starts the HTTP server and wires dependencies.

New backend modules:

- `server/routes.mjs`
- `server/static.mjs`
- `server/archive-store.mjs`
- `server/journal-store.mjs`
- `server/recognition-provider.mjs`
- `server/json.mjs`

We also added a normalized provider response layer. The stub recognizer now emits a provider-like payload with a preserved `raw` field and a stable SetScope match shape before the frontend sees it.

Why this matters:

- ACRCloud, AudD, AcoustID, or a custom fingerprinting backend can be introduced behind the provider module.
- Archive and journal persistence are isolated from route dispatch.
- Static serving is no longer mixed with API logic.
- The next provider integration can focus on input/output contracts instead of server plumbing.

Next backend domino:

Add stricter validation and clamping to `normalizeProviderMatch`, then build a real provider adapter interface.

## 2026-05-23 - Provider Contract Hardening

We hardened the recognition provider boundary before plugging in a real service. The stub provider now goes through the same adapter-style entrypoint a real provider will use.

What changed:

- Added `recognizeAudioWindow` as the provider adapter contract.
- Hardened `normalizeProviderMatch`.
- Added confidence normalization for `0-1` scores and `0-100` confidence values.
- Clamped confidence, BPM, and waveform fields.
- Added `status`: `matched`, `review`, or `unknown`.
- Preserved raw provider payloads for debugging.
- Added provider contract tests for malformed inputs.

Why this matters:

Provider APIs will not agree with our schema. This layer keeps ACRCloud, AudD, AcoustID, or a future custom fingerprint service from leaking provider-specific shape into the frontend or archive data.

Next provider domino:

Pick the first real recognition provider and implement it behind `recognizeAudioWindow`, keeping API keys server-side.

## 2026-05-23 - Audio Window Capture Pipeline

We added the browser-side capture pipeline needed before a real recognition provider can be useful.

What changed:

- Added `src/capture.js`.
- The `Listen` workflow now records short mic windows with `MediaRecorder`.
- Each captured window is encoded as an API payload and sent to `/api/recognize`.
- The server sanitizes audio metadata before adding it to normalized match `raw` data.
- Raw audio data URLs are not preserved in normalized matches.
- The stub provider still returns fixture matches, but now behind the same shape a real provider can use.

Why this matters:

Provider choice can change, but every recognition provider needs audio windows, timing metadata, and a stable server-side adapter. This gives the future real provider integration a concrete input path.

Next provider domino:

Implement the first real provider adapter behind `recognizeAudioWindow`.

## 2026-05-24 - AudD Provider Adapter

We added the first real recognition-provider adapter while keeping the app easy to run without secrets.

What changed:

- Added `server/audd-provider.mjs`.
- Added `AUDD_API_TOKEN` and `AUDD_RETURN` configuration via `.env.example`.
- Added a tiny local `.env` loader so dev tokens can be configured without shell ceremony.
- `/api/recognize` now tries AudD when a token and captured audio data are present.
- No-token development still uses the SetScope stub recognizer.
- AudD responses map into the same normalized `match` object the UI already understands.
- Provider normalization now lives in `server/provider-normalizer.mjs`, keeping AudD and future ShazamKit adapters independent of each other.
- Failed AudD requests return an `unknown` review match instead of leaking provider errors into the frontend.
- Mic capture windows now use 8 seconds, closer to AudD's recommended standard recognition sample size.
- Provider contract tests now cover AudD mapping and token detection.

Why this matters:

This is the first production-shaped recognition seam. We can now test the real service by dropping in a token, and the future iOS/ShazamKit version can reuse the same normalized match contract instead of copying web-specific assumptions.

Next provider domino:

Add a small provider settings/status panel so the app can explain whether it is running on the stub, AudD, or a future native/iOS recognizer.

## 2026-05-24 - Recognition Stack Status

We made provider state visible in the app instead of hiding it behind a generic API indicator.

What changed:

- `/api/health` now returns a recognition status object.
- The main UI has a Recognition Stack panel for active provider, web provider, sample window, and native target.
- The panel is already shaped around the three-provider story: local stub, AudD for web, ShazamKit for iOS.
- `.env` is ignored so local provider tokens stay out of source control.
- Contract checks now assert the provider status shape.

Why this matters:

Recognition providers are going to be a core architecture axis. Making provider state explicit gives us a reliable place to debug setup, explain mode changes, and eventually bridge the web app into an iOS-native ShazamKit path.

Next provider domino:

Add a provider diagnostics route that can run a dry configuration check without sending audio, then use it from the Recognition Stack panel.

## 2026-05-24 - Provider Diagnostics Route

We added a dry diagnostics path for recognition setup.

What changed:

- Added `/api/providers/diagnostics`.
- Diagnostics report local API, AudD token presence, capture-window readiness, and planned iOS native adapter status.
- The Recognition Stack panel now shows setup state separately from active web provider.
- No secrets are exposed; the route only reports whether required configuration is present.

Why this matters:

This gives us a clean place to add provider readiness checks as the app grows. AudD, AcoustID, ACRCloud, and ShazamKit can each publish setup state without forcing the UI to know vendor-specific details.

Next diagnostics domino:

Add an optional “test provider with sample audio” workflow that stores the result in the capture log without requiring a live DJ set.

## 2026-05-24 - Sample Provider Test

We added a no-mic provider test workflow.

What changed:

- Added a browser-side synthetic WAV generator.
- Added a Test provider button to the Recognition Stack.
- The sample audio goes through the same `/api/recognize` path as mic capture.
- Results are added to the timeline and capture log.

Why this matters:

Provider integration now has a fast sanity check. We can validate stubs, AudD token behavior, and future provider adapters without needing a live audio source every time.

Next creative domino:

Build a visual direction board for the interface that combines vinyl culture, street art, retro games, and iconic production hardware.

## 2026-05-24 - Recognition Chain HUD

We added the first concrete visual experiment from the creative direction work.

What changed:

- Recognition Stack now includes a signal-chain HUD: Input -> ID -> Intel -> Save.
- The recognizer step updates between Stub and AudD based on provider status.
- The styling borrows from hardware LCDs, arcade HUDs, and patch-bay routing without changing the workflow.
- The UI creative direction doc now includes sidecar expert notes for street-art and retro-game lanes.

Why this matters:

This gives the app a stronger product identity while making the provider architecture more legible. It is a small visual move that teaches the user how the system works.

Next creative domino:

Add a pixel confidence meter and capture-sticker animation.

## 2026-05-24 - Confidence Meter And Capture Sticker

We added two compact identity upgrades from the creative council.

What changed:

- The current track Match stat now includes a segmented VU/pixel confidence meter.
- New capture-log entries land with a quick sticker-style animation.
- The Recognition Stack signal-chain HUD remains the provider architecture anchor.
- The UI creative direction doc now includes the audio-hardware sidecar notes.

Why this matters:

These details make recognition feel more like an instrument: confidence is readable at a glance, capture events feel tactile, and the interface starts developing its own SetScope language without sacrificing clarity.

Next creative domino:

Design sampler-pad tags for quick track annotation.

## 2026-05-24 - MVP Readiness And Toolbelt Roadmap

We added a tighter product-readiness pass.

What changed:

- Added `docs/MVP_READINESS.md`.
- Added `docs/AUDIO_TOOLBELT_ROADMAP.md`.
- Added `docs/GITHUB_PUBLISHING.md`.
- Added `scripts/smoke-api.mjs` for an end-to-end API smoke test.
- Added `npm run smoke`.

Why this matters:

The project now has a repeatable MVP health check, a clear GitHub publishing recovery path, and a structured place for the bigger audio-toolbelt vision: DJ companion, listening lab, musician helpers, crate intelligence, practice tools, and creative toys.

Next MVP domino:

Run the smoke test in every major pass and then add manual duplicate/merge controls for repeated recognized tracks.

## 2026-05-24 - Audio Event Timeline And Crate Tags

We added the first shared event lane for the larger toolbelt idea.

What changed:

- Added `state.audioEvents`.
- Recognition captures now write both capture-log entries and audio-event entries.
- Track Intel now has quick crate tags: heater, deep cut, break, sample source, crowd lift, unknown gem, blendable, and review.
- Tag changes are logged as audio events.
- Archived sets now include `audioEvents`.
- The timeline search includes tags.

Why this matters:

The product now has a small but real audio event timeline. Future tools like tuners, note detectors, oscilloscopes, practice quests, and synth toys can all write useful moments into the same structure instead of becoming isolated gadgets.

Next MVP domino:

Add duplicate/merge controls for repeated recognized tracks.
