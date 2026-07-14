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

## 2026-06-02 - Tool Rack and Audio Lab Practice Sprint

We turned the expert-panel audit into another implementation pass focused on reusable architecture and more musician-useful controls.

What changed:

- Added a shared tool registry and tool rack across SetScope, Pitch Gates, Audio Lab, and Journal.
- Added reusable audio widget helpers for tuner presets, level metering, zero-crossing trigger alignment, cents math, and practice storage.
- Added Audio Lab instrument presets for chromatic, guitar, bass, and voice targets.
- Added input gain calibration, RMS/peak meters, and triggered oscilloscope mode.
- Added daily practice count and streak tracking for stable target locks.
- Let Audio Lab snapshots attach to an existing set timeline track and preserve that timestamp/track id in the audio-event timeline.

Why this matters:

The toolbelt is getting a spine. New games and utilities can now share navigation, shared musical widget logic, and a memory path back into the DJ set instead of becoming isolated experiments.

## 2026-06-04 - Cockpit Toolbelt Signals

We made the main DJ cockpit aware of attached toolbelt events, starting with Audio Lab snapshots.

What changed:

- Added a state helper for retrieving audio events attached to a specific track.
- Added compact toolbelt badges to set timeline rows.
- Added selected-track toolbelt signals inside the Set Moment inspector.
- Upgraded Toolbelt Events cards with metadata chips for note, target, cents, stable locks, RMS, and peak values.
- Extended tests and project checks around attached event lookup and cockpit rendering hooks.

Why this matters:

The main cockpit is becoming the command center. Audio Lab, Pitch Gates, recognition, tags, and future toys can now leave visible evidence on the actual set timeline instead of disappearing into a generic activity feed.

## 2026-06-05 - Event Detail Drawer and Promote To Notes

We made toolbelt events actionable from the main cockpit.

What changed:

- Added a Toolbelt Event detail drawer with structured metadata, event summary, and attached-track selector.
- Event cards now open the drawer instead of only jumping to a track.
- Added event reassignment so unattached or misattached signals can be moved to the right set moment.
- Added "Add to notes" so a tool signal can become durable track annotation.
- Added state and test coverage for event lookup, reassignment, and note promotion.

Why this matters:

Toolbelt outputs are now part of the user's musical memory. A tuner lock, game run, recognition capture, or future visualizer marker can be turned into a human-readable set note without leaving the cockpit.

## 2026-06-18 - Signal Labels and Timeline Filters

We made the cockpit's toolbelt memory navigable.

What changed:

- Added timeline signal filters for all tracks, tracks with signals, analysis events, instrument events, practice labels, and review labels.
- Added quick labels in the event drawer: practice, tuning, transition, sample, and review.
- Event labels now render as metadata chips and participate in timeline filtering.
- Persisted `signalFilter` in state so the cockpit remembers the current signal view.
- Added tests for event label toggling and label-driven visible-track filtering.

Why this matters:

As the toolbelt grows, the problem shifts from "can we capture interesting signals?" to "can we find the right signal later?" This turns the cockpit into a searchable musical evidence board instead of an activity feed.

## 2026-06-25 - Product QA Tightening Pass

We ran a full product-health pass across the cockpit, Audio Lab, Pitch Gates, and Dev Journal.

What changed:

- Fixed cockpit horizontal overflow caused by dense topbar actions and offscreen hidden controls.
- Switched the event drawer to an in-viewport visibility model so it stays clickable without widening the document.
- Added semantic page headings to Audio Lab, Pitch Gates, and Dev Journal.
- Added labels for hidden file inputs and journal editor fields.
- Extended static checks to guard against unlabeled controls, missing headings, drawer-position regressions, and header overflow regressions.

Why this matters:

The app is moving from "cool prototype surfaces" toward a dependable toolbelt. Cleaner semantics, no stray horizontal scroll, and explicit regression checks make every future music toy easier to ship without slowly roughing up the cockpit.

