# Production Recognition Gateway

SetScope's static app and recognition API deploy independently. GitHub Pages can
point its public recognition client at an HTTPS API without moving private set
archives or journal content into that service.

## Safety Boundary

- Localhost requests keep the current zero-login development workflow.
- Public recognition and analysis requests require a valid RS256 OIDC access
  token. Missing identity configuration fails closed.
- Health and provider diagnostics remain public for deployment checks.
- Set archives and journal routes are not available to cross-origin clients.
- Recognition transactions are isolated by a hash of issuer and subject, so the
  same request ID can safely exist for two authenticated users.
- The in-process short-window limit is abuse friction, not billing enforcement.
  A durable usage ledger is still required before paid provider quotas launch.

## API Environment

```bash
SETSCOPE_BIND_HOST=0.0.0.0
SETSCOPE_PUBLIC_HOSTS=api.example.com
SETSCOPE_ALLOWED_ORIGINS=https://example.github.io
SETSCOPE_RECOGNITION_LIMIT=30
SETSCOPE_TRUST_PROXY=1
SETSCOPE_OIDC_ISSUER=https://identity.example.com
SETSCOPE_OIDC_AUDIENCE=setscope-api
SETSCOPE_OIDC_JWKS_URL=https://identity.example.com/.well-known/jwks.json
AUDD_API_TOKEN=your_server_side_token
```

Only enable `SETSCOPE_TRUST_PROXY` behind a proxy that replaces, rather than
forwards untrusted, client address headers.

## Pages Environment

Set the GitHub Actions repository variable `SETSCOPE_API_BASE_URL` to the public
HTTPS API origin. The Pages build writes the value into `runtime-config.json`.
HTTP is rejected except for loopback development.

The web authentication bootstrap must expose an asynchronous token adapter:

```js
globalThis.__SETSCOPE_AUTH__ = {
  getAccessToken: () => authProvider.getAccessToken(),
};
```

Do not place a shared API secret in `runtime-config.json` or browser JavaScript.

## Release Checks

The Pages workflow now runs the full test suite before deployment and
`npm run canary` afterward. The canary checks every product route, validates the
runtime configuration, and checks remote API health when one is configured.

## Remaining Paid-Service Work

Before charging for live recognition, add account UI, a durable per-user usage
ledger with reserve/commit/refund semantics, shared multi-instance quotas,
provider cost metrics, an independently deployed API with migrations and
rollback, and a synthetic authenticated recognition canary.
