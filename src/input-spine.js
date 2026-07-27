import {
  createLatencyProfile,
  createMusicalAction,
  mappingMatchesObservation,
  normalizeInputMappings,
} from "./contracts/input-timing.js";

export function createMusicalClock({
  bpm = 90,
  beatsPerBar = 4,
  stepsPerBeat = 4,
  originTimeMs = 0,
} = {}) {
  let state = normalizeClock({ bpm, beatsPerBar, stepsPerBeat, originTimeMs });

  return {
    get state() {
      return { ...state };
    },
    positionAt(timeMs) {
      return positionAt(state, timeMs);
    },
    timeAt({ bar = 1, beat = 1, step = 1 } = {}) {
      const absoluteBeat = Math.max(0, (bar - 1) * state.beatsPerBar + (beat - 1) + (step - 1) / state.stepsPerBeat);
      return state.originTimeMs + absoluteBeat * beatDurationMs(state);
    },
    restart(timeMs = 0) {
      state = { ...state, originTimeMs: finite(timeMs, 0) };
      return { ...state };
    },
    setTempo(nextBpm, timeMs = state.originTimeMs) {
      state = normalizeClock({ ...state, bpm: nextBpm, originTimeMs: timeMs });
      return { ...state };
    },
  };
}

export function createSemanticInputSpine({
  sessionId = "",
  clock = createMusicalClock(),
  mappings = [],
  latencyProfiles = [],
} = {}) {
  let currentMappings = normalizeInputMappings(mappings);
  let currentProfiles = latencyProfiles.map((profile) => createLatencyProfile(profile));
  let actionCursor = 0;

  return {
    clock,
    setMappings(nextMappings) {
      currentMappings = normalizeInputMappings(nextMappings);
      return [...currentMappings];
    },
    setLatencyProfiles(nextProfiles) {
      currentProfiles = nextProfiles.map((profile) => createLatencyProfile(profile));
      return [...currentProfiles];
    },
    receive(observation, { receivedAtMs = observation?.timestampMs || 0, audioTimeSec = null } = {}) {
      const mapping = currentMappings.find((candidate) => mappingMatchesObservation(candidate, observation));
      if (!mapping) return null;
      const profile = findLatencyProfile(currentProfiles, observation?.sourceId);
      const compensationMs = profile.inputLatencyMs + profile.outputLatencyMs;
      const correctedAtMs = finite(observation?.timestampMs, receivedAtMs) - compensationMs;
      actionCursor += 1;
      return createMusicalAction({
        actionId: `${sessionId || "input"}_action_${actionCursor}`,
        sessionId,
        action: mapping.action,
        observation,
        receivedAtMs,
        correctedAtMs,
        audioTimeSec,
        position: clock.positionAt(correctedAtMs),
        latencyProfile: profile,
      });
    },
  };
}

function positionAt(clock, timeMs) {
  const elapsedMs = Math.max(0, finite(timeMs, clock.originTimeMs) - clock.originTimeMs);
  const absoluteBeat = elapsedMs / beatDurationMs(clock);
  const barOffset = Math.floor(absoluteBeat / clock.beatsPerBar);
  const beatInBar = absoluteBeat - barOffset * clock.beatsPerBar;
  const beatOffset = Math.floor(beatInBar);
  const beatFraction = beatInBar - beatOffset;
  const stepOffset = Math.min(clock.stepsPerBeat - 1, Math.floor(beatFraction * clock.stepsPerBeat));
  return {
    bar: barOffset + 1,
    beat: beatOffset + 1,
    step: stepOffset + 1,
    tick: Math.round(beatFraction * 960),
    absoluteBeat: round(absoluteBeat, 6),
    phase: round(beatFraction, 6),
  };
}

function findLatencyProfile(profiles, sourceId) {
  return profiles.find((profile) => profile.sourceId === sourceId)
    || profiles.find((profile) => profile.sourceId === "*")
    || createLatencyProfile({ profileId: "latency_default", sourceId: "*", confidence: 0 });
}

function normalizeClock(input) {
  return {
    bpm: clamp(input.bpm, 30, 300),
    beatsPerBar: Math.max(1, Math.floor(finite(input.beatsPerBar, 4))),
    stepsPerBeat: Math.max(1, Math.floor(finite(input.stepsPerBeat, 4))),
    originTimeMs: finite(input.originTimeMs, 0),
  };
}

function beatDurationMs(clock) {
  return 60000 / clock.bpm;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, finite(value, minimum)));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
