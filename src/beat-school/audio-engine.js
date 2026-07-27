export function createBeatSchoolAudioEngine() {
  let context = null;
  let noiseBuffer = null;

  function ensure() {
    if (!context) {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      noiseBuffer = createNoiseBuffer(context);
    }
    if (context.state === "suspended") context.resume();
    return context;
  }

  function playPad(lane, { when = null, velocity = 0.85 } = {}) {
    const audio = ensure();
    if (!audio) return;
    const time = Number.isFinite(when) ? when : audio.currentTime;
    const level = Math.max(0.08, Math.min(1, velocity));
    if (lane === "kick") playKick(audio, time, level);
    if (lane === "snare") playNoiseHit(audio, time, level, 1050, 0.16, 170);
    if (lane === "hat") playNoiseHit(audio, time, level * 0.62, 6900, 0.055, 0);
    if (lane === "clap") [0, 0.018, 0.038].forEach((offset) => playNoiseHit(audio, time + offset, level * 0.58, 1500, 0.075, 0));
  }

  function playPattern(pattern, { startTime = null, stepDurationSec = 0.16 } = {}) {
    const audio = ensure();
    if (!audio) return 0;
    const start = Number.isFinite(startTime) ? startTime : audio.currentTime + 0.05;
    pattern.forEach((event) => playPad(event.lane, {
      when: start + event.step * stepDurationSec,
      velocity: event.velocity,
    }));
    return start;
  }

  return {
    ensure,
    playPad,
    playPattern,
    get currentTime() {
      return ensure()?.currentTime || 0;
    },
  };

  function playNoiseHit(audio, time, velocity, cutoff, duration, toneHz) {
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(cutoff, time);
    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(time);
    source.stop(time + duration + 0.02);
    if (toneHz) playTone(audio, time, toneHz, duration * 0.7, velocity * 0.34, "triangle");
  }
}

function playKick(audio, time, velocity) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(145, time);
  oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.13);
  gain.gain.setValueAtTime(velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(time);
  oscillator.stop(time + 0.25);
}

function playTone(audio, time, frequency, duration, velocity, type) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.01);
}

function createNoiseBuffer(audio) {
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.35), audio.sampleRate);
  const data = buffer.getChannelData(0);
  let value = 0;
  for (let index = 0; index < data.length; index += 1) {
    value = value * 0.35 + (Math.random() * 2 - 1) * 0.65;
    data[index] = value;
  }
  return buffer;
}
