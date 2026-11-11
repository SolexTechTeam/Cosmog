# Solext Frontend QA Plan

## Purpose and execution

This plan turns the checklist in [`frontend-qa-checklist.md`](frontend-qa-checklist.md) into manual UI scenarios. Run scenarios in a dedicated QA environment. Use the Solext interface to perform actions and inspect displayed results; capture before/after values or screenshots for discrepancies. Do not use production data.

### Test setup

Prepare:

- An admin account and a staff account.
- One customer and one supplier, plus the ability to create additional records.
- Two products (A and B) with known prices and categories.
- Product A with at least two on-hand lots of different ages and costs; Product B with no stock.
- A draft warehouse PO, an open sales order, an order with a partial allocation, and a shipped order where practical.
- The configured AUD exchange rate and a known expected conversion result for cost checks.

Before each scenario, record the relevant visible baseline: order/PO status, item quantities, inventory lots, allocated/incoming/available quantities, demand, and ledger rows. Recheck through the UI after the action. Use isolated records or reset test data between scenarios so earlier actions do not affect later results.

**Pass rule:** every expected result is visible and internally consistent across the affected pages. Record the scenario ID, test account/role, test data, actual result, pass/fail, and evidence. If a behavior is intentionally unavailable (for example, archive), record it as unsupported instead of treating it as a pass.

## 1. Sales order workflow

### SO-01 — Create a standard sales order
**Steps:** Sales → Add Sales Order; choose the prepared customer, add Product A and a quantity, complete the wizard. Open the created order.
**Expected:** Creation succeeds once; the order appears in the list and detail with the selected customer, item, quantity, price, and initial status.

### SO-02 — Create a customer during order creation
**Steps:** Start a new order; use the inline customer creation flow; save a new customer and select it for the order.
**Expected:** The customer is saved and selected without losing entered order data; the created order links to the new customer and the customer directory/detail shows it.

### SO-03 — Create a product during order creation
**Steps:** Start a new order; create a product from the inline product flow; add it as an order line.
**Expected:** Product creation succeeds, it is selectable on the order, and its displayed details match the saved record.

### SO-04 — Verify order fields and totals
**Steps:** Create an order with known quantity, unit price, and shipping; review the wizard and saved detail.
**Expected:** Values persist; line total equals quantity × unit price; subtotal, shipping, and order total agree with the displayed calculation.

### SO-05 — Verify initial statuses
**Steps:** Create a new order without allocating or shipping it; inspect the list and detail.
**Expected:** Fulfillment status is Open. Payment status matches the selected/requested payment setup; it does not silently imply fulfillment.

### SO-06 — Demand increases on order creation
**Steps:** Record Product A Demand; create an active order for a known quantity; refresh dashboard/inventory/demand views.
**Expected:** Demand increases by the active ordered quantity according to the displayed metric definition; unrelated products do not change.

### SO-07 — Allocation remains unchanged before reservation
**Steps:** Record Allocated and Available; create an order but do not allocate it; refresh affected views.
**Expected:** Demand reflects the order, while Allocated remains unchanged and no reservation is shown in the order/ledger.

### SO-08 — Edit an open order
**Steps:** Open an Open order; edit a permitted field (quantity or price, then a detail such as shipping); save and reload.
**Expected:** Saved values persist, line/order totals recalculate, and affected demand/allocation metrics reflect the edit without duplicate order lines.

### SO-09 — Distinguish ordered, allocated, and shortfall quantities
**Steps:** Open an order with enough stock, then one with partial stock; inspect each product line/allocation view.
**Expected:** Requested quantity, reserved quantity, and uncovered shortfall are distinguishable and their arithmetic reconciles per line.

### SO-10 — Ship and complete an order
**Steps:** Fully allocate an eligible order; change it to Shipped; inspect stock and ledger; then mark it Completed after delivery.
**Expected:** Shipping follows the allowed transition; fulfilled stock is deducted and ledgered once; completion updates status without a second stock deduction.

### SO-11 — Cancel an allocated order
**Steps:** Allocate stock to an Open order; record its reservation, demand, and available stock; cancel it and confirm.
**Expected:** Status becomes Cancelled; reservation is released; available stock increases by the released amount; active demand no longer includes the cancelled order; cancellation is not duplicated on refresh.

