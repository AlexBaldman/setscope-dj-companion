# SetScope Architecture Audit

## Current Shape

- `index.html`: static app shell and semantic UI structure.
- `audio-lab.html`: standalone tuner and oscilloscope Listening Lab surface.
- `pitch-gates.html`: standalone musician-helper arcade surface.
- `rhythm-roulette.html`: standalone blind-crate beat-making game surface.
- `src/styles.css`: visual system, responsive layout, vinyl/sampler/car/CD skin styling.
- `src/arcade-shell.css`: shared standalone-tool tokens, page shell, hardware controls, readouts, and responsive topbar behavior.
- `src/app.js`: app bootstrap and event wiring.
- `src/cockpit-workspace.js`: responsive Signal/Timeline/Intel workspace controller plus independently persisted disclosure preferences.
- `src/state.js`: browser state, hydration, persistence, selected-track state, track mutation helpers.
- `src/contracts/set-draft.js`: versioned durable draft schema, legacy migration, serialization allowlist, and structural validation.
- `src/render.js`: timeline, inspector, summary, capture log, archive list, current-track rendering, attached toolbelt signal rendering, and event detail drawer rendering.
- `src/set-coach.js`: local set-readiness scoring, ranked next actions, and creative prompts for the cockpit Set Coach.
- `src/dj-mentor.js`: deterministic DJ Mentor model for selected-track story beats, practice missions, dig prompts, and event move cards.
- `src/set-map.js`: canvas set-map drawing and nearest-track selection.
- `src/audio.js`: imported-audio decoding and BPM estimation.
- `src/audio-lab.js` and `src/audio-lab.css`: tuner/oscilloscope tool built on shared audio modules.
- `src/audio-session.js`: reusable browser audio source lifecycle for toolbelt modules.
- `src/audio-widgets.js`: reusable tuner presets, level analysis, zero-crossing trigger helpers, and practice stat persistence.
- `src/capture.js`: browser mic window recording and API-ready audio payload creation.
- `src/listening-session.js`: cancellable continuous-listening state machine, cadence scheduling, sequential capture/recognition ownership, and retry limits.
- `src/pitch-analysis.js`: Pitchy-backed pitch frames and musical pitch helpers.
- `src/performance-events.js`: structured toolbelt practice/game event persistence.
- `src/practice-context.js`: URL-addressable selected-track assignments, tool mission display, and exact track/event return links.
- `src/session-spine.js`: portable Practice Mission contract, session progression model, and context-aware Next Move recommendation.
- `src/skill-graph.js`: bounded cross-session skill ledger, trusted-evidence normalization, and five-node learner constellation.
- `src/pitch-gates.js`: thin page controller for pitch input, the source clock, Canvas projection, and timeline event output.
- `src/pitch-gates/challenge.js`: seeded, versioned Pitch Gates challenge generation with fixed musical timestamps.
- `src/pitch-gates/pitch-filter.js`: game-specific confidence hysteresis, octave correction, median/EMA smoothing, and dropout grace over reusable raw pitch frames.
- `src/pitch-gates/reducer.js`: pure run state, timestamped input, scoring, domain events, projection, and final-state hashing.
- `src/pitch-gates/replay.js`: portable replay creation and deterministic reconstruction.
- `src/pitch-gates.css`: Pitch Gates cabinet, game surface, tuning controls, and page-specific responsive layout.
- `src/rhythm-roulette.js` and `src/rhythm-roulette.css`: thin blind-record controller, sequencer UI, page-specific record-shop styling, and learning-event output.
- `src/rhythm-roulette/catalog.js` and `src/rhythm-roulette/challenge.js`: stable sample identifiers plus seeded, versioned crate pulls and challenge rules.
- `src/rhythm-roulette/reducer.js` and `src/rhythm-roulette/replay.js`: pure beat-pattern transitions, scoring, run hashing, and deterministic replay reconstruction.
- `src/rhythm-roulette/audio-engine.js` and `src/rhythm-roulette/scene.js`: isolated Web Audio synthesis and pixel-scene rendering adapters.
- `src/vendor/pitchy.js`: locally bundled Pitchy detector used without a CDN runtime dependency.
- `src/theme.js` and `src/theme.css`: persisted cross-surface theme control and light-mode treatment.
- `src/design-tokens.css`: shared foundation, semantic signal colors, room identity hook, control sizing, typography, and motion tokens.
- `src/tool-registry.js`: shared SetScope tool rack and registered tool metadata.
- `src/product-manifest.js`: browser-neutral source of truth for product surfaces,
  public routes, room identities, primary actions, and practice capability.
