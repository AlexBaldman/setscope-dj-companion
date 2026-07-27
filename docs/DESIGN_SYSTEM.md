# SetScope Design System

## Product Direction

SetScope should feel like one authored family of music instruments assembled across eras. The neutral chassis, navigation, controls, typography, focus behavior, and responsive rules stay consistent. Each room keeps a distinct creative identity:

- SetScope: warm amber, record-label cream, and mint signal data.
- Pitch Gates: electric cyan, calibration marks, and restrained coral danger cues.
- Audio Lab: phosphor green, oscilloscope glass, and amber calibration.
- Rhythm Roulette: crate-label orange, sampled cyan, punchy coral, and pixel-art print texture.
- Dev Journal: ink, paper, graphite blue, and annotation red.

Room color is identity. Status color is meaning. Mint means healthy or recognized, amber means active or awaiting attention, coral means risk or failure, cyan means measured data, and yellow marks the playhead or keyboard focus.

## Room System V1

The visual system is now executable rather than only descriptive:

- `src/room-system.js` is the versioned manifest for each room's label, material,
  accent, motion language, and environment.
- `src/ui-system.css` supplies shared chassis, panel, screen, metric, action,
  material, touch, and reduced-motion behavior.
- `design-system.html` is a living Style Lab for previewing all room identities,
  original environment art, semantic lights, and instrument primitives.
- `docs/DESIGN_ASSET_PIPELINE.md` defines the asset roles, crop rules, motion
  budget, music-tool ergonomics, and production quality gate.

The shared composition rule is **place + instrument + game**. Beat School is the
current north star: authored surroundings create desire, the central instrument
stays immediately playable, and feedback turns performance into useful evidence.

## Token Layers

`src/design-tokens.css` is the shared foundation:

1. Foundation: spacing, radii, control heights, touch targets, inspector width, and typography roles.
2. Semantic: chassis surfaces, borders, text, action, data, success, warning, danger, and playhead colors.
3. Room identity: each surface overrides `--room-accent` and its own screen treatment without redefining status meaning.
4. State and motion: focus, press depth, fast transitions, page motion, and reduced-motion behavior.

Shared controls belong in `src/arcade-shell.css` or `src/theme.css`. Page styles should describe composition and personality, not redefine generic buttons.

## Shared Grammar

- App headers expose product return, room title, tool rack, status, and utilities in that order.
- Mobile headers use three compact rows: identity, tools, then status/utilities.
- Primary actions are filled with the room action color. Transport and utility controls remain neutral.
- Measurements use the data font. Instructions and longer descriptions use the UI font.
- Complete borders are reserved for equipment modules, controls, selected objects, and inset screens.
- Priority mobile controls are at least 44 by 44 CSS pixels.
- Instrument screens appear before setup controls on mobile.
- Horizontal editors may scroll inside a visibly bounded region; the page itself must never overflow.
- Motion supplements labels and shape changes and always respects reduced-motion preferences.

## Screenshot Audit Findings

Four independent reviews covered 1440, 1024, 768, and 390 pixel views.

### P0

- Reorganize SetScope mobile around one active workspace instead of stacking the entire desktop cockpit.
- Keep Pitch Gates and Audio Lab's primary instrument in the first viewport.
- Make Roulette's sequencer finger-playable and retain fixed lane context while scrolling.
- Use truthful phase language for input, readiness, play, completion, and saved states.
- Maintain readable metadata and touch targets without proportionally shrinking the interface.

### P1

- Add progressive disclosure for coaching, diagnostics, archive, advanced game setup, and source editing.
- Separate navigation from infrequent session actions while preserving Listen as the cockpit's primary command.
- Strengthen Pitch Gates' target corridor, cents feedback, and pitch history.
- Give Audio Lab an authored oscilloscope graticule and hardware-style segmented controls.
- Connect Roulette pads, lanes, playhead, and scene feedback with stable musical color roles.
- Reduce equal-weight metric cards and excessive nested borders so current, next, and reference information read differently.

### P2

- Enrich Roulette's shop with disciplined pixel-scale signage, flyers, sleeves, and discoveries.
- Add restrained tactile feedback for locks, hits, transitions, and recording state.
- Continue Journal's physical binding, stacked-page, stamp, and revision-mark details without crowding the paper.
- Add persistent screenshot comparison baselines once the responsive SetScope workspace lands.

## Implemented In This Pass

- Added the shared four-layer token foundation and room accents.
- Moved segmented controls into the shared arcade shell and repaired Audio Lab's browser-default presets.
- Shortened the standalone mobile header and normalized priority touch targets.
- Put Pitch Gates' playfield before source controls on mobile, corrected idle guidance, and added cents plus pitch-history feedback.
- Added a visible Audio Lab graticule and center calibration axis.
- Made Roulette's mobile sequencer use 44-pixel cells, horizontal scrolling, sticky lane labels, and a shape-changing playhead state.
- Converted Journal source editing into a disclosure, collapsed it by default on phones, improved reorder controls, and tightened reading hierarchy.
- Extended browser QA to distinguish bounded editors from page overflow and enforce priority mobile target sizes.
- Added seven manifest-driven room identities and shared tactile hardware
  primitives across every current product surface.
- Added three original responsive pixel-art environments plus the Beat School
  lesson stage to a living environment library.
- Added state-based room motion cues and a guaranteed 44-pixel touch contract at
  tablet and phone widths.

## Responsive Cockpit Workspaces

The SetScope cockpit now uses one explicit workspace model instead of compressing or stacking the desktop grid:

- Desktop keeps Signal, Timeline, and Track Intel visible together.
- Tablet and mobile expose sticky Signal, Timeline, and Intel tabs with a persistent selected-track readout and Listen transport.
- Selecting a track reveals Intel; review and signal actions reveal Timeline without changing the durable set draft.
- Set Coach, DJ Mentor, recognition diagnostics, capture history, tool events, and archive history become state-preserving disclosures on narrow screens.
- Session utilities move into a compact menu while Listen remains a first-class command.
- Runtime checks cover all three workspaces at phone and tablet widths, selected-track continuity, listening continuity, disclosure behavior, draft isolation, and automatic viewport reveal.

## Current Foundation

The multidisciplinary council selected a durable recognition transaction as an
earlier production domino. Signal Receipt V1 established its production and
design contracts:

- Recognition results display visible inferred or demo-story provenance.
- Pitch Gates, Audio Lab, and Rhythm Roulette expose truthful idle, ready, active, result, and saved behavior with contextual actions and textual Canvas equivalents.
- Phone and tablet layouts keep the current instrument and primary action in the first viewport; browser QA enforces that geometry.
- Roulette's heuristic is labeled Mission rather than presenting itself as an objective measure of groove.

Signal Receipt V1 now includes binary audio transport, SQLite replay persistence,
deep observation validation, and visible terminal outcomes. The adaptive practice
spine, responsive cockpit, Skill Constellation, and MIDI Playground now build on
that foundation. Current sequencing lives in `docs/NEXT_DOMINOS.md` so this design
reference does not become a competing roadmap.
