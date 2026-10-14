# Plan 006 — Cancel Purchase Orders Without Leaving Inventory or Metrics Behind

**Priority:** P1 — cancelled procurement currently remains in stock projections and the ledger story is incomplete  
**Effort:** M  
**Risk:** Medium; cancellation changes inventory state, so the database transition must be atomic and safe under retries.  
**Confidence:** High; reproduced in the local UI and confirmed in both the frontend mutation paths and Aether route implementation.
**Status:** Implemented; Aether integration suite passed 129 tests, and changed Cosmog files pass targeted lint.

**Baseline:** Cosmog `5a4600c`; Aether `fe40314` (2026-10-14). Re-check both repositories before implementation because Aether already has an unrelated working-tree change in `tests/integration/allocation-preview.test.ts`.

## Problem and impact

Cancelling a PO currently changes its status without reversing its inventory effects. The PO then appears cancelled in procurement while its incoming lot and positive `po_incoming` ledger entry still affect stock. Procurement summary cards also include cancelled PO value in Total Spend and omit some statuses from their status counts, so the cards do not reconcile to the table.

QA evidence from local Cosmog:

- Cancelled PO `PO-2610-017` had created one incoming unit for product 151. After cancellation, the displayed inventory formula remained `1,000 on hand + 6,102 incoming - 7,101 allocated = 1 available`.
- Inventory history continued to show the PO's `PO Incoming (+1)` movement for `$11.20`; no compensating ledger movement appeared.
- The PO showed `Cancelled`, but the procurement cards still included its `$11.20` in Total Spend. The cards showed Draft 9, In-Transit 2, Direct to Consumer 0, Received 3, while the table had 17 POs including two Confirmed and one Cancelled.
- The cancelled PO remained linked to its sale order. The QA record did not show that cancellation changed the SO itself.

Code evidence:

- `Cosmog/src/app/(screen)/orders/procurement/[id]/PurchaseOrderDetail.tsx` sends cancellation to `AetherClient.updatePurchaseOrder(..., { status })`, then refreshes the PO detail and sale-order list only.
- `Cosmog/src/app/(screen)/orders/procurement/ProcurementTable.tsx` exposes Cancelled in the inline editor and also sends the status through the generic update method.
- `Aether/src/routes/purchase-orders.ts` implements `PATCH /api/purchase-orders/:id` as a direct `purchase_orders` update. It does not call an inventory transaction.
- `Aether/src/services/inventory.ts` provides atomic RPC-backed create-incoming and receive operations, but no PO cancellation operation. Aether's inventory ledger movement constraint currently supports `po_incoming`, `received`, `reserved`, `shipped`, `adjustment`, and `conversion`.
- `Cosmog/src/app/(screen)/orders/procurement/ProcurementOverviewCards.tsx` counts Draft, In-Transit, DTC, and Received only, and sums `order_total` across all POs, including cancelled ones.
- `Cosmog/advisor-plans/005-analysis-business-insights.md` already defines PO commitments as non-cancelled PO value.

## Desired behavior

- A PO cancellation is a single Aether-owned business operation that updates PO status and reverses any remaining incoming inventory effects atomically.
- Draft and direct-delivery POs cancel without inventory writes. Confirmed and in-transit warehouse POs remove their unreceived incoming quantity from stock projections and append an auditable, compensating ledger row; original ledger history is retained.
- Any allocations/reservations tied to incoming lots from the cancelled PO are released consistently, without changing linked SO status, SO demand, or unrelated lot allocations.
- If a PO has already been received, cancellation must not erase on-hand stock. Reject cancellation after receipt unless product rules explicitly define a safe return/refund workflow. If partial receipt becomes supported, only the unreceived remainder may be reversed and the received quantity must remain on-hand.
- Repeating a cancellation is safe: no duplicate reversal, no double release, and no duplicate ledger movement. Invalid status transitions return a clear conflict response.
- Procurement status metrics explain every PO status in the table, including Confirmed and Cancelled. Cancelled orders are excluded from active procurement counts and committed PO value; status counts reconcile to the table for the same filters. Clarify whether the money card is committed value or historical spend, and label/formula it accordingly.
- After a successful cancellation, PO detail, procurement metrics, linked SO allocation/demand views, stock rows, inventory summaries, inventory lots, and inventory history show the updated state without a hard reload.

## Implementation steps

### Aether — own the transition and inventory reversal