- `src/input-profile-store.js`: storage boundary for normalized controller
  mappings and latency profiles, including legacy migration.
- `src/beat-school/input-mappings.js`: pure adapter from learned semantic actions
  into Beat School drum lanes, with built-in fallbacks.
- `docs/DESIGN_SYSTEM.md`: screenshot-led design principles, audit findings, implemented decisions, and responsive backlog.
- `docs/MIDI_IDEA_BANK.md`: researched MIDI capability boundaries, device-first hardware plan, feature catalog, and portable adapter direction.
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
- `server/database.mjs`: shared SQLite connection and configurable data-directory boundary.
- `server/archive-store.mjs`: transactional SQLite set archive, FTS5 study index, match explanations, and legacy JSON migration.
- `server/archive-schema.mjs`: archive-envelope validation and migration into the shared SetDraft V2 contract.
- `server/journal-store.mjs`: markdown journal persistence.
- `server/audd-provider.mjs`: AudD recognition adapter and result mapper.
- `server/provider-schema.mjs`: validation for normalized provider matches.
- `server/provider-normalizer.mjs`: shared provider-to-SetScope match normalization.
- `server/recognition-provider.mjs`: stub recognition provider, track analysis, and provider response normalization.
- `server/recognition-store.mjs`: bounded, atomic, replay-safe recognition transaction ledger keyed by request ID.
- `server/json.mjs`: bounded JSON request parsing plus structured HTTP error responses.
- `data/setscope.sqlite`: shared local database for recognition receipts and archived sets.
- `data/sets.json`: legacy archive imported and renamed on first successful migration.

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
- Standalone tools now share an explicit arcade shell instead of importing another tool's page stylesheet.
- Browser drafts now migrate into a versioned `SetDraftV2` contract; rendering and selectors are pure, durable commands own persistence, and temporary filters live in separate UI state.
- API JSON bodies have route-specific size limits and explicit `400`, `413`, and `422` responses; archive writes are validated, serialized, and atomically replaced.
- Audio Lab now includes reusable widget primitives: tuner presets, level metering, zero-crossing trigger behavior, daily practice streaks, and set-track attachment.
- The main cockpit now derives attached toolbelt signals from `state.audioEvents`, showing compact badges on timeline rows, richer selected-track moments, and metadata chips in the Toolbelt Events panel.
- Toolbelt events can now be inspected in a drawer, reassigned to a track, and promoted into durable track notes.
- Toolbelt events can be labeled, and the set timeline can be filtered by signal type or label.
- Set Coach turns the current timeline into a readiness score, ranked next actions, and creative prompts that can steer review mode, signal filtering, and event labeling.
- DJ Mentor reads selected tracks and toolbelt events to render practice missions, dig prompts, mentor notes, and event move cards.
- Rhythm Roulette generates deterministic blind-crate challenges, applies beat edits through a pure reducer, verifies portable replays, and writes saved runs into the same structured audio event timeline.
- Shared app headers, semantic accent tokens, metric racks, instrument screens, hardware transports, focus treatment, and reduced-motion behavior now give every surface a consistent interaction language without flattening its visual identity.
- DJ Mentor practice launches now carry the selected track into Pitch Gates, Rhythm Roulette, and Audio Lab; completed runs auto-attach, receive practice labels, and return to the cockpit with the saved event open.
- The Session Spine now persists track-specific practice missions inside the SetDraft envelope, recommends the next useful tool, resumes unfinished assignments, and closes missions against exact performance-event evidence.
- Completed tool runs now also write deduplicated cross-session skill receipts. The Skill Constellation keeps level separate from evidence confidence, excludes guided/demo work from promotion, and can steer Next Move toward calibration or a weak trusted skill.
- The Timing and Semantic Input Spine now maps stable controller gestures into
  versioned musical-action receipts with intensity, latency provenance, and
  deterministic bar/beat/step coordinates. MIDI Learn migrates from legacy raw
  message storage without losing mappings.
