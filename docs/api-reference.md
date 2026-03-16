# API Reference

## REST Endpoints

### GET /api/tree

Returns the file tree as JSON.

```json
[
  {
    "name": "src",
    "path": "src",
    "type": "directory",
    "children": [
      {
        "name": "server.js",
        "path": "src/server.js",
        "type": "file"
      }
    ]
  }
]
```

### GET /api/file?path=\<filepath\>

Returns rendered HTML for the given file.

```bash
curl http://localhost:3000/api/file?path=README.md
```

Response:
```json
{
  "type": "markdown",
  "html": "<h1>Hello World</h1>...",
  "title": "Hello World",
  "frontmatter": {}
}
```

### GET /api/search?q=\<query\>

Search across filenames and content.

```bash
curl "http://localhost:3000/api/search?q=function"
```

### POST /api/file?path=\<filepath\>

Save file content (disabled in read-only mode).

```bash
curl -X POST "http://localhost:3000/api/file?path=notes.md" \
  -H "Content-Type: text/plain" \
  -d "# Updated content"
```

## WebSocket

Connect to `/ws` for live reload events:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.addEventListener('message', (event) => {
  const { type, path } = JSON.parse(event.data);
  // type: "change" | "add" | "unlink"
  console.log(`File ${type}: ${path}`);
});
```
