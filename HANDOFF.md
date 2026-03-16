# 🚀 Handoff: mdbrowse

## Problem

No simple way to browse and view rendered markdown files on a remote/headless server. Developers working with AI coding tools (Claude Code, Codex, etc.) generate lots of markdown files on cloud machines but have no quick way to read them rendered — it's either `cat`, `less`, or download the file.

## Solution

`mdbrowse-cli` — an open source Node CLI that spins up a local web UI to browse and preview files in any directory.

```
npx mdbrowse-cli .
```

→ Instant web server with file tree sidebar, rendered markdown, live reload, and optional Cloudflare Tunnel for remote access.

## Key Decisions

- **Name:** `mdbrowse-cli` (published on npm)
- **Ecosystem:** Node.js / npm — `npx mdbrowse-cli .` for zero-install
- **Edit mode:** enabled by default (toggle button), `--read-only` to disable
- **All files shown:** not just markdown — other files get syntax-highlighted raw view
- **Live reload:** core feature, not optional — file watcher + WebSocket
- **Cloudflare Tunnel:** built-in via `--tunnel` flag
- **Auth:** optional `--auth user:pass`, works with or without tunnel
- **UI:** minimal + screenshot-worthy, dark/light auto + toggle
- **`.gitignore` respected** by default, `--no-ignore` to override
- **Config file:** `.mdbrowse.json` in served directory for persistent settings
- **Environment variables:** `MDBROWSE_PORT`, `MDBROWSE_HOST`, `MDBROWSE_TUNNEL`, `MDBROWSE_AUTH`, `MDBROWSE_READ_ONLY`, `MDBROWSE_NO_IGNORE`
- **Priority chain:** CLI args > env vars > `.mdbrowse.json` > built-in defaults

## Scope (MVP)

**In scope:**
- CLI entry point with flags (`--port`, `--host`, `--tunnel`, `--auth`, `--read-only`, `--no-ignore`)
- `.mdbrowse.json` config file support (auto-detected in served directory)
- Environment variable defaults (`MDBROWSE_*`)
- HTTP server (Fastify)
- File tree sidebar (full directory, all file types)
- Markdown rendering: GFM, syntax highlighting (shiki), Mermaid, Math/KaTeX, frontmatter, relative images
- Non-markdown files: syntax-highlighted raw view
- Live reload via WebSocket + chokidar file watcher
- Search across file names and content
- Edit mode with toggle button
- Dark/light theme (auto + toggle)
- `.gitignore` support

**Deferred:**
- Multi-user collaboration
- Plugin system
- Permanent hosting/deployment mode
- Auth beyond basic auth

## Engineering Tasks

### Slice 1 — Core browser (start here)
- [ ] CLI entry point (`bin/mdbrowse-cli.js`) with commander
- [ ] Directory scanner (respects `.gitignore` via `ignore` package)
- [ ] Fastify HTTP server
- [ ] Markdown renderer (unified + remark-gfm + remark-html + shiki + remark-math + rehype-katex + gray-matter)
- [ ] Non-markdown syntax highlighting (shiki)
- [ ] WebSocket server (ws) + chokidar file watcher for live reload
- [ ] Web UI: sidebar file tree + main content area
- [ ] Dark/light theme (CSS prefers-color-scheme + JS toggle)
- [ ] Mermaid.js client-side rendering
- [ ] `--port`, `--host`, `--no-ignore` flags
- [ ] Path traversal protection

### Slice 2 — Network & access
- [ ] `--tunnel` flag (Cloudflare Tunnel via cloudflared)
- [ ] `--auth user:pass` (basic HTTP auth middleware)

### Slice 3 — Edit mode
- [ ] Edit toggle button in UI
- [ ] POST endpoint to write file changes back to disk
- [ ] `--read-only` flag to disable editing

### Slice 4 — Search
- [ ] Search across file names + content
- [ ] Search UI in sidebar

### Slice 5 — Polish & ship
- [ ] Screenshot-worthy CSS polish
- [ ] README with GIF/video demo
- [ ] npm publish setup
- [ ] GitHub repo (license, contributing guide)

## Tech Stack

- **CLI:** commander
- **Server:** hono + @hono/node-server (~14KB, built-in basic-auth & serve-static)
- **File watching:** chokidar
- **WebSocket:** ws
- **Markdown:** unified + remark-parse + remark-gfm + remark-html
- **Syntax highlight:** shiki
- **Math:** remark-math + rehype-katex
- **Mermaid:** mermaid.js (client-side CDN)
- **Frontmatter:** gray-matter
- **Gitignore:** ignore package
- **Frontend:** vanilla HTML/CSS/JS (History API routing, no build step)
- **Client routing:** History API — clean URLs like `/view/path/to/file.md`

## Reference Files

- `docs/references/spec.md` — full feature spec
- `docs/references/plan.md` — engineering plan with phases, slices, and architecture

## Origin

- **Idea thread:** Discord `#idea-room › Markdown web viewer cli`
- **Idea folder:** `ideas/mdbrowse/`
- **Handoff date:** 2026-03-15
