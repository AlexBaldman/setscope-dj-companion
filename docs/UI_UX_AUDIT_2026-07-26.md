# UI/UX Audit - Adaptive Arcade Pass

Date: 2026-07-26

This review covers SetScope, Pitch Gates, Audio Lab, Rhythm Roulette, and the Dev
Journal at desktop, tablet, and phone sizes. The product vision is a tactile,
bright, music-history toolbelt: vinyl cockpit, pixel arcade, studio hardware,
street-print energy, and serious musical feedback.

## Product Read

The visual identity is distinctive and worth protecting. The strongest shared
idea is that every tool feels like a playable instrument, not a generic web
form. The largest usability gap was that configuration panels were louder than
the moment-to-moment learning signal.

The target loop for every learning mode is:

1. Mission
2. Live feedback
3. Result receipt
4. Recommended next move
5. Saved, clearly qualified evidence

## Implemented In This Pass

- Moved live note, target, interval, raise/hold/lower guidance, and gate progress
  into the Pitch Gates screen so the teaching signal stays visible on mobile.
- Added a target corridor, interval labels, pitch trail, orb feedback pulse, and
  distinct Hit, Near, and Miss reactions.
- Added interval-specific history, mastery, bias, streaks, and adaptive missions.
- Measured interval direction from the previous target, not from the register
  center.
- Made Near partial credit without removing a life.
- Added a round receipt with grade, accuracy, interval focus, and a next action.
- Required repeated, consistent low/high samples before calling range edges
  confirmed.
- Kept demo and guided rounds out of mastery progression; eligible evidence now
  requires microphone input and Balanced or Exact Pitch Gates assist.
- Renamed Stability to Smoothing and exposed Responsive-to-Steady intent.
- Added semantic pressed states to Pitch Gates segmented controls.
- Split Rhythm Roulette feedback into Constraint, Pocket, and Originality.
- Removed bonuses for failed Roulette constraints and exposed player edit count.
- Added mobile beat-range affordance, bar markers, edge continuation, and
  four-beat scroll snapping.
- Added deterministic tests for interval direction, custom range limits,
  near-credit behavior, repeated calibration, assisted evidence, and transparent
  Roulette scoring.

## Gameplay Follow-Up

- Added a three-step Pitch Gates launch sequence with input readiness, stable-note
  lock, a stationary preview gate, and a short 3-2-1 pre-roll.
- Added pause, resume, and restart controls that preserve deterministic round
  timing and replay.
- Split untrustworthy signal from musical misses. `NO LOCK` now protects lives,
  stays out of mastery calculations, and feeds signal diagnosis instead.
- Added octave-correction feedback to the in-screen signal readout.
- Made Rhythm Roulette begin on an empty grid so the first beat belongs to the
  player; Auto Flip remains an explicitly assisted option.
- Added live challenge progress and a visible mission-clear state.
- Required four player choices before an assisted or blank-grid loop can be
  saved.
- Converted the twelve-pad mobile sample bank into a two-row horizontal hardware
  tray so the sequencer appears much earlier.
- Converted the mobile Journal entry list into a horizontal recent-entry rail.
- Capped tablet Track Intel artwork and raised coarse-pointer filter controls to
  the shared touch target.

## Immediate Production Priorities

### Pitch Gates

- Add a previous-run ghost trail and a personal-best comparison.
- Require interval success across multiple sessions before promoting mastery.
- Add a short consonant success tick with a user-facing sound-effects level.
- Let a player explicitly label a calibration note easy, uncertain, or strained.

### SetScope Cockpit

- Give the three desktop columns explicit, consistent scroll ownership with
  sticky panel headers and overflow shadows.
- Cap Track Intel artwork around 360-420px on tablet so analysis remains above
  the fold.
- Ensure BPM and other numerical pills never ellipsize.
- Verify sticky workspace controls with keyboard focus scrolling.

### Audio Lab

- Show whether a stable lock is guided or mastery eligible before the hold starts.
- Unify detector presets and smoothing language with Pitch Gates.
- Add input health, wrong-octave guidance, and a confidence meter.
- Connect daily locks to the same interval map and progression receipt.

### Rhythm Roulette

- Score timing feel from performed input when recording becomes available;
  grid placement alone can only estimate pocket.
- Add keyboard pad controls, undo/redo, and per-lane mute/solo.
- Make assistance eligibility visible before saving.

### Journal

- Apply the shared topbar active-state treatment and remove default link styling.
- On mobile, move Entries into a drawer or recent-entry rail so paper appears
  earlier.
- Keep long titles to two responsive lines and preserve paper texture under edit
  focus.

## Shared Design System

- Amber: action and target.
- Cyan: measured information.
- Mint: confirmed success.
- Pink: recovery, review, or destructive consequence.
- Reserve 9-10px labels for decorative hardware markings; important state should
  be at least 11-12px.
- Keep primary touch targets at 44px on coarse pointers.
- Use patterns and shape as well as color for outcome states.
- Build shared AppShell, InstrumentScreen, SegmentControl, MetricRack, and
  ResultReceipt primitives as the app moves toward a component framework.

## Longer-Horizon Opportunities

- An interval constellation where notes are stations, interval relationships are
  routes, and confidence illuminates vinyl grooves.
- Replay ghosts that compare the current pitch path with the cleanest prior run.
- Cabinet skins that change art and sound design while preserving interaction
  geometry and legibility.
- Color-blind palettes, reduced-effects mode, non-audio cues, and adjustable text
  density.
- Original pixel scenes for calibration, recovery, daily progress, and mastery.

## Acceptance Standard

A production-ready learning surface should be understandable with its side rail
out of view, explain every score, never confuse assistance with mastery, preserve
player progress across tools, and pass screenshot and interaction checks at
phone, tablet, and desktop sizes.
