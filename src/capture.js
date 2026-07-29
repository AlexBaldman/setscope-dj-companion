export async function captureAudioWindow(stream, durationMs = 4000, { signal } = {}) {
  if (!globalThis.MediaRecorder) {
    throw new Error("media_recorder_unavailable");
  }

  const mimeType = chooseMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const captureStartedAtMs = Date.now();
  return new Promise((resolve, reject) => {
    const chunks = [];
    let settled = false;
    let timer = null;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (timer !== null) globalThis.clearTimeout(timer);
      signal?.removeEventListener("abort", abortRecording);
      callback(value);
    };

    const abortRecording = () => {
      if (recorder.state !== "inactive") recorder.stop();
      finish(reject, new Error("listening_stopped"));
    };

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => finish(reject, new Error("recording_failed")));
    recorder.addEventListener("stop", async () => {
      if (settled) return;
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        finish(resolve, {
          blob,
          payload: {
            blob,
            mimeType: blob.type,
            size: blob.size,
            durationMs,
            captureStartedAtMs,
            capturedAt: new Date(captureStartedAtMs).toISOString(),
          },
        });
      } catch {
        finish(reject, new Error("recording_encode_failed"));
      }
    });
    if (signal?.aborted) {
      finish(reject, new Error("listening_stopped"));
      return;
    }
    signal?.addEventListener("abort", abortRecording, { once: true });
    recorder.start();
    timer = globalThis.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, durationMs);
  });
}

export async function createSampleAudioPayload(durationMs = 8000) {
  const captureStartedAtMs = Date.now();
  const sampleRate = 44100;
  const frameCount = Math.floor(sampleRate * (durationMs / 1000));
  const buffer = new ArrayBuffer(44 + frameCount * 2);
  const view = new DataView(buffer);
  writeWavHeader(view, { sampleRate, frameCount });

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / sampleRate;
    const kick = Math.sin(2 * Math.PI * 58 * time) * Math.exp(-8 * (time % 0.5));
    const tone = Math.sin(2 * Math.PI * (220 + 45 * Math.sin(time * 2)) * time) * 0.18;
    const hat = ((index * 1103515245) % 65536) / 65536 - 0.5;
    const hatGate = time % 0.25 < 0.035 ? 0.13 : 0;
    const sample = Math.max(-1, Math.min(1, kick * 0.55 + tone + hat * hatGate));
    view.setInt16(44 + index * 2, sample * 0x7fff, true);
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return {
    blob,
    mimeType: blob.type,
    size: blob.size,
    durationMs,
    captureStartedAtMs,
    capturedAt: new Date(captureStartedAtMs).toISOString(),
  };
}

function chooseMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
}

function writeWavHeader(view, { sampleRate, frameCount }) {
  const bytesPerSample = 2;
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + frameCount * bytesPerSample, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, frameCount * bytesPerSample, true);
}

function writeAscii(view, offset, text) {
  Array.from(text).forEach((character, index) => {
    view.setUint8(offset + index, character.charCodeAt(0));
  });
}