1. Add an explicit cancellation action, such as `POST /api/purchase-orders/:id/cancel`, and expose it through `AetherClient`. Do not permit `{ status: "cancelled" }` through the generic PATCH route to bypass the business operation. Keep generic PATCH for non-inventory header fields and enforce the documented status transition rules server-side.
2. Implement the cancellation in a Postgres RPC/transaction, following the row-locking and atomicity pattern of `fn_create_incoming_lots` and `fn_receive_lots`. Lock the PO and its affected lots/allocations; validate that the PO is cancellable; set status; release eligible active allocations from the PO's incoming lots; and update lot state/quantities so incoming totals no longer include cancelled units.
3. Append compensating ledger entries for each affected PO item/lot, linked to the same PO item reference, with negative quantity equal to the cancelled unreceived incoming amount. Preserve existing `po_incoming` entries as audit history, and use clear notes/metadata to identify the cancellation. Confirm the inventory history display presents negative movements and cancellation context intelligibly. If a distinct movement type is preferred, update the database constraint, lookup seed, API types, and UI label together.
4. Make the RPC idempotent and atomic. A second request must either return the already-cancelled PO without new effects or return a documented conflict; it must not add another reversal. Handle missing lots and legacy inconsistent states explicitly, with no partial writes.
5. Add backend integration coverage in `Aether/tests/integration/po-lifecycle.test.ts` or a focused cancellation test: draft cancellation; confirmed warehouse PO reversal; in-transit cancellation; DTC cancellation without inventory effects; cancellation with allocations; already-cancelled retry; received PO rejection; and an invalid transition. Assert PO status, incoming/on-hand/reserved quantities, allocation rows, summary values, and ledger before/after. Include a concurrent/retry check if the integration harness supports it.
6. Update `Aether/docs/api/purchase-orders.md` with the new action, state rules, response, errors, ledger semantics, and retry behavior.

### Cosmog — route all UI cancellation through the action

7. Add a typed `AetherClient.cancelPurchaseOrder` call and replace the generic status PATCH in both `PurchaseOrderDetail.tsx` and the procurement inline editor. Keep cancellation confirmation and success/error feedback consistent. Do not update the UI optimistically before Aether confirms success.
8. Centralize invalidation for this mutation using `useInvalidate` and existing `queryKeys`. Invalidate/refetch purchase orders, sale orders and allocation/demand views, stock status, inventory summary, inventory lots, and ledger only after successful cancellation. Include keyed query families with prefix invalidation where appropriate.
9. Define the procurement card contract explicitly. Add visible coverage for Confirmed and Cancelled states or an equivalent reconciled status breakdown. Exclude cancelled POs from the active/committed value formula. Rename “Total Spend” if it represents outstanding/non-cancelled PO value rather than actual spend, and make the included statuses/date scope clear. Verify all cards use the same filtered PO collection as the table.
10. Add frontend coverage if a supported harness exists; otherwise perform browser acceptance for cancellation from both the detail status control and inline editor, including failure feedback when Aether rejects cancellation.

## Scope boundaries

In scope: Aether PO cancellation transaction/API/ledger contract and tests; Cosmog cancellation actions, affected-query invalidation, and procurement metric definitions.

Out of scope: cancelling linked sale orders, changing their demand quantities/status, deleting historical ledger entries, changing normal receive behavior, implementing supplier refunds/returns for received stock, or broad procurement dashboard redesign.

## Verification gates

From `Aether/`, run the repository's integration test command for PO lifecycle/cancellation plus lint/typecheck/build commands documented by its package scripts. From `Cosmog/`, run lint and build after the UI work.

Browser acceptance using disposable test POs:

1. Cancel a draft warehouse PO: status changes, no lot/ledger row is created, and stock remains unchanged.
2. Confirm a warehouse PO, then cancel it: the original positive incoming ledger row remains; an equal negative cancellation movement appears; incoming/available summaries return to their pre-PO values; on-hand stays unchanged; and any reservation from that incoming lot is released without changing the SO.
3. Repeat for in-transit and direct-delivery POs. DTC must never create stock or ledger rows.
4. Attempt cancellation of a received PO and verify a clear rejection with no status, lot, allocation, or ledger changes.
5. Cancel from both UI entry points and confirm updated status/count/value cards, SO allocation/demand, stock, lots, and ledger without reload. Confirm a failed action leaves data unchanged and shows the API error.
6. Reconcile procurement cards against the same table filter: Confirmed and Cancelled are represented; cancelled POs are not included in active counts or committed value; all included/excluded value is explainable.

Done means the PO status and its remaining incoming-stock effects cannot diverge, ledger history shows an auditable reversal, retries cannot double-reverse, and the UI/metrics refresh consistently after cancellation.

## Maintenance note

Aether owns PO state and inventory behavior. Future UI cancellation controls must call the cancellation action, not write the status directly. Any new inventory query derived from lots, allocations, demand, or ledger must be included in the cancellation invalidation helper.
