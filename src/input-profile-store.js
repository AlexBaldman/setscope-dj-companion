import {
  createLatencyProfile,
  normalizeInputMappings,
} from "./contracts/input-timing.js";

export const INPUT_MAPPINGS_STORAGE_KEY = "setscope-input-mappings-v1";
export const LEGACY_INPUT_MAPPINGS_STORAGE_KEY = "setscope-midi-mappings-v1";
export const LATENCY_PROFILE_STORAGE_KEY = "setscope-latency-profile-v1";

export function loadInputMappings(storage = globalThis.localStorage) {
  try {
    const current = storage?.getItem(INPUT_MAPPINGS_STORAGE_KEY);
    const legacy = storage?.getItem(LEGACY_INPUT_MAPPINGS_STORAGE_KEY);
    const mappings = normalizeInputMappings(JSON.parse(current || legacy || "[]"));
    if (!current && mappings.length) saveInputMappings(mappings, storage);
    return mappings;
  } catch {
    return [];
  }
}

export function saveInputMappings(mappings, storage = globalThis.localStorage) {
  const normalized = normalizeInputMappings(mappings);
  storage?.setItem(INPUT_MAPPINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadLatencyProfile(storage = globalThis.localStorage) {
  try {
    return createLatencyProfile(JSON.parse(storage?.getItem(LATENCY_PROFILE_STORAGE_KEY) || "{}"));
  } catch {
    return createLatencyProfile({ profileId: "latency_default", sourceId: "*", confidence: 0 });
  }
}

export function saveLatencyProfile(profile, storage = globalThis.localStorage) {
  const normalized = createLatencyProfile(profile);
  storage?.setItem(LATENCY_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
