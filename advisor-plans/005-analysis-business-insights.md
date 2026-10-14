# Plan 005: Analysis page for business insights

**Status:** TODO  
**Written against:** `b87453d`  
**Scope:** Cosmog Analysis page; use existing Aether APIs unless a verified data gap requires a separately scoped backend change.

## Goal

Add an Analysis page that helps the owner understand sales mix, product performance, order movement, purchasing exposure, and gross profitability. After the user runs an analysis, show all selected analysis panels together on one scrollable page; do not make the user choose one chart at a time.

This page is an analysis workspace, not a second Home dashboard. Home already reports live operational cards for Open Orders, Open Value, Outstanding, procurement state counts, Sales Demand, inventory position, and active sale orders. Do not reproduce those as headline cards. Analysis should add period-based breakdowns, comparisons, rankings, and explanatory detail that answer questions the Home dashboard does not.

## Repository context and existing data

- Cosmog is a Next.js App Router application using React, TypeScript, Tailwind CSS, TanStack Query, and the shared `AetherClient` (`package.json`; `src/hooks/useApi.ts`). Use the established client and query layer rather than issuing raw requests from the screen.
- Authenticated screens are nested below `src/app/(screen)/layout.tsx`. Add the route at `src/app/(screen)/analysis/page.tsx` and add its navigation entry in `src/components/layout/SideNav.tsx`.
- Dashboard visual conventions are documented in `docs/dashboard-design-guide.md` and the shared system in `DESIGN.md`: DM Sans, neutral surfaces, restrained borders, orange for brand/action, semantic status colors, readable labels, and responsive layouts. Keep the existing concise metric density; do not turn Analysis into a wall of oversized KPI cards.
- `src/types/index.ts` defines `SaleOrder` with `status`, `payment_status`, `fulfillment_type`, `business_channel`, `owner_id`/`owner_name`, `order_date`, `shipped_date`, `amount_paid`, `order_total`, `allocation_status`, and line items with quantity/unit price/product/category.
- `PurchaseOrder` includes `status`, `fulfillment_type` (`warehouse` or `direct_delivery`), `order_date`, and `order_total`. It does not include payment transaction history or a paid amount.
- `AetherClient.getSaleOrders()` and `AetherClient.getPurchaseOrders()` already provide the necessary records. `AetherClient.getSaleOrderMargin(id)` returns warehouse FIFO line-item revenue/cost/margin and order totals; the DTC form returns revenue/cost/margin at the order level.
- Sale order statuses include open, shipped, completed, cancelled, and returned. Exclude cancelled and returned orders from sales totals and charts; state that scope in the page.
- Map order type using existing fields: `fulfillment_type === "direct_to_customer"` → Direct to consumer; `business_channel === "wholesale_b2b"` → B2B; `business_channel === "retail_b2c"` → Warehouse B2C; otherwise Special / other. Verify actual data values before expanding this mapping.
- Current owner assignment and order/shipped dates support current workload and average order-to-ship duration. There is no owner assignment event history, so do not claim to show historic employee handoffs or each employee's actions over time.
- `amount_paid` is cumulative paid-to-date on a sale order, not a dated payment ledger. Purchase order totals represent commitments, not cash paid. Do not label order-date trends as actual cash flow.

## UX and information architecture

### Filters and run behavior

1. Provide date-from/date-to, employee, and order-type filters in a compact filter row. Validate that the start date is not after the end date.
2. Require an explicit **Run analysis** action. Snapshot filter values when run so the visible charts do not silently change before the user asks to refresh.
3. After execution, render every analysis panel in one page. Use a responsive two-column chart grid on wide screens and one column on narrow screens. Keep the trend and employee table wide enough to read.
4. Give sections independent loading, error, and empty states where practical. If margin calls fail for some orders, disclose the failed count and exclude those rows from margin totals.
5. Keep money formatting in AUD, labels and units explicit, accessible chart names/legends, and text alternatives to color.

### Analysis panels to display together

1. **Order movement and cash position trend:** weekly sales order value, customer payments recorded, and purchase order value. Group by order date and label each series accordingly. Add persistent explanatory copy: this is not a bank cash-flow statement because payment dates and PO payment transactions are unavailable.
2. **Order type mix:** donut of order value by DTC, warehouse B2C, B2B, and other; alongside a compact count/value comparison. Show legible legend labels, percentage share, and center total. Aggregate tiny/unknown groups into Other if needed to keep the donut readable.
3. **Payment balance mix:** donut of unpaid balance grouped by payment status, calculated as `max(order_total - amount_paid, 0)` per order; identify it as an order-balance estimate, not cash receipts history.
4. **Order status by value:** open/shipped/completed value distribution. Cancelled and returned are excluded from the eligible order set and must not be presented as active sales.
5. **Order size distribution:** donut of order value attributed to order-size bands, with order counts in the legend. Use stable documented thresholds and AUD labels.
6. **Product/category analysis:** revenue by product category, popular products by units, and top products by line revenue. Product revenue derived from line items may not exactly equal order totals when shipping/tax are included; label it as line revenue.
7. **Open-order allocation:** allocation state by open-order count and/or value, using the existing `allocationLabel()` utility and understandable names. This is a period-filtered view of currently stored status, not historical status as-of each date.
8. **Purchase commitments:** non-cancelled PO value by warehouse/direct-delivery fulfillment and PO order date. Do not call commitments paid cash. Scope PO panels by the selected date range; owner and sale-order-type filters do not apply to POs and this scope must be visible.
9. **Employee workload table:** assigned order count, current open/shipped/completed counts, value, and average order-to-ship time where shipped dates exist. Say that assignments are current and assignment history is unavailable.
10. **Profitability:** for shipped/completed eligible orders, report revenue, cost, gross profit, and gross margin. Include a horizontal bar chart of profit by order type, top 3 by gross profit, and top 3 by revenue. Use warehouse FIFO line margins to aggregate true product rankings. DTC margin is only available per order, so show DTC rows as DTC orders rather than implying product-level DTC profit. Also show top 3 sale orders if useful, with order numbers and type.