### SO-12 — Return a shipped order
**Steps:** Ship an order; record the affected lot and on-hand quantity; return the order and inspect inventory/history.
**Expected:** Status becomes Returned; returned quantity is restored to inventory according to the return flow; a return movement appears in history; retrying/reloading does not add another return.

### SO-13 — Closed statuses in lists, metrics, and customer history
**Steps:** Create or use Completed, Cancelled, and Returned orders; compare Sales list/metrics and customer detail.
**Expected:** Each order displays its actual status and is counted or excluded from metrics according to the page’s stated definitions; customer history links to the correct order.

### SO-14 — Payment is separate from fulfillment
**Steps:** On an order, update amount paid and payment notes; save, reload, then change fulfillment status separately.
**Expected:** Payment fields persist and payment status/amount update appropriately; changing fulfillment status does not overwrite payment data, and vice versa.

## 2. Purchase order workflow

### PO-01 — Use existing supplier and create a supplier inline
**Steps:** Create one PO with an existing supplier; create another using the inline supplier flow.
**Expected:** Each PO references the selected supplier; the new supplier appears in the directory/detail and remains linked after reload.

### PO-02 — Use existing product and create a product inline
**Steps:** Add an existing product to a PO; create a second product during PO creation and add it.
**Expected:** Both products appear as correct PO lines and the new product is available in the product directory and selectors.

### PO-03 — Warehouse and Direct Delivery types
**Steps:** Create one PO of each fulfillment type and inspect list/detail and inventory summaries.
**Expected:** Each saved PO shows the selected type; warehouse supply participates in incoming warehouse stock, while direct-delivery supply does not.

### PO-04 — Quantity, unit cost, currency, FX, and totals
**Steps:** Create a PO using known quantities, foreign currency cost, configured AUD rate, and shipping. Compare each shown value with an independent calculation using the configured rate.
**Expected:** Quantities and unit costs persist; converted AUD amounts use the configured rate and displayed precision; line and order totals reconcile. No stale or double conversion occurs after editing/reloading.

### PO-05 — Shipping allocation into landed cost
**Steps:** Create a multi-line PO with distinct quantities/costs and shipping; inspect per-line landed costs and summary.
**Expected:** Shipping is reflected in landed costs and PO totals. Check zero and non-zero shipping.

### PO-06 — Editability by PO status
**Steps:** Edit a draft PO’s header and items; save. Confirm it, then inspect which edits remain available and attempt any visible restricted edit.
**Expected:** Draft edits persist and recalculate totals. Post-confirmation controls match intended status rules; unavailable edits cannot be submitted accidentally.

### PO-07 — Confirm warehouse PO and verify incoming/ledger
**Steps:** Record incoming, on-hand, and ledger baseline; confirm a warehouse PO.
**Expected:** The PO becomes Confirmed; expected incoming quantities are recorded and traceable; on-hand does not increase merely because the PO was confirmed; the corresponding ledger/history entry is visible.

### PO-08 — Confirm allocation preview controls
**Steps:** Confirm a warehouse PO with open shortfalls; edit a suggested quantity, reset to suggestions, then test accept and (in a separate PO) skip.
**Expected:** Preview appears on confirmation; edits stay within available PO quantities; reset restores suggestions; accept applies the chosen allocation; skip confirms without applying preview allocations. No duplicate confirmation or allocation occurs.

### PO-09 — In Transit remains incoming
**Steps:** Move a confirmed PO to In Transit; inspect inventory summary and lots.
**Expected:** Status changes to In Transit; warehouse units remain incoming, not on-hand; no receipt lots are treated as physically received.

### PO-10 — Receive PO and verify lots/costs
**Steps:** Receive an In Transit PO; inspect receive results, stock lots, inventory summary, and ledger.
**Expected:** Received quantities move from incoming to on-hand; lots retain PO/source and landed-cost traceability; ledger records receipt once; cost and quantities match the PO.

### PO-11 — Partial receipt
**Steps:** Receive less than the ordered quantity where partial receiving is supported; inspect PO and inventory.
**Expected:** On-hand increases only by received quantity; the unreceived balance remains correctly represented; status and incoming values follow the product’s partial-receipt rules.

