# Getting Started

## Installation

```bash
# Zero install — just run it
npx mdbrowse-cli .

# Or install globally
npm install -g mdbrowse-cli
```

## CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `--port <number>` | `3000` | Port to listen on |
| `--host <address>` | `0.0.0.0` | Host to bind to |
| `--tunnel` | off | Expose via Cloudflare Tunnel |
| `--auth <user:pass>` | off | Enable basic authentication |
| `--read-only` | off | Disable file editing |
| `--no-ignore` | off | Show gitignored files |

## Progress Tracker

- [x] Core file browser
- [x] Markdown rendering
- [x] Syntax highlighting
- [x] Live reload
- [x] Search
- [x] Edit mode
- [x] Dark/light theme
- [x] Cloudflare Tunnel
- [ ] Plugin system
- [ ] Multi-user collaboration

## Code Examples

### JavaScript
```javascript
import { startServer } from './server.js';

const config = {
  port: 3000,
  host: '0.0.0.0',
  tunnel: false,
};

await startServer(config);
console.log('Server running!');
```

### Python
```python
def fibonacci(n):
    """Generate fibonacci sequence up to n."""
    a, b = 0, 1
    while a < n:
        yield a
        a, b = b, a + b

for num in fibonacci(100):
    print(num)
```

### Rust
```rust
fn main() {
    let numbers: Vec<i32> = (1..=10)
        .filter(|x| x % 2 == 0)
        .collect();

    println!("Even numbers: {:?}", numbers);
}
```

> **Tip:** All code blocks are highlighted using Shiki with VS Code-quality themes that adapt to your dark/light preference.
