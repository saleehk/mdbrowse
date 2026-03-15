# Unit 1.2 — Image Support

**Status:** in-progress
**Slice:** 1 — Core Browser
**Size:** S
**Depends on:** none

## What ships
Images referenced in markdown render inline, and clicking image files in the sidebar shows a preview.

## Tasks
- [ ] Add `GET /raw/*` route in server.js to serve raw files with correct Content-Type
- [ ] Rewrite relative image `src` attributes in rendered markdown HTML to use `/raw/` URLs
- [ ] Add image preview when clicking image files (.png, .jpg, .gif, .svg, .webp) in the sidebar
- [ ] Add MIME type mapping (or use a lightweight `mime` package)

## Implementation notes
- **Raw route:** in `src/server.js`, add a `GET /raw/*` handler that reads the file from disk and serves it with the appropriate Content-Type header. Reuse `safePath()` for traversal protection.
- **MIME types:** a simple map is sufficient: `{ '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' }`. Or install the `mime` package for comprehensive coverage.
- **Rewrite img src:** in `src/renderer.js`, after rendering markdown to HTML, use a regex or rehype plugin to rewrite relative `src` attributes on `<img>` tags. E.g., `./screenshot.png` in a file at `docs/readme.md` becomes `/raw/docs/screenshot.png`.
- **Image preview in sidebar:** in `public/app.js`, detect image extensions on file click. Instead of fetching rendered HTML, show an `<img src="/raw/path/to/image.png">` element in the content area.

## Done when
- A markdown file containing `![](./screenshot.png)` renders with the image visible.
- Clicking a `.png` file in the sidebar shows the image in the content area.
- `curl localhost:3000/raw/path/to/image.png` returns the raw image with correct Content-Type.