### PO-12 — Receive-results review is separate/read-only
**Steps:** Complete receipt and inspect the resulting dialog; attempt to change displayed allocation results.
**Expected:** Receive-results review appears after receipt and summarizes actual reallocation; it is read-only and distinct from the editable confirmation allocation preview.

### PO-13 — PO state machine
**Steps:** Progress a test PO through Draft → Confirmed → In Transit → Received; separately inspect available actions at each stage and attempt visible backward transitions.
**Expected:** Only intended forward transitions are available; Confirmed → In Transit is status-only; receipt behavior occurs only on In Transit → Received; Received is terminal for receipt flow.

### PO-14 — Cancel a PO with unreceived supply and reservations
**Steps:** Use a confirmed/in-transit PO with incoming quantity and active allocations; record quantities; cancel and confirm.
**Expected:** PO becomes Cancelled; unreceived incoming quantity is reversed and its active reservations released; already received units remain on-hand; cancellation happens once.

### PO-15 — Cancellation effects across UI
**Steps:** After PO cancellation, inspect Inventory, order allocations/procurement status, PO detail, and Inventory History.
**Expected:** Incoming/allocated/available values and affected statuses update consistently; ledger shows cancellation reversal; existing received stock is unchanged.

### PO-16 — Direct Delivery excluded from warehouse stock
**Steps:** Create/confirm/in-transit a Direct Delivery PO; compare warehouse incoming, on-hand, and dashboard PO metrics.
**Expected:** Direct-delivery goods do not increase warehouse stock or warehouse incoming totals; PO remains visible in procurement with correct fulfillment type.

## 3. Sales and procurement links

### LINK-01 — Link/unlink SO from PO
**Steps:** On PO detail, link an eligible sales order, save/refresh, then unlink it.
**Expected:** Link appears and is removed consistently; no unrelated orders are changed.

### LINK-02 — Link/unlink PO from SO
**Steps:** On sales-order detail or creation flow, link an eligible PO and then unlink it.
**Expected:** PO appears as linked from the sales order; unlink removes the relationship on both detail pages.

### LINK-03 — Link consistency from both details
**Steps:** Create a link from each supported entry point; open both PO and SO detail pages.
**Expected:** Both pages show the same relationship and identifiers after refresh.

### LINK-04 — Linked incoming supply and procurement status
**Steps:** Link an in-transit warehouse PO containing the needed product to an open order; compare its allocation/status before and after linking.
**Expected:** Only matching product/quantity supply contributes to the intended line’s awaiting/procurement calculation; unrelated lines remain unchanged.

### LINK-05 — Link behavior on PO edit, receipt, and cancellation
**Steps:** With a linked PO, edit its quantity if allowed, receive it, then run a separate cancellation case.
**Expected:** Link remains visible unless the workflow explicitly removes it; supply/status recalculates after each transition; cancellation removes unreceived cover and does not erase received inventory.

### LINK-06 — Create SO from PO detail
**Steps:** Use the create-sales-order action on PO detail; finish the order and reopen both records.
**Expected:** The new SO is saved once, linked to the PO, and shown from both details with correct products/quantities.

## 4. Allocation and reallocation

### ALLOC-01 — PO confirmation targets correct shortfalls
**Steps:** Prepare multiple open orders with different product shortfalls and confirm a PO containing only one of those products.
**Expected:** Preview suggests allocation only to eligible matching shortfalls; quantities never exceed the PO supply or remaining order need.

### ALLOC-02 — Allocation priority
**Steps:** Prepare competing open orders with different priority inputs (including age/payment as applicable); confirm or run pool allocation.
**Expected:** Distribution follows the documented scoring/priority order; displayed order and quantities agree with the chosen priority inputs.

### ALLOC-03 — Linked SO prioritization
**Steps:** Prepare linked and unlinked eligible orders for the same PO supply; open allocation preview.
**Expected:** Linked-order preference follows the intended rule and is visible in allocation results; no unrelated product is allocated.

### ALLOC-04 — Edit, accept, reset, and skip preview
**Steps:** Change a suggested quantity; reset; change again and accept; repeat with another PO and skip.
**Expected:** Reset restores original suggestions; accept commits only final displayed quantities; skip makes no preview allocations; totals remain within supply and shortfall bounds.

