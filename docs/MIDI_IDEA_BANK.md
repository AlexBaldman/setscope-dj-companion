# SetScope MIDI Idea and Inspiration Bank

## Purpose

MIDI can make SetScope a bridge between listening, playing, producing, learning,
and performing. This bank separates buildable product ideas from speculative
visual metaphors so the strange ideas can stay strange without being mistaken
for scientific claims.

This is a synthesis through expert lenses, not a claim that the named professions
or any specific living person formally reviewed the product.

## Ground Truth

- MIDI carries performance and control events, not audio. It can describe notes,
  velocity, controllers, cues, clock, and device-specific messages, but it cannot
  identify a song or hear an instrument by itself.
- Web MIDI can enumerate ports and send or receive timestamped messages, but it
  requires a secure context and explicit permission. It is not available in every
  major browser, so MIDI must remain a progressive enhancement.
- System Exclusive access is a stronger permission with additional security risk.
  SetScope should not request it for the first MIDI release.
- MIDI 2.0 extends rather than replaces MIDI 1.0. Its useful long-term ideas are
  higher-resolution control, per-note expression, Universal MIDI Packets,
  capability inquiry, Profiles, and Property Exchange.
- Apple CoreMIDI supports hardware, network, Bluetooth LE MIDI, Universal MIDI
  Packets, and protocol translation. This makes native iOS a stronger universal
  MIDI host than the browser alone.

Primary references:

