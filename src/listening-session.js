export const listeningCadences = [8000, 15000, 30000, 60000];

export function normalizeListeningCadence(value, fallback = 15000) {
  const parsed = Number(value);
  return listeningCadences.includes(parsed) ? parsed : fallback;
}

export function createListeningSession({
  acquireStream,
  captureWindow,
  recognize,
  onMatch = () => {},
  onError = () => {},
  onState = () => {},
  now = () => Date.now(),
  maxConsecutiveErrors = 3,
} = {}) {
  if (typeof acquireStream !== "function" || typeof captureWindow !== "function" || typeof recognize !== "function") {
    throw new Error("listening_session_dependencies_required");
  }

  let active = false;
  let abortController = null;
  let stream = null;
  let sessionToken = 0;
  let waitTimer = null;
  let releaseWait = null;
  let state = createInitialState();

  function snapshot() {
    return { ...state, active };
  }

  function emit(patch = {}) {
    state = { ...state, ...patch };
    onState(snapshot());
  }

  async function start({ cadenceMs = 15000, windowMs = 8000 } = {}) {
    if (active) return false;
    const token = ++sessionToken;
    active = true;
    abortController = new AbortController();
    state = {
      ...createInitialState(),
      cadenceMs: normalizeListeningCadence(cadenceMs),
      startedAt: now(),
      windowMs: Math.max(1000, Number(windowMs) || 8000),
    };
    emit({ phase: "requesting" });

    try {
      stream = await acquireStream({ signal: abortController.signal });
    } catch (error) {
      if (token !== sessionToken || !active) return false;
      active = false;
      emit({ phase: "error", lastError: error?.message || "microphone_unavailable" });
      cleanup();
      throw error;
    }

    if (token !== sessionToken || !active) {
      stopTracks(stream);
      stream = null;
      return false;
    }

    void runLoop(token);
    return true;
  }

  async function runLoop(token) {
    while (active && token === sessionToken) {
      const cycleStartedAt = now();
      emit({
        cycleCount: state.cycleCount + 1,
        lastError: "",
        nextCaptureAt: null,
        phase: "capturing",
      });

      try {
        const capture = await captureWindow(stream, state.windowMs, { signal: abortController.signal });
        if (!active || token !== sessionToken) break;
        emit({ phase: "recognizing" });
        const match = await recognize(capture, { signal: abortController.signal });
        if (!active || token !== sessionToken) break;
        emit({
          consecutiveErrors: 0,
          lastMatch: match,
          matchCount: state.matchCount + 1,
        });
        onMatch(match, snapshot());
      } catch (error) {
        if (!active || token !== sessionToken || abortController.signal.aborted) break;
        const consecutiveErrors = state.consecutiveErrors + 1;
        emit({
          consecutiveErrors,
          errorCount: state.errorCount + 1,
          lastError: error?.message || "recognition_failed",
        });
        onError(error, snapshot());
        if (consecutiveErrors >= maxConsecutiveErrors) {
          active = false;
          emit({ phase: "error" });
          cleanup();
          return;
        }
      }

      if (!active || token !== sessionToken) break;
      const elapsed = Math.max(0, now() - cycleStartedAt);
      const waitMs = Math.max(0, state.cadenceMs - elapsed);
      emit({ nextCaptureAt: now() + waitMs, phase: "waiting" });
      await waitForNextCycle(waitMs, token);
    }

    if (token === sessionToken) cleanup();
  }

  function stop() {
    if (!active && state.phase === "idle") return false;
    active = false;
    sessionToken += 1;
    abortController?.abort();
    cancelWait();
    cleanup();
    emit({ nextCaptureAt: null, phase: "idle", stoppedAt: now() });
    return true;
  }

  function waitForNextCycle(waitMs, token) {
    if (waitMs <= 0 || !active || token !== sessionToken) return Promise.resolve();
    return new Promise((resolve) => {
      releaseWait = resolve;
      waitTimer = globalThis.setTimeout(() => {
        waitTimer = null;
        releaseWait = null;
        resolve();
      }, waitMs);
    });
  }

  function cancelWait() {
    if (waitTimer !== null) globalThis.clearTimeout(waitTimer);
    waitTimer = null;
    const resolve = releaseWait;
    releaseWait = null;
    resolve?.();
  }

  function cleanup() {
    cancelWait();
    stopTracks(stream);
    stream = null;
    abortController = null;
  }

  return {
    getState: snapshot,
    isActive: () => active,
    start,
    stop,
  };
}

function createInitialState() {
  return {
    cadenceMs: 15000,
    consecutiveErrors: 0,
    cycleCount: 0,
    errorCount: 0,
    lastError: "",
    lastMatch: null,
    matchCount: 0,
    nextCaptureAt: null,
    phase: "idle",
    startedAt: null,
    stoppedAt: null,
    windowMs: 8000,
  };
}

function stopTracks(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}
