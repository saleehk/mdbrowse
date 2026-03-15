# Unit 4.1 — Search Backend

**Status:** pending
**Slice:** 4 — Search
**Size:** M
**Depends on:** 1.1

## What ships
API endpoint to search across filenames and file content in the served directory.

## Tasks
- [ ] Create `src/search.js` module with search logic
- [ ] Add `GET /api/search?q=...` endpoint in `src/server.js`
- [ ] Implement filename search (substring match, case-insensitive)
- [ ] Implement content search (read files, match lines, return context)
- [ ] Return results as: `[{ path, name, matches: [{ line, lineNumber, context }] }]`
- [ ] Respect ignore rules (reuse scanner's ignore logic)
- [ ] Limit results: max 50 files, max 5 matches per file
- [ ] Skip binary files during content search

## Implementation notes
- **Search module:** `src/search.js` exports `async function search(rootDir, query, options)`. It walks the file tree (reuse scanner's file list if cached, or re-scan), filters by ignore rules, then searches.
- **Filename matching:** simple `file.toLowerCase().includes(query.toLowerCase())`.
- **Content matching:** read each file as text, split by lines, check `line.toLowerCase().includes(query.toLowerCase())`. Collect matching line numbers and surrounding context (1 line before/after).
- **Binary skip:** reuse binary detection from Unit 1.1 (null byte check on first 8KB).
- **Performance:** for large directories, consider caching the file list. Search is inherently O(n) over files — acceptable for local use, but cap total files scanned if needed.
- **Response format:**
  ```json
  {
    "results": [
      {
        "path": "docs/guide.md",
        "name": "guide.md",
        "matches": [
          { "line": "# Getting Started with Markdown", "lineNumber": 1 }
        ]
      }
    ],
    "query": "markdown",
    "totalFiles": 3
  }
  ```

## Done when
- `curl "localhost:3000/api/search?q=markdown"` returns matching files with line-level matches.
- Binary files are excluded from content results.
- `.gitignore`d files are excluded.
- Results are capped at reasonable limits.