- [W3C Web MIDI API](https://www.w3.org/TR/webmidi/)
- [MDN Web MIDI API and compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [MIDI Association MIDI 2.0 overview](https://midi.org/midi-2-0)
- [MIDI 2.0 state and Profiles, February 2026](https://midi.org/the-state-of-midi-2-0-high-resolution-performance-and-the-rise-of-profiles-update-feb-2026)
- [Apple Core MIDI](https://developer.apple.com/documentation/coremidi)
- [Apple: Incorporating MIDI 2 into apps](https://developer.apple.com/documentation/coremidi/incorporating-midi-2-into-your-apps)

## Product Principles

1. Make a connected instrument useful within ten seconds.
2. Learn a player's intent before asking them to understand MIDI terminology.
3. Show every mapping and make undo immediate.
4. Keep performance level separate from evidence confidence.
5. Treat assisted, generated, and human-played input honestly.
6. Let one physical gesture work across games when its meaning is stable.
7. Use MIDI to deepen real musicianship, not merely to decorate the screen.
8. Preserve keyboard, touch, voice, and pointer play for people without hardware.
9. Record normalized musical gestures, not device-specific accidents.
10. Keep timing on the audio clock and presentation on the animation clock.

## Expert Lens Observations

### DJ and Turntablist

- A controller should mark track entry, phrase, drop, breakdown, and transition
  events without forcing the DJ to touch the screen.
- Crossfader and channel-fader curves can become transition evidence. A hard cut,
  long blend, echo handoff, and transform pattern have distinct gesture shapes.
- MIDI clock can align set notes to bars and beats when a deck or DAW provides it.
- Hot cues can become annotated memory anchors rather than anonymous numbers.
- A performance replay should show musical intent, not a surveillance log of every
  knob twitch.
- Footswitch capture is valuable because both hands may already be occupied.
- A "What just happened?" pad could save the previous 16 or 32 bars of metadata,
  recognition results, and control gestures.

### Beatmaker and Producer

- Rhythm Roulette should accept pad controllers with automatic 4x4 mapping.
- Velocity should affect timbre, gain, scoring nuance, and visual weight.
- Knobs can control sample start, filter, swing, decay, and humanization.
- A blind mapping mode can hide sample identity while preserving pad location,
  making the physical controller part of the crate-digging ritual.
- A groove fingerprint can compare timing offsets without calling one feel
  universally correct.
- A MIDI clip exported from a challenge should preserve the player's choices,
  challenge seed, BPM, and provenance.
- Hardware-generated notes should be separable from Auto Flip notes in replays.
- Program Change can switch era-inspired instrument rooms or performance skins.

### Keyboard Teacher

- Pitch Gates can offer a keyboard mode where the player hears, predicts, then
  plays the target.
- Separate note recognition, interval recognition, fingering, velocity control,
  and timing. They are related but not interchangeable skills.
- Highlight comfortable hand position before speed.
- Chord gates can begin with shell voicings and guide tones before dense harmony.
- A voice-plus-keyboard mode can test whether the learner can sing a note before
  locating it physically.
- The app can transpose a mission while preserving interval relationships.
- Sustain-pedal use should be taught as phrasing and clarity, not a binary penalty.

### Drummer and Rhythm Teacher

- Pads should support subdivision gates, backbeat locks, rudiment call-and-response,
  and limb-independence patterns.
- Timing feedback should show early/late distributions over several hits instead
  of shaming one imperfect strike.
- Polyrhythm mode can let two pad colors represent 3:2, 4:3, or 5:4 cycles.
- Euclidean rhythm puzzles can teach distribution and rotation through direct play.
- Accent accuracy and dynamic contour deserve separate skill nodes.
- A metronome can progressively remove beats to test internal pulse.
- Latency calibration must happen before fine timing is graded.

### Guitar, Bass, Wind, and String Teachers

- MIDI guitars, wind controllers, pickups, and pitch-to-MIDI systems have different
  tracking behavior; the app should expose confidence and avoid one universal
  threshold.
- Breath and expression controllers can make phrasing visible as continuous shape.
- Fretboard and fingerboard views can project the same interval mission into an
  instrument-specific geometry.
- Pitch bend should distinguish expressive intent from inaccurate intonation.
- Practice can alternate performed audio with MIDI note intent to reveal where
  tracking, fingering, and sounding pitch disagree.
- One-note drones and guide tones can support intonation without turning the
  exercise into a tuner stare-down.

### Game Designer

- Every mapping should produce an immediate toy-like response before a lesson
  begins.
- Difficulty can vary target width, rhythmic density, required velocity, hand
  travel, memory length, or simultaneous controls.
- Boss encounters can combine listening, a short performance phrase, and a final
  production choice.
- MIDI Learn itself can be a game: touch the control that feels like "filter,"
  "lift," "danger," or "space," then let the interface adapt.
- Hardware identity should unlock cosmetic badges only when privacy-safe; skill
  progression should never depend on owning expensive gear.
- Cooperative play can assign melody, rhythm, expression, and scene control to
  different devices.
- A Fahrenheit-style rescue sequence can use chords, pads, faders, and expression
  gestures as distinct verbs rather than arbitrary button prompts.

### Accessibility Specialist

- Support one-switch scanning, foot controls, breath, large pads, and one-handed
  layouts.
- Let any note or CC become an action through MIDI Learn.
- Provide velocity normalization for players with limited force range.
- Offer hold, toggle, latch, and repeated-trigger interpretations per control.
- Never encode success through color alone.
- Haptic and screen-flash cues should be adjustable independently of sound.
- Avoid requiring fast device changes during timed play.

### Music-Theory and Mathematics Professor

- The circle of fifths can become a navigable map driven by notes or a rotary
  encoder.
- A Tonnetz can show common-tone movement and economical voice leading.
- Interval vectors can become spatial moves that remain identical across keys.
- A Rubik-like chord cube can teach inversion, function, and voice leading: rotate
  one dimension while holding common tones.
- Euclidean rhythms provide a clear bridge between modular arithmetic and groove.
- Polyrhythm visualizers can display least common multiples as reunion points.
- Temperament mode can compare equal temperament, just intervals, and historical
  tunings without declaring one universally superior.
- Fourier building blocks can connect waveform composition to timbre, while MIDI
  controls amplitudes and phases.
- Markov or probabilistic systems should expose their rules so generation becomes
  learnable composition rather than a magic button.

### Cymatics, Acoustics, and Sonic-Geometry Lens

- Chladni figures, Lissajous curves, standing-wave nodes, and harmonic lattices are
  powerful visual metaphors when accurately labeled.
- MIDI can control the parameters of a simulated visualization, but it does not
  measure physical cymatic behavior.
- An interval can drive a rational-frequency Lissajous figure so consonance and
  periodic reunion become visible.
- A harmonic-series tower can let each played note illuminate partials and shared
  overtones.
- A phase-cancellation puzzle can teach polarity and delay with safe synthesized
  signals.
- A room-mode sandbox can visualize idealized dimensions while clearly stating
  that real rooms require measurement.
- "Sacred geometry" skins can be treated as cultural and artistic interpretations,
  not evidence of hidden physical laws.

### Synth Designer and Electronic-Instrument Historian

- Device Profiles and user mappings can make a controller feel native without
  forcing one fixed layout.
- A synth museum can teach signal flow through playable approximations inspired by
  eras and synthesis methods, while avoiding copied trade dress and protected
  branding.
- Per-note expression can bend individual stars, gates, or geometry rather than
  moving an entire chord as one block.
- Patch morph challenges can ask a learner to move from "brass" to "glass" using
  a small constrained parameter set.
- Property Exchange could eventually help describe devices and parameters, but
  MIDI 1 mappings must remain first-class.
- A controller's physical limitations can become creative constraints instead of
  compatibility failures.

## Feature Bank

### Set Companion

1. One-button MIDI marker for track, drop, phrase, break, and surprise.
2. Footswitch "What was that?" retrospective marker.
3. MIDI-clock-aligned set timeline with bar and beat coordinates.
4. Crossfader gesture transition classifier with manual confirmation.
5. Controller-driven quick tags and confidence review.
6. Hot-cue annotation importer.
7. Program Change skin switching by set era.
8. LED feedback for recognition confidence and review status.
9. Tactile unknown-track queue navigation.
10. A physical Next Move button that launches the recommended mission.
11. Set-map scrubbing from a jog wheel or endless encoder.
12. Performance bookmarks carrying the prior few seconds of control history.

### Pitch Gates and Ear Training

13. MIDI keyboard input mode.
14. Hear-sing-play three-stage interval missions.
15. Chord-quality gates.
16. Guide-tone landing missions.
17. Velocity corridor gates.
18. Aftertouch sustain tunnels.
19. MPE pitch-bend obstacle curves.
20. Scale-degree mode independent of key.
21. Fretboard projection for MIDI guitar.
22. Breath-shape phrasing gates.
23. Pedal-controlled freeze and replay.
24. Transposition roulette.
25. Melody memory sequences.
26. Wrong-octave rescue lanes rather than instant failure.
27. Human-versus-synth intonation comparison.
28. A controller calibration game that discovers comfortable force and travel.

### Rhythm Roulette

29. Automatic 4x4 pad mapping.
30. Blindfold hardware mode.
31. Velocity-sensitive chops.
32. Knob-per-constraint challenges.
33. Fader-controlled sample slicing.
34. Swing matching by performance rather than a slider.
35. Three-record rule enforced by pad color families.
36. Finger-drumming rudiment missions.
37. Euclidean rhythm lock puzzles.
38. Polyrhythm cooperative mode.
39. Beat relay between two controllers.
40. Missing-beat internal-clock challenge.
41. Groove fingerprint comparison.
42. MIDI clip export with challenge provenance.
43. Controller-only performance mode.
44. Physical crate digging with a jog wheel and hidden display.

### Audio Lab

45. MIDI note as tuner target.
46. MIDI-triggered oscilloscope capture.
47. Note-on synchronized waveform overlays.
48. Velocity-to-amplitude comparison.
49. Aftertouch-to-timbre visualization.
50. CC-controlled trigger, gain, and time scale.
51. Lissajous interval garden.
52. Harmonic-series illumination.
53. Temperament comparison keyboard.
54. Phase-cancellation puzzle.
55. Envelope drawing from performed gestures.
56. MIDI-to-audio latency calibration.
57. Pitch-to-MIDI disagreement inspector.
58. Safe room-mode simulation.

### Skill Constellation

59. Touch a physical control to open a skill node.
60. LED-ring feedback for level versus evidence confidence.
61. Controller-driven mission selection.
62. Instrument-specific subgraphs.
63. Compare voice, keyboard, pads, and breath without collapsing them into one score.
64. Cross-modal transfer missions.
65. Confidence decay when evidence becomes stale, without erasing earned history.
66. A physical skill-map performance that turns learning history into music.
67. Teacher-authored node playlists.
68. Classroom ensemble constellation.

### Creative Tools

69. MIDI Learn as an expressive mapping interview.
70. Chord-memory sampler.
71. Constraint arpeggiator.
72. Groove-aware note repeater.
73. Probability sequencer with visible rules.
74. Era-inspired synth-method rooms.
75. Patch morph challenges.
76. Controller-to-light and scene mapping.
77. MIDI postcard: a tiny replayable gesture plus sound recipe.
78. Ghost-band accompaniment that follows dynamics, not only tempo.
79. Cross-instrument translator: drum phrase to bass contour or melody to pad rhythm.
80. Performance fingerprint based on timing and expression, kept private by default.
81. Set archaeology mode that reconstructs likely performance gestures from notes.
82. Live visual score generated from played structure.

## Frontier Experiments

- **The Harmonic City:** notes occupy buildings by pitch class; intervals create
  bridges; voice leading moves through streets with a cost based on motion.
- **Rubik's Voice-Leading Cube:** each rotation changes inversion, function, or
  register while common tones remain visibly pinned.
- **Cymatic Boss Room:** MIDI gestures control a clearly labeled simulation of
  nodes and modes; the puzzle is to stabilize a target pattern.
- **Time Crystal Sequencer:** nested clocks reveal their common return points and
  let players perform phase shifts.
- **The Living Set Sculpture:** recognition, transition gestures, played notes,
  and practice evidence continuously build a replayable visual artifact.
- **Frequency Telescope:** zoom from rhythm cycles to audible pitch to partials,
  showing that frequency relationships recur at different time scales while
  avoiding mystical causal claims.
- **Instrument Dream Translator:** play a phrase on one controller and receive
  several structurally related interpretations for different instruments.
- **MIDI Mystery School:** every room teaches one hidden property through play
  before naming the concept.

## Recommended First Product Slice: MIDI Playground

1. **Connect:** permission-aware port selector with a no-hardware demo source.
2. **Monitor:** readable note, velocity, channel, CC, clock, and device-state log.
3. **Learn:** touch a UI action, move a hardware control, confirm the mapping.
4. **Play:** keyboard Pitch Gates and 4x4 Rhythm Roulette.
5. **Control:** map one footswitch/pad to set markers and Next Move.
6. **Remember:** save normalized mappings by locally generated device alias.
7. **Calibrate:** measure input latency before timing-sensitive scoring.

This slice proves the shared architecture, improves two existing games, helps a
working DJ immediately, and stays useful without MIDI 2.0 or System Exclusive.

## Alex's Hardware Bench

The first compatibility targets should be the instruments already available for
real testing. We should not wait for a universal controller abstraction before
making these delightful.

### 1. Sensel Morph

Why it should be the flagship:

- It is pressure-sensitive, multi-touch, reconfigurable, USB/Bluetooth, and able
  to become several different musical instruments by changing overlays.
- The Piano Overlay defaults to notes on channel 1 and supports lateral pitch
  movement.
- The Drum Overlay defaults to channel 10 beginning at MIDI note 36.
- The Music Production Overlay separates its 16 pads/controls on channel 2 and
  keys on channel 3.
- Transport controls can emit MIDI Machine Control, while custom maps can replace
  them with ordinary notes or CCs.
- MPE maps make it our best available controller for per-note pressure, glide,
  and multidimensional game mechanics.

First experiences:

1. **Overlay Detective:** infer Piano, Drum, or Producer behavior from channels
   and incoming gestures, then let the user confirm.
2. **Pressure Gates:** target note, timing, and pressure shape simultaneously.
3. **Morph Garden:** each contact grows geometry from pitch, pressure, and glide.
4. **Producer Roulette:** map the 4x4 region directly to Rhythm Roulette while
   sliders control swing, filter, density, and sample position.
5. **Fingertip Constellation:** multiple contacts physically bend Skill
   Constellation nodes and make their relationships audible.
6. **Overlay Quest:** swapping overlays changes the current control vocabulary
   without ending the session.

Reference: [Sensel Morph documentation](https://guide.sensel.com/morph/)

### 2. Original Korg nanoKEY

Why it is the baseline keyboard:

- It is a simple class-compliant-style USB MIDI target with 25 velocity-sensitive
  keys, octave controls, pitch buttons, modulation, and a CC mode.
- Its small control set is ideal for proving that the app remains fun without
  screens, pads, aftertouch, or expensive hardware.

First experiences:

1. Keyboard Pitch Gates.
2. Hear-sing-play interval relay.
3. Octave-shift rescue game.
4. Velocity consistency trainer.
5. CC Mode MIDI Learn tutorial.
6. Pitch-button spaceship or lane-change control.

Reference: [Korg nanoKEY manuals and MIDI implementation](https://www.korg.com/us/support/download/product/1/250/)

### 3. Maschine Studio

Why it matters:

- Sixteen velocity-sensitive pads suit finger drumming, sample launching, and
  chord input.
- Encoders, transport, groups, and displays can support a dense production
  workstation once ordinary input is proven.
- Native Instruments documents MIDI mode as `SHIFT + CHANNEL`.

First experiences:

1. Full Rhythm Roulette pad deck.
2. Group buttons as record crates or sample families.
3. Encoder-driven sample surgery.
4. Velocity contour and rudiment coaching.
5. Transport buttons as session capture and replay.
6. Display feedback later through a desktop/native bridge, only after input is
   dependable.

### 4. Maschine Jam

Why it matters:

- The large pad matrix is naturally suited to step sequencing, harmonic maps,
  polyrhythms, and spatial games.
- Native Instruments documents MIDI mode as `SHIFT + headphones`.

First experiences:

1. Entire Rhythm Roulette sequence visible under the fingers.
2. Euclidean rhythm rotation on the matrix.
3. Tonnetz and chord-neighborhood map.
4. Polyrhythm reunion-point game.
5. Set timeline and cue matrix.
6. Skill Constellation as a physical 8x8 field.

Maschine references:

- [Native Instruments MIDI-mode combinations](https://support.native-instruments.com/support/solutions/articles/69000880031-native-instruments-switching-your-controller-to-midi-mode)
- [Maschine pad MIDI key mapping](https://support.native-instruments.com/support/solutions/articles/69000879787-recording-midi-notes-in-fl-studio-from-maschine)

### 5. DJ Hero USB Turntable Controller

The exact controller revision must be identified before choosing the adapter.
Game controllers often expose Gamepad or vendor-specific HID reports rather than
MIDI. That is an opportunity, not a dead end.

First step:

1. Connect it to the Mac.
2. Run a Hardware Census that checks Web MIDI ports, Gamepad devices, and
   permission-gated HID devices.
3. Move each platter, crossfader, mixer control, and button.
4. Record which API sees it and the value range, center, direction, jitter, and
   report frequency.
5. Save a local device recipe without uploading its raw identity.

First experiences if its controls are readable:

1. **DJ Hero Archaeology:** teach the app the old controller through a playful
   calibration ritual.
2. Dual-platter scratch and phase challenges.
3. Crossfader transition-shape trainer.
4. Two-deck rhythm rescue sequences.
5. Vinyl-digging browser where platter motion flips through records.
6. A modern spiritual successor to DJ Hero using the original physical grammar
   without copying its protected visual or musical content.

### Device-First Build Order

1. Hardware Census and event monitor.
2. nanoKEY note input, our simplest reference device.
3. Sensel Morph Piano and Drum overlays.
4. Maschine Studio 4x4 pad map.
5. Maschine Jam matrix map.
6. Sensel pressure, pitch bend, and MPE experiments.
7. DJ Hero protocol probe and the appropriate Gamepad/HID adapter.
8. Output feedback and device-specific polish only after input recipes are stable.

### Compatibility Matrix

| Device | Likely path | First SetScope role | Special evidence |
| --- | --- | --- | --- |
| Sensel Morph Piano | Web MIDI/CoreMIDI | Pitch Gates | pitch bend, pressure, note |
| Sensel Morph Drums | Web MIDI/CoreMIDI | Rhythm Roulette | velocity, channel 10 |
| Sensel Morph Producer | Web MIDI/CoreMIDI | Roulette + controls | channels 2/3, CC |
| Korg nanoKEY | Web MIDI/CoreMIDI | Keyboard baseline | note, velocity, CC mode |
| Maschine Studio | MIDI mode | Pad instrument | velocity, pads, encoders |
| Maschine Jam | MIDI mode | Matrix sequencer | grid position, touch/control |
| DJ Hero controller | Probe MIDI/Gamepad/HID | DJ mechanics | platter, fader, buttons |

## Proposed Portable Contract

```js
{
  schema: "setscope.midi-observation",
  schemaVersion: 1,
  observationId: "midi_...",
  sessionId: "set_...",
  sourceId: "local_alias_1",
  sourceKind: "hardware",
  protocol: "midi-1",
  timestampMs: 12345.67,
  message: {
    type: "note-on",
    channel: 1,
    note: 60,
    velocity: 0.78,
    controller: null,
    value: null
  },
  provenance: "performed"
}
```

Adapters:

- `WebMidiAdapter`: browser permission, ports, MIDI 1 byte messages.
- `CoreMidiAdapter`: iOS/macOS ports, BLE, network, UMP, protocol translation.
- `DemoMidiAdapter`: deterministic browser and CI fixture.
- `ReplayMidiAdapter`: challenge playback and regression testing.

Consumers receive normalized observations:

- `MidiMapper`
- `MidiClock`
- `PitchGatesMidiController`
- `RhythmRouletteMidiController`
- `SetMarkerController`
- `MidiVisualizer`

## Safety, Privacy, and Quality Gates

- Request ordinary MIDI access only after a user gesture.
- Do not request System Exclusive in the MVP.
- Explain that device access reads control events, not microphone audio.
- Use local aliases instead of uploading raw manufacturer/device identity.
- Offer a visible disconnect and forget-device action.
- Send note-off or all-notes-off during teardown to prevent stuck notes.
- Timestamp at receipt and preserve the source timestamp when available.
- Calibrate round-trip latency before judging timing.
- Bound event logs and never store unbounded raw controller streams.
- Keep clock transport, note input, mapping, and output routing separately enabled.
- Never send messages to an output until the user explicitly arms it.
- Feature-detect Web MIDI and preserve keyboard/touch fallbacks.
- Treat MPE and MIDI 2.0 as negotiated capabilities, not assumptions.

## Priority Ladder

### Now

- Validate the Hardware Census against the physical controller bench.
- Add keyboard input to Pitch Gates.
- Add pad input to Rhythm Roulette.
- Add a set-marker mapping.
- Measure input-to-audio latency before timing-based scoring.

### Next

- Build the first four-pad hip-hop Beat School lesson described in
  `docs/BEAT_SCHOOL_ROADMAP.md`.
- Clock-aware timeline coordinates.
- Velocity and aftertouch learning.
- Latency calibration.
- Mapping profiles and local device aliases.
- MIDI clip export.
- CoreMIDI iOS adapter.

### Later

- BLE and network sessions.
- MPE expression games.
- MIDI 2.0 UMP and Profile negotiation.
- Collaborative classroom play.
- Advanced synth museum and geometry labs.
- Physical Skill Constellation performances.

## Decision Filter

Before building any MIDI idea, ask:

1. Does it make listening, playing, producing, or learning measurably better?
2. Is the musical concept visible and audible?
3. Does it work without expensive hardware?
4. Can the app explain why it scored the performance that way?
5. Does it preserve human choice and provenance?
6. Can the same contract survive web, desktop, and iOS?
7. Is the scientific framing accurate?

## Implemented Foundation

- Versioned normalized MIDI observation contract
- MIDI 1 parser and deterministic contract tests
- Ordinary Web MIDI connection without SysEx
- Explicit Gamepad and WebHID probes for unusual controllers
- Deterministic demo source for no-hardware onboarding and CI
- Bounded live observation monitor and 4x4 pad visualization
- Local MIDI Learn mappings
- Named census slots for the Sensel Morph, nanoKEY, Maschine Studio, Maschine
  Jam, and DJ Hero deck
