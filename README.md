# SetScope

SetScope is a browser prototype for a DJ set watching companion. It captures the core product shape:

- timestamped track timeline
- current-track recognition state
- BPM/key/transition metadata
- search and review triage for uncertain matches
- clickable set map for tempo movement, track entries, and review flags
- API status indicator and recognition capture log
- editable musician and set notes
- music DNA cards for era, lineage, texture, source, and transition logic
- local set archive with JSON export
- file-backed API archive for saved sets
- one-click human-readable setlist copy
- imported-audio BPM estimation
- markdown-backed dev journal with page-turn UI and paper skins
- AudD-ready provider adapter with local stub fallback
- recognition diagnostics and sample-audio provider test workflow

Run it locally:

```bash
npm run dev
```

Then open `http://127.0.0.1:5173`.

The app can still be opened directly from `index.html`, but the recognition demo uses the local API server.

For live web recognition, create a local `.env` with:

```bash
AUDD_API_TOKEN=your_token_here
AUDD_RETURN=apple_music,spotify
```

Without a token, SetScope uses the local demo recognizer so the full product loop remains usable.

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

## Next Build Steps

The next useful milestone is a real recognizer bridge:

- Add a small backend so API keys never live in the browser.
- POST 12-second audio windows from the browser.
- Send fingerprints to a recognition provider.
- Normalize matches into the track schema.
- Update the timeline automatically as the set plays.

## Local API

- `GET /api/health`: confirms the local server is running.
- `GET /api/providers/diagnostics`: checks provider setup without sending audio.
- `POST /api/recognize`: returns one realistic recognition match from the stub provider.
- `POST /api/analyze`: returns basic set summary data from submitted tracks.
- `GET /api/sets`: lists archived sets.
- `POST /api/sets`: saves or updates an archived set in `data/sets.json`.
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

Run checks with:

```bash
npm run check
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current architecture audit and recommended refactor path. See [docs/UI_CREATIVE_DIRECTION.md](docs/UI_CREATIVE_DIRECTION.md) for the visual direction board.
See [docs/MVP_READINESS.md](docs/MVP_READINESS.md) for the MVP checklist, [docs/AUDIO_TOOLBELT_ROADMAP.md](docs/AUDIO_TOOLBELT_ROADMAP.md) for the larger toolbelt vision, and [docs/GITHUB_PUBLISHING.md](docs/GITHUB_PUBLISHING.md) for GitHub setup.

## Product Priorities

The highest-leverage loop is:

1. Detect a track.
2. Put it into the set timeline with confidence.
3. Flag uncertain moments for review.
4. Enrich the moment with music-history context.
5. Let the user correct, tag, and export the set.

That loop should stay fast, tactile, and fun before adding heavier social features.
