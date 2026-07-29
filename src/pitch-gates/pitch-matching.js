export const PITCH_MATCH_MODES = Object.freeze({
  pitchClass: "pitch-class",
  exactOctave: "exact-octave",
});

export function normalizePitchMatchMode(value) {
  return value === PITCH_MATCH_MODES.exactOctave
    ? PITCH_MATCH_MODES.exactOctave
    : PITCH_MATCH_MODES.pitchClass;
}

export function signedPitchDistance(inputMidi, targetMidi, mode = PITCH_MATCH_MODES.pitchClass) {
  if (!Number.isFinite(inputMidi) || !Number.isFinite(targetMidi)) return null;
  const exactDistance = inputMidi - targetMidi;
  if (normalizePitchMatchMode(mode) === PITCH_MATCH_MODES.exactOctave) return exactDistance;
  return wrapSemitones(exactDistance);
}

export function projectPitchNearTarget(inputMidi, targetMidi, mode = PITCH_MATCH_MODES.pitchClass) {
  const distance = signedPitchDistance(inputMidi, targetMidi, mode);
  return Number.isFinite(distance) ? targetMidi + distance : null;
}

export function pitchClassForMidi(midi) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const rounded = Math.round(Number(midi));
  return Number.isFinite(rounded) ? names[((rounded % 12) + 12) % 12] : "--";
}

function wrapSemitones(value) {
  const wrapped = ((value + 6) % 12 + 12) % 12 - 6;
  return wrapped === -6 && value > 0 ? 6 : wrapped;
}
