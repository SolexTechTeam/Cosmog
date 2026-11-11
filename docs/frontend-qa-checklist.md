# Solext Frontend QA Checklist

## Purpose

Use this checklist to guide user-facing QA of Solext. Follow each workflow in the UI and check that the displayed status, quantities, metrics, links, and history match the action taken. Prioritize the end-to-end order and inventory workflows before directory and account pages.

This file is the result-bearing checklist from manual UI QA on 2026-10-20 against the live localhost:3000 app using the connected Supabase dev dataset. `[PASS]` means the expected behavior was observed; `[FAIL]` means a defect was reproduced; `[PARTIAL]` means some checks passed but the full bullet was not covered; `[NOT TESTED]` means no evidence was collected. See [`frontend-qa-results.md`](frontend-qa-results.md) for tested record IDs and key findings.

## 1. Sales order workflow

- Can I create a standard sales order from the Sales page? **[PASS]** — SO-2610-003/004 created through the UI.
- Can I create a new customer while creating an order? **[PASS]** — QA-20261020 Deep Sales Customer created and selected.
- Can I create a new product while creating an order? **[PASS]** — QA products created and used on QA orders/POs.
- Do customer, products, quantities, unit prices, shipping, and order total display and save correctly? **[PASS]** — SO-2610-003 shipping $5 persisted; total recalculated to $55.
- Does the order appear with the expected initial fulfillment and payment statuses? **[PASS]** — New QA orders started Open with payment Not requested.
- Does creating the order increase Demand by the ordered quantities? **[PASS]** — QA order creation increased product Demand by ordered quantity.
- Does creating the order leave Allocated unchanged until stock is reserved? **[PARTIAL]** — Unstocked order showed no reservation; isolated metric baseline not captured for every order.
- Can I edit an open order, and do its details and totals update afterward? **[PASS]** — Shipping/note edit persisted after reload and total updated.
- Are requested, allocated, and shortfall quantities shown distinctly for each order line? **[PASS]** — Retest: SO-2610-001 showed 10 needed, 10 from warehouse, 0 incoming, 0 shortfall; Test Product showed SO-2610-001 at 10 / 10 on an on-hand lot.
- Can I ship an order, then mark it Completed after delivery? **[PASS]** — Happy path shipment/completion worked, the Open menu now exposes only Shipped and Cancelled, and shortfall order SO-2610-003 was blocked from shipping with a clear allocation error.
- Can I cancel an order? Does cancellation release its reservations and remove its active demand? **[PASS]** — SO-2610-005 cancellation released its incoming reservation; demand returned to 0.
- Can I return a shipped order? Does the return restore inventory and appear in history? **[PARTIAL]** — SO-2610-003 status changed to Returned; inventory restoration/history not verified.
- Are completed, cancelled, and returned orders represented correctly in tables, metrics, and customer history? **[PARTIAL]** — Statuses persisted after reload; cross-page metrics/customer history not fully checked.
- Is payment tracked independently from fulfillment? Can I update amount paid and payment notes? **[PASS]** — SO-2610-002 remained Open while payment moved to Awaiting payment; AUD $4 paid, $6 balance, and a tagged payment note persisted after reload while the order Notes tab stayed separate.

## 2. Purchase order workflow

