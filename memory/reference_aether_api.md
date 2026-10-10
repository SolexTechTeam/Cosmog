---
name: reference-aether-api
description: Aether backend API docs and schemas live at ../Aether/ — check before any API work
metadata:
  type: reference
---

Aether is the backend API, adjacent to Cosmog at `../Aether/`.

Key locations:
- **Endpoint docs:** `../Aether/docs/api/` — per-resource markdown files (sale-orders.md, inventory.md, etc.) plus ENDPOINTS.md index
- **Request/response schemas:** `../Aether/src/schemas/` — Zod/validation schemas per resource
- **Route handlers:** `../Aether/src/routes/` — actual endpoint implementations
- **Services:** `../Aether/src/services/` — business logic (allocation, inventory, margin, ledger)
- **Health check:** `../Aether/src/routes/health.ts`
