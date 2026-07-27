# SetScope Design and Asset Pipeline

## North Star

SetScope is one music clubhouse with seven distinct rooms. Every room combines:

1. **Place**: an authored environment that creates mood and identity.
2. **Instrument**: the playable hardware surface and primary interaction.
3. **Game**: an immediate goal, legible feedback, and a useful receipt.

Beat School is the current reference implementation. New screens should borrow its
clarity and physicality without copying its exact layout.

## Room Manifest

The source of truth lives in `src/room-system.js`.

| Room | Material | Motion language | Environment |
| --- | --- | --- | --- |
| Listening Station | Black lacquer | Meter lock | Music Block |
| Vocal Arcade | Painted cabinet | Gate pulse | Vocal Arcade |
| Signal Bench | Phosphor glass | Trace lock | Signal Workshop |
| Beat Basement | Rubber pads | Pad impact | Music Block |
| Record Shop | Printed crates | Sticker stamp | Music Block |
| Controller Workshop | Patch metal | Cable signal | Signal Workshop |
| Field Notebook | Paper binding | Page turn | Music Block |

Room accent colors express identity. Semantic colors keep the same meaning
everywhere: amber for action, cyan for measured data, mint for success, coral for
danger, and yellow for playheads and keyboard focus.

## Three Reading Distances

- **Across the room**: the instrument silhouette and primary action are obvious.
- **At arm's length**: current state, controls, and consequences are readable.
- **Up close**: labels, stickers, scuffs, jokes, serials, and discoveries reward
  attention without carrying essential instructions.

Mobile adds a fourth test: **under a thumb**. Priority controls are at least 44
CSS pixels, never require hover, and do not crowd the playable surface.

## Asset Roles

Assets enter the system with an explicit role:

- **Environment**: wide room or world backdrop with a calm center for UI.
- **Faceplate**: tightly cropped hardware material or control surround.
- **Prop**: records, speakers, cables, flyers, cases, and other storytelling.
- **Texture**: subtle paper, metal, lacquer, plastic, or printed wear.
- **Receipt**: stamps, tickets, score slips, labels, and saved evidence.

Environment masters use a 16:9 composition at 1672 by 941 pixels. Important
objects stay away from the center safe area and must survive `cover` crops at
1440x1100, 1024x768, 768x1024, and 390x844. Assets must be original and avoid
third-party logos, protected characters, or product-identical trade dress.

## Motion Rules

Motion communicates state or physical consequence:

- Buttons depress.
- Pads impact.
- Screens lock onto signal.
- Gates pulse during countdown.
- Receipts stamp when saved.
- Pages turn when navigation changes.

Ambient motion is quiet. A room gets one dominant active cue at a time. Motion
must collapse under `prefers-reduced-motion`, and labels or shape changes must
still communicate the same state without animation.

## Music-Tool UX Rules

- Put the playable instrument before setup and explanation on narrow screens.
- Display signal readiness before a user performs.
- Keep timing, latency, confidence, source, and assistance provenance visible.
- Make every input produce immediate visual acknowledgement.
- Keep transport controls stable when the layout changes.
- Never let decorative art interfere with note, beat, waveform, or timeline data.
- Test in silence, with noisy input, with touch only, and with mapped MIDI.

## Production Workflow

1. Write a room brief: place, instrument, game, material, motion, and semantic
   feedback.
2. Produce original assets with a documented prompt or illustration brief.
3. Inspect the source image at full resolution.
4. Store it under `assets/world`, `assets/rooms`, or a tool-specific folder.
5. Register the room or asset in a manifest instead of hard-coding a new dialect.
6. Compose with shared `data-ui` primitives before adding page-specific styling.
7. Test dark, light, reduced-motion, mouse, keyboard, and touch behavior.
8. Capture phone, tablet, compact desktop, and wide desktop screenshots.
9. Record the decision and verification result in `docs/DEV_JOURNAL.md`.

## Current Asset Set

- `assets/world/music-block.png`: shared record, production, and notebook world.
- `assets/world/vocal-arcade.png`: pitch and voice environment.
- `assets/world/signal-workshop.png`: audio-analysis and MIDI environment.
- `assets/beat-school/beat-lab.png`: authored Beat School lesson stage.

The living visual reference is available at `/design-system.html`.

