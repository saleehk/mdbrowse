# Unit 5.1 — CSS Polish

**Status:** pending
**Slice:** 5 — Polish & Ship
**Size:** M
**Depends on:** 3.2, 4.2

## What ships
A screenshot-worthy UI that looks good enough to post on Twitter/Reddit.

## Tasks
- [ ] Typography pass: system font stack, line-height 1.6, proper heading sizes with clear hierarchy
- [ ] Code block styling: rounded corners, subtle background, horizontal scroll
- [ ] Scrollbar styling: thin, themed for dark/light
- [ ] Sidebar improvements: hover states, active file highlight, smoother transitions
- [ ] Mobile responsive: hamburger menu, content fills screen, sidebar as overlay
- [ ] Loading states: skeleton placeholder or spinner while content loads
- [ ] Smooth theme toggle transition (no flash)
- [ ] GFM table styling: borders, alternating row colors, padding
- [ ] Blockquote styling: left border, muted color, italic
- [ ] Task list checkbox styling: custom checkboxes that match theme

## Implementation notes
- **System font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` for body, monospace stack for code.
- **Scrollbar:** use `::-webkit-scrollbar` with `width: 6px` and themed colors. Firefox: `scrollbar-width: thin; scrollbar-color: ...`.
- **Mobile:** use `@media (max-width: 768px)` breakpoint. Sidebar becomes a slide-over panel triggered by a hamburger button. Content area fills 100vw.
- **Theme transition:** add `transition: background-color 0.2s, color 0.2s` to `body` and major containers. Be careful to not transition everything (performance).
- **Tables:** `border-collapse: collapse`, `th/td { padding: 8px 12px; border: 1px solid var(--border) }`, `tr:nth-child(even)` for alternating rows.
- **Files:** primarily `public/style.css`, possibly minor changes to `public/app.js` for loading states or hamburger toggle.

## Done when
- The UI looks polished and cohesive in both dark and light themes.
- Content is readable with good typography.
- Works well on mobile screen sizes.
- Good enough to take a screenshot and share publicly.
