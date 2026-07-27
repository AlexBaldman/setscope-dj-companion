# Beat School Roadmap

Beat School is the flagship experience after the MIDI Hardware Census. It begins
with hip-hop rhythm and pad performance, then expands into keyboard musicianship
and an original loop studio. The goal is to make timing visible, practice
specific, and creation feel like the natural final step of every lesson.

## Core Learning Loop

Every challenge follows the same seven-beat arc:

1. **Hear**: listen to the musical idea without visual overload.
2. **Watch**: see pads, subdivisions, accents, and pocket.
3. **Imitate**: play with generous timing windows and optional guidance.
4. **Repair**: isolate the weakest beat or limb instead of restarting everything.
5. **Perform**: complete the phrase with assistance reduced.
6. **Remix**: change one meaningful musical property.
7. **Save**: keep the performance, MIDI clip, and skill evidence.

Demo and heavily guided runs remain useful practice but do not promote mastery.
Scoring receipts feed the existing Rhythm and Transfer nodes in the Skill
Constellation.

## Hip-Hop Curriculum

The first curriculum should be playable with touch, computer keys, or any mapped
MIDI pads.

1. Pulse and one-pad timing
2. Kick and snare backbeat
3. Eighth- and sixteenth-note hi-hats
4. Velocity, accents, and ghost notes
5. Swing and intentional microtiming
6. Kick placement and syncopation
7. Sample-chop call and response
8. One-, two-, and four-bar pattern memory
9. A/B sections, fills, drops, and arrangement
10. Style studies using original material inspired by boom-bap, breakbeat,
    southern, trap, and other hip-hop lineages

Style studies teach musical characteristics and history without copying protected
recordings, artwork, game interfaces, or artist likenesses.

## Scoring That Teaches

One total score is not enough. Each run should expose:

- **Accuracy**: whether the intended event was played.
- **Pocket**: signed early/late timing relative to the musical target.
- **Dynamics**: velocity shape, accents, and ghost-note control.
- **Independence**: ability to maintain one part while another changes.
- **Memory**: performance after cues disappear.
- **Recovery**: how quickly the player returns after a miss.
- **Originality**: meaningful choices made during the remix phase.

Timing judgments must subtract measured input and audio latency. Adaptive windows
should begin forgiving, then narrow only when evidence is stable. Results should
name one success and one next adjustment in plain musical language.

## Hardware Bench

- **Sensel Morph Drum/Producer overlays**: pressure, velocity, rolls, and
  aftertouch expression.
- **Maschine Studio**: primary 4x4 pad curriculum and transport mapping.
- **Maschine Jam**: step grid, arrangement, mute groups, and polyrhythm views.
- **Korg nanoKEY**: keyboard fallback, bass lines, note geography, and later
  harmony lessons.
- **DJ Hero controller**: platter gestures, crossfader timing, fills, and remix
  modifiers after its MIDI/Gamepad/HID protocol is identified.
- **Touch and computer keyboard**: complete no-hardware path for every core
  lesson.

MIDI Learn stores semantic actions rather than page-specific button selectors.
Device presets remain local aliases over the same normalized observation
contract.

## Keyboard Academy

After the beat curriculum is coherent:

1. Note geography and comfortable hand position
2. Intervals by sound, shape, and function
3. Major and minor triads
4. Inversions and voice leading
5. Seventh chords and common extensions
6. Hip-hop, soul, funk, and jazz-informed progressions
7. Melody, bass line, and chord coordination
8. Transposition and ear-led recall
9. Arrangement roles and register
10. Improvisation over original practice material

Keyboard lessons use the same challenge, replay, diagnosis, assistance, and
evidence system as Beat School rather than becoming a separate app.

## Loop Studio

Creation is the capstone, not a detached utility:

- count-in and latency calibration
- record, overdub, undo, mute, and clear
- optional quantize strength rather than a destructive on/off switch
- swing and per-track timing
- velocity editing and humanization
- one-, two-, four-, and eight-bar scenes
- pad, drum, bass, chord, melody, and texture lanes
- remix prompts based on the skill currently being practiced
- MIDI export plus a portable SetScope performance receipt

## Architecture

The playable engine should follow the deterministic pattern already proven by
Pitch Gates and Rhythm Roulette:

- versioned challenge definition
- pure state reducer
- stable audio/session clock
- normalized MIDI, touch, and keyboard actions
- portable replay with verification hash
- renderer independent of scoring
- latency profile separate from musician skill
- one structured performance event at completion

The first implementation brick is a four-pad kick/snare lesson with demo input,
touch/keyboard fallback, mapped MIDI input, signed timing feedback, and a
deterministic replay. It should be useful before sounds, lessons, or device
presets multiply.
