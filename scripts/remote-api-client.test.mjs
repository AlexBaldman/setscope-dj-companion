import assert from "node:assert/strict";

const requests = [];
globalThis.window = { location: { hostname: "alexbaldman.github.io", search: "" } };
globalThis.location = globalThis.window.location;
globalThis.__SETSCOPE_CONFIG__ = { apiBaseUrl: "https://api.setscope.test/" };
globalThis.__SETSCOPE_AUTH__ = { getAccessToken: async () => "test-access-token" };
globalThis.fetch = async (url, options = {}) => {
  requests.push({ url: String(url), options });
  if (String(url).endsWith("/api/health")) {
    return Response.json({ ok: true, provider: "audd", recognition: { activeProvider: "audd" } });
  }
  if (String(url).endsWith("/api/providers/diagnostics")) {
    return Response.json({ ok: true, checks: [] });
  }
  if (String(url).endsWith("/api/recognize")) {
    return Response.json({ outcome: "unmatched", cursor: 2 });
  }
  if (String(url).endsWith("/api/analyze")) {
    return Response.json({ trackCount: 1, bpmRange: "94-94", reviewCount: 0 });
  }
  throw new Error(`unexpected_fetch:${url}`);
};

const { analyzeSet, getApiHealth, getProviderDiagnostics, recognizeWindow } = await import("../src/api.js");

assert.equal((await getApiHealth()).provider, "audd");
assert.equal((await getProviderDiagnostics()).ok, true);
const recognition = await recognizeWindow({
  audio: { blob: new Blob(["audio"], { type: "audio/webm" }), durationMs: 8000 },
  cursor: 1,
  requestId: "remote_request_001",
  sessionId: "remote_session_001",
  setElapsedMs: 12_000,
});
assert.equal(recognition.outcome, "unmatched");
assert.equal((await analyzeSet([{ bpm: 94 }])).trackCount, 1);
assert.deepEqual(requests.map((request) => request.url), [
  "https://api.setscope.test/api/health",
  "https://api.setscope.test/api/providers/diagnostics",
  "https://api.setscope.test/api/recognize",
  "https://api.setscope.test/api/analyze",
]);
assert.equal(requests[2].options.headers["x-setscope-request-id"], "remote_request_001");
assert.equal(requests[2].options.headers.authorization, "Bearer test-access-token");
assert.equal(requests[2].options.headers["x-setscope-client-platform"], "web");
assert.equal(requests[2].options.body.size, 5);

console.log("Remote API client checks passed");
