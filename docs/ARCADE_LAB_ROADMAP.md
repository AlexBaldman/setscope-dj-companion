# Arcade Lab Roadmap

## Big Idea

SetScope can become an arcade of musical attention: small, engrossing challenges where listening, performing, reacting, and DJ technique are the controllers. Pitch Gates is the first proof. The scalable product is not a list of unrelated minigames; it is a challenge system that can turn audio features and human gestures into playable rounds, then remember what the player learned.

The emotional target is the immediacy of rhythm games and tense reactive sequences: hear it, understand it, respond in time. Influences can be acknowledged plainly: `Rock Band`, `Guitar Hero`, `DJ Hero`, and `PaRappa the Rapper` for musical performance languages; `Fahrenheit` and `Heavy Rain` for intense timed reaction grammar. We should build original mechanics, visuals, names, sounds, and stories rather than replica screens or borrowed assets.

## Control Languages

| Control language | Player action | Audio/system signal | Original game direction |
| --- | --- | --- | --- |
| Pitch altitude | Sing or play a note | frequency, note, octave, clarity | `Pitch Gates`: guide an orb through melodic gates |
| Beat strike | Tap keys, pads, screen, or MIDI | onset, beat phase, timing error | `Pocket Drummer`: catch breaks and rebuild a groove |
| Phrase choice | Choose/crossfade at the right moment | bar/phrase boundary, BPM, energy | `Blend Runner`: land a transition across two lanes |
| Pattern reflex | Hit prompted inputs rapidly | timed command sequence over music | `Needle Drop Rescue`: survive musical pressure moments with pad/button combinations |
| Scratch gesture | Swipe, jog, or controller movement | velocity/direction/cue timing | `Cut School`: copy simple scratch rhythms and accents |
| Ear decision | Select what changed or belongs | interval, sample, timbre, transition class | `Crate Detective`: spot samples, keys, and technique clues |
| Tone shaping | Move knobs/sliders/pads | filter, envelope, oscillator parameters | `Patch Quest`: recreate a target synth texture |

## Shared Engine Primitives

Every arcade mode should use a small shared grammar:

1. `InputAdapter`
   - Microphone, deliberately shared playback, audio file, generated demo, keyboard/touch, MIDI, and later native-device sources.

2. `FeatureFrame`
   - Timestamped observations such as pitch, clarity, onset, beat phase, energy, spectral shape, selected input, and confidence.

3. `ChallengeDefinition`
   - Mode id, difficulty, target stream, accepted controls, scoring rules, accessibility options, and visual skin.

4. `PerformanceEvent`
   - Start, prompt, hit, miss, streak, recovery, completion, score, and evidence/confidence fields.

5. `MemoryWrite`
   - Compact events stored in the existing SetScope audio-event timeline so practice can connect back to sets, tracks, transitions, and discoveries.

## Design Rules

- Each mode needs an instant generated/demo path before asking for permissions or external equipment.
- Controls should be readable and satisfying with keyboard/touch first, then become richer with microphone, MIDI pads, or native capabilities.
- Difficulty should teach a musical idea: octave control, beat placement, phrasing, scratch rhythm, sample recognition, or sound design.
- Performance analytics should help, not shame: accuracy, timing drift, vocal range, progress, and useful next exercises.
- Music and pop-culture energy belong in original art direction and curation; do not reproduce protected characters, branded game interfaces, hardware trade dress, or copyrighted recordings without rights.
- The interface may wink knowingly through genre, control grammar, cabinet-era materials, and comedic homage. It must remain unmistakably a SetScope world, not a counterfeit franchise screen.

## Recommended Build Order

1. Extract the reusable real-time input/analyzer session currently living inside Pitch Gates.
2. Add structured `PerformanceEvent` metadata to saved toolbelt events.
3. Create an Arcade Lab registry that can launch installed playable modes, beginning with Pitch Gates.
4. Build `Needle Drop Rescue`, an original keyboard/touch pattern-reflex mode that needs no new audio analysis and establishes the challenge-definition engine.
5. Build `Pocket Drummer` once beat/onset analysis is reliable, then `Blend Runner` after transition and phrase analysis mature.

## Why Pattern Reflex Is Next

The fast input-combination idea is a strong second minigame because it broadens the control language without first requiring difficult audio ML. It tests prompt scheduling, scoring, difficulty curves, mobile controls, and shared performance events. Later, music-analysis signals can author the pressure moments from real DJ sets.