Do not add Home's Open Orders, Open Value, Outstanding, Sales Demand, inventory position, or generic live KPI cards as Analysis headlines. Compact period-scoped totals may appear inside their relevant analysis panel when they explain the chart (for example, the center total of an order-type donut).

## Implementation steps

1. Recheck the current screen and API contracts in `src/types/index.ts`, `src/lib/aether-client.ts`, `src/hooks/useApi.ts`, and Home components. Confirm all order type/status values against existing data or API types. Do not assume that a historical trend can be derived from current statuses.
2. Create `src/app/(screen)/analysis/page.tsx` and a client workspace component under `src/app/(screen)/analysis/`. Add an Analysis nav item in `src/components/layout/SideNav.tsx` using an existing Lucide icon and the current nav pattern.
3. Implement filter state and explicit run snapshot. Use TanStack Query and `AetherClient` to load sale orders, purchase orders, and profiles. Bound parallel margin requests (for example, at most five concurrent order-margin calls); never request margins for open/cancelled/returned orders.
4. Build reusable accessible chart components in the Analysis route or an existing chart location. Donut slices must use nonnegative values, handle zero totals, show the legend and percentages, and have an empty state. Horizontal bars must handle zero/negative gross profit and long labels. Trend series must share comparable units/currency and identify the date basis.
5. Compute each panel from the same filtered sale-order set. Keep PO date filtering explicit and independent from sale-only employee/order-type filters. Reconcile sums and avoid counting one order more than once in order-level panels.
6. Implement profitability using the margin response union. Aggregate warehouse item-level margins by product across orders for product rankings. Preserve sale-order-level totals for profit-by-type and order rankings. Keep DTC profit/revenue rankings at order level. Clearly distinguish gross profit from net profit; current data does not establish operating expenses.
7. Add empty, partial-failure, loading, and API-error states. Make the limits of cash and employee history visible next to the affected panels, not only in documentation.
8. Review at desktop and narrow viewport widths. Check that all chart panels are visible in the page at once, readable, and do not overflow. Ensure chart text does not depend on color alone.

## Scope boundaries

**In scope:** Cosmog Analysis route, sidebar link, compact filters, client-side aggregation, responsive chart/table presentation, and honest labeling of available metrics.

**Out of scope unless a verified requirement is approved separately:** Aether endpoint/schema/database changes, payment ledger or cash-flow implementation, employee assignment audit history, inventory forecasting, changes to Home dashboard metrics, profit allocation of unmodeled operating expenses, and modification of order workflows.

If actual cash flow or historic employee activity becomes a hard requirement, stop and report the missing source data and proposed API/schema work separately instead of inferring it from order dates or current owner fields.

## Verification gates

From the Cosmog repository root:

1. `npm run lint` — no new lint findings.
2. `npx tsc --noEmit` — no new type errors. At plan-writing time this command reports pre-existing missing exports (`PoShortfallResponse`, `ShortfallOrder`, `ShortfallOrderItem`) and implicit-any errors in `src/components/common/orders/ShortfallAllocationDialog.tsx`; record these separately.
3. `npm run build` — production build succeeds, subject to existing environment prerequisites.
4. Manual UI review at desktop and narrow widths: all panels render together after Run; filters apply consistently; order types and percentages are legible; empty/partial/error states are understandable; charts do not imply true cash flow or historic assignment activity.
5. Reconcile chart totals against a small known dataset or representative API records: sale totals exclude cancelled/returned; paid and outstanding formulas are correct; PO commitments exclude cancelled; warehouse product margins sum to their order totals within rounding; profit-by-type sums to the available margin rows.

There is no dedicated test script in `package.json` at plan-writing time. If adding calculation tests, colocate them with the aggregation module and follow the repository's existing test setup if one has since been added; otherwise keep pure aggregation functions testable and report the test-tooling gap rather than introducing a test framework as part of this UI feature.

## Maintenance notes

- Revisit order-type mapping when Aether adds or changes `business_channel`/`fulfillment_type` values.
- Revisit cash reporting only after dated customer-payment and supplier-payment data becomes available.
- Revisit employee movement after assignment history is persisted.
- Keep labels clear if margin cost methods change; the UI should describe the API's actual cost basis.
- Do not add new dashboard-overlapping KPIs without removing or differentiating existing Home metrics.
