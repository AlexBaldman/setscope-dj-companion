# Next Lead Dominos

Updated 2026-07-27 after branch archaeology, repository cleanup, MIDI Playground,
Beat School planning, and the cymatics module boundary.

This is the canonical priority list. Domain roadmaps hold depth and inspiration;
this file decides sequencing.

## 1. Timing and Semantic Input Spine

Build one portable service that converts MIDI, touch, keyboard, Gamepad, and
future native events into musical actions on a calibrated clock.

Deliverables:

- semantic actions such as `kick`, `snare`, `hat`, `transport-toggle`,
  `set-marker`, and `crossfader`
- input timestamp, source timestamp, audio-clock coordinate, and compensated
  musical position
- local input/output latency profile with measured confidence
- per-device aliases and mappings over normalized observations
- deterministic action recording and replay
- touch and computer-keyboard parity for every required action

Why first: Beat School scoring, Rhythm Roulette MIDI control, DJ Hero gestures,
Loop Studio overdubs, and native iOS input all need the same answer to “what was
played, and when?”

## 2. Beat School Vertical Slice

Ship one excellent four-pad hip-hop lesson before expanding curriculum.

The slice:

- kick and snare call-and-response
- Hear, Watch, Imitate, Repair, Perform, Remix, Save progression
- demo, touch, computer keyboard, and MIDI input
- forgiving adaptive timing windows
- signed early/late feedback and velocity accents
- deterministic challenge and replay receipt
- Rhythm and Transfer evidence in the Skill Constellation

Success means a first-time player can connect nothing, make music immediately,
understand one correction, and save a recognizable two-bar variation.

## 3. Physical Hardware Census

Test the actual Sensel Morph, nanoKEY, Maschine Studio, Maschine Jam, and DJ Hero
controller against the Playground.

Record:

- browser-reported protocol and port names
- available notes, CCs, pressure, pads, buttons, axes, LEDs, and transport
- stable local alias
- input jitter and round-trip latency
- disconnect/reconnect behavior
- useful default semantic mapping

The DJ Hero deck gets a protocol decision only after MIDI, Gamepad, and HID probes
are observed.

## 4. Creation Handoff

Let the Beat School result become an editable loop:

- record, overdub, mute, clear, and undo
- one/two/four-bar scenes
- optional quantize strength
- swing and velocity preservation
- remix prompt from the completed lesson
- MIDI export and structured performance receipt

This proves the core thesis that learning should end in authorship.

## 5. Cymatics Mode Explorer

Integrate the sibling cymatics project read-only before hardware control:

- import one plate experiment and measured images
- render simulated versus measured provenance
- inspect frequency, geometry, material, support, and drive position
- overlay nodal predictions on calibrated captures
- map MIDI to safe simulation parameters
- sample measured resonances into the creation handoff

Actuator control waits behind the separately tested local safety bridge.

## 6. Production Validation

- test AudD with a real token and representative DJ-set audio
- run extended microphone/listening sessions on target mobile hardware
- measure recognition cost, latency, false matches, duplicates, and battery use
- add transition-analysis evidence rather than placeholder labels
- test static Pages and local-server upgrades against existing archives

## Architecture Debt Queue

These are important but should support, not interrupt, the vertical slices:

1. Introduce a browser storage port before adding sync or native persistence.
2. Split `src/styles.css` by cockpit room after visual regression baselines exist.
3. Extract the phase controller shared by playable tools.
4. Break `src/pitch-gates.js` into input, session, rendering, and UI-controller
   ownership once Beat School confirms the shared engine boundary.
5. Replace static-string structure checks incrementally with contract and browser
   behavior tests.
6. Add an archive study view after the first creation loop writes richer evidence.

## Decision Rule

A new idea moves ahead of this list only if it:

1. closes a broken production loop,
2. unlocks at least two planned experiences,
3. reduces a scientific, privacy, safety, or data-loss risk, or
4. can be completed as a small vertical slice that teaches us something the
   current plan cannot.
