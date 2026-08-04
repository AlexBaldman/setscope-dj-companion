import assert from "node:assert/strict";
import { HttpRequestError } from "../server/json.mjs";
import { createFixedWindowRateLimiter } from "../server/rate-limit.mjs";
import { createRequestPolicy } from "../server/request-policy.mjs";
import { normalizeRuntimeConfig } from "../src/runtime-config.js";

const policy = createRequestPolicy({
  SETSCOPE_ALLOWED_ORIGINS: "https://alexbaldman.github.io, https://app.setscope.test",
  SETSCOPE_PUBLIC_HOSTS: "api.setscope.test",
  SETSCOPE_BIND_HOST: "0.0.0.0",
  SETSCOPE_TRUST_PROXY: "1",
});
assert.equal(policy.bindHost, "0.0.0.0");
assert.doesNotThrow(() => policy.assertRequest(request({
  host: "api.setscope.test",
  origin: "https://alexbaldman.github.io",
}), new URL("http://localhost/api/recognize")));
assert.throws(
  () => policy.assertRequest(request({ host: "attacker.test" }), new URL("http://localhost/api/health")),
  (error) => error instanceof HttpRequestError && error.code === "allowed_host_required",
);
assert.throws(
  () => policy.assertRequest(request({
    host: "api.setscope.test",
    origin: "https://attacker.test",
  }), new URL("http://localhost/api/recognize")),
  (error) => error instanceof HttpRequestError && error.code === "allowed_origin_required",
);
assert.throws(
  () => policy.assertRequest(request({
    host: "api.setscope.test",
    origin: "https://app.setscope.test",
  }), new URL("http://localhost/api/journal")),
  (error) => error instanceof HttpRequestError && error.code === "remote_route_not_available",
);
assert.equal(policy.clientKey(request({ "x-forwarded-for": "203.0.113.4, 10.0.0.1" })), "203.0.113.4");
assert.equal(policy.requiresAuthentication(request({
  host: "api.setscope.test",
}), new URL("http://localhost/api/recognize")), true, "public non-browser calls must authenticate");
assert.equal(policy.requiresAuthentication(request({
  host: "localhost:5173",
}), new URL("http://localhost/api/recognize")), false, "loopback development remains local");

let now = 1000;
const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 5000, now: () => now });
assert.equal(limiter.consume("listener").remaining, 1);
assert.equal(limiter.consume("listener").remaining, 0);
assert.throws(
  () => limiter.consume("listener"),
  (error) => error instanceof HttpRequestError && error.statusCode === 429 && error.code === "recognition_rate_limit_exceeded",
);
now = 6000;
assert.equal(limiter.consume("listener").remaining, 1);

assert.deepEqual(normalizeRuntimeConfig({ apiBaseUrl: "https://api.setscope.test/" }), {
  schemaVersion: 1,
  apiBaseUrl: "https://api.setscope.test",
});
assert.equal(normalizeRuntimeConfig({ apiBaseUrl: "javascript:alert(1)" }).apiBaseUrl, "");
assert.equal(normalizeRuntimeConfig({ apiBaseUrl: "https://user:pass@api.setscope.test" }).apiBaseUrl, "");
assert.equal(normalizeRuntimeConfig({ apiBaseUrl: "http://api.setscope.test" }).apiBaseUrl, "");
assert.equal(normalizeRuntimeConfig({ apiBaseUrl: "http://localhost:5173" }).apiBaseUrl, "http://localhost:5173");

console.log("Production gateway checks passed");

function request(headers = {}) {
  return {
    headers,
    socket: { remoteAddress: "127.0.0.1" },
  };
}