- Can I create a PO for an existing supplier and create a new supplier during the workflow? **[PASS]** — QA supplier created; POs created against it.
- Can I add an existing product and create a new product during the workflow? **[PASS]** — QA product created and added to POs.
- Can I create both Warehouse and Direct Delivery POs? **[PASS]** — Warehouse POs were covered earlier; PO-2610-002 was created as Direct Delivery.
- Do quantities, unit costs, currency, AUD FX conversion, shipping, landed costs, and PO totals calculate correctly? **[PASS]** — PO-2610-005: SGD10 ×2 at 1.1192 + $1 freight = AUD$23.50; landed $11.75/unit.
- Is shipping applied to the intended lines and reflected in landed cost and order total? **[PARTIAL]** — Single-line freight allocation and totals checked; multi-line allocation not checked.
- Can I edit draft PO details and items? Are edits restricted as expected after confirmation? **[PARTIAL]** — Draft PO-2610-002 tracking and notes saved, but expected-arrival display did not update and item editing was not exercised; confirmed status choices were restricted.
- On confirmation, does a warehouse PO create the expected incoming quantities and ledger entries? **[PASS]** — PO-2610-005 confirmation showed incoming +2 and reserved 2.
- Does confirming a PO show the allocation preview, with suggested allocations that can be edited, accepted, reset, or skipped? **[PASS]** — Edit, reset, and accept were verified on PO-2610-007; Skip Allocation was verified on direct-delivery PO-2610-002.
- When a PO moves to In Transit, does incoming stock remain incoming rather than on-hand? **[PASS]** — PO-2610-005 remained incoming until receipt.
- On receipt, do quantities move from incoming to on-hand, create traceable lots, and use the correct landed costs? **[PASS]** — PO-2610-005 received 2; traceable lot at AUD$11.75/unit.
- Do partial receipts leave the correct remaining quantities and status? **[FAIL]** — PO-2610-003 ordered 2 units, but the In Transit → Received flow offered no quantity entry and immediately received all 2 units; a one-unit partial receipt could not be performed.
- Does receiving show the separate, read-only receive-results review? **[PASS]** — Receive results showed allocated quantities and success/failure summary.
- Does the PO follow Draft → Confirmed → In Transit → Received, and are invalid backward transitions prevented? **[PASS]** — Happy path worked; retest showed Draft offers only Confirmed/Cancelled and Confirmed offers only In Transit/Cancelled.
- Can I cancel a PO? Are unreceived incoming quantities and active reservations reversed while received inventory remains? **[PARTIAL]** — Unreceived PO incoming/reservations reversed; preservation of already received stock not tested.
- Does PO cancellation update inventory, allocation, procurement status, and ledger views correctly? **[PASS]** — PO-2610-006 cancellation reversed incoming; metrics returned to zero and ledger reversal was visible.
- Do Direct Delivery POs stay out of warehouse stock and incoming-stock metrics? **[PASS]** — Confirming direct-delivery PO-2610-002 created zero lots and left the product at 4 on-hand, 0 incoming, and 0 allocated.

## 3. Sales and procurement links

- Can I link and unlink sales orders from a PO? **[PARTIAL]** — Linking verified; unlink action not exercised.
- Can I link and unlink POs from a sales order? **[PARTIAL]** — PO creation from SO created the link; unlinking not tested.
- Are links visible from both the sales-order and PO detail pages? **[PASS]** — SO-2610-004 and PO-2610-005 showed each other, including after receipt.
- Does linked incoming supply affect the correct sales-order lines and procurement status? **[PASS]** — Linked PO changed SO from Need to Awaiting, then Ready to Ship after receipt.
- What happens to links and statuses when a PO is edited, received, or cancelled? **[PARTIAL]** — Link persisted through receipt; edit/cancel lifecycle and agent observed inconsistency remain unverified.
- Can I create a sales order from a PO detail page, and does the link appear correctly? **[PASS]** — Created SO-2610-002 from PO-2610-002; after selecting Direct to Customer and linking the PO, both detail pages showed the relationship.

## 4. Allocation and reallocation

