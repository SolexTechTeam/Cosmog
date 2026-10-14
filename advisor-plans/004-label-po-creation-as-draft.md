# Plan 004 — Label PO Creation as Draft

**Priority:** P3 — small workflow copy defect  
**Effort:** XS  
**Risk:** Low  
**Confidence:** High; the wizard and backend success state say Draft while the primary button says “Save and confirm.”

## Problem and impact

The purchase-order wizard's final action says “Save and confirm,” but the PO is created with `draft` status. Operators can believe the PO has been confirmed and inventory incoming lots created when it is still a draft.

Evidence:

- `Cosmog/src/components/common/orders/purchase-order/PurchaseOrderWizardFooter.tsx:29-45` hardcodes `saveLabel="Save and confirm"`.
- `Cosmog/src/components/common/orders/CreatePurchaseOrderDialog.tsx:218-221` stores the created order and `:304-306` explicitly reports it “was created as a draft.”
- `Cosmog/AGENTS.md` specifies draft → confirmed creates incoming lots and opens allocation preview; creation itself must not imply that transition.

## Implementation steps

1. Change the final button label to “Save as draft” (or “Create draft PO,” matching the shared wizard's terminology). Keep the loading label unambiguous, e.g. “Saving…”.
2. Verify the PO status remains Draft after save and that confirmation remains a separate status action that creates lots and opens the allocation preview.
3. Add a component test only if a frontend test runner already exists; otherwise use the browser acceptance check.

## Scope boundaries

In scope: purchase-order footer copy and related loading copy.

Out of scope: changing PO creation status, confirmation API calls, sales-order wizard copy, or the PO state machine.

## Verification gates

From `Cosmog/`:

```sh
npm run lint
npm run build
```

Browser acceptance: create a PO and verify the action says it will save/create a draft, the success message and detail badge both say Draft, no incoming lot is created until explicit confirmation, and explicit confirmation still opens Allocation Preview.

Done means the button copy matches the persisted state and the lifecycle remains draft until the operator confirms it.

## Maintenance note

Keep creation copy consistent with Aether's `POST /api/purchase-orders` semantics and the status-transition documentation in `Cosmog/AGENTS.md`.
