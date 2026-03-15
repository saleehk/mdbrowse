# Unit 3.1 — Save Endpoint

**Status:** pending
**Slice:** 3 — Edit Mode
**Size:** S
**Depends on:** 1.1

## What ships
API endpoint to save file changes back to disk, with read-only mode support.

## Tasks
- [ ] Add `POST /api/file` endpoint in `src/server.js` that accepts `?path=...` query param and raw text body
- [ ] Reuse `safePath()` for path traversal protection
- [ ] Write the body content to the file on disk using `fs.promises.writeFile`
- [ ] Add `--read-only` flag to commander in `bin/mdbrowse.js`
- [ ] Return 403 with error message if `--read-only` mode is active
- [ ] Return 404 if file doesn't exist (prevent creating new files via API for now)

## Implementation notes
- **Endpoint:** `app.post('/api/file', async (c) => { ... })`. Read path from `c.req.query('path')`, body from `await c.req.text()`.
- **Safe path:** reuse the existing `safePath(rootDir, requestedPath)` function to resolve and validate the path.
- **Read-only flag:** `program.option('--read-only', 'Disable file editing')`. Pass the flag value to the server config. Check it before processing writes.
- **Content-Type:** accept `text/plain` body. The client will send the raw file content as text.

## Done when
- `curl -X POST "localhost:3000/api/file?path=test.md" -H "Content-Type: text/plain" -d "# Hello"` writes the content to `test.md`.
- With `--read-only`: same curl returns 403.
- Attempting path traversal (`?path=../../etc/passwd`) returns 403 or 400.
