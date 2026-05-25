# Audio Toolbelt Roadmap

## Product Thesis

SetScope starts as a DJ set companion, but the larger opportunity is an audio discovery toolbelt: a playful set of useful listening, learning, visualization, and creative tools for fans, DJs, musicians, and producers.

The main rule: every tool should feed the same memory layer. A tuner, oscilloscope, synth toy, crate note, or DJ transition lesson should make the user better at hearing music.

The core primitive is the **audio event timeline**. Recognition, ShazamKit, BPM estimation, transition detection, tuners, visualizers, synth toys, and learning drills should all be able to write structured events into one timeline. That keeps the product from becoming disconnected toys.

## Toolbelt Modules

### Audio Event Timeline

- `recognition`: track, artist, provider, confidence, timestamp.
- `tag`: crate tag, practice label, utility marker, review reason.
- `analysis`: BPM, key, energy, density, waveform, phrase, transition.
- `learning`: explanation, practice prompt, ear-training result, teacher-mode note.
- `crate`: sample lineage, label, era, scene, source, recommendation.
- `instrument`: pitch, note, tuning, chord, interval, synth patch, loop.
- `visual`: oscilloscope marker, spectrogram region, beat-grid marker.

### SetScope Deck

- Track recognition.
- Timeline and set map.
- BPM/key/transition metadata.
- Review queue and corrections.
- Crate-history notes.

### Listening Lab

- Oscilloscope.
- Spectrogram.
- Beat grid.
- Key wheel.
- Groove-density meter.
- Energy and texture timeline.

### Musician Helpers

- Pitch Gates singing game: playable first slice with note/frequency/octave detection, scoring, and event logging.
- Guitar/bass tuner.
- Note finder.
- Interval trainer.
- Chord recognition.
- Call-and-response ear training.

Pitch Gates is now the first working musician-helper experiment. Its input model is intentionally honest: microphone, local audio file, or audio explicitly shared through the browser; future native apps can expand platform capture options.

### DJ Practice Tools

- Transition teacher mode.
- Blend/cut/scratch/echo-out examples.
- Practice quests: match BPM, find the one, spot the sample, rebuild the transition.
- A/B transition mixer with outgoing and incoming track lanes.
- Saved technique clips.
- Phrase-count helper for 8/16/32-bar structure.
- Scratch/cue timing visualizer.
- Silent live HUD mode that never interrupts the set.

### Crate Intelligence

- Sample and interpolation maps.
- Label/scene timelines.
- Producer and session-player links.
- Taste graph across sets.
- Recurring sample-source memory.
- Quick tags for DJ utility: heater, deep cut, break, sample source, crowd lift, unknown gem, blendable, review.

### Creative Toys

- Era-inspired synth toys without copying exact product trade dress.
- Simple drum pad sampler.
- Tape delay and dub siren experiments.
- FM bell machine.
- Analog mono bass toy.
- Groovebox sketchpad.

## Novel Feature Ideas

- "What is THAT?" button that captures the last few seconds, recognizes the song, and starts a crate note.
- DJ Set X-Ray: feed it a set and get a full annotated timeline.
- Transition Detective: identify fade, cut, scratch, drop, loop roll, echo out, backspin, and double.
- Crate Compass: find more tracks like a specific moment in the set.
- Teacher mode that explains why a transition worked in terms of tempo, key, density, and cultural context.
- Personal listening syllabus generated from saved sets.
- DJ fingerprinting: recurring BPM zones, eras, labels, techniques, and favorite transition moves.
- Memory callbacks: "You heard this drum break in another set last month."
- Visual remix mode: turn a set into a poster, arcade level map, or hardware patch sheet.
- Record-shop mode: convert a set into a shopping/search list across vinyl, CD, and digital sources.
- Scene Time Machine: explore moments like 1994 NYC hip-hop, 1983 electro, or 2001 neo-soul through sets and records.

## Guardrails

- Do not copy exact hardware layouts, logos, or trade dress.
- Keep factual music-history claims sourceable.
- Keep AI explanations clearly separated from verified metadata.
- Avoid stuffing too many toys into the main DJ workflow.
- Make each tool small, tactile, and useful before making it flashy.
- Confidence must be honest; wrong IDs should degrade into review/unknown states.
- Live mode should be quiet and focused.
