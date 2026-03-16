# Configuration

mdbrowse-cli can be configured through CLI flags, environment variables, and a config file. Settings are resolved using the following priority chain:

```
CLI args  >  Environment variables  >  .mdbrowse.json  >  Built-in defaults
```

For example, if you set `port: 4000` in `.mdbrowse.json` but run `mdbrowse-cli . --port 5000`, the CLI flag wins and the server starts on port 5000.

---

## Config file (`.mdbrowse.json`)

Place a `.mdbrowse.json` file in the directory you're serving. mdbrowse-cli auto-detects it on startup.

### Full example

```json
{
  "port": 4000,
  "host": "0.0.0.0",
  "tunnel": false,
  "auth": "admin:secret",
  "readOnly": true,
  "noIgnore": false
}
```

### Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `port` | `number` | `3000` | Port to listen on |
| `host` | `string` | `"0.0.0.0"` | Host to bind to |
| `tunnel` | `boolean` | `false` | Expose via Cloudflare Tunnel |
| `auth` | `string` | — | Basic auth credentials (`"user:pass"`) |
| `readOnly` | `boolean` | `false` | Disable file editing |
| `noIgnore` | `boolean` | `false` | Show all files (don't respect `.gitignore`) |

### Tips

- **Team settings:** Commit `.mdbrowse.json` to your repo so everyone gets the same defaults.
- **Personal overrides:** Add `.mdbrowse.json` to `.gitignore` if you want per-machine settings.
- All keys are optional — only include what you want to override.

---

## Environment variables

Every CLI flag has a corresponding `MDBROWSE_*` environment variable.

| Variable | Maps to | Example |
|----------|---------|---------|
| `MDBROWSE_PORT` | `--port` | `MDBROWSE_PORT=8080` |
| `MDBROWSE_HOST` | `--host` | `MDBROWSE_HOST=localhost` |
| `MDBROWSE_TUNNEL` | `--tunnel` | `MDBROWSE_TUNNEL=1` |
| `MDBROWSE_AUTH` | `--auth` | `MDBROWSE_AUTH=admin:secret` |
| `MDBROWSE_READ_ONLY` | `--read-only` | `MDBROWSE_READ_ONLY=1` |
| `MDBROWSE_NO_IGNORE` | `--no-ignore` | `MDBROWSE_NO_IGNORE=1` |

Boolean variables use `1` to enable.

### Shell profile example

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# mdbrowse-cli defaults
export MDBROWSE_PORT=8080
export MDBROWSE_HOST=0.0.0.0
export MDBROWSE_AUTH=admin:secret
```

Then just run:

```bash
npx mdbrowse-cli .
# → starts on port 8080 with auth enabled
```

---

## Priority chain

```
CLI args  >  Environment variables  >  .mdbrowse.json  >  Built-in defaults
```

**Example:** You have this `.mdbrowse.json`:

```json
{
  "port": 4000,
  "readOnly": true
}
```

And this in your shell:

```bash
export MDBROWSE_PORT=5000
```

Then you run:

```bash
npx mdbrowse-cli . --port 6000
```

Result:
- **Port:** `6000` (CLI flag wins over env var and config file)
- **Read-only:** `true` (from config file, no CLI flag or env var to override)

---

## Built-in defaults

| Setting | Default |
|---------|---------|
| Port | `3000` |
| Host | `0.0.0.0` |
| Tunnel | off |
| Auth | off |
| Read-only | off |
| No-ignore | off |

If the requested port is in use, mdbrowse-cli automatically tries the next available port.
