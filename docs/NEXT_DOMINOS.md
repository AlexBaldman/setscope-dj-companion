# Next Lead Dominos

Updated 2026-07-28 after the Set-to-Skill Alpha foundation pass.

This is the canonical priority list. Domain roadmaps hold depth and inspiration;
this file decides sequencing.

## 1. Timing and Semantic Input Spine V1 - Completed

The portable service now converts normalized device observations into musical
actions on a tempo-aware clock.

Implemented:

- semantic actions such as `kick`, `snare`, `hat`, `transport-toggle`,
  `set-marker`, and `crossfader`
- receive timestamp, source timestamp, optional audio-clock coordinate, and
  compensated musical position
- versioned local input/output latency profiles with explicit method and confidence
- per-source mappings over normalized observations
- deterministic action receipts ready for recording and replay
- legacy MIDI Learn migration into stable gesture signatures
- live bar, beat, step, intensity, and semantic-action monitoring

Why first: Beat School scoring, Rhythm Roulette MIDI control, DJ Hero gestures,
Loop Studio overdubs, and native iOS input all need the same answer to “what was
played, and when?”

Manual latency offsets are working now. Tap and loopback measurement, device
aliases, and non-MIDI fallback adapters close during the physical census and Beat
School slice, where real timing evidence can validate them.

## 2. Beat School Vertical Slice - Completed

Ship one excellent four-pad hip-hop lesson before expanding curriculum.

The slice:

- kick and snare call-and-response
- Hear, Watch, Imitate, Repair, Perform, Remix, Save progression
- demo, touch, computer keyboard, and MIDI input
- forgiving adaptive timing windows
- signed early/late feedback and velocity accents
- deterministic challenge and replay receipt
- Rhythm and Transfer evidence in the Skill Constellation

Delivered:

- original pixel-art basement lab and synthesized kick, snare, hat, and clap
- stable two-by-two touch pads with pressure-derived velocity where available
- one semantic path for touch, keyboard, demo, and General MIDI drum notes
- deterministic Hear, Watch, Imitate, Repair, Perform, Remix, Save run engine
- signed timing diagnosis, accuracy, pocket, and dynamics scoring
- replay hash and performance receipt persisted into the Skill Constellation
- assisted demo runs explicitly excluded from mastery
- desktop, tablet, and phone composition with the primary action in the first
  phone viewport

The next curriculum pass should add a second two-bar lesson and learner-adjustable
tempo only after physical controller timing has been measured.

## 3. Set-to-Skill Alpha - In Progress

Prove the product's unique loop with one real path:

1. identify a moment in a DJ set,
2. preserve its honest timestamp and recognition provenance,
3. turn its musical feature into a short practice mission,
4. complete that mission with trustworthy timing, and
5. return the earned evidence to the original set moment.

Foundation completed:

- five player-facing tools now form the primary app shell; MIDI, Journal, and
  Style remain accessible in an explicit Labs drawer
- recognition no longer invents confidence, timestamps, or transition labels
- capture-start time, rather than response time, anchors a recognized set moment
- Beat School uses the audio clock as its scoring origin
- uncalibrated performances remain useful practice but cannot claim timing mastery
- a tap-calibration flow records offset, jitter, sample count, method, and confidence
- four-beat count-in, explicit retry/advance decisions, and subdivision-specific
  repair make the lesson easier to understand and repeat
- Pitch Gates now separates welcoming pitch-class matching from exact-octave
  practice and can turn an imported file into an honest Lead or Bass-register
  dominant-pitch contour level

Next acceptance test:

- run representative DJ-set clips through a real provider token
- route one recognized tempo/rhythm observation into a canonical Beat School mission
- complete it with a measured timing profile
- show the resulting receipt on both the skill graph and source set moment

## 4. Physical Hardware Census

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

## 5. Creation Handoff

Let the Beat School result become an editable loop:

- record, overdub, mute, clear, and undo
- one/two/four-bar scenes
- optional quantize strength
- swing and velocity preservation
- remix prompt from the completed lesson
- MIDI export and structured performance receipt

This proves the core thesis that learning should end in authorship.

## 6. Cymatics Mode Explorer

Integrate the sibling cymatics project read-only before hardware control:

- import one plate experiment and measured images
- render simulated versus measured provenance
- inspect frequency, geometry, material, support, and drive position
- overlay nodal predictions on calibrated captures
- map MIDI to safe simulation parameters
- sample measured resonances into the creation handoff

Actuator control waits behind the separately tested local safety bridge.

## 7. Production Validation

- test AudD with a real token and representative DJ-set audio
- run extended microphone/listening sessions on target mobile hardware
- measure recognition cost, latency, false matches, duplicates, and battery use
- add transition-analysis evidence rather than placeholder labels
- test static Pages and local-server upgrades against existing archives

## Architecture Debt Queue

These are important but should support, not interrupt, the vertical slices:

1. Finish the browser storage port started by the shared input-profile store
   before adding sync or native persistence.
2. Add nested SetDraft item validation for tracks, missions, captures, and
   performance evidence before native or cloud writes.
3. Split `src/styles.css` by cockpit room after visual regression baselines exist.
4. Extract the phase controller shared by playable tools.
5. Break `src/pitch-gates.js` into input, session, rendering, and UI-controller
   ownership once Beat School confirms the shared engine boundary.
6. Replace static-string structure checks incrementally with contract and browser
   behavior tests.
7. Add an archive study view after the first creation loop writes richer evidence.

Completed architecture hardening:

- one browser-neutral product manifest now drives navigation, build output,
  route QA, room identity, and practice capability
- Pages deployment is blocked by full browser and built-artifact verification
- all eight static surfaces receive route, shared-navigation, image, and console checks
- MIDI Learn mappings and latency profiles now flow into Beat School through a
  shared profile boundary
- performance events, mission closure, and skill evidence now use one
  write-ahead, retry-safe completion commit

## Decision Rule

A new idea moves ahead of this list only if it:

1. closes a broken production loop,
2. unlocks at least two planned experiences,
3. reduces a scientific, privacy, safety, or data-loss risk, or
4. can be completed as a small vertical slice that teaches us something the
   current plan cannot.
