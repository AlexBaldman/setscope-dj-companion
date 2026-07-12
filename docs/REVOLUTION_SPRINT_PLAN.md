# SetScope Revolution Sprint

## Product Promise

SetScope turns a DJ set into a living route through music: hear a moment, understand why it worked, practice the underlying skill, and carry proof of that learning back to the exact track and transition.

The paid value is not a pile of audio toys or collectible skins. It is a trusted loop that makes the user better at hearing, remembering, and shaping music.

## Council Decision

The visual, game, music-pedagogy, and systems reviews independently converged on the same implementation order:

1. Version the learning and replay contracts.
2. Make Pitch Gates deterministic and replayable.
3. Prove one honest `Hear -> Predict -> Perform -> Transfer` lesson.
4. Replace the all-at-once cockpit with `Booth / Route / Practice / Crate`.
5. Apply the canonical Block Signal Broadcast visual world to the stable hierarchy.

This is one vertical spine, not five parallel feature projects:

```text
Audio or action input
        |
        v
Versioned FeatureFrame
        |
        v
Deterministic challenge + replay
        |
        v
PerformanceEventV2 evidence
        |
        v
Skill state + one Next Move
        |
        v
Booth / Route / Practice / Crate
        |
        v
Block Signal Broadcast world
```

## First-Session Magic

Within three minutes, a new user should be able to:

1. Hear or simulate one recognized set moment.
2. Mark it with one reaction: `Love it`, `Study it`, `What was that?`, or `Wrong match`.
3. See that moment land on the Route.
4. Accept one short practice assignment based on the moment.
5. Calibrate, predict, perform, and attempt transfer.
6. Return to the Route and see the source moment visibly changed by evidence they earned.

That changed Route is the proof of the product. The app did not merely score a game; it converted listening into understanding.

## Product World

The canonical direction is **Block Signal Broadcast**:

- **Block Signal Broadcast** supplies the world: a fictional mobile broadcast rig, neighborhood-night energy, vinyl culture, field markings, and tactile signal hardware.
- **Night Transit Control** supplies the information model: tracks are stations, transitions are routes, uncertainty is fog, practice is a branch line, and mastery clears a checkpoint.
- **Pressing Plant Field Desk** supplies the evidence language: captured matches, run results, provenance, and archived sets become labels, stamps, sleeves, and receipts.

The design borrows craft principles, not protected expression. It must not copy characters, logos, exact game screens, hardware faceplates, trade dress, or identifiable artist styles.

## Sprint 1: Contract Spine

**Goal:** make every future run portable, inspectable, migratable, and safe to persist.

Deliver:

- `FeatureFrameV1` with explicit units, sequence, capture time, production time, analyzer version, confidence, and typed features.
- `ChallengeDefinitionV1` with stable identity, version, seed, targets, timing windows, skill ids, difficulty, and accessibility parameters.
- `ReplayV1` with ordered timestamped actions and consumed feature evidence.
- `PerformanceEventV2` separating observation, inference, player result, assistance, calibration, and track context.
- A versioned persistence envelope and non-destructive V1 compatibility adapter.
- Runtime validators, malformed-data quarantine, and golden JSON round-trip fixtures.

Primary modules:

- `src/performance-events.js`
- `src/pitch-analysis.js`
- `src/state.js`
- `server/archive-store.mjs`
- New `src/contracts/` and `src/migrations/`

Acceptance:

- Existing drafts and V1 events still load and render.
- Unknown or malformed versions cannot crash or silently become demo data.
- Demo and assisted runs are explicitly ineligible for mastery evidence.
- Every timestamp states its clock and unit.

Estimate: 1.5-2.5 focused CC days.

Do not bundle SQLite, cloud sync, raw-audio storage, or speculative schemas for unbuilt analyzers.

## Sprint 2: Deterministic Pitch Gates

**Goal:** establish the gameplay architecture every future challenge must follow.

Deliver:

- A pure reducer with `createRun`, `applyInput`, `advanceTo`, and `finishRun` operations.
- A specified seeded random generator and versioned challenge generation.
- An audio-clock input boundary; render frames interpolate but never decide musical timing.
- Explicit `hit`, `near`, `miss`, `recovery`, and `complete` domain events.
- Replay fixtures that produce identical score, event stream, and final-state hashes.
- A thin browser controller preserving demo, microphone, file, and shared-audio paths.

Primary modules:

- Split `src/pitch-gates.js` into reducer, challenge, replay, view, and page-controller modules.
- `src/audio-session.js`
- `src/pitch-analysis.js`
- `scripts/` deterministic and replay tests.

Acceptance:

- Reducer code has no DOM, Canvas, Web Audio, storage, wall clock, or `Math.random()` dependency.
- Identical challenge, seed, and input trace produce identical results.
- Results remain stable under simulated 30, 60, and 120 Hz rendering and dropped frames.
- Pause/resume, stale frames, lost input, tolerance boundaries, and completion are tested.
- Current browser interactions remain playable.

Estimate: 3-4 focused CC days.

Do not bundle new levels, multiplayer, MIDI, a generalized plugin framework, ECS, Rust/WASM, or a second minigame.

## Sprint 3: Honest Learning Slice

**Goal:** prove SetScope teaches one real skill without confusing activity, detector confidence, or combo score with learning.

Deliver:

- A quick calibration for input route, usable range, signal dropout, and latency confidence.
- One small skill model: `pitch-center`, `stable-hold`, and `anticipation`.
- An explicit `Hear -> Predict -> Perform -> Transfer` state machine.
- Craft Score for immediate game feel and separate Learning Evidence for durable progress.
- Mastery states: `introduced`, `practiced`, `demonstrated`, and `transferred`, each with evidence count and uncertainty.
- One deterministic `NextMove` policy returning a single action, reason, duration, destination, and fallback.
- Recovery after failure; partial evidence is retained when musically useful.

Primary modules:

- New `src/learning/` modules for calibration, session, mastery, and next move.
- `src/practice-context.js`
- `src/dj-mentor.js`
- `src/set-coach.js`
- `src/performance-events.js`
- Pitch Gates UI and tests.

Acceptance:

- A first-time user completes the loop without documentation.
- Prediction is recorded before corrective feedback appears.
- Transfer changes a meaningful challenge dimension and is never inferred from a single assisted run.
- Low signal confidence reduces evidence confidence rather than lowering the learner's score.
- A miss produces one causal cue and one recovery rep.
- Identical evidence always yields the same Next Move and explanation.

Estimate: 3-4 focused CC days.

Do not bundle generative coaching, global course catalogs, leaderboards, streak pressure, notifications, or mastery models for every tool.

## Sprint 4: Four-Space Product Shell

**Goal:** turn the prototype collection into one legible product while preserving every working workflow.

### Booth

Live listening, current track, confidence, elapsed Route, four reaction actions, and one Next Move. Provider health appears only on fault. No archive, metadata editor, scores, developer controls, or celebratory audio.

### Route

The set journey is the primary navigation surface. Tracks are stops, transitions are lines, energy changes are landmarks, review items are fog or hazards, and practice evidence clears checkpoints.

### Practice

Current assignment, calibration, learning phase, mastery evidence, available tools, and recent results. Pitch Gates, Rhythm Roulette, and Audio Lab remain distinct activities inside one training broadcast.

### Crate

Saved sets, tracks, tags, move cards, evidence history, notes, exports, and taste development. The Dev Journal leaves player navigation and remains a development-only route.

Structural decisions:

- Replace separate Set Pulse, Set Coach, and DJ Mentor panels with one `Next Move` layer.
- Combine Capture Log and Toolbelt Events into one chronological evidence stream.
- Combine track story, practice, and metadata into one inspector with `Story / Practice / Details` tabs.
- Move provider diagnostics, manual sorting, archive management, and secondary filters into drawers or their owned spaces.
- Implement the new shell progressively; do not delete legacy render paths before parity tests pass.

Acceptance:

- Every current capability has one documented owner.
- Four URL-addressable spaces preserve selected set, track, event, and practice-return context.
- Mobile never degrades into one enormous all-at-once dashboard.
- The primary action appears in the first viewport.
- Listening, recognition, review, edit, tagging, practice launch/return, event reassignment, archive, copy, and export all pass end to end.

Estimate: 3-5 focused CC days.

Do not bundle a framework migration, backend rewrite, account system, social features, collaboration, or complete archive search.

## Sprint 5: Block Signal Broadcast Finish

**Goal:** make the stable product hierarchy unmistakably SetScope.

Deliver:

- Shared semantic tokens for signal, tempo, source, review, practice, evidence, and uncertainty.
- Material roles: vinyl black for playback, flight case for shell, smoked screen for live instruments, label stock for evidence, and thermal paper for receipts.
- A unified type, spacing, radius, icon, focus, and motion system.
- Three motion verbs: `tune` for live signal, `stamp` for saved evidence, and `route` for timeline movement.
- Deterministic fictional sleeves and record labels from modular geometry, catalog ids, era motifs, and controlled two-color overprints.
- Pixel scenes only for places and play: booth, record shop, rehearsal room, radio desk, and loading dock.
- An asset manifest with stable ids, dimensions, hashes, platform variants, rights/source metadata, and accessibility policy.

