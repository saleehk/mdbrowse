# Unit 2.2 — Cloudflare Tunnel

**Status:** pending
**Slice:** 2 — Network & Access
**Size:** S
**Depends on:** 1.1

## What ships
`--tunnel` flag creates an instant public URL via Cloudflare Tunnel — no account or config needed.

## Tasks
- [ ] Add `--tunnel` flag to commander in `bin/mdbrowse.js`
- [ ] Create `src/tunnel.js` module that spawns `cloudflared tunnel --url http://localhost:<port>`
- [ ] Parse the `.trycloudflare.com` URL from cloudflared's stdout/stderr
- [ ] Print the tunnel URL to the console
- [ ] Clean up the cloudflared child process on SIGINT/SIGTERM/exit
- [ ] Handle `cloudflared` not being installed with a helpful error message and install instructions

## Implementation notes
- **Spawn:** use `child_process.spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`])`. cloudflared prints to stderr, not stdout.
- **Parse URL:** listen on the `stderr` stream for a line matching `https://[a-z0-9-]+\.trycloudflare\.com`. It may take a few seconds to appear.
- **Cleanup:** register handlers for `process.on('SIGINT')`, `process.on('SIGTERM')`, and `process.on('exit')` to call `child.kill()`.
- **Not installed:** catch `ENOENT` spawn error. Print: "cloudflared is not installed. Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
- **Export:** export a function like `startTunnel(port)` that returns a promise resolving to the tunnel URL.

## Done when
- `node bin/mdbrowse.js . --tunnel` prints a `.trycloudflare.com` URL that serves the app publicly.
- Ctrl+C cleanly stops both the server and the tunnel.
- Running without `cloudflared` installed shows a clear error with install link.