## 2026-06-25 - Set Coach Mission Control

We gave the cockpit a local producer brain.

What changed:

- Added a Set Coach panel that scores set readiness from review count, signal coverage, event labels, confidence, transition variety, and BPM movement.
- Added ranked coach actions that can jump into review mode, open the signal timeline, or launch the event-label drawer.
- Added creative prompts that suggest the next listening pass, transition pass, or archive-memory pass.
- Extracted the scoring and prompt logic into `src/set-coach.js` so future AI narration can sit on top of a real deterministic model.
- Added structural and behavioral checks for the coach model, panel, score, actions, and prompts.

Why this matters:

The cockpit now tells the user what to do next. That is the product leap: SetScope is no longer only logging evidence, it is starting to conduct the session.

## 2026-07-01 - DJ Mentor Layer and Move Cards

We turned Set Coach into a booth-side mentor.

What changed:

- Added a local DJ Mentor model that reads the selected track, transition, tags, toolbelt events, and set position.
- Added a DJ Mentor cockpit panel with story beat, energy, move read, why-it-works explanation, practice mission, dig prompt, and mentor actions.
- Added mentor-note actions that persist DJ Mentor advice into selected track notes.
- Added DJ Move Cards to toolbelt event drawers so every signal can explain its practice and dig value.
- Fixed coach action event-id namespacing so coach controls no longer masquerade as event cards.
- Added tests and checks for mentor model output, move cards, and note persistence.

Why this matters:

SetScope is starting to teach DJ craft. It does not only identify and archive songs; it gives the user a next move, a reason, and a practice rep tied to the set timeline.

## 2026-07-01 - Rhythm Roulette Beat Lab

We added the first beat-making game surface.

What changed:

- Added a standalone Rhythm Roulette mode with blindfold crate digging, mystery record pulls, sample pads, and a 16-step beat grid.
- Drew an original pixel-art record shop scene in canvas: crates, blindfolded producer, shop signs, pulled sleeves, and beat lights.
- Added browser-generated beat sounds for kick, snare, hat, and melodic chops so the mode is playable without uploads or APIs.
- Added Auto flip, Play, Clear, and Save run actions.
- Persisted saved runs into the shared SetScope toolbelt timeline as structured learning events.
- Registered Rhythm Roulette in the shared tool rack and added regression checks.

Why this matters:

The toolbelt now has a beat-making practice game, not only recognition and pitch utilities. It points SetScope toward playful music education: constraints, surprises, cultural flavor, and a durable memory trail.

## 2026-07-04 - Rhythm Roulette Beauty Pass

We gave Rhythm Roulette more game-show pressure and craft feedback.

What changed:

- Added a top marquee with the current constraint badge.
- Added random producer constraints like Dusty pocket, Backbeat tax, Three-record rule, and Late swing.
- Added challenge bonuses to scoring and saved learning events.
- Added a selected-sample readout so the pad bank feels more tactile and intentional.
- Added a crate receipt with constraint, hit count, records used, and bonus.
- Added a saved-run glow and a challenge poster inside the pixel-art record shop canvas.

Why this matters:

Rhythm Roulette now feels less like a static beat grid and more like a playable challenge: the user gets a surprise pull, a constraint, a score reason, and a logged artifact.

## 2026-07-06 - Runtime QA Harness

We added a real browser runtime smoke harness.

What changed:

- Added Playwright as a dev dependency.
- Added `npm run test:runtime`.
- Added runtime coverage for SetScope, Rhythm Roulette, Pitch Gates, Audio Lab, and Dev Journal.
- The harness clicks core actions, verifies expected state, captures screenshots, and checks console errors, page errors, failed HTTP responses, duplicate ids, broken images, and horizontal overflow.
- Screenshots are written to a temp artifacts folder so local QA can inspect the app without committing image churn.

Why this matters:

This makes the creative sprint loop safer. Every new visual mode, game, or audio tool can now be checked in a real browser instead of depending only on static structure checks.

