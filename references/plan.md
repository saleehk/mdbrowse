# mdbrowse — Engineering Plan

## 1. Idea summary

- **Idea:** `mdbrowse` — a CLI that serves a local web UI to browse and preview files in any directory, with first-class markdown rendering
- **Target user:** Developers working on remote servers where AI coding tools generate markdown files
- **Problem:** No simple way to view rendered markdown on a remote/headless machine. Existing tools are either unmaintained, terminal-only, or require API keys.
- **Proposed solution:** `npx mdbrowse-cli .` → instant local web server with file tree sidebar, rendered markdown, live reload, and optional Cloudflare Tunnel for remote access
- **Why now:** AI coding tools (Claude Code, Codex, etc.) are generating more markdown than ever. Remote dev environments are the norm. The gap between "file exists on server" and "I can read it nicely" is real and growing.

## 2. Challenge pass

### Why it might work

- Solves a real daily pain point for a growing audience
- Zero-install via `npx` removes all friction
- Cloudflare Tunnel integration is a genuine differentiator
- Existing tools (`grip`, `markserv`, `glow`) are stale, limited, or terminal-only
- Simple enough to build well in a short time

### Why it might fail

- People might just use VS Code Remote or GitHub's preview
- "Yet another markdown tool" — crowded mindshare even if existing tools are weak
- Editing feature could creep scope if not bounded
- Cloudflare Tunnel dependency adds a moving target

### Better framing

The real value isn't "markdown viewer" — it's **instant file browser for headless machines**. Markdown rendering is the killer feature, but showing all files makes it broadly useful.

## 3. Opportunity scorecard

- **Pain severity:** high (daily friction for remote dev workflows)
- **Frequency:** high (every coding session on a remote machine)
- **Willingness to pay / strategic value:** low (this is open source / dev tool credibility play)
- **Distribution feasibility:** high (npm/npx = zero friction)
- **Implementation difficulty:** low-medium (well-understood tech, library-heavy)
- **Defensibility:** low (easy to clone, but first-mover + polish wins in CLI tools)
- **Founder-fit:** high (Saleeh uses this exact workflow daily)

## 4. Phase plan

### Phase 1 — Prototype (1-2 days)
- **Goal:** Working CLI that serves rendered markdown with file tree
- **Assumption:** The core experience (browse + preview + live reload) is useful enough to share
- **Success signal:** Saleeh uses it on his own server and it replaces his current workflow
- **Biggest risk:** UI doesn't feel good enough to screenshot/share
- **Exit criterion:** Can run `npx mdbrowse-cli .` on a remote server and browse files from local browser

### Phase 2 — MVP (3-5 days)
- **Goal:** Feature-complete v1 ready for npm publish
- **Assumption:** Other developers have the same pain point
- **Success signal:** Published on npm, gets organic installs, positive feedback
- **Biggest risk:** Polish level — needs to look good enough for Twitter/Reddit posts
- **Exit criterion:** All v1 features working, README done, published to npm

### Phase 3 — Early production (1-2 weeks)
- **Goal:** Community feedback, bug fixes, edge cases
- **Assumption:** Real users surface real issues
- **Success signal:** GitHub stars, issues filed, PRs from others
- **Biggest risk:** Maintenance burden if adoption happens
- **Exit criterion:** Stable v1.x with no major bugs

### Phase 4 — Growth
- **Goal:** Become the default "browse markdown" CLI
- **Assumption:** Word of mouth in dev communities
- **Success signal:** >500 GitHub stars, mentioned in AI coding tool docs/communities
- **Biggest risk:** A bigger player ships the same thing
- **Exit criterion:** Self-sustaining community

## 5. Recommended next slice

- **Slice name:** Core browser
- **What ships:** CLI that starts a server with file tree sidebar + markdown rendering + live reload
- **What it proves:** The core experience is useful and feels good
- **Why this comes first:** Everything else (tunnel, auth, edit, search) is additive — this is the foundation
- **How success is measured:** Saleeh uses it on his remote server instead of cat/less

## 6. Engineering plan — Slice 1: Core browser

### Scope

Minimal working product: CLI → server → web UI with sidebar + rendered content + live reload.

### Core flows

