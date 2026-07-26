export function createRhythmRouletteAudioEngine({ AudioContextClass = globalThis.AudioContext } = {}) {
  let audioContext;

  function play(sample, step) {
    if (!sample || !AudioContextClass) return;
    ensureContext();
    const now = audioContext.currentTime;
    if (sample.lane.tone === "kick") playKick(now, sample.record.bpm);
    if (sample.lane.tone === "snare") playSnare(now);
    if (sample.lane.tone === "hat") playHat(now);
    if (sample.lane.tone === "chop") playChop(now, sample.record.bpm, step);
  }

  async function close() {
    if (audioContext && audioContext.state !== "closed") await audioContext.close();
    audioContext = undefined;
  }

  function ensureContext() {
    audioContext ||= new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();
  }

  function playKick(now, bpm) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(92 + (bpm % 12), now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  function playSnare(now) {
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = createNoiseBuffer(0.13);
    filter.type = "bandpass";
    filter.frequency.value = 1300;
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    source.connect(filter).connect(gain).connect(audioContext.destination);
    source.start(now);
  }

  function playHat(now) {
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = createNoiseBuffer(0.045);
    filter.type = "highpass";
    filter.frequency.value = 5200;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    source.connect(filter).connect(gain).connect(audioContext.destination);
    source.start(now);
  }

  function playChop(now, bpm, step) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const notes = [0, 3, 5, 7, 10, 12];
    osc.type = "sawtooth";
    osc.frequency.value = 146.83 * 2 ** (notes[(step + bpm) % notes.length] / 12);
    filter.type = "lowpass";
    filter.frequency.value = 900 + (bpm % 5) * 120;
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(filter).connect(gain).connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  function createNoiseBuffer(duration) {
    const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  return { close, play };
}
