import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = await reservePort();
const dataDirectory = await mkdtemp(join(tmpdir(), "setscope-api-smoke-"));
const baseUrl = `http://127.0.0.1:${port}`;
const recognitionRequestId = `smoke_recognition_${process.pid}`;
const serverOutput = [];
const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    AUDD_API_TOKEN: "",
    AUDD_TOKEN: "",
    PORT: String(port),
    SETSCOPE_DATA_DIR: dataDirectory,
    SETSCOPE_ALLOWED_ORIGINS: "https://app.setscope.test",
    SETSCOPE_OIDC_ISSUER: "",
    SETSCOPE_OIDC_AUDIENCE: "",
    SETSCOPE_OIDC_JWKS_URL: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on("data", (chunk) => serverOutput.push(chunk.toString()));

try {
  await waitForServer(baseUrl, server, serverOutput);

  const health = await getJson(`${baseUrl}/api/health`);
  assert.equal(health.ok, true);
  assert.equal(typeof health.recognition.activeProvider, "string");

  const diagnostics = await getJson(`${baseUrl}/api/providers/diagnostics`);
  assert.equal(diagnostics.ok, true);
  assert.equal(diagnostics.checks.some((check) => check.id === "capture-window"), true);

  const foreignHost = await rawRequest(`${baseUrl}/api/health`, { host: "attacker.example" });
  assert.equal(foreignHost.status, 403);
  assert.equal(foreignHost.body.error, "allowed_host_required");

  const foreignOrigin = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker.example",
    },
    body: JSON.stringify({ tracks: [] }),
  });
  assert.equal(foreignOrigin.status, 403);
  assert.equal((await foreignOrigin.json()).error, "allowed_origin_required");

  const preflight = await fetch(`${baseUrl}/api/recognize`, {
    method: "OPTIONS",
    headers: { origin: "https://app.setscope.test" },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://app.setscope.test");

  const remoteAnalysis = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://app.setscope.test",
    },
    body: JSON.stringify({ tracks: [] }),
  });
  assert.equal(remoteAnalysis.status, 503);
  assert.equal(remoteAnalysis.headers.get("access-control-allow-origin"), "https://app.setscope.test");
  assert.equal((await remoteAnalysis.json()).error, "remote_auth_not_configured");

  const remoteJournal = await fetch(`${baseUrl}/api/journal`, {
    headers: { origin: "https://app.setscope.test" },
  });
  assert.equal(remoteJournal.status, 403);
  assert.equal((await remoteJournal.json()).error, "remote_route_not_available");

  const audioBytes = Buffer.from("UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=", "base64");
  const recognition = await postAudio(`${baseUrl}/api/recognize`, audioBytes, {
    requestId: recognitionRequestId,
    cursor: 0,
    durationMs: 8000,
    demoMode: true,
  });
  assert.equal(recognition.audio.hasData, true);
  assert.equal(recognition.match.raw.audio.bytes, undefined);
  assert.equal(typeof recognition.match.title, "string");
  assert.equal(recognition.transaction.replayed, false);
  assert.equal(recognition.observation.requestId, recognitionRequestId);

  const replayedRecognition = await postAudio(`${baseUrl}/api/recognize`, audioBytes, {
    requestId: recognitionRequestId,
    cursor: 999,
    durationMs: 8000,
    demoMode: true,
  });
  assert.equal(replayedRecognition.transaction.replayed, true);
  assert.equal(replayedRecognition.match.title, recognition.match.title);

  const analysis = await postJson(`${baseUrl}/api/analyze`, {
    tracks: [recognition.match],
  });
  assert.equal(analysis.trackCount, 1);

  const malformed = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, "invalid_json");

  const invalidSet = await fetch(`${baseUrl}/api/sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ set: { name: "Missing tracks" } }),
  });
  assert.equal(invalidSet.status, 422);
  assert.equal((await invalidSet.json()).error, "invalid_set");

  const archiveId = `set_smoke_${process.pid}`;
  const savedSet = await postJson(`${baseUrl}/api/sets`, {
    set: {
      id: archiveId,
      name: "Smoke archive",
      skin: "vinyl",
      recognitionCursor: 0,
      captureLog: [],
      audioEvents: [{ id: "smoke-event", type: "instrument", title: "Interval ear drill", labels: ["practice"] }],
      tracks: [{
        id: "smoke-track",
        time: "00:00",
        title: "Smoke Track",
        artist: "SetScope",
        transition: "Echo blend",
        tags: ["golden-era"],
      }],
    },
  });
  assert.equal(savedSet.set.id, archiveId);
  assert.equal(savedSet.set.trackCount, 1);
  const archiveList = await getJson(`${baseUrl}/api/sets`);
  assert.equal(archiveList.sets.some((set) => set.id === archiveId), true);
  const trackSearch = await getJson(`${baseUrl}/api/sets?q=${encodeURIComponent("golden echo")}`);
  assert.equal(trackSearch.query, "golden echo");
  assert.equal(trackSearch.sets[0].id, archiveId);
  assert.equal(trackSearch.sets[0].matches[0].label, "Track");
  const evidenceSearch = await getJson(`${baseUrl}/api/sets?q=${encodeURIComponent("interval drill")}`);
  assert.equal(evidenceSearch.sets[0].matches[0].label, "Practice");
  assert.equal((await getJson(`${baseUrl}/api/sets?q=not-a-real-match`)).sets.length, 0);
  const loadedSet = await getJson(`${baseUrl}/api/sets/${archiveId}`);
  assert.equal(loadedSet.set.schemaVersion, 2);
  assert.equal(loadedSet.set.tracks[0].title, "Smoke Track");

  const oversized = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ padding: "x".repeat(1024 * 1024) }),
  });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error, "payload_too_large");

  console.log("API smoke checks passed");
} finally {
  server.kill();
}

async function waitForServer(url, child, output) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8000) {
    if (child.exitCode !== null) throw new Error(`server_exited: ${output.join("").trim()}`);
    try {
      await getJson(`${url}/api/health`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw new Error(`server_start_timeout: ${output.join("").trim()}`);
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => resolve(address.port));
    });
  });
}

async function getJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.json();
}

function rawRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          status: response.statusCode,
          body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
        });
      });
    });
    request.once("error", reject);
    request.end();
  });
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.ok, true);
  return response.json();
}

async function postAudio(url, body, { requestId, cursor = 0, durationMs = 8000, demoMode = false } = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "audio/wav",
      "x-setscope-cursor": String(cursor),
      "x-setscope-request-id": requestId,
      "x-setscope-session-id": "session_smoke_001",
      "x-setscope-set-elapsed-ms": "12000",
      "x-setscope-window-ms": String(durationMs),
      "x-setscope-demo": demoMode ? "1" : "0",
    },
    body,
  });
  assert.equal(response.ok, true);
  return response.json();
}