### ALLOC-05 — Multi-product and multi-order PO allocation
**Steps:** Use a PO with products A and B and at least two eligible orders; allocate across lines and orders.
**Expected:** Each product’s supply is accounted separately; sum of allocations per product does not exceed received/eligible PO supply; each order line shows the correct amount.

### ALLOC-06 — Reallocate PO supply
**Steps:** Start with allocations from a PO; use PO reallocation preview to move some supply from one linked order to another; accept.
**Expected:** Source allocation decreases and destination increases by the same product quantity; total allocated against the PO remains valid; both orders’ procurement state refreshes.

### ALLOC-07 — Allocate/reallocate SO by lot
**Steps:** Open an order with multiple eligible lots; allocate manually to a selected lot, edit/reallocate to another lot, save.
**Expected:** Selected lot and quantities are displayed correctly; no lot is overdrawn; order-level allocated total and stock availability reconcile.

### ALLOC-08 — Take another order’s allocation for shortfall
**Steps:** Create two open orders sharing eligible stock; use shortfall allocation on one to take a defined quantity from the other.
**Expected:** Destination order gains the quantity; source order loses the same amount; combined allocation is conserved; affected statuses/shortfalls recalculate.

### ALLOC-09 — Shared-pool reallocation
**Steps:** Create several open orders, some with existing reservations, and leave some stock unassigned; run pool reallocation.
**Expected:** Only unassigned warehouse stock is distributed by priority; existing reservations remain unchanged; total allocations do not exceed eligible on-hand stock.

### ALLOC-10 — Automatic lot selection
**Steps:** Create multiple eligible lots for one product with different receipt ages and enough combined stock; trigger automatic allocation.
**Expected:** Lots are selected according to the documented lot-order rule (oldest eligible first if applicable); quantities per lot and remaining balances are correct.

### ALLOC-11 — Metrics and statuses after allocation changes
**Steps:** Record Allocated, Available, and procurement status; allocate, reduce, and move allocation; refresh all affected pages.
**Expected:** Allocated and Available reflect reservation changes; affected order statuses recalculate; unrelated products/orders remain unchanged.

### ALLOC-12 — Prevent over-allocation and expose shortfall
**Steps:** Attempt to allocate more than available stock/PO supply and more than the order’s remaining need.
**Expected:** UI blocks or caps invalid quantities with clear feedback; committed allocation stays within limits; remaining uncovered demand is visible.

## 5. Procurement status and demand

### STATUS-01 — Need with no linked incoming supply
**Steps:** Create an open order with a quantity greater than on-hand stock and no linked PO.
**Expected:** Procurement status shows Need for the uncovered line/order.

### STATUS-02 — Awaiting with linked unreceived PO
**Steps:** Link a confirmed/in-transit warehouse PO for the shortfall without receiving it.
**Expected:** Status shows Awaiting for the covered incoming quantity; it does not imply on-hand stock or immediate ship readiness.

### STATUS-03 — Ready to Ship with on-hand allocation
**Steps:** Ensure enough on-hand stock is allocated to the order; inspect order status indicators.
**Expected:** Procurement status shows Ready to Ship when the documented quantity condition is met.

### STATUS-04 — Partial coverage remains Need
**Steps:** Allocate or link supply for less than the order-line quantity.
**Expected:** Covered and uncovered quantities are accurate; procurement status remains Need for the uncovered shortfall where specified.

### STATUS-05 — Status recalculation triggers
**Steps:** Record status; separately link/unlink a PO, receive/cancel a PO, allocate stock, and edit order quantity; refresh after each action.
**Expected:** Status updates after each relevant mutation and reflects the new available/incoming/allocated supply.

### STATUS-06 — Done after fulfillment
**Steps:** Fulfill/complete an order whose lines are ready; inspect procurement status.
**Expected:** Status shows Done after fulfillment and does not revert to Need on refresh.

### STATUS-07 — Demand and procurement metric scope
**Steps:** Prepare orders in Open, Shipped, Completed, Cancelled, and Returned states; compare Demand and procurement metrics.
**Expected:** Only statuses and quantities included by the product’s metric definitions contribute; all displayed totals reconcile with eligible orders.

