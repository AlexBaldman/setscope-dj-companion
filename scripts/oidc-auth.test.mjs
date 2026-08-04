import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { createOidcAuthenticator } from "../server/oidc-auth.mjs";

const issuer = "https://identity.setscope.test";
const audience = "setscope-api";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
Object.assign(jwk, { alg: "RS256", kid: "key-1", use: "sig" });
const authenticator = createOidcAuthenticator({
  SETSCOPE_OIDC_ISSUER: issuer,
  SETSCOPE_OIDC_AUDIENCE: audience,
  SETSCOPE_OIDC_JWKS_URL: `${issuer}/.well-known/jwks.json`,
}, {
  fetchImpl: async () => Response.json({ keys: [jwk] }),
  now: () => Date.parse("2026-08-04T12:00:00.000Z"),
});

const token = jwt({
  iss: issuer,
  aud: audience,
  sub: "user-123",
  exp: Math.floor(Date.parse("2026-08-04T13:00:00.000Z") / 1000),
  setscope_plan: "pro",
});
const principal = await authenticator.authenticate(request(`Bearer ${token}`));
assert.equal(principal.userId, "user-123");
assert.equal(principal.plan, "pro");
assert.equal(principal.platform, "web");
assert.match(principal.tenantId, /^[a-f0-9]{64}$/);

await assert.rejects(
  () => authenticator.authenticate(request("")),
  (error) => error.statusCode === 401 && error.code === "authentication_required",
);
const unavailable = createOidcAuthenticator({});
await assert.rejects(
  () => unavailable.authenticate(request(`Bearer ${token}`)),
  (error) => error.statusCode === 503 && error.code === "remote_auth_not_configured",
);

console.log("OIDC authentication checks passed");

function jwt(payload) {
  const header = encode({ alg: "RS256", kid: "key-1", typ: "JWT" });
  const body = encode(payload);
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${body}`), privateKey).toString("base64url");
  return `${header}.${body}.${signature}`;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function request(authorization) {
  return { headers: { authorization, "x-setscope-client-platform": "web" } };
}
