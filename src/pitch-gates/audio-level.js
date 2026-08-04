import { PitchDetector } from "../vendor/pitchy.js";

const FOCUS_CONFIG = Object.freeze({
  melody: {
    label: "Upper contour",
    minMidi: 52,
    maxMidi: 84,
    highpassHz: 120,
    lowpassHz: 1800,
  },
  bass: {
    label: "Low contour",
    minMidi: 28,
    maxMidi: 60,
    highpassHz: 35,
    lowpassHz: 360,
  },
});

export async function analyzeAudioFileForPractice(file, {
  focus = "melody",
  maxDurationSec = 90,
  sampleEverySec = 0.22,
} = {}) {
  if (!file) throw new Error("audio_file_required");
  const config = FOCUS_CONFIG[focus] || FOCUS_CONFIG.melody;
  const context = new AudioContext();
  try {
    const sourceBuffer = await context.decodeAudioData(await file.arrayBuffer());
    const durationSec = Math.min(sourceBuffer.duration, maxDurationSec);
    const rendered = await renderFocusBand(sourceBuffer, config, durationSec);
    const frames = detectPitchFrames(rendered, {
      minMidi: config.minMidi,
      maxMidi: config.maxMidi,
      sampleEverySec,
    });
    return createPracticeLevelFromFrames(frames, {
      focus,
      fileName: file.name,
      durationSec,
    });
  } finally {
    await context.close().catch(() => {});
  }
}

export function createPracticeLevelFromFrames(frames = [], {
  focus = "melody",
  fileName = "Imported audio",
  durationSec = 0,
  targetCount = 12,
} = {}) {
  const config = FOCUS_CONFIG[focus] || FOCUS_CONFIG.melody;
  const stable = frames
    .filter((frame) => Number.isFinite(frame?.midi) && Number(frame.clarity) >= 0.62)
    .map((frame) => ({
      atSec: Number(frame.atSec) || 0,
      midi: Math.round(frame.midi),
      clarity: Math.max(0, Math.min(1, Number(frame.clarity) || 0)),
    }));
  const contour = collapseContour(stable);
  const selected = evenlySample(contour, targetCount);
  if (selected.length < 4) {
    return {
      status: "insufficient",
      focus,
      focusLabel: config.label,
      fileName,
      durationSec,
      detectedFrames: stable.length,
      confidence: 0,
      targetMidiSequence: [],
      detail: "No stable monophonic contour was found. Try a cleaner vocal, bass, or solo-instrument passage.",
    };
  }
  const confidence = Math.min(0.86, (
    selected.reduce((sum, frame) => sum + frame.clarity, 0) / selected.length
  ) * Math.min(1, stable.length / 18));
  return {
    status: "ready",
    focus,
    focusLabel: config.label,
    fileName,
    durationSec,
    detectedFrames: stable.length,
    confidence,
    targetMidiSequence: selected.map((frame) => frame.midi),
    detail: `${selected.length} targets estimated from the ${config.label.toLowerCase()}. This is a dominant-pitch contour, not isolated stems.`,
  };
}

async function renderFocusBand(sourceBuffer, config, durationSec) {
  const length = Math.max(1, Math.floor(durationSec * sourceBuffer.sampleRate));
  const offline = new OfflineAudioContext(1, length, sourceBuffer.sampleRate);
  const source = offline.createBufferSource();
  const highpass = offline.createBiquadFilter();
  const lowpass = offline.createBiquadFilter();
  source.buffer = sourceBuffer;
  highpass.type = "highpass";
  highpass.frequency.value = config.highpassHz;
  lowpass.type = "lowpass";
  lowpass.frequency.value = config.lowpassHz;
  source.connect(highpass).connect(lowpass).connect(offline.destination);
  source.start(0, 0, durationSec);
  return offline.startRendering();
}

function detectPitchFrames(audioBuffer, { minMidi, maxMidi, sampleEverySec }) {
  const windowSize = 4096;
  const detector = PitchDetector.forFloat32Array(windowSize);
  const data = audioBuffer.getChannelData(0);
  const step = Math.max(1, Math.floor(audioBuffer.sampleRate * sampleEverySec));
  const frames = [];
  for (let offset = 0; offset + windowSize <= data.length; offset += step) {
    const window = data.subarray(offset, offset + windowSize);
    if (rootMeanSquare(window) < 0.012) continue;
    const [frequency, clarity] = detector.findPitch(window, audioBuffer.sampleRate);
    if (!Number.isFinite(frequency) || clarity < 0.62) continue;
    const midi = 69 + 12 * Math.log2(frequency / 440);
    if (midi < minMidi || midi > maxMidi) continue;
    frames.push({ atSec: offset / audioBuffer.sampleRate, midi, clarity });
  }
  return frames;
}

function collapseContour(frames) {
  const contour = [];
  for (const frame of frames) {
    const previous = contour.at(-1);
    if (previous && previous.midi === frame.midi) {
      if (frame.clarity > previous.clarity) contour[contour.length - 1] = frame;
    } else {
      contour.push(frame);
    }
  }
  return contour;
}

function evenlySample(frames, count) {
  if (frames.length <= count) return frames;
  return Array.from({ length: count }, (_, index) => (
    frames[Math.round(index * (frames.length - 1) / Math.max(1, count - 1))]
  ));
}

function rootMeanSquare(samples) {
  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) sum += samples[index] ** 2;
  return Math.sqrt(sum / samples.length);
}
