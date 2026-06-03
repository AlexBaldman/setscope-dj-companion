# Audio Lab

Audio Lab is SetScope's first Listening Lab tool: a compact tuner and oscilloscope powered by the same audio foundation as Pitch Gates.

## Playable MVP

- Generated demo tone, microphone, explicitly shared audio, and local audio-file inputs.
- Live note, MIDI, frequency, clarity, cents-to-target, and target-note readout.
- Oscilloscope trace drawn from the active Web Audio analyser.
- Scope gain, time scale, and freeze controls.
- Tuner target selection with a 2-second stable-hold meter.
- Snapshot logging into the shared audio-event timeline as structured `analysis` metadata.

## Why It Matters

Pitch Gates proved the musical-game loop. Audio Lab proves the shared audio foundation can support a second, practical utility surface. That makes the toolbelt real: one source session can feed games, tuners, scopes, note finders, and future native adapters.

## Next Iterations

1. Add saved scope markers and frozen trace export.
2. Add alternate tuner temperaments and instrument presets.
3. Add a spectrogram lane once frequency-bin analysis is introduced.
4. Let snapshots attach to a selected track or set timestamp.
