# Plan 001: Ant Design integration

**Status:** IN PROGRESS  
**Written against:** `769b954`  
**Scope:** Cosmog frontend only; no Aether API or database changes.

## Goal

Adopt Ant Design (`antd`) as the standard library for interactive UI controls, overlays, and common layout/display components across Cosmog. Keep Solext's orange, DM Sans, neutral palette, and existing operational workflows. Roll out incrementally so each group of pages remains usable throughout migration.

Keep AG Grid and the shared `DataGrid` as the table solution throughout this integration. Do not replace them with Ant Design Table. `DataGrid` uses AG Grid for sorting/filtering, row selection and details, expanded details, edit/archive actions, pagination, and custom cell behavior; preserve these table implementations and behaviors unchanged while adopting Ant Design for the rest of the shared UI.

## Repository context

- Next.js 16 App Router and React 19; npm and `package-lock.json` are used. `package.json` currently has no Ant Design dependency.
- `src/app/layout.tsx` is the root server layout and loads `src/app/globals.css` plus the DM Sans font.
- Authenticated routes are nested under `src/app/(screen)/layout.tsx`, which composes `QueryProvider`, `ToastProvider`, `SideNav`, and the dashboard shell. Put the Ant Design theme provider here so the login route does not inherit a new UI theme unless intentionally migrated later.
- `src/app/globals.css` already defines the Solext CSS variables (orange `#F97316`, ink, surfaces, borders, and radius) and imports Tailwind 4 plus shadcn Tailwind styles.
- Existing primitives are mostly local Tailwind components. `src/components/ui/button.tsx`, `select.tsx`, `divider.tsx`, and `tooltip.tsx` use Base UI; `Select` accepts `<option>` children and exposes a DOM-like `onChange` event. `src/components/common/` contains shared composites such as `DataGrid`, `MetricCard`, `SearchFilterBar`, `StatusBadge`, and dialogs.
- Operational pages use AG Grid through `src/components/common/DataGrid.tsx`; preserve its behavior during this migration.
- Current verification scripts are `npm run lint`, `npm run build`; there is no test script in `package.json`. `npx tsc --noEmit` can be used as a diagnostic, but the current branch has existing missing exports for shortfall response types in `src/components/common/orders/ShortfallAllocationDialog.tsx`.

## Library and integration decisions

1. Use Ant Design v6 with `@ant-design/nextjs-registry`. The project is already on React 19, which meets Ant Design v6's React 18+ requirement.
2. Use the App Router style registry in `src/app/layout.tsx` to collect Ant Design's CSS-in-JS styles during server rendering and avoid a client-only style flash.
3. Add a small client `AntdProvider` around authenticated content in `src/app/(screen)/layout.tsx`, containing a single `ConfigProvider` theme. Map tokens to Solext: `colorPrimary` `#F97316`, `fontFamily` DM Sans (`var(--font-sans)`), `borderRadius` 8, white container/background, ink text, and existing border color. Set focused component tokens only where needed to match the current compact operational density.
4. Keep Tailwind for page structure and one-off layout. Ant Design owns reusable controls and interactions; do not style Ant Design's internal DOM with brittle selectors.
5. Do not import Ant Design's global reset stylesheet in the first pass. Tailwind preflight already resets browser defaults; importing another global reset can alter existing screens. Add a reset only if the pilot shows a specific unmet requirement and verify it across both old and migrated screens.
6. Continue to route all data access through `AetherClient` and TanStack Query. Ant Design forms/components must not introduce direct API calls.

Official references:

