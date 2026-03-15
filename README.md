# mdbrowse

**Browse and preview markdown files in any directory.**

[![npm version](https://img.shields.io/npm/v/mdbrowse)](https://www.npmjs.com/package/mdbrowse)
[![license](https://img.shields.io/npm/l/mdbrowse)](LICENSE)

Zero-install CLI that spins up a local web UI with a file tree, rendered markdown, live reload, and optional Cloudflare Tunnel for remote access.

<!-- TODO: Add screenshot here -->
<!-- ![mdbrowse screenshot](docs/screenshot.png) -->

## Quick start

```bash
npx mdbrowse .           # serve current directory
npx mdbrowse ./docs      # serve a specific folder
npx mdbrowse . --tunnel  # expose via Cloudflare Tunnel
```

Opens in your browser automatically. On SSH/headless servers, grab the printed URL.

## Features

- 📁 **File tree sidebar** — browse all files in the directory
- 📝 **Markdown rendering** — GFM tables, task lists, strikethrough, and more
- 🎨 **Syntax highlighting** — VS Code-quality code blocks via Shiki
- 🔢 **Math & diagrams** — LaTeX math (KaTeX) and Mermaid diagrams
- 📋 **Frontmatter** — YAML frontmatter displayed as a clean table
- 🔴 **Live reload** — auto-refreshes when files change on disk
- ✏️ **Edit mode** — toggle to edit, Ctrl+S to save, tab indentation
- 🔍 **Search** — filename + content search, Ctrl+K to open
- 🌗 **Dark / light theme** — auto-detects system preference, with toggle
- 🌐 **Cloudflare Tunnel** — instant public URL with `--tunnel`
- 🔒 **Basic auth** — protect access with `--auth user:pass`
- 🚫 **Read-only mode** — disable editing with `--read-only`

## CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `[directory]` | `.` | Directory to serve |
| `-p, --port <number>` | `3000` | Port to listen on |
| `--host <address>` | `localhost` | Host to bind to (use `0.0.0.0` for all interfaces) |
| `--tunnel` | off | Expose via Cloudflare Tunnel (requires `cloudflared`) |
| `--auth <user:pass>` | off | Require basic HTTP authentication |
| `--read-only` | off | Disable file editing |
| `--no-ignore` | off | Show all files (don't respect `.gitignore`) |

## Use cases

**Remote / headless servers** — Working on a cloud dev box or VPS? Run `npx mdbrowse . --tunnel` to get a public URL and view rendered markdown from any browser.

**AI coding tools** — Using Claude Code, Codex, or similar tools that generate lots of markdown? Browse their output rendered, not raw.

**Documentation browsing** — Point it at your `docs/` folder for a quick local docs site with search, live reload, and edit support.

## Tech stack

[Hono](https://hono.dev/) server, [unified](https://unifiedjs.com/)/remark markdown pipeline, [Shiki](https://shiki.style/) syntax highlighting, [KaTeX](https://katex.org/) math, [Mermaid](https://mermaid.js.org/) diagrams, [chokidar](https://github.com/paulmillr/chokidar) file watching, vanilla JS frontend — no build step.

## License

[MIT](LICENSE)