## 2026-07-11 - Track-Scoped Practice Loop

We connected DJ Mentor assignments to the tools that can actually train and record them.

What changed:

- Added a compact Practice Deck to DJ Mentor for launching Pitch Gates, Rhythm Roulette, or Audio Lab from the selected timeline track.
- Added a shared assignment strip that carries track, timestamp, artist, and mission into each tool.
- Auto-attached completed runs and snapshots to the source track with searchable practice, tuning, or sample labels.
- Added an exact return path that reopens SetScope on the source track with the new event drawer already open.
- Extended unit, static, and Playwright coverage across the full launch, save, and return loop.

Why this matters:

The Mentor, minigames, lab, and timeline now form one learning workflow. A suggestion can become a rep, the rep becomes evidence, and the evidence lands back on the musical moment that gave it meaning.

## 2026-07-11 - Continuous Live Listening

We turned the three-window microphone demo into an owned live session.

What changed:

- Added a reusable continuous-listening controller with explicit capture, recognition, waiting, error, and stopped states.
- Added a true Listen/Stop transport with visible window and match totals.
- Added persisted 8, 15, 30, and 60-second recognition cadence choices.
- Made microphone recording and recognition requests cancellable when the user stops or leaves the page.
- Kept capture and recognition sequential so slow provider responses cannot overlap or reorder timeline writes.
- Added bounded retry behavior that pauses after three consecutive failures instead of silently looping forever.
- Added unit and Playwright coverage for transport ownership, a complete fake-microphone recognition pass, and explicit stop behavior.

Why this matters:

SetScope can now stay beside a DJ set instead of asking for three isolated samples. The transport is also provider-neutral: the browser can use AudD while a future iOS build can drive the same lifecycle with ShazamKit.

## 2026-07-12 - Revolution Sprint Council

We reconvened independent visual-world, game-direction, music-pedagogy, and audio-platform reviews to choose the next lead dominoes.

What changed:

- Defined the product promise as turning a DJ set into a route from hearing through understanding, practice, and transfer.
- Selected Block Signal Broadcast as the canonical visual world, Night Transit as its information model, and Pressing Plant as its evidence language.
- Converged on one implementation spine: versioned contracts, deterministic Pitch Gates, honest learning evidence, the four-space shell, and the visual finish.
- Specified Booth, Route, Practice, and Crate as the long-term product structure.
- Separated immediate Craft Score from durable Learning Evidence.
- Added production gates for audio latency, data migration, privacy, accessibility, first-session completion, and return behavior.
- Explicitly deferred new minigames and infrastructure expansion until one existing game proves the complete learning loop.

Why this matters:

The next sprint now has a hard order and a quality bar. We are not adding another attractive prototype; we are converting the existing strengths into one product people can understand, trust, and come back to.

See `docs/REVOLUTION_SPRINT_PLAN.md` for the complete council plan.

## 2026-07-12 - Moonshot Council

We asked the same visual, game, music-learning, and systems council to suspend roadmap gravity and surface the ideas they would normally leave unspoken.

What changed:

- Reframed SetScope's possible category as software that makes musical attention playable.
- Identified repeated independent convergence around Counterfactual Booth, Blind Booth, Signal Relay, Memory Pressing, and Pocket Phrase.
- Defined sixteen category-scale concepts with concrete user actions, human needs, technical primitives, risks, and experiments under three CC days.
- Preserved dangerous dissent around crowd participation, designed forgetting, disappearing interfaces, ephemeral sessions, and moving native-first when haptics or background audio become the product.
- Added cultural, rights, accessibility, privacy, provenance, and uncertainty guardrails.
- Ranked five thin-wedge experiments that can test magic without disrupting the approved Revolution Sprint.

Why this matters:

The moonshots now have disciplined escape velocity. They remain strange enough to create a new category, but each can be tested cheaply before it attracts infrastructure or mythology.

