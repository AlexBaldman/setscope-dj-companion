# Cymatics Module Integration

The cymatics project should plug into SetScope as a sibling physical-instrument
laboratory. It owns plate/fluid simulation, camera measurement, rig calibration,
and actuator control. SetScope owns musical sessions, MIDI mapping, lesson/game
orchestration, provenance, saved evidence, and the route from an experiment into
creative play.

## Scientific Boundary

“Cymatics” covers related but distinct systems:

- A solid Chladni plate is a flexural-vibration problem. Its mode shapes depend
  on geometry, thickness, density, stiffness, Poisson ratio, support conditions,
  drive position, and frequency. Granules tend to reveal low-motion nodal regions,
  but particle transport is a second model layered over the plate displacement.
- A vertically driven fluid surface is a Faraday-wave problem. Density, viscosity,
  surface tension, fluid depth, container geometry, drive frequency, and drive
  acceleration affect the instability threshold and resulting pattern.
- An artistic shader can react to audio beautifully but is not automatically a
  prediction of either physical system.

Every output must therefore be labeled **Measured**, **Simulated**, or
**Artistic**. A measured photograph and a finite-element result may be compared,
but never silently substituted for one another.

## Three-Layer Module

### 1. Resonance Core

A headless library or local service accepts
`setscope.resonance-experiment@1` and returns
`setscope.resonance-result@1`.

Solid plate engines may begin with:

- a thin-plate eigenfrequency solver
- nodal contours extracted from mode displacement
- driven-response amplitude around candidate modes
- a deliberately approximate particle-density layer

Fluid engines should remain separate:

- linear onset and dispersion estimates for fast exploration
- reduced modal/amplitude models for interactive previews
- full Navier-Stokes/free-surface simulation only as an offline high-fidelity
  option

### 2. Physical Rig Bridge

A local-only service can connect a signal generator, audio interface, amplifier,
accelerometer, camera, and eventually automated sweep control. It should expose:

- device readiness without secret or serial-number leakage
- calibrated frequency and acceleration limits
- emergency stop and watchdog state
- commanded versus measured frequency/amplitude
- synchronized camera frames and sensor readings
- experiment receipts linked to the exact hardware calibration revision

No browser page should directly energize an actuator. The bridge must enforce
hardware limits, require an explicit arm action, stop on disconnect, and default
to silence.

### 3. SetScope Room

The SetScope module can offer:

- **Mode Explorer**: sweep a safe range and bookmark resonances.
- **Prediction vs Reality**: overlay simulated nodal lines on calibrated camera
  captures and inspect error.
- **Shape Composer**: change geometry, material, support, and drive point.
- **Plate Instrument**: map MIDI notes, pads, pressure, and knobs to safe
  experiment parameters.
- **Pattern Memory**: hear a frequency, then identify or recreate its measured
  mode.
- **Resonance Hunt**: navigate toward a hidden mode using sensor and image clues.
- **Water Rhythm**: explore forcing ratios and Faraday-wave pattern transitions.
- **Sample the Plate**: turn measured resonances into an original playable
  instrument or Loop Studio texture.
- **Orbit Choir / Geometry Rooms**: use the same experiment data in educational
  visualizations while preserving the physical/artistic label.

## Portable Contract

The initial contract lives in `src/contracts/resonance-experiment.js`.

An experiment records:

- medium: solid plate, granular-on-plate, or fluid surface
- geometry and SI-unit dimensions
- material properties relevant to the selected medium
- support and drive location
- waveform, frequency, amplitude, amplitude unit, and duration
- requested outputs

A result records:

- measured, simulated, or artistic source
- model name, version, and assumptions
- resonant frequencies and observed frequency
- confidence and numerical metrics
- local artifacts such as images, video, displacement fields, spectra, and
  particle-density maps

The JSON contract can cross a Web Worker, iframe `postMessage`, Tauri command,
local HTTP/WebSocket service, or native Swift boundary without coupling SetScope
to a specific solver.

## Integration Sequence

1. Import one known plate's dimensions, material, support, and measured mode
   photographs.
2. Implement or wrap a solid-plate eigenmode solver and compare its first modes
   against the photographs.
3. Add camera calibration and a nodal-line comparison metric.
4. Make a read-only SetScope Mode Explorer using saved experiment/results.
5. Add MIDI mapping to simulation parameters.
6. Introduce the hardware bridge only after limits, arm/disarm, watchdog, and
   emergency stop behavior have independent tests.
7. Add a separate fluid-surface model and dataset; do not generalize the plate
   solver into water.
8. Feed captured resonances into Loop Studio and selected experiments into the
   Skill Constellation.

## Validation Targets

- Compare eigenfrequencies and nodal topology, not only visual resemblance.
- Record boundary conditions and drive location with every run.
- Calibrate image scale, perspective, crop, and illumination before overlays.
- Keep solver mesh/resolution and convergence notes with simulated results.
- Quantify repeatability across physical runs.
- Treat particle distribution, contamination, humidity, fluid depth, and
  surface condition as experimental variables.
- Preserve raw captures locally so later analysis can be reproduced.

## Research Basis

- COMSOL's Chladni Plate example models editable geometry, material, thickness,
  and frequency range through a plate eigenfrequency study:
  https://www.comsol.com/model/chladni-plate-67591
- Misseroni et al. compare experimental Chladni visualization with numerical
  plate simulations and emphasize boundary/fixture artifacts:
  https://www.nature.com/articles/srep23929
- Tuan et al. show that material anisotropy and drive position can redistribute
  resonant frequencies and mode shapes:
  https://www.nature.com/articles/s41598-018-29244-6
- Latifi et al. demonstrate that granular/object motion can be statistically
  modeled and controlled, reinforcing that transport is more than a static node
  contour:
  https://www.nature.com/articles/ncomms12764
- Wilson et al. experimentally measure how edge effects and fluid depth affect
  azimuthal Faraday-wave onset and spatial modes:
  https://journals.aps.org/prfluids/abstract/10.1103/PhysRevFluids.7.014803
- Périnet, Juric, and Tuckerman numerically reproduce square and hexagonal
  Faraday patterns and their spatiotemporal spectra:
  https://arxiv.org/abs/0901.0464
