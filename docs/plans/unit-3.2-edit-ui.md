# Unit 3.2 — Edit UI

**Status:** pending
**Slice:** 3 — Edit Mode
**Size:** M
**Depends on:** 3.1

## What ships
Toggle between rendered view and raw text editor in the browser, with save functionality.

## Tasks
- [ ] Add Edit/View toggle button to the top bar in the UI
- [ ] In edit mode, show a `<textarea>` with the raw file content
- [ ] Add a way to fetch raw file content (either a new `GET /api/file?path=...` endpoint or modify existing)
- [ ] Add Save button that POSTs content to `POST /api/file`
- [ ] After save, switch back to view mode and re-render the content
- [ ] Add `GET /api/config` endpoint (or embed config in HTML) to communicate `--read-only` status to the client
- [ ] Hide Edit button when server is in read-only mode

## Implementation notes
- **Raw content endpoint:** add `GET /api/file?path=...` that returns the raw text content of a file (not rendered HTML). This is distinct from the render endpoint.
- **UI toggle:** in `public/app.js`, add state for `editMode`. When toggling to edit mode, fetch raw content and populate a `<textarea>`. When toggling back, re-fetch rendered content.
- **Save flow:** POST textarea content → on success, toggle back to view mode, re-fetch rendered HTML.
- **Config endpoint:** `GET /api/config` returns `{ readOnly: true/false }`. Fetch on page load. If read-only, hide the Edit button entirely.
- **CSS:** style the textarea to fill the content area. Match the existing theme (dark/light).
- **Files to change:** `public/app.js` (toggle logic, fetch, save), `public/index.html` (button markup), `public/style.css` (textarea styling), `src/server.js` (new endpoints).

## Done when
- Click Edit → textarea appears with raw file content.
- Modify content, click Save → file updates on disk, view re-renders with new content.
- In `--read-only` mode, Edit button is not shown.