See `docs/MOONSHOT_COUNCIL.md` for the complete atlas.

## 2026-07-12 - Frequency Geometry Lab Council

We extended the moonshot review to acoustics, mathematical music theory, puzzle design, multisensory learning, haptics, cymatics, light, and the cultural symbolism of geometry.

What changed:

- Defined SetScope's new experimental category as reversible musical reasoning: predict, transform, reveal an invariant, and transfer the result to a Route moment.
- Created a visible truth ledger separating measured signals, internal digital signals, computed models, authored mappings, and symbolic stories.
- Selected Route Resonator as the flagship synthesis of DJ transitions, deterministic puzzles, musical causality, and the Block Signal Broadcast world.
- Ranked Phase Loom, Pulse Rosette, Fourier Timbre Forge, Beat Loom, Mapping Forge, and Chladni Field Log as the strongest supporting experiments.
- Specified a small shared engine for reversible transformations, cyclic objects, deterministic runs, mathematical views, evidence, and personal mapping profiles.
- Added a virtual-lab protocol, research footing, accessibility co-design requirements, audio/light/vibration safety, and explicit claims the product must never make.
- Preserved the Revolution Sprint as the lead domino; the scientific toys depend on deterministic clocks, replay, calibration, and honest evidence.

Why this matters:

SetScope can pursue wonder without drifting into pseudoscience or decorative visualization. The proposed experiments make ratios, phase, interference, rhythm, harmony, resonance, symmetry, and personal multisensory mappings genuinely playable while keeping measured fact, mathematical model, and poetic meaning legible.

See `docs/FREQUENCY_GEOMETRY_LAB.md` for the complete charter.

## 2026-07-12 - Performance Evidence Contract V2

We completed the first production brick from the Revolution Sprint's contract spine.

What changed:

- Added a versioned `PerformanceEventV2` contract with runtime creation, validation, and stable schema identity.
- Separated observation, inference, result, assistance, calibration, evidence, and Route context while retaining transitional fields used by the current UI.
- Made demo assistance explicitly ineligible for mastery evidence without erasing its score or practice value.
- Added a deterministic adapter for unversioned V1 performance events so existing local drafts and archived sets continue to load.
- Added quarantine records for malformed V2 metadata so corrupt or unknown evidence cannot silently become valid learning data or crash hydration.
- Applied migration during local-state hydration and archived-set restore.
- Added a golden legacy fixture and contract tests for round-trip stability, mastery eligibility, calibration, inference confidence, generic metadata, and malformed input.
- Extended static checks so schema identity, migration, quarantine, and mastery eligibility cannot disappear unnoticed.

Why this matters:

Scores are no longer the only durable truth about a run. SetScope now has the first trustworthy evidence envelope needed by deterministic replay, honest mastery, iOS interchange, Route transfer, and the future Frequency Geometry Lab.

## 2026-07-13 - Deterministic Pitch Gates Engine

We rebuilt Pitch Gates around musical time instead of render frames.

What changed:

- Added seeded, versioned challenge generation with fixed spawn, evaluation, and removal timestamps.
- Moved scoring, lives, streaks, gate outcomes, and completion into a pure reducer with no DOM, Canvas, Web Audio, wall-clock, or random dependencies.
- Added timestamped pitch-input actions, pause/resume support, and explicit `hit`, `near`, `miss`, `recovery`, and `complete` domain events.
- Made Canvas positions a projection of musical timestamps, so viewport width and animation frequency no longer decide when a note is scored.
- Bound live rounds to an audio-context clock when audio is active, with one stable performance-clock fallback selected at round start.
- Added portable Replay V1 records and deterministic final-state hashes.
- Attached challenge id, seed, replay hash, action count, and end reason to PerformanceEventV2 evidence.
- Added engine tests proving identical results and hashes at simulated 30, 60, and 120 Hz render schedules.
- Preserved demo tone, microphone, shared audio, file input, practice context, scoring display, Canvas play, and timeline persistence.