- Does PO confirmation suggest allocations for the correct open-order shortfalls? **[PASS]** — PO preview matched its product and one-unit shortfall.
- Does the priority system allocate to the intended sales orders first? **[PARTIAL]** — Linked priority verified; full priority ranking/tie-break rules not tested.
- Are sales orders linked to a PO prioritized as expected? **[PASS]** — PO-2610-007 suggested linked SO-2610-007 before older unlinked SO-2610-006.
- Can I edit allocation suggestions, accept them, reset them, or skip them? **[PASS]** — Edit/reset/accept were verified on a warehouse PO; skip was verified on PO-2610-002.
- Can allocation cover multiple products and orders without exceeding the PO quantities? **[FAIL]** — PO-2610-004 correctly constrained a manual 2+2 split across two products and two SOs to 4/4 per line, but Accept & Allocate failed because the preview also included unrelated direct-to-customer SO-2610-002 at zero allocation. The PO remained at zero allocations after reload.
- Can I reallocate supply from a PO? After accepting, are the previous and new allocations correct? **[FAIL]** — The accepted baseline could not be created: the same zero-allocation direct-to-customer row caused the initial allocation transaction to fail, so the PO remained at zero and reallocation could not proceed.
- Can I allocate and reallocate a sales order by inventory lot? **[PARTIAL]** — FIFO lot display inspected; manual lot allocation/reallocation not exercised.
- Can I cover a sales-order shortfall by taking allocation from another open order? Does the other order lose the same quantity? **[PASS]** — Transferred 1 unit from SO-2610-004 to SO-2610-005; the recipient moved 2/3→3/3 and Ready to Ship, while the donor moved 2/2→1/2 and Need.
- Can I reallocate unassigned stock from the shared pool? Does this leave existing reservations in place and distribute only unassigned stock? **[PASS]** — Cancelling SO-2610-005 released 3 units; Re-allocate Pool added only the one-unit shortfall to SO-2610-004 while preserving its existing unit, moving it 1/2→2/2.
- Does automatic allocation choose the expected eligible lots, including oldest stock first where applicable? **[PARTIAL]** — Oldest lot showed existing reservation; automatic lot selection was not independently exercised.
- Do allocation changes update Allocated, Available, and affected order statuses correctly? **[PASS]** — PO allocation/receipt and SO shipment updated metrics and statuses; ledger matched.
- Is allocation bounded by available stock, with any uncovered quantity remaining as a visible shortfall? **[PARTIAL]** — No-stock SO showed a warning/shortfall; line-level allocation details were blank.

## 5. Procurement status and demand

- Does procurement status show **Need** when supply is insufficient and no linked incoming PO covers the shortfall? **[PASS]** — Uncovered QA sales order displayed Need.
- Does it show **Awaiting** when linked PO supply is expected but not yet received? **[PASS]** — SO-2610-004 displayed Awaiting after PO confirmation.
- Does it show **Ready to Ship** when enough on-hand stock is available and allocated? **[PASS]** — SO-2610-004 became Ready to Ship after receipt/allocation.
- Does it remain **Need** when only part of the requested quantity is covered? **[PARTIAL]** — Shortfall preview shown; partially covered status case not isolated.
- Does status update after linking/unlinking a PO, receiving/cancelling a PO, allocating stock, or editing an order? **[PARTIAL]** — Link/receive/allocation/edit paths observed; unlink path not tested.
- Does procurement status show **Done** after fulfillment? **[PASS]** — SO-2610-004 showed Done after shipment.
- Do Demand and procurement metrics include only the intended active order statuses and quantities? **[PARTIAL]** — Demand changes verified for create/cancel/ship; all-status inclusion rules not exhaustively checked.
- Do cancellation, completion, return, and order edits update Demand and other affected metrics correctly? **[PARTIAL]** — Cancel/edit/ship metrics checked; return and full completion metric semantics not fully checked.

## 6. Product conversion

- Can I convert source-product stock into the expected output product? **[PASS]** — Converted 1 unit of Test into 2 units of QA-20261020 Conversion Output.
- Does the conversion validate source quantity, output quantity, and conversion ratio? **[PASS]** — Positive whole quantities completed; a source quantity above available stock was blocked by the form constraint.
- Does source stock decrease and output stock increase by the expected amounts? **[PASS]** — Test decreased by 1 and the output product increased by 2.
- Does conversion appear in Inventory History with the correct products and quantities? **[PASS]** — Source history showed conversion -1 and output history showed conversion +2.
- Is the output lot and its cost correct? **[PASS]** — A two-unit output lot was created at the manually entered AUD $6.01 unit cost.
- Is output average cost calculated using the conversion ratio? For example, if one source item costing $10 converts to 36 output items, is output average cost $10 ÷ 36? **[FAIL]** — With a nonzero source cost and 1→2 ratio, Output Unit Cost stayed at $0.00 instead of auto-filling; the conversion required a manual $6.01 value.
- Are inventory summaries and available quantities updated? **[PASS]** — Combined on-hand moved 101→102; source and output detail totals reconciled after conversion.
- Does the UI prevent conversion when there is insufficient source stock? **[PASS]** — Requesting 101 source units when only 100 were available did not submit; the source field retained focus with its max constraint.

