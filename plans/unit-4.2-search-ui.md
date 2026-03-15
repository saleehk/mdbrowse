# Unit 4.2 — Search UI

**Status:** pending
**Slice:** 4 — Search
**Size:** M
**Depends on:** 4.1

## What ships
Search input in the sidebar with live results — type a query, see matching files and content, click to navigate.

## Tasks
- [ ] Add search input field at top of sidebar
- [ ] Implement debounced input handler (300ms) that calls `GET /api/search?q=...`
- [ ] Display results grouped by file, with match line previews
- [ ] Click a result to navigate to that file
- [ ] Add Ctrl+K / Cmd+K keyboard shortcut to focus the search input
- [ ] Add clear button (X) to reset search and restore file tree
- [ ] Show empty state when no results found
- [ ] Show file tree when search input is empty

## Implementation notes
- **Sidebar layout:** the search input goes above the file tree. When a search is active, the file tree is replaced by search results. Clearing search restores the file tree.
- **Debounce:** use a simple `setTimeout`/`clearTimeout` debounce. Don't search on every keystroke.
- **Results display:** each result shows the file name/path as a header, with matching lines indented below. Highlight the matching text with `<mark>` tags.
- **Navigation:** clicking a result calls the existing file navigation function with the file's path.
- **Ctrl+K:** add a global `keydown` listener. `e.preventDefault()` to avoid browser default. Focus the search input and select all text.
- **CSS:** style search input to match sidebar theme. Style results with proper spacing, hover states, and match highlighting.
- **Files:** `public/app.js` (search logic, UI), `public/index.html` (search input markup), `public/style.css` (search styles).

## Done when
- Type in search → results appear after brief pause.
- Results show file names with matching line previews.
- Click a result → navigates to that file.
- Ctrl+K focuses the search input.
- Clearing search restores the file tree.
