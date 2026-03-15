# mdbrowse — Implementation Plans

## Units Overview

| Unit | Name | Size | Status | Depends on |
|------|------|------|--------|------------|
| 1.1 | Smoke Test & Fixes | S | in-progress | — |
| 1.2 | Image Support | S | in-progress | — |
| 2.1 | Basic Auth | XS | pending | 1.1 |
| 2.2 | Cloudflare Tunnel | S | pending | 1.1 |
| 3.1 | Save Endpoint | S | pending | 1.1 |
| 3.2 | Edit UI | M | pending | 3.1 |
| 3.3 | Edit UX Polish | S | pending | 3.2 |
| 4.1 | Search Backend | M | pending | 1.1 |
| 4.2 | Search UI | M | pending | 4.1 |
| 5.1 | CSS Polish | M | pending | 3.2, 4.2 |
| 5.2 | README & Demo | S | pending | 5.1 |
| 5.3 | npm Publish | S | pending | 5.2 |

## Suggested Build Order

```
Phase A (parallel):  1.1, 1.2
Phase B (parallel):  2.1, 2.2, 3.1, 4.1    ← all depend only on 1.1
Phase C (parallel):  3.2, 4.2              ← 3.2 needs 3.1, 4.2 needs 4.1
Phase D:             3.3                    ← needs 3.2
Phase E:             5.1                    ← needs 3.2 + 4.2
Phase F:             5.2                    ← needs 5.1
Phase G:             5.3                    ← needs 5.2
```

Units without dependencies on each other can be parallelized. The critical path is: 1.1 → 3.1 → 3.2 → 5.1 → 5.2 → 5.3.
