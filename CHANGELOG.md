# Changelog

## [0.5.2](https://github.com/saleehk/mdbrowse/compare/v0.5.1...v0.5.2) (2026-03-24)


### Bug Fixes

* use absolute GitHub URLs for README images (npm compatibility) ([#17](https://github.com/saleehk/mdbrowse/issues/17)) ([e0dc258](https://github.com/saleehk/mdbrowse/commit/e0dc258c20e1905d95bdbb79697042fad6f89c5e))

## [0.5.1](https://github.com/saleehk/mdbrowse/compare/v0.5.0...v0.5.1) (2026-03-24)


### Bug Fixes

* diagram fullscreen modal + e2e test fixes ([#15](https://github.com/saleehk/mdbrowse/issues/15)) ([005cac0](https://github.com/saleehk/mdbrowse/commit/005cac04efc544e288224e163bd91068c03175ed))

## [0.5.0](https://github.com/saleehk/mdbrowse/compare/v0.4.3...v0.5.0) (2026-03-24)


### Features

* add inline +/- zoom controls on Mermaid diagrams ([03941c7](https://github.com/saleehk/mdbrowse/commit/03941c7ba53c41d9ef69dc4da4764e35661c0944))
* collapse folders by default + replace emoji with SVG icons in file tree ([24fecb6](https://github.com/saleehk/mdbrowse/commit/24fecb616e89078e0871abce245c55a91b862677))
* diagram drag-to-pan, fit-to-width, touch gestures ([9cc7011](https://github.com/saleehk/mdbrowse/commit/9cc70116ba177ed27e41a21785358ee99eabc6ce))
* sidebar toggle, diagram zoom, heading anchors + ToC, code copy button ([362cdfb](https://github.com/saleehk/mdbrowse/commit/362cdfbdad6b9773e4143971d1d5fe4a9cdbc26b))
* sidebar toggle, diagram zoom/fullscreen, heading anchors + ToC, code copy ([64df297](https://github.com/saleehk/mdbrowse/commit/64df297935a99b11848890057cf94f390ef3a151))


### Bug Fixes

* diagram modal — white background, visible toolbar, auto-fit on open ([a723115](https://github.com/saleehk/mdbrowse/commit/a7231159b1452dd6614b259978e632e310a23639))
* diagram modal background + remove fixed height constraint ([59a996f](https://github.com/saleehk/mdbrowse/commit/59a996f5937ed1e378658ee5e27100aadc60da4c))
* visible hamburger toggle + full-width content layout ([2c9dda2](https://github.com/saleehk/mdbrowse/commit/2c9dda20774b00938dd8f1a86a9dc9251fb8e955))
* visible hamburger toggle + full-width content layout ([b87de00](https://github.com/saleehk/mdbrowse/commit/b87de0077fc82a8511fba65d9548f80c24011387))

## [0.4.3](https://github.com/saleehk/mdbrowse/compare/v0.4.2...v0.4.3) (2026-03-17)


### Bug Fixes

* **ci:** switch to NPM_TOKEN for publishing ([d981695](https://github.com/saleehk/mdbrowse/commit/d9816955e0621f5a486e8660a39fab9cdd21cced))

## [0.4.2](https://github.com/saleehk/mdbrowse/compare/v0.4.1...v0.4.2) (2026-03-17)


### Bug Fixes

* verify npm trusted publishing works ([e331815](https://github.com/saleehk/mdbrowse/commit/e33181542d43884214a1618f463facdf65648d48))

## [0.4.1](https://github.com/saleehk/mdbrowse/compare/v0.4.0...v0.4.1) (2026-03-17)


### Bug Fixes

* **ci:** remove environment from publish job to match npm trusted publisher config ([f2d2e54](https://github.com/saleehk/mdbrowse/commit/f2d2e54f09bac72a70e9adfffba3eeac8c26ac03))

## [0.4.0](https://github.com/saleehk/mdbrowse/compare/v0.3.0...v0.4.0) (2026-03-17)


### Features

* replace basic auth with token auth + deep link support ([77c97df](https://github.com/saleehk/mdbrowse/commit/77c97dfaa053c2d81934fb52919939b6888e3bfc))
* token auth + deep links (replaces basic auth) ([f93ebd6](https://github.com/saleehk/mdbrowse/commit/f93ebd637926fdc40acabc15d52d28ce453e27d3))

## [0.3.0](https://github.com/saleehk/mdbrowse/compare/v0.2.0...v0.3.0) (2026-03-16)


### Features

* support .mdbrowse.json config file (CLI &gt; env &gt; config &gt; defaults) ([b2e35fe](https://github.com/saleehk/mdbrowse/commit/b2e35fe3cd09f51047be75d8540fd94d3f747e5e))
* support environment variable defaults (MDBROWSE_PORT, MDBROWSE_HOST, MDBROWSE_TUNNEL, MDBROWSE_AUTH, MDBROWSE_READ_ONLY, MDBROWSE_NO_IGNORE) ([79a117d](https://github.com/saleehk/mdbrowse/commit/79a117dec4ddb73276b86e429e8ef27a4daa00a7))

## [0.2.0](https://github.com/saleehk/mdbrowse/compare/v0.1.0...v0.2.0) (2026-03-16)


### Features

* auto-find next available port if requested port is taken ([d7e512b](https://github.com/saleehk/mdbrowse/commit/d7e512b41b81e8873ca640722bfed91bde378de4))
* default bind to 0.0.0.0, show network IPs on startup ([3805b9c](https://github.com/saleehk/mdbrowse/commit/3805b9c86d417f30a9cc21a908f95c01fd504b1e))
* v0.1.1 — auto-find available port, updated docs ([f2a7300](https://github.com/saleehk/mdbrowse/commit/f2a730070bf453e92dbd9f69932e2fac069c3c35))