- [Ant Design: Usage with Next.js](https://ant.design/docs/react/use-with-next/)
- [Ant Design: Customize Theme](https://ant.design/docs/react/customize-theme/)
- [Ant Design: v5 to v6 migration](https://ant.design/docs/react/migration-v6/)

## Implementation phases

### Phase 0 — Add runtime and prove the integration

**Status:** Complete, except for the environment-blocked production build check.

**Files:** `package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/app/(screen)/layout.tsx`, new `src/components/providers/AntdProvider.tsx`.

1. Install `antd@6` and `@ant-design/nextjs-registry` using npm; commit the lockfile change with the package manifest change.
2. Wrap the root layout's rendered children in `AntdRegistry` per the official App Router guide. Keep the root layout a server component.
3. Add the client theme provider under the authenticated layout. Keep it alongside `QueryProvider` and `ToastProvider`, and confirm existing provider context still reaches all dashboard pages.
4. Configure Solext theme tokens in one `ConfigProvider`; do not scatter `ConfigProvider` instances or hard-coded component colors around pages.
5. Add one low-risk Ant Design control to a development-only or existing non-critical location (prefer a simple dashboard filter or button) to verify server rendering, focus, popup positioning, and Tailwind coexistence before migrating shared primitives.

**Done when:** `npm run build` renders App Router routes without hydration/style-order warnings; the pilot control shows the orange theme and DM Sans; existing login and dashboard shell styling are unchanged.

### Phase 1 — Replace shared primitive implementations behind stable exports

**Status:** In progress. Button, Select, Divider, Tooltip, SegmentedToggle, ConfirmDialog, Card, Tabs, Input, TextArea, and the shared Dialog shell now use Ant Design behind local exports. Core create/adjust dialogs use the new shell; toast migration and specialised allocation/receive dialogs remain staged.

**Files:** `src/components/ui/button.tsx`, `select.tsx`, `divider.tsx`, `tooltip.tsx`, and new or existing shared adapters for Input, Modal/ConfirmDialog, and notification feedback as justified by callsites.

1. Inventory callsites and their required behavior before changing each primitive. Preserve accessible labels, disabled/required states, keyboard navigation, validation display, and event semantics.
2. Migrate Button, Divider, and Tooltip first; these have smaller APIs and establish styling conventions.
3. Migrate Select in a dedicated change. Its current `<option>` child contract and synthetic `ChangeEvent<HTMLSelectElement>` are not Ant Design's native API. Either keep a thin compatibility adapter temporarily or update each callsite to the Ant Design value callback in the same change; do not leave callers with a misleading fake native event long-term.
4. Migrate text inputs and simple confirmation dialogs after their actual props and error/loading states are inventoried. Keep specialized dialogs as purpose-built compositions around Ant Design Modal rather than turning every workflow into `Form`.
5. Keep custom categories/combobox behavior if Ant Design AutoComplete/Cascader cannot preserve its searchable hierarchy and selection behavior without added complexity.
6. Preserve the existing toast behavior or replace it through Ant Design's context-aware message API in one coordinated pass. Avoid Ant Design static message/modal methods when they must inherit the `ConfigProvider` theme; use hook/context APIs and render their context holder inside the provider.

**Done when:** migrated shared exports are Ant Design-backed or intentionally documented exceptions; representative callsites compile and retain behavior; no new raw API access is introduced.

### Phase 2 — Pilot and migrate low-risk screens

Start with Home, then simple settings/data pages. Migrate in cohesive screen batches, not isolated controls spread across unrelated routes.

1. Use Ant Design Card, Statistic, Divider, Select, Button, and Alert/Skeleton equivalents where they improve consistency, preserving the user's current Home metric-card layout and its short dividers.
2. Migrate simple filters, buttons, empty/error/loading states, and page-level controls on `/users`, `/suppliers`, and `/inventory/history`.
3. Compare layouts against Solext's existing color, typography, radius, and density rules. Keep the existing custom MetricCard where Ant Design Statistic cannot match the required label/value composition cleanly.

**Done when:** pilot pages show one coherent design system, responsive behavior holds, and filter values and navigation actions behave as before.

### Phase 3 — Migrate complex forms and order workflows

1. Migrate customer/product/user forms and sale/purchase order creation dialogs in separate batches.
2. Adopt Ant Design Form only for flows where its validation and field-state model simplifies the existing form. Preserve existing domain validation and server error mapping.
3. Keep the PO transition workflows distinct: draft→confirmed allocation preview and in-transit→received results review must remain separate dialogs and retain their existing ordering/side effects.
4. Preserve keyboard operation, focus return, async saving indicators, cancel behavior, and unsaved-change behavior.

**Done when:** each migrated flow passes its full create/edit/status-transition path with matching validation and no changes to API payloads or order-state semantics.

### Phase 4 — Complete route coverage and remove superseded primitives

1. Migrate remaining shared UI on sales, procurement, inventory, customers, suppliers, products, users, details, and profile routes.
2. Search all imports of `@base-ui/react` and local wrappers. Remove a Base UI dependency only after no live component relies on it; keep a package if an intentional exception remains.
3. Remove obsolete custom primitive code only after all usages have moved and the build confirms no imports remain.
4. Update `DESIGN.md`/README component guidance to reflect the actual ownership split: Ant Design for interactive primitives, Tailwind for composition, AG Grid for data-intensive tables.

**Done when:** route inventory shows no unintended legacy primitive usage; exceptions are named with a reason; dependencies match actual imports.

## Boundaries

**In scope:** Cosmog's UI dependencies, global/provider integration, shared UI wrappers, and incremental route-level adoption.

**Out of scope:** Aether routes/schemas/database, API payload changes, product workflow changes, changing AG Grid/DataGrid or migrating tables to Ant Design Table, adopting Ant Design Pro, and broad visual redesign.

## Verification gates

Run after each phase and record any known pre-existing failures:

1. `npm run lint` — no new lint errors in changed files.
2. `npx tsc --noEmit` — no new type errors; track the existing shortfall type-export errors separately until independently fixed.
3. `npm run build` — production build succeeds and server-rendered Ant Design styles are present on first render.
4. Manually exercise a representative migrated page at desktop and narrow widths, including select popup placement, keyboard focus/selection, disabled/loading/error/empty states, and modal open/close/focus return.
5. Verify end-to-end order create/confirm/receive behaviors in Phase 3 with the project's established regression suite; no API payload or ledger changes should occur from a visual-library migration.

## Risks and stop conditions

- Ant Design CSS-in-JS injection can produce missing or reordered styles if the App Router registry is omitted or placed at the wrong boundary. Stop migration and fix SSR style extraction before converting more pages.
- Tailwind preflight and Ant Design reset/global styles can compete. Do not add a second reset without a concrete visual regression and multi-route check.
- Changing the Select contract can silently break every filter/dialog. Inventory callsites and migrate/adapt atomically; stop if a caller depends on native form submission or option behavior that the adapter does not preserve.
- `antd@6` includes API and styling changes from v5. Follow the v6 docs and use its React 19 support; do not copy legacy v4/v5 Less configuration into this codebase.
- Do not remove Base UI or AG Grid based on package presence alone; prove no relevant usages remain.

## Maintenance note

Future shared controls should use the Ant Design wrappers and Solext `ConfigProvider` tokens. Keep page-specific layout in Tailwind, tables in AG Grid/DataGrid, and business behavior in the existing screen/component layers. Changes to token names or provider placement should be checked across a migrated page and a legacy page because both styling systems coexist during rollout.