- The main deck now runs a continuous listening transport with explicit start/stop ownership, configurable cadence, abortable capture/API work, session metrics, and bounded retry behavior.
- SetScope now projects the same cockpit into three explicit responsive workspaces. Workspace selection and disclosure preferences are isolated from SetDraft, selected-track actions reveal the relevant narrow-screen workspace, and Listen remains available across every mode.
- Recognition windows now carry persistent session identity, set-relative timing, request and observation IDs, explicit outcomes, provider deadlines, cancellation, and visible provenance. Bounded binary audio stays ephemeral, committed observations replay from SQLite after restart without invoking the provider again, and provider errors cannot create fake timeline tracks.
- Pitch Gates, Audio Lab, and Rhythm Roulette now expose truthful idle/ready/active/result states, contextual disabled actions, and screen-readable Canvas summaries. Roulette playback updates cells in place so keyboard focus survives every tick.
- Pitch Gates and Audio Lab now share Musician Profile V2. Stable-center calibration begins with an estimated safe span; separately captured low/high notes confirm its boundaries. Signed gate distances produce centered/high/low/mixed/silent diagnosis, and profile revision, diagnosis, targets, and deterministic seven-stage prescriptions travel across both tools and into saved evidence.
- API and runtime suites start the current checkout on ephemeral ports, and GitHub Actions runs the same contract, HTTP, and responsive browser checks.
- Navigation, Pages output, responsive/light-mode route coverage, room identity,
  and practice-mode validation now derive from one product manifest.
- Beat School is accepted by the Session Spine and consumes MIDI Learn mappings
  from the same input-profile store as MIDI Playground.
- Pages deployment now runs the complete browser suite before artifact upload,
  and the built artifact is checked across all eight surfaces.

## Main Risks

- The main frontend has been split into modules, which removes the largest immediate maintainability issue.
- Backend concerns have been split into route, static, archive, journal, and recognition-provider modules.
- Archive persistence now uses the same WAL-enabled SQLite database as recognition receipts. Saves are transactional, IDs are unique, legacy JSON is migrated atomically, and independent connections are covered by boundary tests.
- Archive discovery uses a derived FTS5 index over the portable SetDraft envelope. The SetDraft JSON remains canonical; search rows are replaced in the same transaction as each save and can be rebuilt from canonical data by version.
- Provider matches are normalized, clamped, and schema-validated at the server boundary.
- Domain commands still mutate the in-memory draft object for compatibility. The persistence boundary is explicit now, but a future reducer/store can make command transitions immutable without changing the serialized contract.
- Web audio-source capture is permission-scoped: arbitrary computer playback cannot be silently sampled, and shared system-audio choices vary by browser/OS.
- Continuous listening is deliberately sequential so slow recognition responses cannot overlap capture windows or reorder timeline writes.
- Performance completion still spans separate SetDraft and Skill Ledger writes.
  A future application-level commit operation should define retry and partial
  failure behavior before cloud sync is introduced.
- Browser storage remains directly accessed by several older modules. The new
  input-profile store is the first adapter boundary; drafts, scores, theme,
  journal, and static archives should move behind the same port incrementally.
- SetDraft validates top-level containers but not every nested track, mission,
  capture, and performance-event item. Native clients need stricter item schemas
  before bidirectional sync.
