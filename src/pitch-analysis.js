import { PitchDetector } from "./vendor/pitchy.js";

export function createPitchAnalyzer({ bufferLength = 2048, minClarity = 0.82, minFrequency = 45, maxFrequency = 1600 } = {}) {
  let detector = PitchDetector.forFloat32Array(bufferLength);
  let buffer = new Float32Array(bufferLength);

  function reset() {
    detector = PitchDetector.forFloat32Array(bufferLength);
    buffer = new Float32Array(bufferLength);
  }

  function readFrame(session) {
    const analyser = session?.getAnalyser?.();
    const audioContext = session?.getAudioContext?.();
    if (!analyser || !audioContext) return createAnalysisFrame();

    analyser.getFloatTimeDomainData(buffer);
    const [frequency, clarity] = detector.findPitch(buffer, audioContext.sampleRate);
    if (!Number.isFinite(frequency) || clarity < minClarity || frequency < minFrequency || frequency > maxFrequency) {
      return createAnalysisFrame({ clarity, sourceLabel: session.getSourceLabel?.() });
    }

    const midi = frequencyToMidi(frequency);
    return createAnalysisFrame({
      clarity,
      frequency,
      midi,
      note: midiToNote(midi),
      sourceLabel: session.getSourceLabel?.(),
    });
  }

  return { readFrame, reset };
}

export function createAnalysisFrame({ clarity = 0, frequency = null, midi = null, note = "--", sourceLabel = "none" } = {}) {
  return {
    clarity: Number.isFinite(clarity) ? clarity : 0,
    frequency,
    midi,
    note,
    sourceLabel,
    timestamp: performance.now(),
  };
}

export function isPitchedFrame(frame) {
  return Number.isFinite(frame?.midi) && Number.isFinite(frame?.frequency);
}

export function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function midiToNote(midi) {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const rounded = Math.round(midi);
  return `${notes[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}
