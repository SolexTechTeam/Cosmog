# Plan 001 — Refresh Inventory and Ledger Views After SO Transitions

**Priority:** P1 — stale stock and ledger undermine fulfillment decisions  
**Effort:** S  
**Risk:** Low; broad invalidation may trigger extra reads, but TanStack Query deduplicates requests.  
**Confidence:** High; stale stock and a missing shipped-ledger row were observed until browser reload.

## Problem and impact

Shipping an SO mutates reservations, on-hand lot quantities, SO state, and ledger rows. `SaleOrderDetail` calls `refetch()` only for the sale-order list after fulfillment, release, or return. Inventory and history queries remain cached, so immediate navigation can show old quantities or omit the ledger movement. The user had to hard-reload to see the shipped row and updated stock.

Evidence:

- `Cosmog/src/app/(screen)/orders/sales/[id]/SaleOrderDetail.tsx:34-36` reads sale orders, purchase orders, and profiles; no inventory/ledger reads are owned here.
- `Cosmog/src/app/(screen)/orders/sales/[id]/SaleOrderDetail.tsx:183-190` calls fulfill/release/return and then only `refetch()`.
- `Cosmog/src/hooks/useApi.ts:32-52` defines query keys including `saleOrders`, `stockStatus`, `inventorySummary`, `ledger`, `inventoryLots`, `allocation`, and `demandPriority`; the wrapper has a 30-second stale time by repository convention.
- `Cosmog/src/app/(screen)/inventory/InventoryTable.tsx:52-54` and `Cosmog/src/app/(screen)/inventory/history/HistoryTable.tsx:99` consume the stale stock/lot/ledger queries.

## Implementation steps

1. Add a typed shared invalidation helper (or a clearly named local helper) for mutations that change SO status or inventory. It should invalidate the SO list, all allocation detail keys, stock status, inventory summary, inventory lots, ledger, and demand priority. Use prefix invalidation for keyed families such as `allocation` and `inventoryAllocations`; add root query-key constants if required rather than hardcoding strings at call sites.
2. In the SO status handler, await the successful API mutation first, then invalidate the affected queries. Keep the existing toast and SO list refresh. Do not invalidate on a failed transition.
3. Apply the same helper to shipped, cancelled/released, and returned transitions because each changes inventory/allocation state. Do not add unrelated PO or customer invalidation.
4. Add an explicit regression verification: after ship, cancel, and return, navigate to Inventory and History without reloading; stock and ledger must reflect the mutation immediately. Since Cosmog currently has no test script/test runner, use a browser acceptance check unless a supported frontend test harness is already present on the implementation branch.

## Scope boundaries

In scope: `SaleOrderDetail`, `useApi` query key/invalidation helper, narrowly scoped tests if a frontend harness exists.

Out of scope: backend inventory calculations, ledger content/ordering, PO transitions, changing cache stale time globally, or refetching every query after every mutation.

## Verification gates

From `Cosmog/`:

```sh
npm run lint
npm run build
```

Browser acceptance: fulfill a fully allocated warehouse SO; navigate immediately to Inventory and History without reload; verify on-hand, allocated, available, and the `shipped` ledger row update. Repeat with cancel/release and return, checking the expected stock effects. Confirm no invalidation runs when the API mutation fails.

Done means the three status mutations refresh all listed data before the next screen renders stale cached data, and lint/build pass.

## Maintenance note

If another component adds a query derived from inventory allocations or fulfillment, include it in the shared invalidation helper and its regression checklist. Keep invalidation aligned with Aether's actual mutation side effects.
