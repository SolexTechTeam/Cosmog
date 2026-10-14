# Plan 002 — Render PO Receive Results from the Response Contract

**Priority:** P2 — receipt confirmation currently contradicts its success message  
**Effort:** M  
**Risk:** Low-medium; response rendering and toast copy only, unless backend contract evidence reveals incorrect data.  
**Confidence:** High; type/component mismatch explains the reproduced “No items to allocate” display.

## Problem and impact

After PO receipt, the API returns each reallocated SO with `items?: AllocationItemBreakdown[]`. The frontend passes these objects directly to `AllocationConfirmDialog`, whose row model expects `suggested_allocations?: SuggestedAllocationItem[]`. The dialog therefore renders “No items to allocate” even when `items` is present. The same handler counts successful SOs but the message uses the vague phrase “orders re-allocated.” In QA the success toast said one order was reallocated while the modal showed no items.

Evidence:

- `Aether/src/routes/inventory-actions.ts:166-174` returns `{ sale_order_id, priority_points, items }` from `reallocateOnReceive`.
- `Aether/src/services/allocation.ts:87-100` constructs those `items` from `autoAllocateOrder` results; failures use `error`.
- `Cosmog/src/types/index.ts:319-327` correctly declares `ReceivePoResponse.reallocations[].items`.
- `Cosmog/src/app/(screen)/orders/procurement/[id]/PurchaseOrderDetail.tsx:143-153,559-566` passes those response rows into the generic dialog as `suggestions`.
- `Cosmog/src/components/common/orders/AllocationConfirmDialog.tsx:7-14,195-253` reads `suggested_allocations` and shows a misleading empty-allocation message when that property is absent.

## Implementation steps

1. Keep the receive API contract as the source of truth unless tests prove it wrong. Introduce a receive-specific read-only results view or adapt the generic dialog through an explicit typed mapper; do not cast response rows to `SuggestedAllocationItem[]`.
2. Render SO number (resolve `sale_order_id` against the already-fetched sale-order list), each returned product/item, allocated quantities and remaining shortfall using the exact `AllocationItemBreakdown` fields. Render rows with an `error` as failures, not successful reallocation; render a distinct empty state only when the API result contains no item movements.
3. Change `AllocationConfirmDialog` only if a shared read-only model can be represented without weakening the confirm-mode types. Prefer a separate `ReceiveResultsDialog` when the two response shapes or user actions remain different.
4. Make the toast count truthful: report successful SO count separately from failed SO count, and use “orders” only when counting SO groups. If one order has no positive allocation, do not report it as reallocated.
5. Add tests for a successful row with `items`, an error row, a zero-result response, and mixed success/failure. If no frontend test harness exists, document the equivalent browser cases and keep Aether's `po-lifecycle` assertions for the response shape.

## Scope boundaries

In scope: receive response rendering, strongly typed mapping, and receive toast wording.

Out of scope: changing `reallocateOnReceive` priority/eligibility rules, changing ledger operations, editable allocation controls during receipt, or unifying PO confirmation preview with receive results.

## Verification gates

From `Cosmog/`:

```sh
npm run lint
npm run build
```

From `Aether/`, if the response type or service contract changes:

```sh
npm run build
npm test -- tests/integration/po-lifecycle.test.ts
```

Browser acceptance: receive a PO where an SO is reallocated; verify the modal displays the SO number and per-item result, and its totals match the inventory allocation and SO allocation tabs. Force one failed allocation and verify the error is visibly separated and excluded from the successful count.

Done means the dialog never shows “No items to allocate” for a response containing `items`, and toast/modal counts match successful and failed results.

## Maintenance note

Keep `ReceivePoResponse` synchronized with the route/service and do not reuse the `suggested_allocations` shape without a deliberate adapter. Confirmation preview and receive review are separate PO lifecycle stages.
