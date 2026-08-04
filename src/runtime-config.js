const RUNTIME_CONFIG_SCHEMA_VERSION = 1;
let cachedConfigPromise;

export function loadRuntimeConfig({ fetchImpl = globalThis.fetch } = {}) {
  if (globalThis.__SETSCOPE_CONFIG__) {
    return Promise.resolve(normalizeRuntimeConfig(globalThis.__SETSCOPE_CONFIG__));
  }
  if (!cachedConfigPromise) {
    cachedConfigPromise = loadConfigFile(fetchImpl);
  }
  return cachedConfigPromise;
}

export function normalizeRuntimeConfig(input = {}) {
  return {
    schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
    apiBaseUrl: normalizeApiBaseUrl(input.apiBaseUrl),
  };
}

export function resetRuntimeConfigCache() {
  cachedConfigPromise = undefined;
}

async function loadConfigFile(fetchImpl) {
  if (typeof fetchImpl !== "function") return normalizeRuntimeConfig();
  try {
    const response = await fetchImpl(new URL("../runtime-config.json", import.meta.url), {
      cache: "no-store",
    });
    if (!response.ok) return normalizeRuntimeConfig();
    return normalizeRuntimeConfig(await response.json());
  } catch {
    return normalizeRuntimeConfig();
  }
}

function normalizeApiBaseUrl(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  try {
    const url = new URL(text);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
    if (!(url.protocol === "https:" || localHttp) || url.username || url.password || url.search || url.hash) return "";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}
