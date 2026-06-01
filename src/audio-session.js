import { midiToFrequency } from "./pitch-analysis.js";

export function createAudioInputSession({ bufferLength = 2048, onEnded = () => {} } = {}) {
  let audioContext;
  let analyser;
  let inputStream;
  let sourceNode;
  let playbackElement;
  let playbackUrl;
  let toneOscillator;
  let toneGain;
  let sourceLabel = "none";

  async function useMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    await attachStream(stream, "MIC");
    return snapshot();
  }

  async function useSharedAudio() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      preferCurrentTab: true,
      systemAudio: "include",
    });
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("shared_audio_missing");
    }
    await attachStream(stream, "SHARED");
    return snapshot();
  }

  async function useAudioFile(file) {
    if (!file) throw new Error("audio_file_required");
    stop();
    await createContext();
    playbackUrl = URL.createObjectURL(file);
    playbackElement = new Audio(playbackUrl);
    playbackElement.loop = true;
    playbackElement.addEventListener("ended", onEnded);
    sourceNode = audioContext.createMediaElementSource(playbackElement);
    sourceNode.connect(analyser);
    sourceNode.connect(audioContext.destination);
    sourceLabel = "FILE";
    await playbackElement.play();
    return snapshot();
  }

  async function useDemoTone({ midi = 57 } = {}) {
    stop();
    await createContext();
    toneOscillator = audioContext.createOscillator();
    toneGain = audioContext.createGain();
    toneOscillator.type = "sine";
    toneGain.gain.value = 0;
    toneOscillator.frequency.value = midiToFrequency(midi);
    toneOscillator.connect(analyser);
    analyser.connect(toneGain);
    toneGain.connect(audioContext.destination);
    toneOscillator.start();
    sourceNode = toneOscillator;
    sourceLabel = "DEMO";
    return snapshot();
  }

  function setDemoFrequency(midi, glideSeconds = 0.025) {
    if (!toneOscillator || !audioContext) return false;
    toneOscillator.frequency.setTargetAtTime(midiToFrequency(midi), audioContext.currentTime, glideSeconds);
    return true;
  }

  function stop() {
    inputStream?.getTracks().forEach((track) => track.stop());
    playbackElement?.pause();
    try {
      toneOscillator?.stop();
    } catch {
      // Already stopped by the browser.
    }
    if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    sourceNode?.disconnect();
    toneGain?.disconnect();
    audioContext?.close();
    audioContext = null;
    analyser = null;
    inputStream = null;
    sourceNode = null;
    playbackElement = null;
    playbackUrl = null;
    toneOscillator = null;
    toneGain = null;
    sourceLabel = "none";
  }

  async function attachStream(stream, label) {
    stop();
    await createContext();
    inputStream = stream;
    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);
    inputStream.getTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        stop();
        onEnded();
      });
    });
    sourceLabel = label;
  }

  async function createContext() {
    audioContext = new AudioContext();
    await audioContext.resume();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = bufferLength;
  }

  function snapshot() {
    return {
      active: Boolean(analyser),
      sourceLabel,
    };
  }

  return {
    getAnalyser: () => analyser,
    getAudioContext: () => audioContext,
    getSourceLabel: () => sourceLabel,
    isActive: () => Boolean(analyser),
    setDemoFrequency,
    snapshot,
    stop,
    useAudioFile,
    useDemoTone,
    useMicrophone,
    useSharedAudio,
  };
}
