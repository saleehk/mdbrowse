# Unit 1.1 — Smoke Test & Fixes

**Status:** in-progress
**Slice:** 1 — Core Browser
**Size:** S
**Depends on:** none

## What ships
Robust handling of edge cases — binary files, empty files, large files, special characters, and port conflicts all handled gracefully.

## Tasks
- [ ] Detect binary files in renderer and show a "binary file" message instead of rendering
- [ ] Handle empty files gracefully (render blank content, no crash)
- [ ] Add size limit — files >1MB show a warning instead of rendering
- [ ] Treat no-extension files as plain text
- [ ] Encode special characters in filenames (spaces, unicode) in URLs and API calls
- [ ] Show helpful error message when port is already in use
- [ ] Verify WebSocket reconnects after server restart or connection drop

## Implementation notes
- **Binary detection:** check for null bytes in the first 8KB of the file buffer, or use a simple heuristic. In `src/renderer.js`, return a placeholder message for binary files.
- **Empty files:** ensure the render pipeline handles empty string input without error.
- **Size limit:** check `fs.stat` size before reading. Return a message like "File too large to render (X MB)".
- **No extension:** in `src/renderer.js`, default to plain text rendering when file has no extension.
- **Special chars:** use `encodeURIComponent` on file paths in the client (`public/app.js`) and `decodeURIComponent` on the server (`src/server.js`).
- **Port conflict:** catch `EADDRINUSE` error in `bin/mdbrowse.js` and print a clear message with the port number.
- **WebSocket reconnect:** in `public/app.js`, add reconnect logic with exponential backoff (already partially done — verify it works).

## Done when
- `node bin/mdbrowse.js .` serves a directory containing binary files, empty files, a 2MB file, files with spaces/unicode in names, and no-extension files — all without crashes.
- Starting on an occupied port shows "Port 3000 is already in use" (or similar).
- Kill and restart server → browser reconnects automatically.
