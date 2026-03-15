# Unit 6.1 — E2E Tests (Playwright)

**Status:** pending
**Slice:** 6 — Testing
**Size:** M-L
**Depends on:** 5.1

## What ships
Automated Playwright test suite verifying all core features end-to-end in a real browser.

## Setup
- `@playwright/test` as dev dependency
- Test fixture: starts mdbrowse server on a random port pointing at `tests/fixtures/`
- Teardown: kills server after tests

## Test fixtures
```
tests/fixtures/
├── README.md              # markdown with headings, links, images
├── code-sample.js         # JS file for syntax highlight test
├── nested/
│   └── deep-file.md       # test nested navigation
├── image.png              # small test image (1x1 pixel)
├── doc-with-image.md      # markdown referencing ./image.png
├── empty.txt              # empty file
├── frontmatter.md         # markdown with YAML frontmatter
├── table.md               # markdown with GFM table
├── math.md                # markdown with KaTeX math
└── .gitignore             # ignores a file to test filtering
```

## Test suites

### 1. Navigation & File Tree
- Server starts and shows welcome screen
- File tree renders with correct files
- .gitignored files are hidden
- Click file → content loads, URL changes to /view/path
- Browser back/forward works (History API)
- Deep link: /view/nested/deep-file.md → loads correct file
- Folders are collapsible

### 2. Markdown Rendering
- Headings render as proper h1, h2, etc.
- GFM tables render with table elements
- Code blocks have syntax highlighting (shiki classes present)
- Frontmatter displays as metadata block
- Relative images resolve and display
- Math blocks render (KaTeX classes present)

### 3. Non-Markdown Files
- .js file renders with syntax highlighting
- Empty file shows content area without error
- Image file in sidebar → shows image preview

### 4. Search
- Ctrl+K focuses search input
- Type query → results appear after debounce
- Results show file names and matching lines
- Click result → navigates to file
- Clear search → file tree restores

### 5. Edit Mode
- Edit button visible (when not read-only)
- Click Edit → textarea with raw content
- Modify content → Save → file updated on disk
- Ctrl+S saves
- Tab inserts spaces
- Cancel returns to view mode
- Unsaved changes: visual indicator

### 6. Read-Only Mode
- Start server with --read-only → edit button hidden
- POST /api/file returns 403

### 7. Basic Auth
- Start server with --auth user:pass
- Unauthenticated → 401
- Authenticated → content loads

### 8. Theme
- Toggle switches dark/light
- Preference persists (localStorage)

### 9. Live Reload
- Modify file on disk → content auto-updates (WebSocket)
- Add new file → sidebar tree updates

## Implementation notes
- playwright.config.ts with webServer config to auto-start mdbrowse
- Separate test files per suite
- Use page.waitForSelector for dynamic content
- Live reload test: use fs.writeFileSync during test
- Auth test: separate server instance with --auth flag

## Done when
- `npx playwright test` passes all suites
- Tests run in CI-friendly headless mode