Acceptance:

- Booth reads as broadcast control, Route as transit information, Practice as signal training, and Crate as pressing-plant evidence without becoming four unrelated brands.
- Every state remains distinguishable without color alone.
- Live readouts target 7:1 contrast; all normal text and controls meet WCAG AA.
- Every target is at least 44px where touch is expected.
- Reduced motion stops every nonessential loop.
- Canvas information has semantic DOM summaries.
- 320, 390, 768, 1024, and 1440px visual regression passes show no overlap, clipping, hidden commands, or horizontal overflow.

Estimate: 2.5-4 focused CC days for the foundational pass. Illustration production continues after the release spine is stable.

Do not bundle multiple skins, 3D hardware, ornamental controls, a marketplace, a marketing site, or a complete illustration library.

## Production Gates

The sprint is not production-ready until all of these are true:

### Trust

- Existing data migrations are reversible and fixture-tested.
- Recognition confidence, analyzer confidence, and learner evidence are separate concepts.
- Raw microphone audio is never retained without explicit opt-in.
- Provider, permission, and corrupted-data errors state the problem, likely cause, and recovery.

### Feel

- Mic-to-pitch feature age is under 60ms p95 on target hardware.
- Input-to-visual response is under 50ms p95.
- Main-thread work remains under 8ms p95 during play, with no tasks over 50ms.
- Rhythm Roulette moves from timer-defined notes to audio-clock lookahead scheduling before it is marketed as a timing tool.

### Quality

- Unit tests cover reducers, contracts, migrations, mastery, and Next Move.
- Golden replays cover deterministic behavior and future JavaScript/Swift conformance.
- Playwright covers the complete first-session magic loop and legacy workflow parity.
- Real-device QA covers microphone permission, route changes, source switching, backgrounding, interruption, and low-performance devices.
- Accessibility QA covers keyboard, screen reader summaries, high contrast, reduced motion, one-handed use, and adjustable timing windows.

### Commercial Proof

- First meaningful moment occurs within three minutes.
- At least 70% of guided-demo users complete the first learning loop.
- At least 40% voluntarily start a second practice rep.
- Users can explain one musical thing they learned after the session.
- Returning users can find prior evidence and resume a recommended rep without searching.

Payment infrastructure comes after this value proof. The initial paid promise should be the personal set-learning archive, not cosmetic scarcity.

## Explicitly Deferred

- New minigames, including Needle Drop Rescue.
- Full Ear / Hands / Crate campaign trees.
- AI-authored coaching.
- Social profiles, leaderboards, multiplayer, and collaboration.
- SQLite, cloud sync, and account infrastructure.
- Electron/Tauri selection and native desktop capture.
- SwiftUI implementation beyond a golden-replay conformance spike.
- ShazamKit integration beyond preserving the normalized adapter contract.
- Collectible rig skins and a large illustration catalog.
- Chord recognition, instrument classification, beat tracking, and polyphonic pitch.

## Execution Shape

Estimated focused implementation: 13-19 CC working days plus real-device audio QA.

This should run as one coordinated program with verified checkpoints, not one giant commit:

1. Contract spine and migrations green.
2. Deterministic Pitch Gates and golden replay green.
3. Honest learning loop green.
4. Four-space shell at feature parity.
5. Canonical visual finish and production QA.

Each checkpoint must keep `npm run check`, `npm run smoke`, and `npm run test:runtime` green. No later phase earns permission to conceal a broken earlier phase.

## Decision Audit

| Decision | Classification | Why |
| --- | --- | --- |
| Build one vertical spine rather than parallel feature work | Mechanical | All disciplines identified fragmentation as the central product risk. |
| Contracts and deterministic play precede the visual overhaul | User-impact | Styling unstable hierarchy would create expensive rework and preserve weak learning claims. |
| Block Signal Broadcast is the canonical world | Taste | It best unifies vinyl, street culture, pixel places, and useful signal hardware without becoming a novelty skin. |
| Booth / Route / Practice / Crate replace the dashboard model | Product | The existing mobile and desktop hierarchy exposes too many equal-priority systems. |
| One Next Move replaces competing Coach and Mentor action lists | Product | Direction is more valuable than simultaneous advice. |
| Pitch Gates proves the engine before any new minigame | Engineering | A second game would duplicate unstable scoring and timing assumptions. |
| Craft Score and Learning Evidence remain separate | Trust | Detector confidence, spectacle, and mastery answer different questions. |
| Payment follows demonstrated learning value | Commercial | Monetizing before the magic loop is proven optimizes the wrong bottleneck. |
