# SetScope UI Creative Direction

## Creative Council

This direction combines three lanes: street-art energy, retro game clarity, and iconic music-hardware tactility. The goal is not a novelty skin. The goal is a usable DJ set cockpit that feels like crate digging, block-party discovery, and studio hardware all got compressed into one expressive tool.

## Street Art And Graffiti

Adaptable motifs:

- Sticker layering: small status labels, provider badges, era tags, and review flags can feel like collected venue stickers.
- Wheatpaste texture: subtle paper grain behind journal and set-intel surfaces.
- Paint-marker strokes: active selections, waveform accents, and transition tags can use slightly imperfect underline/outline treatments.
- Stencil blocks: provider diagnostics and set stats can use compact stencil-like label blocks.
- Spray fades: hover and active states can use soft overspray edges, kept restrained so text remains crisp.
- Wall fragments: archive cards can carry tiny torn-poster edge details or halftone scuffs.

Palette:

- Keep vinyl black, cream, amber, mint, cyan, and rose as the base.
- Add sharper accent swatches: signal green, safety orange, electric blue, hot pink, and concrete gray.
- Use high-chroma color in small UI hits, not full-page washes.

Animation:

- Sticker slap for added captures.
- Paint-marker draw-on for selected track underlines.
- Gentle spray flicker for active provider/test state.

Avoid:

- Copying identifiable artist styles.
- Low-contrast paint effects behind data.
- Making every surface distressed.

## Retro Game Interface

Adaptable motifs:

- Pixel meters for confidence, BPM drift, and transition intensity.
- Arcade insert-coin microcopy for empty states.
- Stage-map thinking for the set map: tracks become rooms/checkpoints along a route.
- Cartridge/save-slot language for archived sets.
- 8-bit sparkle only for success moments, never as constant decoration.
- CRT scanline texture only inside optional skins or preview surfaces.

Rules:

- Use pixel styling as garnish around modern readable type.
- Keep data tables and forms clean.
- Prefer crisp segmented meters over fake terminal blocks.
- Use animations with short durations so repeated workflows stay fast.

Avoid:

- Full pixel fonts for body text.
- Heavy CRT blur.
- Low information density disguised as nostalgia.

## Audio Hardware And Synths

Adaptable motifs:

- MPC/SP-style pad banks for transitions, cue points, and workflow actions.
- Korg/Moog/Juno-inspired knobs and sliders for filters, BPM range, energy, and confidence thresholds.
- Patch-bay routing for provider chain: input, recognition, analysis, archive.
- VU meters for live audio windows and match confidence.
- Transport controls from tape decks, CDJs, samplers, and car stereos.
- Screen labels like hardware LCDs for provider mode and capture diagnostics.

Rules:

- Controls should look tactile because they do real things.
- Hardware skins should keep the same layout skeleton.
- Use knobs/sliders only where the user manipulates a continuous value.
- Keep vendor inspiration generic; do not copy logos, exact faceplates, or trade dress.

Avoid:

- Decorative controls that do nothing.
- Making the UI too skeuomorphic to scan quickly.
- Overloading one screen with every era at once.

## Directional Concept

**Vinyl Block Party Workstation**

The default SetScope skin should feel like a portable listening station sitting on a stickered folding table: a real record platter, bright label art, sampler pads, little hardware readouts, and a set timeline that feels like a route map through music history.

Implementation priorities:

1. Keep the platter as the visual anchor.
2. Add a sticker/tag system for provider, era, confidence, and review status.
3. Make capture events animate like a fresh sticker landing in the log.
4. Turn the set map into a more expressive route with checkpoints, tempo color, and review hazards.
5. Add a hardware-style provider chain panel: Mic/Sample -> Recognizer -> Analysis -> Archive.
6. Add skins later by swapping surface treatments, not by changing workflows.

## First UI Experiments

- Capture sticker animation in the Capture Log.
- Pixel confidence meter in the Track Intel panel.
- Patch-chain mini diagram in the Recognition Stack.
- Hardware-style knobs for BPM range and confidence filters once filtering becomes richer.
- Archive cards as save slots with small sticker stacks for set stats.

## Sidecar Expert Notes

Street-art lane:

- Use layered sticker/poster edges, paint-marker outlines, stencil labels, halftone spray texture, tag rhythm lines, and utility wall markings.
- Keep the UI grounded in black lacquer, charcoal rubber, off-white labels, brushed metal, and smoked plastic.
- Use bright street-art accents as controlled state cues, not whole-screen decoration.
- Let new captures stamp in like fresh labels or stickers.
- Avoid copying specific artists, logos, tags, or identifiable murals.

Retro-game lane:

- Treat the active recognition state as a compact HUD.
- Make confidence, capture windows, and transition intensity work as segmented meters.
- Use pixel/arcade styling only for short status labels, chips, meters, and decorative frames.
- Keep body text and metadata in readable sans-serif.
- Add game-feel through short press states, `LISTENING`/`MATCHING`/`LOCKED` style state language, and side-scroller set-map ideas.
- Avoid scanlines over small text, excessive glitching, and full pixel fonts for long-form notes.

Audio-hardware lane:

- Use sampler pads, mixer channels, EQ knobs, VU meters, jog-wheel/platter details, tape counters, car-stereo presets, LCD displays, patch-bay routing, and rack framing as modular inspiration.
- Build next toward a recognition deck strip, transition mixer, sampler pad tags, crate presets, confidence VU meters, and hardware skin tokens.
- Let new recognition events flash like a pad light or LCD update.
- Use hardware language for controls and status, with clean information architecture underneath.
- Avoid copying exact product layouts, logos, knob colors, or recognizable trade dress from real gear.
