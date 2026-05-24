import { formatSeconds } from "./utils.js";

export async function importAudio(file, { addTrack, nextTimecode, setLength, setEngineStatus, showToast }) {
  if (!file) return;
  setEngineStatus("Analyzing");
  showToast("Analyzing audio");
  try {
    const buffer = await file.arrayBuffer();
    const context = new AudioContext();
    const audioBuffer = await context.decodeAudioData(buffer);
    const bpm = estimateBpm(audioBuffer);
    setLength(formatSeconds(audioBuffer.duration));
    addTrack({
      time: nextTimecode(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Imported audio",
      bpm,
      confidence: 64,
      transition: "Fade",
      wave: Math.min(92, Math.max(18, Math.round((bpm / 150) * 100))),
      era: "Imported",
      label: "Local file",
      source: "BPM estimate",
      texture: "Decoded audio",
      lineage: "Provider match pending",
      why: "This file has a local tempo estimate and is ready for recognition metadata.",
      status: "review",
      needsReview: true,
      notes:
        "Local BPM estimate from the imported file. A production build would send short fingerprints at intervals and merge provider matches into this same timeline.",
    });
    await context.close();
    setEngineStatus("Imported");
  } catch (error) {
    console.error(error);
    setEngineStatus("Needs audio");
    showToast("Could not decode audio");
  }
}

export function estimateBpm(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const blockSize = Math.floor(sampleRate * 0.05);
  const energies = [];
  for (let index = 0; index < channel.length; index += blockSize) {
    let sum = 0;
    for (let j = index; j < Math.min(index + blockSize, channel.length); j += 1) {
      sum += channel[j] * channel[j];
    }
    energies.push(Math.sqrt(sum / blockSize));
  }
  const average = energies.reduce((sum, value) => sum + value, 0) / energies.length;
  const peaks = [];
  energies.forEach((energy, index) => {
    if (energy > average * 1.45 && energy > (energies[index - 1] || 0) && energy > (energies[index + 1] || 0)) {
      peaks.push(index * 0.05);
    }
  });
  const intervalScores = new Map();
  peaks.forEach((peak, index) => {
    peaks.slice(index + 1, index + 9).forEach((next) => {
      const interval = next - peak;
      if (interval < 0.24 || interval > 2) return;
      let bpm = Math.round(60 / interval);
      while (bpm < 70) bpm *= 2;
      while (bpm > 180) bpm /= 2;
      bpm = Math.round(bpm);
      intervalScores.set(bpm, (intervalScores.get(bpm) || 0) + 1);
    });
  });
  const ranked = [...intervalScores.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || 0;
}