1. User runs `npx mdbrowse-cli .` (or `mdbrowse-cli /path/to/dir`)
2. CLI scans directory, respects `.gitignore`
3. Starts HTTP server on available port
4. Opens browser (or prints URL if headless)
5. Web UI shows:
   - Left: file tree sidebar
   - Right: rendered content (markdown → HTML, others → syntax highlighted)
6. User clicks file → content loads
7. File changes on disk → WebSocket push → browser refreshes content

### Components

```
mdbrowse/
├── bin/
│   └── mdbrowse.js          # CLI entry point
├── src/
│   ├── server.js             # Express/Fastify HTTP server
│   ├── watcher.js            # chokidar file watcher
│   ├── ws.js                 # WebSocket handler
│   ├── scanner.js            # directory scanner (respects .gitignore)
│   ├── renderer.js           # markdown → HTML (unified/remark pipeline)
│   └── highlight.js          # syntax highlighting for non-md files
├── public/
│   ├── index.html            # SPA shell
│   ├── style.css             # minimal + screenshot-worthy styles
│   └── app.js                # client-side JS (tree, navigation, WS, theme toggle)
├── package.json
└── README.md
```

### Tech choices

| Concern | Choice | Why |
|---------|--------|-----|
| CLI framework | `commander` | lightweight, standard |
| HTTP server | `hono` + `@hono/node-server` | ~14KB, built-in basic-auth & serve-static, simpler than Fastify |
| File watching | `chokidar` | battle-tested, cross-platform |
| WebSocket | `ws` | lightweight, no framework needed |
| Markdown | `unified` + `remark-parse` + `remark-gfm` + `remark-html` | plugin ecosystem |
| Syntax highlight | `shiki` | VS Code-quality highlighting, theme support |
| Mermaid | client-side `mermaid.js` via CDN | no server-side rendering needed |
| Math | `remark-math` + `rehype-katex` | standard |
| Frontmatter | `gray-matter` | standard |
| .gitignore | `ignore` package | standard |
| Dark/light | CSS `prefers-color-scheme` + JS toggle | zero dependencies |
| Client routing | History API (vanilla) | clean URLs like `/view/path/to/file.md`, no framework needed |
| Frontend | vanilla HTML/CSS/JS | zero build step, tiny footprint, served from `public/` |

### Dependencies / integrations

- **Cloudflare Tunnel** (Slice 2): `cloudflared` binary, auto-detect or prompt install
- **Auth** (Slice 2): basic HTTP auth middleware
- **Edit mode** (Slice 2): POST endpoint to write files back

### Risks / trust boundaries

- **File system access:** server reads (and later writes) files. Must not serve files outside the target directory (path traversal protection)
- **Network exposure:** default to localhost only. `--host` and `--tunnel` are explicit opt-ins
- **Large directories:** need to handle gracefully (lazy loading tree, skip binary files)

### Testing

- Unit: renderer output, scanner respects .gitignore, path traversal blocked
- Integration: start server, request file, verify HTML output
- Manual: test on actual remote server via SSH tunnel

### Rollout

1. Build Slice 1 (core browser)
2. Saleeh dogfoods on his server
3. Fix issues
4. Build Slice 2 (tunnel, auth, edit, search)
5. Polish UI for screenshots
6. Publish to npm
7. README with GIF demo
8. Share on Twitter/Reddit/HN

## 7. Slice plan

### Slice 1 — Core browser
- CLI + server + file tree + markdown rendering + live reload + dark/light theme
- `.gitignore` support + `--no-ignore` flag
- `--port` and `--host` flags

### Slice 2 — Network & access
- `--tunnel` (Cloudflare Tunnel)
- `--auth user:pass`

### Slice 3 — Edit mode
- Toggle button in UI
- POST endpoint to save files
- `--read-only` flag

### Slice 4 — Search
- File name + content search
- Search UI in sidebar

### Slice 5 — Polish & ship
- Screenshot-worthy CSS
- README with GIF/video demo
- npm publish
- GitHub repo setup (license, contributing, etc.)

## 8. Recommendation

**Build.** This is a real pain point, low implementation risk, high founder-fit, and can ship fast. Start with Slice 1 today.
