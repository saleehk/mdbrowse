# Architecture

## System Overview

```mermaid
graph TD
    CLI[CLI Entry Point] --> Server[Hono Server]
    Server --> Scanner[Directory Scanner]
    Server --> Renderer[Markdown Renderer]
    Server --> Watcher[File Watcher]
    Server --> Search[Search Engine]
    Watcher --> WS[WebSocket]
    WS --> Browser[Browser Client]
    Scanner --> |.gitignore| IgnoreFilter[Ignore Filter]
    Renderer --> |unified/remark| HTML[HTML Output]
    Renderer --> |shiki| Highlight[Syntax Highlight]
```

## Request Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server
    participant FS as File System

    B->>S: GET /api/tree
    S->>FS: Scan directory
    FS-->>S: File list
    S-->>B: JSON tree

    B->>S: GET /api/file?path=readme.md
    S->>FS: Read file
    FS-->>S: Raw content
    S->>S: Render markdown → HTML
    S-->>B: Rendered HTML

    Note over FS,S: File changes on disk
    FS->>S: chokidar event
    S->>B: WebSocket push
    B->>B: Re-render content
```

## Math Support

Inline math: $E = mc^2$

The quadratic formula:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

Euler's identity:

$$e^{i\pi} + 1 = 0$$

Maxwell's equations in differential form:

$$\nabla \cdot \mathbf{E} = \frac{\rho}{\epsilon_0}$$

$$\nabla \times \mathbf{B} = \mu_0 \mathbf{J} + \mu_0 \epsilon_0 \frac{\partial \mathbf{E}}{\partial t}$$
