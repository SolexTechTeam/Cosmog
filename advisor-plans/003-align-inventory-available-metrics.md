# Plan 003 — Align Inventory “Available” Metrics

**Priority:** P2 — inconsistent labels make stock promises hard to interpret  
**Effort:** S  
**Risk:** Medium; changing displayed availability can change operational interpretation, so preserve the domain distinction explicitly.  
**Confidence:** High; code uses two formulas under the same “Available” label.

## Problem and impact

Inventory rows and product detail use Aether's `qty_available`, defined as on-hand minus reserved. The home dashboard instead calculates on-hand plus incoming minus reserved and labels it “Available.” This makes the home card disagree with the sum of product-row Available values. The inventory overview card labels the projected formula “Unallocated,” which is a different concept and can remain distinct if clearly defined.

Evidence:

- `Aether/supabase/migrations/00001_full_schema.sql:482-489` defines `qty_available = qty_on_hand - qty_reserved`.
- `Cosmog/src/app/(screen)/inventory/InventoryTable.tsx:119-123` displays that API field in the “Available” column.
- `Cosmog/src/app/(screen)/home/InventorySummaryWidget.tsx:44-48` computes `available = onHand + incoming - allocated` but the card at line 87 labels it “Available.”
- `Cosmog/src/app/(screen)/inventory/InventoryOverviewCards.tsx:16-19,28-34` computes the same projected amount and labels it “Unallocated.”
- QA after an incoming 2-unit PO showed the home/aggregate available value at 0 while product rows summed to −6,103; for the test product, 0 on-hand, 2 incoming, 2 allocated produced row Available −2 and projected unallocated 0.

## Desired definitions

- **On-Hand:** physical units in warehouse lots.
- **Incoming:** units in confirmed/in-transit incoming lots not yet received.
- **Allocated:** units reserved to open demand, including incoming lots where the backend reports them reserved.
- **Available:** `qty_available = on_hand - allocated`; it may be negative when reservations depend on incoming stock, and should be labeled/visually explained as current on-hand availability or shortfall.
- **Unallocated / projected balance:** `on_hand + incoming - allocated`; this may differ from Available and must not be called Available.

If product direction intentionally defines “Available” as projected including incoming, stop and align the backend stock-row field and every consumer through an approved domain decision; do not silently change the DB formula based on the UI repro.

## Implementation steps

1. Use the canonical `qty_available` field for the home dashboard's Available metric, both for All Products and selected-product mode. Do not recompute the quantity with incoming stock included.
2. Keep InventoryOverviewCards' projected formula only under an explicit label such as “Unallocated (incl. incoming)” or another product-approved term, with a short help label if needed. Keep the computation centralized in a pure helper if it will be reused.
3. Review other dashboard/product detail cards and tooltip copy for the same ambiguous label. Do not change stock-status thresholds or allocation state derivation as part of this UI alignment.
4. Add arithmetic checks if a frontend test harness exists; otherwise record and run browser checks for the dataset below. Include zero stock, incoming-only, partially reserved, and over-reserved scenarios.

## Scope boundaries

In scope: home Available calculation and inventory summary labels/help text; a small shared formula helper if beneficial.

Out of scope: changing `inventory_summary.qty_available`, changing stock-status rules, altering allocation behavior, changing product demand formulas, or changing procurement spend.

## Verification gates

From `Cosmog/`:

```sh
npm run lint
npm run build
```

Browser acceptance for a product with `on_hand=0`, `incoming=2`, `reserved=2`: Available must be −2 on the home product filter and product row; projected Unallocated must be 0. For All Products, home Available must equal the sum of row `qty_available`; the separately labeled projected metric must equal `sum(on_hand + incoming - reserved)`. Verify UI copy makes a negative Available understandable as shortfall/over-reservation rather than available stock.

Done means no UI metric labeled Available includes incoming quantities while the product rows use the database's on-hand-only definition, and build/lint pass.

## Maintenance note

Use Aether's `qty_available` as the source of truth for current availability. Any future projected-stock metric should name incoming stock in its label and have its formula verified against the inventory ledger and lot statuses.
