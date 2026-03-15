# Unit 5.3 — npm Publish

**Status:** pending
**Slice:** 5 — Polish & Ship
**Size:** S
**Depends on:** 5.2

## What ships
Published on npm — `npx mdbrowse .` works from anywhere with no prior install.

## Tasks
- [ ] Verify `package.json` fields: name, version, description, keywords, license, repository, bin, files
- [ ] Add `.npmignore` or verify `files` field in package.json includes only needed files
- [ ] Run `npm pack` and inspect the tarball contents — ensure no junk files
- [ ] Add `LICENSE` file (MIT)
- [ ] Create GitHub repo and push code
- [ ] Run `npm publish`
- [ ] Test `npx mdbrowse .` from a clean directory (no local install)

## Implementation notes
- **package.json `files`:** should include `bin/`, `src/`, `public/`, `package.json`, `README.md`, `LICENSE`. Exclude `references/`, `plans/`, `ideas/`, `node_modules/`, etc.
- **package.json `bin`:** should be `{ "mdbrowse": "bin/mdbrowse.js" }`.
- **Keywords:** `["markdown", "browser", "viewer", "cli", "preview", "server", "live-reload"]`.
- **npm pack check:** run `npm pack --dry-run` to see what would be included. Then `npm pack` and `tar -tzf mdbrowse-*.tgz` to verify.
- **Test npx:** from a temp directory with no node_modules, run `npx mdbrowse .` and verify it downloads, installs deps, and starts the server.
- **GitHub repo:** create repo `mdbrowse`, push with main branch, add description and topics.

## Done when
- `npm pack` produces a clean tarball with only necessary files.
- `npm publish` succeeds.
- `npx mdbrowse .` works from a clean environment (downloads, installs, serves).
