# Adaptive Practice Spine

SetScope's musician tools share one local, portable Musician Profile instead of inventing separate difficulty settings.

## Learning Loop

1. **Calibrate**: establish a comfortable center from one stable monophonic pitch.
2. **Hear**: hold the center accurately in Audio Lab.
3. **Predict**: hear the target internally before producing it.
4. **Perform**: complete an easy Pitch Gates pass.
5. **Diagnose**: use direction, clarity, and misses to identify the problem.
6. **Prescribe**: repeat a smaller neighboring-note exercise.
7. **Transfer**: apply the skill to an instrument, track, or set mission.

The current prescription is deterministic and intentionally modest. Calibration, stable locks, completed sessions, and recent accuracy choose the next stage. It is not an AI claim about ability or musicianship.

## Musician Profile V1

`src/contracts/musician-profile.js` defines the portable profile:

- profile identity and revision
- comfortable center MIDI note
- estimated or separately confirmed low and high practice bounds
- detector stability and clarity floor
- calibration method, source, clarity, and timestamp
- completed sessions, stable locks, latest accuracy, and latest mode

The browser stores the profile under `setscope-musician-profile-v1`. Existing personal Pitch Gates centers migrate automatically. A future SwiftUI app can serialize the same contract and feed it with a native audio engine.

## Calibration Boundary

One held note does not reveal a person's complete vocal or instrumental range. Center calibration labels its first result an **estimated safe span** and places five semitones on either side. Audio Lab can then replace each estimate with a separately performed comfortable low and high note. The range is labeled confirmed only after both boundaries pass clarity, ordering, and distance checks.

The current V2 calibration collects:

- comfortable center
- separately captured low and high notes
- clarity and timestamp at each boundary
- source type and input conditions
- user confirmation that the range feels physically comfortable

Range exercises should never encourage strain. The product should prefer a smaller comfortable span over a nominally impressive one.

## Current Integration

- Pitch Gates can calibrate from its stabilized live frame and uses the profile as its personal center.
- Audio Lab loads the same center and estimated span, captures confirmed low/high boundaries, exposes five generated tuner targets, and advances the profile after stable locks.
- Pitch Gates records signed distance for every voiced landing and classifies a run as centered, high, low, mixed, or mostly silent.
- Pitch Gates run evidence stores profile revision, accuracy, diagnosis, and practice stage.
- Audio Lab snapshots store profile revision and practice stage.
- Runtime QA proves calibration survives navigation and advances across tools.
