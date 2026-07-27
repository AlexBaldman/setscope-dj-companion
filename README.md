# SetScope

SetScope is a local-first DJ set companion and musician toolbelt. It turns a listening session into a searchable timeline, then routes discoveries into playful practice tools:

- timestamped track timeline
- current-track recognition state
- BPM/key/transition metadata
- search and review triage for uncertain matches
- clickable set map for tempo movement, track entries, and review flags
- API status indicator and provenance-labeled signal receipts
- editable musician and set notes
- provenance-labeled context cards for era, lineage, texture, source, and transition logic
- local set archive with JSON export
- transactional SQLite archive for saved sets
- indexed archive search across tracks, artists, tags, transitions, signals, and practice evidence
- one-click human-readable setlist copy
- imported-audio BPM estimation
- markdown-backed dev journal with page-turn UI and paper skins
- AudD-ready provider adapter with local stub fallback
- recognition diagnostics and sample-audio provider test workflow
- continuous, cancellable listening sessions with replay-safe recognition requests
- Pitch Gates, a deterministic singing game with comfort controls and replay evidence
- Audio Lab, a tuner and oscilloscope with practice locks and track-aware snapshots
- shared musician calibration and adaptive practice guidance across Pitch Gates and Audio Lab
- Rhythm Roulette, a deterministic blind-crate sequencer with portable run replays
- responsive Signal, Timeline, and Intel workspaces for phone, tablet, and desktop

Run it locally:

```bash
npm run dev
```

Then open `http://127.0.0.1:5173`.

The shared tool rack opens Pitch Gates, Audio Lab, Rhythm Roulette, and the Dev Journal. Microphone, an audio file, an internal demo source, or explicitly shared browser/system audio can drive supported tools.

The app can still be opened directly from `index.html`, but the recognition demo uses the local API server.

## GitHub Pages

The public static build is deployed from `main` by `.github/workflows/pages.yml`. Build and verify it locally with:

```bash
npm run test:pages
```

GitHub Pages runs in an explicit Demo mode. Audio instruments, games, timeline editing, archive search, and the journal remain usable; archives and journal edits are stored in that browser. Live AudD recognition, shared SQLite persistence, and server-backed journal files remain available through `npm run dev`.

For live web recognition, create a local `.env` with:

```bash
AUDD_API_TOKEN=your_token_here
AUDD_RETURN=apple_music,spotify
AUDD_TIMEOUT_MS=10000
```

Without a token, SetScope uses the clearly labeled local demo recognizer so the full product loop remains usable. Recognition requests stream bounded binary audio, carry durable IDs, explicit outcomes, set-relative timing, and provenance; provider failures do not create fake tracks.

## Visual Direction

The MVP should be vinyl-first: a modern record-listening cockpit with a dominant platter, tonearm, groove rings, bright label art, timestamped track cards, and tactile controls that feel like real music hardware. Vinyl gives the product a clear center of gravity and fits the crate-digging, hip-hop, funk, soul, and pop-culture discovery angle.

Future skins can remix other classic devices without replacing the core product:

- **Sampler**: MPC/SP-style pads, sample-bank colors, chunky cue buttons, pattern-grid moments.
- **Car stereo**: equalizer bands, glowing preset buttons, tape deck slots, dashboard meters.
- **CD era**: jewel-case shine, jog wheels, skip counters, anti-skip/player status details.

These should act as collectible interface skins around the same set timeline and recognition engine.

## MVP Shape

The first production version should separate the app into five services:

1. **Audio capture**
   - Browser mic capture, uploaded recordings, livestream audio where allowed.
   - Slice short windows every 10-20 seconds.

2. **Recognition**
   - Pluggable provider: ACRCloud, AudD, MusicBrainz/AcoustID, or a custom Chromaprint-style backend.
   - Store provider confidence and raw response for auditing.
   - Current local stub: `POST /api/recognize`.

3. **Analysis**
   - BPM estimate per track and rolling BPM across the set.
   - Transition classifier using overlap, energy slope, tempo change, and spectral similarity.
   - Later: key detection, phrase alignment, cue point detection, and drop/build moments.

4. **Music intelligence**
   - Artist, label, release date, aliases, samples/interpolations, genre lineage, nearby tracks.
   - AI-generated summaries should cite source data and keep factual claims separate from inferred commentary.

5. **Set archive**
   - Store one row per detected set moment.
   - Let users correct matches, merge duplicates, tag transitions, and export/share setlists.

## Data Model

