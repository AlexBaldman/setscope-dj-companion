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

## Working Features

- Vinyl-first deck UI with sampler, car, and CD skins.
- Recognition Stack panel with provider status, setup state, and signal-chain HUD.
- Stub recognizer for no-token development.
- AudD adapter ready behind `AUDD_API_TOKEN`.
- Synthetic sample-audio provider test.
- Browser mic capture path with sanitized server payloads.
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
- File-backed archive API.
- Markdown-backed dev journal UI.
- Pitch Gates minigame with pitch/note/octave readout, gate scoring, demo mode, and timeline event logging.
- Browser QA now covers page overflow, semantic headings, unlabeled controls, missing assets, duplicate IDs, and core cockpit event flows.

## MVP Gaps

- Real AudD token has not been tested in this environment yet.
- Archive storage is JSON-file based and should move to SQLite before heavy use.
- Archived set and audio-event payloads are not schema-validated yet.
- Transition classification is currently manual/provider-stub metadata.
- Key detection is placeholder metadata, not real audio analysis.
- Pitch Gates detects stable monophonic pitch; instrument-family classification and chord detection are later work.
- Shared computer-audio capture depends on explicit browser/OS sharing support and permission.
- iOS/ShazamKit path is designed conceptually but not implemented.

## Launch-Quality Checklist

- Authenticate GitHub CLI and push the repo.
- Add a real AudD token and run the Test provider workflow.
- Keep new toolbelt modules writing to the shared audio event timeline.
- Extract shared real-time audio input plumbing before adding tuner and visualizer modules.
- Expand schema validation to archived sets and audio events.
- Add SQLite archive storage.
- Add a real transition-analysis pass.
- Add basic accessibility checks for keyboard focus and reduced motion.
- Keep the no-horizontal-overflow and labeled-control browser audit green across every top-level surface.
- Decide public/private repo status and license.

## Verification Commands

```bash
node --check server.mjs
node scripts/check.mjs
node scripts/provider-contract.test.mjs
node scripts/smoke-api.mjs
```

## MVP Principle

The MVP is not "every audio toy." The MVP is a reliable audio event timeline. New tools earn their place when they detect, explain, teach, visualize, or archive something useful into that timeline.
