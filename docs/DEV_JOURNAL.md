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

## 2026-05-24 - Duplicate Moment Review

We added a correction workflow for repeated recognizer hits.

What changed:

- Track Intel now surfaces a Possible Duplicate panel when the selected track matches another captured moment within 90 seconds.
- Added one-click merge for nearby duplicate moments.
- Merge preserves combined crate tags, highest confidence, and capture/event references.
- Merges create an audio-event history entry.

Why this matters:

Real DJ-set recognition will hear blends and long transitions more than once. This workflow keeps the timeline clean without silently deleting intentional replays later in the set.

Next MVP domino:

Add schema validation around recognition payloads and prepare archive storage for SQLite.

## 2026-05-24 - Provider Schema Boundary

We added validation to the recognition contract.

What changed:

- Added `server/provider-schema.mjs`.
- Every normalized provider match is now asserted before entering the app contract.
- Validation checks required text fields, status values, confidence/BPM bounds, review state, and raw payload shape.
- Provider diagnostics now report match-schema readiness.
- Contract tests cover valid and malformed normalized matches.

Why this matters:

AudD, ShazamKit, and future recognition/analysis adapters can evolve independently, but malformed events should fail at one clear server boundary instead of corrupting the timeline or archive.

Next architecture domino:

Validate archived set/audio-event shapes, then migrate local archive persistence from JSON to SQLite.

## 2026-05-24 - Pitch Gates Arcade Lab

We built the first playable musician-helper tool in the SetScope toolbelt.

What changed:

- Added `pitch-gates.html` with a note-controlled orb-and-gates arcade game, scoring, streaks, lives, registers, and speeds.
- Added real-time note, octave, frequency, clarity, and tuning readouts powered by a locally bundled Pitchy detector.
- Added four input paths: silent automatic demo tone, microphone, user-shared audio, and local audio files.
- Completed rounds now write an `instrument` event into the existing audio-event timeline.
- Added `docs/PITCH_GATES.md` to define the browser audio boundary and future tuner/instrument-analysis roadmap.

Why this matters:

The bigger product idea is no longer only a roadmap. Pitch Gates is a compact proof that SetScope can be playful, genuinely useful for musicians, and structurally connected to the DJ companion memory layer.

Technical truth worth keeping visible:

A browser cannot silently sample arbitrary computer audio. Users can explicitly share an audio-capable tab or screen when their browser and operating system offer it; microphone and files are reliable web inputs. Instrument-family identification remains a later, confidence-aware analysis problem.

Next toolbelt domino:

Extract a reusable audio input/analyzer session so Pitch Gates, a tuner, and an oscilloscope can share one clean foundation.

## 2026-05-25 - Arcade Lab Control Languages

We captured the next expansion of the toolbelt: many kinds of playful musical control, sharing one memory layer.

What changed:

- Added `docs/ARCADE_LAB_ROADMAP.md`.
- Defined control languages for pitch, beat timing, phrase decisions, rapid pad/button patterns, scratch gestures, ear decisions, and tone shaping.
- Defined shared future primitives: `InputAdapter`, `FeatureFrame`, `ChallengeDefinition`, `PerformanceEvent`, and timeline memory writes.
- Identified an original pattern-reflex mode, `Needle Drop Rescue`, as a smart second game after Pitch Gates.

Why this matters:

Rhythm games and reactive story games reveal the same powerful principle: timed input makes attention exhilarating. For SetScope, that can mean learning to hear pitch, beats, phrasing, transitions, scratching, samples, and synthesis through play. A common challenge architecture keeps that vision coherent and lets every game deepen the user's musical memory.

Creative boundary:

We can learn from interaction patterns and emotional pacing while designing original game names, prompts, visuals, sounds, narrative framing, and equipment-inspired surfaces.

Next arcade domino:

Turn Pitch Gates audio input and round outcomes into reusable input/session and performance-event contracts, then prototype `Needle Drop Rescue`.

## 2026-05-25 - Lightning Bulb Theme And Native Path

We turned two big creative/technical instincts into product decisions.

What changed:

- Added an original fine-ink light bulb toggle illustration with a bright lightning-bolt filament.
- Added a persistent light/dark mode shared by the DJ cockpit, Pitch Gates, and the Dev Journal.
- Added `docs/PLATFORM_STRATEGY.md`: browser-first today, native SwiftUI/ShazamKit/AVAudioEngine for the serious iOS version, and a Tauri-first desktop capture spike with Electron held as an evidence-driven alternative.
- Made the Arcade Lab inspirations explicit while keeping its visual expression and game content original.

Why this matters:

SetScope should wear its influences loudly and lovingly without being an imitation. Meanwhile, its platform strategy should protect the hard part of the vision: reliable musical listening and input. Portable schemas let the web prototype move fast while native audio implementations later deliver the magic cleanly.

Next engineering domino:

Extract `AudioInputSession`, `AnalysisFrame`, and `PerformanceEvent` contracts from Pitch Gates so the next game and the future native adapters begin on the same foundation.

## 2026-05-27 - MVP Functional Hardening

We ran a functional QA pass across the DJ deck, journal, shared theme, provider sample workflow, archive lifecycle, and Pitch Gates on desktop and mobile. The pass exposed one serious cross-tab persistence issue: finishing a Pitch Gates round from an older tab could write its stale copy of the set draft back over newer edits made in the cockpit.

What changed:

- Added `persistAudioEvent` so toolbelt activities append to the latest saved draft without replacing newer tracks, capture history, or archive state.
- Updated Pitch Gates round completion to use the append-only event path.
- Added a state persistence regression test that simulates an edit made after the game tab opens.
- Verified track edit/tag/duplicate merge, provider sample logging, copy/export, archive/load/new set, journal paging and paper selection, theme persistence, Pitch Gates scoring, API smoke routes, and mobile layout.

Why this matters:

SetScope is becoming a connected toolbelt. Its tools must be able to contribute observations and game outcomes without becoming a risk to the DJ set timeline the user is collecting.

## 2026-05-31 - Audio Toolbelt Foundation

We extracted the first reusable audio-toolbelt foundation from Pitch Gates.

What changed:

- Added `src/audio-session.js` for microphone, shared audio, file playback, and generated demo-tone lifecycle.
- Added `src/pitch-analysis.js` for Pitchy-backed analysis frames plus shared MIDI, frequency, and note helpers.
- Added `src/performance-events.js` for structured performance events that persist into the existing audio-event timeline with metadata.
- Refactored Pitch Gates so it uses those shared modules instead of owning all audio setup and pitch math inline.
- Added `scripts/audio-toolbelt.test.mjs` to cover pitch helpers, performance-event mapping, and persisted metadata.

Why this matters:

Pitch Gates is no longer a one-off. The same source/session/analyzer/event path can now power a tuner, oscilloscope, note finder, vocal practice game, future arcade modes, and native iOS/desktop audio adapters.

Next toolbelt domino:

Build the first tiny tuner/oscilloscope panel on top of these modules to prove the foundation works outside Pitch Gates.

## 2026-06-02 - Audio Lab First Tool

We built the first Listening Lab surface on the shared audio-toolbelt foundation.

What changed:

- Added `audio-lab.html`, a compact tuner and oscilloscope tool.
- Added `src/audio-lab.js` and `src/audio-lab.css`.
- Audio Lab uses `createAudioInputSession`, `createPitchAnalyzer`, and `persistPerformanceEvent`, proving the foundation works outside Pitch Gates.
- The deck now links to Audio Lab, and Pitch Gates links back to it.
- Audio Lab snapshots persist as structured `analysis` events with note, frequency, clarity, source, and mode metadata.
- Added `docs/AUDIO_LAB.md` and expanded checks to cover the new page.

Why this matters:

SetScope now has both a game and a utility using the same audio backbone. That makes the product feel less like a single experiment and more like a real musical toolbelt.

## 2026-06-02 - Audio Lab Utility Upgrade

We pushed Audio Lab beyond a passive tuner/scope and into a more useful practice surface.

What changed:

- Added target-note selection and cents-to-target readout.
- Added a 2-second stable-hold meter so tuning becomes an active practice challenge.
- Added oscilloscope gain, time-scale, and freeze controls.
- Logged Audio Lab snapshots with richer metadata: target note, cents, stability, gain, and time scale.

Why this matters:

The first utility now teaches, not just displays. It gives singers and instrumentalists a tiny goal loop while keeping the raw audio visualization available for curiosity and debugging.