Why this matters:

Pitch Gates is now the first real SetScope gameplay engine rather than a Canvas loop with scoring inside it. The same challenge can be replayed, audited, moved to iOS, used for honest learning evidence, and reused as the architectural pattern for Phase Loom, Pulse Rosette, and Route Resonator.

## 2026-07-13 - Vinyl Deck Pixel Hardware Pass

We repaired the cropped controls beside the main record and sharpened the default visual language.

What changed:

- Rebalanced the deck into a dominant vinyl zone and a stable control zone instead of relying on narrow percentage-based leftovers.
- Enlarged the transition pad bank, removed hidden browser padding, made labels container-responsive, and kept every skin on a readable 2-by-2 grid.
- Added a latched active state and `aria-pressed` semantics so selecting Blend, Cut, Loop, or Echo produces immediate visual feedback.
- Added restrained pixel-grid texture, a deck status legend, signal LEDs, serial sticker, harder hardware edges, and more purposeful meter placement.
- Kept dense discovery details behind the record, controls, and current state in the visual hierarchy.
- Added browser regression checks that verify all four pad labels and bounds remain inside the deck at runtime.
- Documented studio-synthesis rules combining toy-like legibility, arcade energy, hardware precision, authored-world density, magazine irreverence, and pixel-era continuity without copying protected game or hardware expression.

Why this matters:

The record area now behaves like a designed instrument instead of an illustration cropped into a card. Its playful details reward inspection, but its controls remain complete, legible, and trustworthy.

## 2026-07-13 - Pitch Gates Comfort Pass

We rebuilt the first minute of Pitch Gates around a human voice instead of an abstract scale.

What changed:

- Changed the default from the demanding A3-A4 Groove round to a slower, forgiving C3-centered round.
- Added a persistent `My note` control that captures the singer's current comfortable pitch and builds the round around it.
- Replaced octave-spanning random targets with seeded stepwise phrases that repeat the home note before gradually exploring a twelve-semitone display range.
- Separated tempo from pitch forgiveness with Gentle, Balanced, and Exact assist presets.
- Added a Stability control for choosing between faster response and steadier tracking.
- Added game-specific confidence hysteresis, time-based median/EMA smoothing, octave-slip correction, and short-dropout grace without changing the reusable raw analyzer.
- Changed scoring from one instantaneous pitch sample to the median of the preceding 220 milliseconds.
- Added deterministic checks for personal ranges, stepwise motion, smoothing, octave glitches, dropout behavior, and noisy gate crossings.

Why this matters:

The detector no longer asks beginners to fight the game before they can learn from it. The opening gates are reachable, the controls map to musical choices, and the tuning parameters are isolated enough for real playtesting to improve them without destabilizing the engine.

## 2026-07-13 - Responsive Presentation Pass

We audited every SetScope screen at phone, tablet, compact-laptop, and desktop widths, then repaired the shared constraints behind the visible clipping.

What changed:

- Added a two-row tablet header for the arcade tools so navigation, status displays, and the light control remain complete instead of pushing beyond the viewport.
- Tightened the cockpit timeline at tablet widths so track names retain useful space and metadata moves into a readable second row.
- Made every Rhythm Roulette side module respect its panel width, compressed the sequencer grid cleanly, and introduced a two-column tablet workbench.
- Removed Audio Lab's stretched dead zone by giving the oscilloscope a stable responsive height and arranging readouts into a tablet grid.
- Rebuilt the Journal's tablet header, capped its entry index to keep the current page nearby, and fixed entry previews that escaped their cards as long single-line strips.
- Added permanent 768-pixel tablet screenshots, horizontal-overflow checks, and control-boundary assertions to the runtime suite alongside phone and desktop coverage.

Why this matters:

Responsive behavior is now treated as a tested product contract. Each surface keeps its identity, but navigation, instruments, controls, and primary content follow the same predictable progression from phone to tablet to desktop.
