# Changelog

## [0.2.0] - 2026-03-16

### Features
- Auto-find next available port if requested port is taken
- Default bind to 0.0.0.0, show network IPs on startup
- Updated documentation

### Bug Fixes
- Fixed auth test bin path reference
- Fixed publish workflow permissions

## [0.1.0] - 2026-03-15

### Features
- File tree sidebar with collapsible folders
- Markdown rendering (GFM, syntax highlighting, math, Mermaid, frontmatter)
- Non-markdown files get syntax-highlighted view
- Live reload via WebSocket + chokidar
- Edit mode with Ctrl+S save, Tab indent, auto-resize
- File and content search with Ctrl+K
- Dark/light theme with auto-detection
- Cloudflare Tunnel support via --tunnel
- Basic auth via --auth user:pass
- Read-only mode via --read-only
- Image support (relative paths + preview)