- `scripts/check.mjs` still contains many source-text assertions. New behavior
  should prefer contract or browser tests, and old assertions should be retired
  as equivalent behavior coverage lands.

## 2026-07-27 Architecture Hardening

This pass closed three integration gaps found by parallel frontend and delivery
audits:

1. A tool could be present in navigation, routing, build output, and practice
   flows through separate registries. The product manifest now owns that catalog.
2. Beat School appeared practice-capable but was rejected by the Session Spine.
   Practice capability and labels now derive from the manifest and are contract
   tested for every eligible tool.
3. GitHub Pages could deploy while browser CI failed. Deployment now installs
   Chromium and requires the complete runtime and built-artifact suites before
   upload.

The same audit found that MIDI Learn did not reach Beat School. Controller
mappings and latency now cross a shared input-profile boundary, and a pure
adapter accepts learned kick, snare, hat, and clap gestures while excluding
unrelated transport or mixer commands.

## Recommended Next Refactor

The canonical sequencing now lives in `docs/NEXT_DOMINOS.md`. The architecture
order below records dependency direction rather than a competing product backlog.

1. Validate the completed Timing and Semantic Input Spine and MIDI Playground
   Hardware Census against the physical
   nanoKEY, Sensel Morph, Maschine Studio, Maschine Jam, and DJ Hero bench. Record
   aliases, capabilities, and latency without leaking device identity outside the
   local profile.

2. Build the first four-pad hip-hop Beat School lesson on the normalized MIDI
   contract, deterministic challenge/reducer/replay pattern, and calibrated
   session clock. See `docs/BEAT_SCHOOL_ROADMAP.md`.

3. Keep the cymatics project as a sibling resonance module behind the portable
   experiment/result boundary. Begin with imported plate measurements and a
   read-only Mode Explorer; keep actuator control inside an independently tested
   local safety bridge. See `docs/CYMATICS_MODULE_INTEGRATION.md`.

4. Add a unified session-history view that reads the mission and skill ledgers alongside recognition receipts and performance evidence.

5. Add a dedicated archive study view with sorting, faceted filters, set comparison, and track-level jump targets on top of the completed full-text index.

6. Extend the now-visible recognition provenance badges across mentor interpretation, generated signals, scientific models, and saved performance evidence.

7. Extract the implemented phase behavior into a shared controller and apply it to the Journal and cockpit Next Move surface.

8. Add screenshot comparison baselines for the common app header, responsive cockpit workspaces, and instrument primitives now that their composition is stable.

9. Keep the provider layer native-app ready.
   - Web can use AudD or future AcoustID/ACRCloud adapters behind `/api/recognize`.
   - iOS can use ShazamKit behind the same normalized match contract.
   - Keep API keys and vendor details outside the UI and archive schema.

10. Expand schema validation to tracks, practice missions, and audio events before archive migration.

11. Promote the reusable Audio Lab controls into smaller component modules as Beat School and the next musician helpers arrive.

12. Preserve portable schemas and challenge definitions for a native SwiftUI/ShazamKit iOS application and a Tauri-first desktop capture spike; see `docs/PLATFORM_STRATEGY.md`.

## Recognition Adapter Contract

```js
{
  cursor: 1,
  detectedAt: "2026-05-23T00:00:00.000Z",
  observation: {
    schema: "setscope.recognition-observation",
    schemaVersion: 1,
    observationId: "observation_recognition_123",
    requestId: "recognition_123",
    sessionId: "set_session_123",
    setElapsedMs: 266000,
    outcome: "matched",
    provenance: "inference",
    provider: "audd",
    latencyMs: 824,
    retryable: false,
    audio: { durationMs: 8000, mimeType: "audio/webm", size: 48211, hasData: true }
  },
  transaction: { requestId: "recognition_123", replayed: false },
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
- Continuous web listening treats capture cadence and provider choice as adapters around the normalized match contract. A ShazamKit implementation can replace the web capture/recognize functions without replacing the transport states or archive schema.
