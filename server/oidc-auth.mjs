import { createHash, createPublicKey, verify } from "node:crypto";
import { HttpRequestError } from "./json.mjs";

const CACHE_MS = 5 * 60 * 1000;

export function createOidcAuthenticator(env = process.env, {
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  const issuer = normalizeUrl(env.SETSCOPE_OIDC_ISSUER);
  const audience = String(env.SETSCOPE_OIDC_AUDIENCE || "").trim();
  const jwksUrl = normalizeUrl(env.SETSCOPE_OIDC_JWKS_URL);
  const configured = Boolean(issuer && audience && jwksUrl);
  let cachedKeys = null;
  let cachedAt = 0;

  async function authenticate(request) {
    if (!configured) throw new HttpRequestError(503, "remote_auth_not_configured");
    const token = bearerToken(request.headers?.authorization);
    if (!token) throw new HttpRequestError(401, "authentication_required");
    const parts = token.split(".");
    if (parts.length !== 3) throw new HttpRequestError(401, "invalid_access_token");
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    if (header.alg !== "RS256" || !header.kid) throw new HttpRequestError(401, "unsupported_access_token");
    const key = await findKey(header.kid);
    if (!key) throw new HttpRequestError(401, "unknown_access_token_key");
    const validSignature = verify(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key, format: "jwk" }),
      decodeBase64Url(parts[2]),
    );
    if (!validSignature) throw new HttpRequestError(401, "invalid_access_token");
    validateClaims(payload, { issuer, audience, nowMs: now() });
    return {
      userId: payload.sub,
      tenantId: createHash("sha256").update(`${issuer}\0${payload.sub}`).digest("hex"),
      plan: typeof payload.setscope_plan === "string" ? payload.setscope_plan : "free",
      platform: String(request.headers?.["x-setscope-client-platform"] || "web").slice(0, 40),
    };
  }

  async function findKey(kid) {
    let keys = await loadKeys(false);
    let key = keys.find((candidate) => candidate.kid === kid && candidate.kty === "RSA");
    if (!key) {
      keys = await loadKeys(true);
      key = keys.find((candidate) => candidate.kid === kid && candidate.kty === "RSA");
    }
    return key || null;
  }

  async function loadKeys(force) {
    if (!force && cachedKeys && now() - cachedAt < CACHE_MS) return cachedKeys;
    let response;
    try {
      response = await fetchImpl(jwksUrl, { headers: { accept: "application/json" } });
    } catch {
      throw new HttpRequestError(503, "identity_provider_unavailable");
    }
    if (!response?.ok) throw new HttpRequestError(503, "identity_provider_unavailable");
    const body = await response.json();
    cachedKeys = Array.isArray(body?.keys) ? body.keys : [];
    cachedAt = now();
    return cachedKeys;
  }

  return { authenticate, configured };
}

function validateClaims(payload, { issuer, audience, nowMs }) {
  const nowSeconds = Math.floor(nowMs / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== issuer || !audiences.includes(audience)) {
    throw new HttpRequestError(401, "invalid_access_token_claims");
  }
  if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= nowSeconds - 30) {
    throw new HttpRequestError(401, "expired_access_token");
  }
  if (Number.isFinite(payload.nbf) && payload.nbf > nowSeconds + 60) {
    throw new HttpRequestError(401, "inactive_access_token");
  }
}

function bearerToken(value) {
  const match = String(value || "").match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] || "";
}

function decodeJson(value) {
  try {
    return JSON.parse(decodeBase64Url(value).toString("utf8"));
  } catch {
    throw new HttpRequestError(401, "invalid_access_token");
  }
}

function decodeBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url");
}

function normalizeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return "";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}
