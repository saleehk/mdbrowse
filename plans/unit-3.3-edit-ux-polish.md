# Unit 3.3 — Edit UX Polish

**Status:** pending
**Slice:** 3 — Edit Mode
**Size:** S
**Depends on:** 3.2

## What ships
Polished editing experience with keyboard shortcuts, unsaved change warnings, and smart textarea behavior.

## Tasks
- [ ] Add Ctrl+S / Cmd+S keyboard shortcut to save
- [ ] Add `beforeunload` warning when there are unsaved changes
- [ ] Auto-resize textarea to fit content height
- [ ] Override Tab key to insert 2 spaces instead of moving focus
- [ ] Add visual indicator for unsaved changes (e.g., dot on the Save button or changed button color)

## Implementation notes
- **Ctrl+S:** add a `keydown` listener on the document. Check `e.ctrlKey || e.metaKey` and `e.key === 's'`. Call `e.preventDefault()` and trigger save. Only active in edit mode.
- **beforeunload:** set a `dirty` flag when textarea content changes. Add `window.addEventListener('beforeunload', ...)` that calls `e.preventDefault()` if dirty. Clear the flag on save.
- **Auto-resize:** on textarea `input` event, set `textarea.style.height = 'auto'` then `textarea.style.height = textarea.scrollHeight + 'px'`. Also run on initial load.
- **Tab key:** on textarea `keydown`, if `e.key === 'Tab'`, prevent default, insert 2 spaces at cursor position using `selectionStart`/`selectionEnd`.
- **Unsaved indicator:** add a CSS class like `.unsaved` to the Save button when dirty, changing its color or adding a dot.
- **Files:** all changes in `public/app.js` and `public/style.css`.

## Done when
- Ctrl+S saves the file without browser's save dialog.
- Tab key inserts spaces in the textarea.
- Modifying text shows a visual "unsaved" indicator.
- Navigating away with unsaved changes triggers a browser warning.
