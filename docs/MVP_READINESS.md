# SetScope MVP Readiness

## Core Loop

The current MVP supports the essential loop:

1. Load the DJ set cockpit.
2. Detect or simulate recognition.
3. Add matches to the timeline.
4. Show confidence, provider state, BPM, key, transition, and music-history notes.
5. Flag review moments.
6. Edit metadata manually.
7. Archive, reload, copy, or export the set.
8. Track project progress in the dev journal.
9. Play Pitch Gates with generated, microphone, shared, or uploaded audio and log a practice event.
10. Play Rhythm Roulette by pulling mystery records, building a generated beat-grid loop, and logging the run.
11. Start continuous listening, choose a recognition cadence, watch session progress, and stop capture explicitly.
12. Inspect MIDI, Gamepad, HID, or demo events in MIDI Playground and save a local semantic mapping.

## Working Features

- Vinyl-first deck UI with sampler, car, and CD skins.
- Recognition Stack panel with provider status, setup state, and signal-chain HUD.
- Stub recognizer for no-token development.
- AudD adapter ready behind `AUDD_API_TOKEN`.
- Synthetic sample-audio provider test.
- Browser mic capture path with sanitized server payloads.
- Continuous live-listening transport with start/stop, 8/15/30/60-second cadence choices, session totals, abortable work, and bounded retries.
- Imported-audio BPM estimation.
- Audio event timeline for recognition and crate-tag events.
- Quick crate tags in the Track Intel panel.
- Nearby duplicate review and one-click merge for likely repeated recognition moments.
- Provider-boundary validation for normalized recognition matches.
- Timeline search and review filtering.
- Set map canvas with click-to-select.
- Track inspector with editable metadata.
- Capture log with provider/status entries.
- Set Coach readiness score with ranked next actions and creative prompts.
- DJ Mentor panel with selected-track explanation, practice mission, dig prompt, mentor-note persistence, and event drawer move cards.
- Transactional SQLite archive API with automatic legacy JSON migration.
- Full-text archive discovery across set metadata, tracks, tags, transitions, signal receipts, and practice evidence.
- Markdown-backed dev journal UI.
- Pitch Gates minigame with pitch/note/octave readout, gate scoring, demo mode, and timeline event logging.
- Rhythm Roulette minigame with pixel-art blind crate digging, mystery record pulls, producer constraints, generated sample pads, sequencer grid, crate receipt, and learning-event logging.
- Runtime QA harness for cockpit, Pitch Gates, Audio Lab, Journal, and Rhythm Roulette with screenshots, console checks, duplicate-id checks, broken-image checks, and overflow checks.
- Browser QA now covers page overflow, semantic headings, unlabeled controls, missing assets, duplicate IDs, and core cockpit event flows.
- MIDI Playground provides a normalized controller monitor, hardware census,
  deterministic demo, and local MIDI Learn.
- Cross-session Skill Constellation and resumable Practice Missions connect set
  moments to trusted learning evidence.

## MVP Gaps

- Real AudD token has not been tested in this environment yet.
- Continuous listening still needs a physical microphone and long-session battery/network test on target devices.
- Archive storage is local-only and does not yet provide sync, accounts, or conflict resolution.
- Archived sets are normalized into SetDraft V2 and full-text searchable; richer facets, sorting, and set comparison are not implemented yet.
- Transition classification is currently manual/provider-stub metadata.
- Key detection is placeholder metadata, not real audio analysis.
- Pitch Gates detects stable monophonic pitch; instrument-family classification and chord detection are later work.
- Shared computer-audio capture depends on explicit browser/OS sharing support and permission.
- iOS/ShazamKit path is designed conceptually but not implemented.

## Launch-Quality Checklist

- Keep `main` and GitHub Pages green through the complete verification suite.
- Add a real AudD token and run the Test provider workflow.
- Keep new toolbelt modules writing to the shared audio event timeline.
- Build the shared timing and semantic-input spine before Beat School or Loop
  Studio multiply input-specific code.
- Add a dedicated archive study view with facets, sorting, comparison, and direct track-level navigation.
- Add an explicit sync/export boundary before introducing accounts or cloud storage.
- Add a real transition-analysis pass.
- Extend accessibility checks as each new playable input and result state lands.
- Keep the no-horizontal-overflow and labeled-control browser audit green across every top-level surface.
- Run `npm run test:runtime` before major UI commits.
- Decide public/private repo status and license.

## Verification Commands

```bash
npm run check
npm run smoke
npm run test:runtime
```

## MVP Principle

The MVP is not "every audio toy." The MVP is a reliable audio event timeline. New tools earn their place when they detect, explain, teach, visualize, or archive something useful into that timeline.