### STATUS-08 — Demand/metrics after lifecycle and edits
**Steps:** Record baseline; edit an active order, cancel one, complete another, return a shipped one; compare dashboard and inventory values after each.
**Expected:** Each action changes only the relevant demand/metric contributions; no stale or double-counted values remain after refresh.

## 6. Product conversion

### CONV-01 — Convert source stock to output product
**Steps:** Open conversion with a source product that has sufficient stock; choose output product and ratio; submit.
**Expected:** Conversion completes once and identifies the correct source/output products and quantities.

### CONV-02 — Validate conversion quantities and ratio
**Steps:** Try blank, zero, negative, fractional (if unsupported), and inconsistent quantities/ratios.
**Expected:** Invalid inputs are blocked with clear feedback; valid quantities produce the expected ratio.

### CONV-03 — Verify stock movement
**Steps:** Record source and output stock; perform conversion; refresh Inventory.
**Expected:** Source decreases by consumed quantity and output increases by produced quantity; no unrelated product changes.

### CONV-04 — Verify conversion ledger record
**Steps:** Perform a conversion and open Inventory History for both products.
**Expected:** Ledger shows the conversion movement(s), products, quantities, and reference/context; values match stock changes.

### CONV-05 — Verify output lot and cost
**Steps:** Convert stock with a known source cost; inspect output lot and cost/average-cost display.
**Expected:** Output lot exists and its cost traces to consumed source cost and conversion ratio; no unexplained cost is introduced.

### CONV-06 — Average cost ratio calculation
**Steps:** Use one source unit costing $10 and convert it into 36 output units; inspect the output average cost.
**Expected:** Output average cost is $10 ÷ 36 (subject to displayed rounding); total source cost is conserved across output units.

### CONV-07 — Summary refresh after conversion
**Steps:** Compare on-hand, available, allocated, and inventory value before/after conversion.
**Expected:** Summaries reflect source reduction and output addition; reservations are not silently changed unless conversion rules explicitly require it.

### CONV-08 — Insufficient source stock
**Steps:** Attempt conversion with quantity above available source stock.
**Expected:** UI blocks submission or returns a clear error; stock and ledger remain unchanged.

## 7. Dashboard (`/home`)

### DASH-01 — Dashboard metrics are current
**Steps:** Record dashboard totals; create an order or receive stock; refresh dashboard.
**Expected:** Relevant inventory, order, and procurement figures update and reconcile with their source pages.

### DASH-02 — Open Orders definition
**Steps:** Prepare orders in Open, Shipped, Completed, and Cancelled states; inspect Open Orders.
**Expected:** Only Open-status orders count as stated in Help; shipped/closed/cancelled orders are excluded.

### DASH-03 — Product and owner filters
**Steps:** Record all-products/all-owners values; choose a product, then an owner; compare cards and summaries.
**Expected:** Product and owner filters affect only their documented metrics; unaffected metrics remain stable.

### DASH-04 — Create and edit team note
**Steps:** Add a note; edit its text; reload dashboard.
**Expected:** Note appears once, edited text persists, and stale text is not shown after refresh.

### DASH-05 — Dashboard/source-page reconciliation
**Steps:** Compare selected dashboard totals with Sales, Procurement, and Inventory pages using the same filters/date scope.
**Expected:** Values agree once differences in scope are accounted for; discrepancies can be tied to documented definitions.

## 8. Inventory stock (`/inventory`)

### INV-01 — Inventory metric calculations
**Steps:** Use a product with known on-hand, incoming, and allocated amounts; inspect all metric cards.
**Expected:** On-Hand matches physical lots; Incoming matches eligible warehouse PO supply; Allocated matches active reservations; Available follows the displayed formula; Demand matches active orders; value uses displayed cost rules.

### INV-02 — Product filter scope
**Steps:** Record all-products totals, filter to Product A, then clear filter.
**Expected:** Product-scoped metrics change to Product A values; global-only totals behave as documented; clearing restores original values.

### INV-03 — Lot quantities/status/cost/count
**Steps:** Open a product’s lot view with multiple lots and known balances/costs.
**Expected:** Each lot’s quantity/status/cost and the lot count match its displayed details; totals reconcile to inventory summary.