```json
{
  "set": {
    "id": "set_123",
    "title": "DJ Jazzy Jeff study notes",
    "source": "livestream | mic | upload | url",
    "startedAt": "2026-05-03T20:00:00-04:00"
  },
  "tracks": [
    {
      "id": "track_moment_1",
      "timestamp": "04:26",
      "title": "Palm Trees At Noon",
      "artist": "The Lowpass District",
      "bpm": 96,
      "key": "9A",
      "transition": "Loop tease",
      "confidence": 0.87,
      "provider": "demo",
      "notes": "AI/context notes for this moment."
    }
  ]
}
```

## Architecture Direction

The current production path is a Signal Receipt: capture, recognize, commit one replay-safe observation, disclose provenance, and route the result into one useful next move. The server keeps secrets out of the browser, bounds binary payloads, applies provider deadlines, stores recent recognition transactions in SQLite, and normalizes vendor responses behind a versioned portable contract suitable for a future ShazamKit adapter.

Raw browser audio remains ephemeral and is never written to the ledger. Legacy JSON recognition transactions and archived sets migrate automatically into one shared SQLite database. Recognition receipts and complete SetDraft V2 archives retain separate contracts and tables while sharing a durable local transaction boundary.

## Local API

- `GET /api/health`: confirms the local server is running.
- `GET /api/providers/diagnostics`: checks provider setup without sending audio.
- `POST /api/recognize`: accepts bounded binary audio plus `x-setscope-*` receipt metadata and returns an explicit recognition observation plus normalized match when available.
- `POST /api/analyze`: returns basic set summary data from submitted tracks.
- `GET /api/sets`: lists archived sets.
- `GET /api/sets?q=...`: searches archived sets and returns concise matching-evidence clues.
- `POST /api/sets`: transactionally saves or updates an archived SetDraft V2 in `data/setscope.sqlite`.
- `GET /api/sets/:id`: loads one archived set.
- `GET /api/journal`: loads `docs/DEV_JOURNAL.md`.
- `POST /api/journal`: saves edited journal markdown.

The frontend and backend share demo recognition data from `src/fixtures.js`, which keeps the mock provider and UI defaults aligned. Real provider results are normalized through the server adapter layer before reaching the UI.

## Dev Journal

Progress is tracked in `docs/DEV_JOURNAL.md`.

Open `http://127.0.0.1:5173/journal.html` to view and edit it through the journal UI. The current journal prototype supports:

- Notebook, graph, and sketch paper skins.
- Page-turn animation between entries.
- Entry editing.
- Markdown source editing.
- Entry reordering.

Run the complete local verification suite with:

```bash
npm run check
npm run smoke
npm run test:runtime
```

The runtime suite starts the current server on an ephemeral port, exercises every surface in Chromium, checks responsive overflow and first-viewport actions, and writes screenshots to a temporary artifact directory. GitHub Actions runs the same suite on pushes and pull requests.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current architecture audit and recommended refactor path. See [docs/UI_CREATIVE_DIRECTION.md](docs/UI_CREATIVE_DIRECTION.md) for the visual direction board.
See [docs/MVP_READINESS.md](docs/MVP_READINESS.md) for the MVP checklist, [docs/AUDIO_TOOLBELT_ROADMAP.md](docs/AUDIO_TOOLBELT_ROADMAP.md) for the larger toolbelt vision, and [docs/GITHUB_PUBLISHING.md](docs/GITHUB_PUBLISHING.md) for GitHub setup.
See [docs/PITCH_GATES.md](docs/PITCH_GATES.md) for minigame inputs, browser audio boundaries, and the note/instrument roadmap.
See [docs/ADAPTIVE_PRACTICE.md](docs/ADAPTIVE_PRACTICE.md) for the shared Musician Profile and learning loop.
See [docs/ARCADE_LAB_ROADMAP.md](docs/ARCADE_LAB_ROADMAP.md) for the multi-minigame control system and next playable modes.
See [docs/PLATFORM_STRATEGY.md](docs/PLATFORM_STRATEGY.md) for the native iOS and desktop packaging recommendation.
See [docs/MIDI_IDEA_BANK.md](docs/MIDI_IDEA_BANK.md) for the device-first MIDI Playground, Alex's hardware compatibility matrix, and the long-range music/game/geometry inspiration bank.

## Product Priorities

The highest-leverage loop is:

1. Detect a track.
2. Put it into the set timeline with confidence.
3. Flag uncertain moments for review.
4. Enrich the moment with music-history context.
5. Let the user correct, tag, and export the set.

That loop should stay fast, tactile, and fun before adding heavier social features.
