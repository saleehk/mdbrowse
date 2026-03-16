# Unit 2.1 — Basic Auth

**Status:** pending
**Slice:** 2 — Network & Access
**Size:** XS
**Depends on:** 1.1

## What ships
`--auth user:pass` flag protects the server with HTTP basic authentication.

## Tasks
- [ ] Add `--auth <credentials>` option to commander in `bin/mdbrowse.js`
- [ ] Parse `user:pass` string from the flag value
- [ ] Apply Hono's built-in `basicAuth` middleware to all routes in `src/server.js`
- [ ] Validate flag format (must contain `:`) and show error if malformed

## Implementation notes
- **Commander flag:** `program.option('--auth <credentials>', 'Require basic auth (user:pass)')`.
- **Hono middleware:** use `import { basicAuth } from 'hono/basic-auth'`. Apply it with `app.use('*', basicAuth({ username, password }))` only when the `--auth` flag is provided.
- **Parsing:** split on first `:` only (password may contain colons). `const [user, ...rest] = auth.split(':'); const pass = rest.join(':');`
- **WebSocket auth:** the initial HTTP upgrade request will carry the basic auth header, so Hono middleware should handle it. Verify this works.

## Done when
- `node bin/mdbrowse.js . --auth admin:secret` → browser shows basic auth prompt.
- Correct credentials → access granted.
- Wrong credentials → 401 Unauthorized.
- Without `--auth` flag → no auth required (default behavior unchanged).