### INV-04 — Depleted lot visibility
**Steps:** Consume a lot to zero or use a depleted fixture; inspect active inventory and history.
**Expected:** Depleted lots are excluded from active-stock view if that is the intended rule but remain traceable in history.

### INV-05 — Product detail navigation and sections
**Steps:** Open a product from inventory; inspect Lots, Allocations, History, and Details tabs.
**Expected:** Tabs load the selected product’s records only; links and values identify the correct product.

### INV-06 — Stock status and threshold
**Steps:** Open a product near/below its low-stock threshold; edit threshold and reload.
**Expected:** Stock status reflects quantity versus threshold; saved threshold persists and status updates as expected.

## 9. Inventory history (`/inventory/history`)

### HIST-01 — Positive and negative adjustments
**Steps:** Create one positive and one negative adjustment for a test product.
**Expected:** Both directions are supported with correct signed quantity and confirmation/success feedback; stock changes by the requested amount.

### HIST-02 — Select lots for decrease
**Steps:** Start a negative adjustment; choose one or more lots and enter a decrease across them.
**Expected:** UI shows eligible lots and balances; selected decreases sum to the adjustment and cannot exceed lot balances.

### HIST-03 — Enter landed cost for increase
**Steps:** Start a positive adjustment; enter quantity and landed cost in AUD; save.
**Expected:** Cost input is accepted in AUD, validated, and shown consistently in the resulting inventory/ledger record.

### HIST-04 — Positive adjustment inventory result
**Steps:** Record existing lot/stock state; add positive adjustment and inspect lots.
**Expected:** Inventory increases by the adjustment amount; new lot/update behavior matches the UI flow and cost is traceable.

### HIST-05 — Adjustment effects across summaries
**Steps:** Record on-hand, available, average cost, inventory value, and dashboard summary; make adjustment and refresh.
**Expected:** Every affected figure recalculates consistently; unrelated products/metrics do not change.

### HIST-06 — Ledger fields for adjustment
**Steps:** Save an adjustment with known quantity, cost, reason, and date; find it in history.
**Expected:** One ledger row shows correct movement type, signed quantity, cost/context, date, and product.

### HIST-07 — Other movement types
**Steps:** Generate or locate a receipt, fulfillment, return, reservation, conversion, and PO cancellation reversal; filter history.
**Expected:** Each movement is labeled and signed correctly; cancellation reversal is identified as incoming reversal, not physical stock removal; records link to the appropriate source when supported.

### HIST-08 — Search, filters, links, pagination
**Steps:** Search/filter for a known record; open a linked reference; load another history page.
**Expected:** Results match criteria, links navigate to the right record, and loading more appends older/newer entries without duplicates or losing filters.

## 10. Data pages

### DATA-01 — Create, view, and edit each record type
**Steps:** For Customer, Supplier, Product, and User, create a record where permitted; open detail; edit a field; reload.
**Expected:** Each supported operation saves once and persists; required fields and validation are clear; detail reflects the list.

### DATA-02 — Archive/deactivation behavior
**Steps:** For each type, inspect available archive/deactivation controls; deactivate/archive a test record if supported; inspect selectors and existing linked records; restore if supported.
**Expected:** UI clearly communicates support and consequences; inactive records are handled consistently in selectors while existing order history remains intact. If no archive control exists, record as unsupported/product decision.

### DATA-03 — Search, filters, and counts
**Steps:** Add records with distinct names/types/statuses; search and apply each available filter; clear filters.
**Expected:** Matching rows and counts update correctly; clear restores the full list; no record is lost or duplicated.

### DATA-04 — Detail relationships and metrics
**Steps:** Open customer/supplier detail with related orders and compare displayed totals/counts against their lists.
**Expected:** Related orders and summary metrics use the correct customer/supplier and the documented status/financial scope.

### DATA-05 — Customer detail fields and metrics
**Steps:** Edit customer name/contact/type/payment terms/address/notes one at a time; reload and compare orders and metric cards.
**Expected:** Each field persists independently; address/notes do not overwrite other details; order history, revenue, open orders, and outstanding amounts reconcile.

### DATA-06 — Supplier detail fields and metrics
**Steps:** Edit supplier name, email, phone, and lead days; inspect PO list and totals.
**Expected:** Edits persist; invalid lead days are rejected; PO counts and spend reconcile with supplier-linked POs and documented status rules.

