# mdbrowse — Spec

## One-liner

A CLI that spins up a local web UI to browse and preview markdown files in any directory.

## Usage

```
npx mdbrowse-cli .
npx mdbrowse-cli ./docs
npx mdbrowse-cli . --tunnel
npx mdbrowse-cli . --auth user:pass
npx mdbrowse-cli . --read-only
npx mdbrowse-cli . --no-ignore
```

## Core use case

Working on a remote server (cloud dev box, VPS) where AI coding tools (Claude Code, Codex, etc.) generate markdown files. Need to view them rendered in a browser without downloading or copy-pasting.

## Target audience

- Developers working on remote servers
- Anyone with a directory of markdown files they want to browse

## Package

- **Name:** `mdbrowse-cli`
- **Registry:** npm (published)
- **Install:** `npx mdbrowse-cli .` (zero install) or `npm install -g mdbrowse-cli`

## Features

### Core (v1)

- **File browser sidebar** — full directory tree, all file types shown
- **Markdown rendering** — GitHub-flavored markdown (tables, task lists, strikethrough)
- **Non-markdown files** — syntax-highlighted raw view
- **Live reload** — file watcher + WebSocket, auto-refreshes on file changes
- **Search** — across file names and file content
- **Edit mode** — click button to toggle edit, enabled by default
  - `--read-only` flag disables editing entirely
- **Dark/light theme** — auto-detects system preference + toggle button in UI
- **Respects `.gitignore`** — hides ignored files by default
  - `--no-ignore` flag to show everything

### Markdown features (all v1)

- GitHub-flavored markdown (remark-gfm)
- Syntax-highlighted code blocks (shiki or highlight.js)
- Mermaid diagrams (mermaid.js client-side)
- Math/LaTeX (remark-math + KaTeX)
- Frontmatter display (gray-matter)
- Relative image paths resolved correctly

### Network & access

- **Default:** `localhost:<port>`
- **`--host 0.0.0.0`** — bind to all interfaces
- **`--tunnel`** — auto-create Cloudflare Tunnel for instant public URL
- **`--auth user:pass`** — optional basic auth (works with or without tunnel)
- **`--port <number>`** — custom port

## UI

- **Style:** Minimal + screenshot-worthy
- **Layout:** sidebar file tree + main content area
- **Vibe:** clean typography, tasteful, the kind of thing devs post on Twitter

## Tech stack

- Node.js CLI
- Express or Fastify for the server
- WebSocket for live reload (chokidar for file watching)
- unified/remark ecosystem for markdown parsing
- Vanilla or lightweight frontend (keep bundle small)

## Non-goals (for now)

- Multi-user collaboration
- Authentication beyond basic auth
- Hosting/deployment as a permanent site
- Plugin system