## 7. Dashboard (`/home`)

- Are inventory, order, and procurement metrics current and accurate? **[PARTIAL]** — QA product/order metrics reconciled after PO receipt, shipment, and cancellations.
- Does Open Orders count Open orders and exclude orders already Shipped or closed? **[PARTIAL]** — Open and shipped order display inspected; dashboard count semantics not exhaustively reconciled.
- Do product and owner filters affect the intended metrics without changing unrelated metrics? **[PARTIAL]** — Inventory search filtering was exercised; dashboard product/owner metric scoping was not fully completed.
- Can I create and edit team notes? Are changes still visible after refresh? **[PASS]** — Created, refreshed, edited, and refreshed the note `QA-20261020 dashboard note edited`.
- Do dashboard values agree with the Sales, Procurement, and Inventory pages? **[PARTIAL]** — Targeted QA product counts agreed after receipt/shipment; full dashboard reconciliation not done.

## 8. Inventory stock (`/inventory`)

- Are on-hand, incoming, allocated, available, demand, and inventory-value metrics correct? **[PASS]** — QA product metrics reconciled at key states: 0/2 incoming/2 allocated, then receipt and shipment to zero.
- Do product filters scope the intended metrics? **[PARTIAL]** — Search hid nonmatching rows, but summary cards remained at overall totals; selector-based metric scoping was not completed.
- Are lot quantities, statuses, costs, and lot counts accurate? **[PASS]** — Received PO lot quantity and AUD landed unit cost matched receipt.
- Are depleted lots hidden from active stock views where expected, while remaining visible in history? **[PASS]** — After fully removing the two-unit PO lot, a refreshed Lots tab showed only the two unaffected lots while History retained the -2 adjustment and original receipt. The immediate post-adjustment view briefly showed an empty lot state before refresh.
- Can I open product inventory details and find its lots, allocations, movement history, and product details? **[PASS]** — Lots, history, details, and line-level allocation rows were visible in the tested product/SO records.
- Do stock statuses and low-stock thresholds display correctly? **[PASS]** — Tagged product moved from Low Stock at threshold 3 with 2 units to In Stock with 4 units after adjustments; the edited threshold persisted.

## 9. Inventory history (`/inventory/history`)

- Can I create both positive and negative manual adjustments? **[PASS]** — Admin added 3 units and removed 1 unit from the tagged product.
- For a decrease, can I select lots to reduce, and does the selected quantity equal the adjustment? **[PASS]** — The dialog exposed both lots and accepted exactly 1 of 1 assigned to the chosen AUD $4 lot.
- For an increase, can I enter landed cost in AUD? **[PASS]** — Added 3 units with AUD $4.00 landed cost.
- Does a positive adjustment create the expected inventory lot or update inventory as intended? **[PASS]** — A new three-unit AUD $4.00 lot was created.
- Do adjustments update on-hand, available stock, average cost, inventory summaries, and related metrics? **[PASS]** — After +3/-1, the product showed 4 on-hand, 4 available, and $5.01 weighted average cost.
- Does each adjustment create a ledger entry with the correct quantity, cost, reason, and date? **[PASS]** — Both movements appeared at the action time; the positive note was searchable and the selected lot quantity/cost reconciled.
- Are receipts, fulfillment, returns, reservations, conversions, and PO cancellation reversals recorded correctly? **[PARTIAL]** — Receipts, fulfillment, reservations, conversions, and PO reversals were verified; return history remains unverified.
- Can I search/filter the ledger, follow links to related records, and load more history? **[PARTIAL]** — Exact-note search and related records worked; movement/date filters and load-more could not be fully exercised with the small dataset.

## 10. Data pages

For Customers, Suppliers, Products, and Users:

- Can I create, view, and edit each type of record? **[PARTIAL]** — Customer, supplier, product creation and order/PO views tested; users and record edits not exhaustively tested.
- Is archive or deactivation supported? If so, can I restore the record, and what happens to existing orders and selection lists? **[PARTIAL]** — Product archive/restore and user deactivate/reactivate worked and counts changed; consequences for every record type and selector were not covered. Inactive Product/User rows were mislabeled `depleted`.
- Do search, filters, and list counts work? **[PARTIAL]** — Product, inventory, ledger, and user list counts/search were exercised; every directory/filter combination was not covered.
- Do detail pages show the right related orders and summary metrics? **[PARTIAL]** — SO/PO cross-links verified; other data detail pages not tested.

Additional detail checks:

- **Customers** — edit contact details, customer type, payment terms, address, and notes; verify order history and customer metrics. **[PARTIAL]** — Created a tagged customer and saved name, contact email/phone, payment terms, and address; notes and a nonempty order-history reconciliation were not completed.
- **Suppliers** — edit contact details and lead time; verify PO history and spend metrics. **[PARTIAL]** — Lead time edited from 1 to 2 days and was restored; the detail page reconciled 2 POs, 1 active, 1 received, and $14.55 spend. Contact fields were not changed.
- **Products** — edit product details and low-stock threshold; verify product availability in inventory and order selectors. **[PASS]** — Name and low-stock threshold edits persisted; the product remained available in inventory and order selectors and survived archive/restore.
- **Users** — edit name and role; activate/deactivate; verify access restrictions. **[PARTIAL]** — Staff name edit and deactivate/reactivate worked and staff admin-page restriction was verified; role reassignment was not changed. Inactive status was labeled `depleted` in the table.

## 11. Profile, settings, help, and navigation

- **Profile (`/profile`)** — edit name, change password, view role/status, and sign out. **[PARTIAL]** — Name edit persisted and was restored, role/status displayed, and sign-out worked; password change was not executed.
- **Lookup Values (`/settings/lookups`)** — switch categories; add, edit, delete, and activate/deactivate values; verify admin-only access and protected system values. **[PASS]** — Admin created, edited, deactivated, and deleted a tagged Customer Type value; system SO values were protected and staff access was blocked.
- **Help (`/help`)** — expand/collapse topics and check that workflow guidance matches current behavior. **[PASS]** — Home Dashboard collapsed and Inventory History expanded with current workflow guidance.
- **Navigation** — check sidebar links, active-page state, collapse/expand, profile/help links, and mobile layout. **[PARTIAL]** — Core Sales/PO/Inventory routes navigated; collapse and mobile layout not tested.
- **Authentication** — check sign-in errors, protected-page redirects, and sign-out behavior. **[PARTIAL]** — Sign-out redirected a protected Inventory request to `/login`, and admin/staff sign-in worked; invalid-credential feedback was not exercised.

## 12. Shared checks

- Do loading, empty, error, retry, and save states behave clearly? **[PARTIAL]** — Save toasts and asynchronous status refresh observed; empty/error/retry states not systematically tested.
- Is invalid input blocked with useful feedback? **[PARTIAL]** — Required product fields and over-available conversion quantity were blocked by native constraints, but the UI did not show explanatory inline feedback.
- Do consequential actions, such as cancellation, ask for confirmation? **[PASS]** — SO and PO cancellation required confirmation.
- Do successful changes show feedback and refresh affected data? **[PASS]** — Allocation, receive, cancel, and save actions gave feedback and updated views.
- Do tables, search, filters, dialogs, and forms remain usable at narrow screen widths? **[FAIL]** — At 390×844, Sales and Procurement tables/dialogs and the reallocation modal remained usable, but Inventory's Convert Products button was partly hidden behind the fixed sidebar and pagination controls began offscreen.
- Can keyboard users navigate controls and understand focus and validation states? **[PARTIAL]** — Tab moved focus from product search to Category, and Escape closed the Add Product dialog; a full keyboard-only workflow and screen-reader pass were not completed.