### DATA-07 — Product fields, threshold, and selectors
**Steps:** Edit product details and threshold; open inventory and order/PO selectors.
**Expected:** Product details persist; threshold/status updates; product remains correctly searchable/selectable where active.

### DATA-08 — User name, role, active state, access
**Steps:** As admin, edit a user’s name and role, deactivate/reactivate a test account, then inspect sign-in/access as that user.
**Expected:** Profile reflects changes; inactive account access follows policy; role restrictions (such as lookup management) match assigned role.

## 11. Profile, settings, help, navigation, and authentication

### NAV-01 — Profile details and password
**Steps:** Edit own name; change password using valid and invalid/mismatched values; sign in again with the new password.
**Expected:** Name persists; invalid password changes are blocked with feedback; successful change permits sign-in with new credential; role/status display is correct.

### NAV-02 — Lookup values CRUD and categories
**Steps:** As admin, switch categories; add a value; edit label/order; toggle active; delete a deletable test value; revisit category.
**Expected:** Changes persist in the selected category; ordering/status display updates; deleted values disappear as intended; system values cannot be changed where protected.

### NAV-03 — Lookup access control
**Steps:** Open lookup page as staff and as admin.
**Expected:** Admin can manage values; staff sees the access restriction and cannot submit management actions.

### NAV-04 — Help accordion
**Steps:** Open each FAQ topic; close it; open a different topic.
**Expected:** Topic content matches its heading; expand/collapse state and accessibility labels update; no content is clipped.

### NAV-05 — Sidebar and responsive navigation
**Steps:** Visit every sidebar destination; check active state; collapse/expand; resize to mobile and navigate.
**Expected:** Each link routes correctly; active state follows route; collapsed labels remain discoverable; mobile content/nav remain usable.

### NAV-06 — Sign-in errors and protected routes
**Steps:** Submit invalid credentials; visit a protected route signed out; then sign in with a valid account.
**Expected:** Error is visible without exposing sensitive details; protected route requires authentication; valid sign-in reaches the app and intended landing page.

### NAV-07 — Sign out
**Steps:** Sign out from the sidebar; use browser back or revisit a protected URL.
**Expected:** User returns to login; authenticated pages remain inaccessible until signing in again.

## 12. Shared behavior

### SHARED-01 — Loading, empty, error, retry, save states
**Steps:** Check pages with no records; exercise loading and retry states where reproducible; submit a mutation and observe its saving state.
**Expected:** Empty state explains next action; errors are visible and retryable; controls prevent duplicate submits while saving; successful save returns to a stable view.

### SHARED-02 — Validation feedback
**Steps:** Submit required fields empty and try invalid numeric/date/email values in representative forms.
**Expected:** Invalid values are blocked before or by the server with actionable feedback; entered valid values are retained where practical.

### SHARED-03 — Confirmation for consequential actions
**Steps:** Trigger cancel order, cancel PO, and any destructive delete action; inspect confirmation; cancel once and confirm in a separate run.
**Expected:** Dialog identifies the action and consequence; dismissing makes no mutation; confirming performs the action once.

### SHARED-04 — Mutation feedback and data refresh
**Steps:** Create/edit/cancel/allocate/receive/adjust records; inspect toast/feedback and affected pages after navigation/refresh.
**Expected:** Success or error feedback matches the result; query data refreshes; no stale totals or duplicate records remain.

### SHARED-05 — Narrow viewport usability
**Steps:** Repeat key table, form, and dialog flows at a narrow mobile viewport and tablet width.
**Expected:** Required controls remain reachable; tables can be used without losing critical fields; dialogs and forms fit/scroll without hiding actions.

### SHARED-06 — Keyboard accessibility
**Steps:** Navigate representative pages, dialogs, tables, and validation errors with keyboard only.
**Expected:** Focus is visible and follows a logical order; actions can be activated; dialogs can be dismissed appropriately; errors are associated with fields and announced/readable.

## Results log template

| Scenario ID | Date | Tester / role | Test data | Pass / fail / unsupported | Actual result and evidence | Defect reference |
|---|---|---|---|---|---|---|
| SO-01 | | | | | | |
