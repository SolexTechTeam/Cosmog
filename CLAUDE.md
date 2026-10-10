@AGENTS.md

# Cosmog — Project Instructions

## Workflow

### Implementation workflow
Before implementing significant work:
1. **Plan** — create a plan and align with the user on approach
2. **Survey** — run `/improve` to generate a prioritized implementation plan for the work
3. **Implement** — execute the plan, one task at a time

### API work
When any task involves API connectivity, endpoints, request/response shapes, or building/modifying AetherClient methods:
1. **Check endpoint docs** — read the relevant file in `../Aether/docs/api/` (e.g., `sale-orders.md`, `inventory.md`, `ENDPOINTS.md`)
2. **Check schemas** — read the corresponding schema in `../Aether/src/schemas/` to understand request validation and response shapes
3. **Check the route** — if behavior is unclear, read `../Aether/src/routes/` for the actual handler logic

Do not guess at endpoint paths, query params, or response shapes — Aether is the source of truth.

### Pre-PR checklist
Before creating any PR, run both of these in order:
1. `/simplify` — review for reuse, simplification, and efficiency cleanups
2. `/code-review` — review for standards compliance and spec correctness

Do not skip these steps. Fix anything they surface before opening the PR.

---

## Coding Style & Architecture

### Component hierarchy (SLAP — Single Level of Abstraction Principle)
Frontend code follows a strict top-down decomposition. Each level should only talk to the level directly below it:

1. **Layout** — shared structural UI (navbars, sidebars, page shells). Lives in Next.js route group `layout.tsx` files and `src/components/layout/`.
2. **Screen** — the full page a user sees. This is the `page.tsx` file in the route. Screens compose screen-sections; they do not contain raw markup or business logic.
3. **Screen-section** — a major visual block of a screen (e.g., `HomeInventorySummary`, `OrderStatusPanel`). These are groups of widgets/components that form a logical section.
4. **Widget / Component** — the smallest reusable pieces (cards, tables, badges, form fields).

### File organization
```
src/
  components/
    ui/            # primitives (button, input, dialog) — fully reusable
    common/        # shared composite components (DataGrid, MetricCard, SearchFilterBar)
    layout/        # structural layout components (SideNav, TopNavBar)
  app/
    (screen)/
      orders/
        sales/
          page.tsx                # SalesScreen — the screen
          SalesOverviewCards.tsx   # screen-section, colocated
          SalesTable.tsx          # screen-section, colocated
        procurement/
          page.tsx
          ProcurementOverviewCards.tsx
          ProcurementTable.tsx
```

**Rule:** Reusable components live in `src/components/`. Screen-specific sections and groupings are **colocated** next to the `page.tsx` that uses them. If a screen-section is used by more than one screen, promote it to `src/components/common/`.

### Naming conventions
- Screens: component name matches the route purpose — e.g., the `page.tsx` at `/orders/sales` exports a component like `SalesScreen`
- Screen-sections: descriptive of what they show — `InventorySummaryCards`, `OrderStatusPanel`
- Widgets: descriptive + suffix hinting at type — `MetricCard`, `StatusBadge`, `SearchFilterBar`

### API architecture — AetherClient
All API communication goes through a single class: **`AetherClient`** (`src/lib/aether-client.ts`).

- Pages and components **never** call `fetch`, `api.get`, or raw HTTP methods directly
- Instead they call typed methods on AetherClient: `AetherClient.getOrders()`, `AetherClient.createSaleOrder(data)`, etc.
- AetherClient handles auth headers, base URL, error normalization internally
- Every backend endpoint gets a corresponding method on AetherClient — this is the single source of truth for "what endpoints exist and how to call them"
- Hooks like `useApi` should wrap AetherClient methods, not raw fetch calls

### Next.js practices
- Follow Next.js best practices for the installed version. Before writing Next.js code, check `node_modules/next/dist/docs/` for current API guidance.
- Use route groups for shared layouts (e.g., `(screen)` group for authenticated pages with nav)
- Keep `page.tsx` files thin — they import and compose screen-sections, they don't contain implementation
- Use server components by default; add `"use client"` only when the component needs interactivity or browser APIs

### General style
- Componentize aggressively — if a block of JSX has a clear name, extract it
- Prefer composition over props-sprawl; a component with 10+ props probably needs to be split
- TypeScript strict mode; define shared types in `src/types/`
- No inline styles — use Tailwind classes or CSS modules
- Keep functions short and at a single level of abstraction (SLAP)
