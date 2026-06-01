# Pitch Gates

Pitch Gates is SetScope's first playable musician helper: sing or play a single note to move an orb vertically through incoming note gates. It turns pitch perception into a quick arcade drill while feeding finished runs back into the shared audio-event timeline.

## Playable MVP

- Live monophonic pitch detection with note name, octave, frequency in Hz, and detection clarity.
- Orb-and-gate game loop with score, streak, lives, three pitch registers, and three speeds.
- A silent `Demo tone` input that follows gates automatically so the interaction is instantly testable.
- Completed rounds write a structured `instrument` performance event into SetScope's saved toolbelt timeline.

## Audio Inputs

- `Demo tone`: a generated sine wave routed silently through the detector for a no-permission trial run.
- `Mic`: vocals, guitar, bass, keys, whistle, or another nearby single-note sound through microphone permission.
- `Share audio`: a browser sharing prompt where the user explicitly chooses a tab, screen, or system-audio option offered by their browser and operating system.
- `Audio file`: a local recording or music file played into the analyzer.

## Important Browser Boundary

A web app cannot silently monitor every audio source on a computer. Capturing non-microphone playback requires the user to deliberately select and share an available source, and which system-audio choices appear varies by browser and operating system.

This is a reason to keep the audio-analysis core portable: the web prototype can prove the learning loop, and a future native app can use platform-specific capture and ShazamKit capabilities where appropriate.

## Detection Scope

Today Pitch Gates identifies the strongest stable single pitch. That is useful for singing, whistling, tuning, and isolated melodic instruments. Full songs, chords, noisy drums, and layered DJ mixes may not produce a single meaningful note.

It does not yet identify which instrument created a sound. Instrument classification will require a separate model or audio-feature pipeline and training/evaluation data; it should show confidence rather than pretend certainty.

## Next Iterations

1. Add a tuner and oscilloscope view powered by `src/audio-session.js` and `src/pitch-analysis.js`.
2. Store note hits and misses as richer practice events, not only round summaries.
3. Add guided scales, interval drills, call-and-response phrases, and vocal-range calibration.
4. Prototype instrument-family classification for clean samples, with transparent confidence.
5. Share portable pitch-analysis contracts with the future iOS app.

## Implementation Note

Pitch detection uses [Pitchy](https://github.com/ianprime0509/pitchy), bundled locally for the static browser app. The project retains a small, dependency-light frontend while avoiding a hand-written pitch detector.

The game now delegates browser source lifecycle to `src/audio-session.js`, pitch frames to `src/pitch-analysis.js`, and completed run summaries to `src/performance-events.js`. That keeps Pitch Gates focused on gameplay while making the audio pipeline reusable by the next toolbelt module.
