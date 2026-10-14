# Legacy Dialog Redesign Playbook

Use this guide when replacing a dense legacy dialog with a clearer guided flow. The purchase order wizard is the current example; its three steps and fields are specific to that task, not a template every dialog must copy.

## 1. Understand the existing dialog

- Read the dialog, its child components, the caller, relevant types, and API methods before changing the UI.
- List every field, action, validation rule, relationship, and side effect in the existing flow.
- Check the backend endpoint documentation, schema, and route when the dialog creates or updates data.
- Check the entity's status lifecycle. Keep data creation, confirmation, fulfillment, and receipt as distinct actions when the product defines them separately.
- Treat screenshots as design and workflow references. Verify each proposed field against the real model and endpoint rather than copying mockup-only fields.
- Preserve pre-existing working-tree changes unrelated to the dialog.

## 2. Shape the user journey

- Group fields by the order in which staff need to make decisions. Use steps only when a group has a clear purpose and the next step depends on it.
- Put the minimum information needed to start first, detailed configuration next, and a useful review at the end when that matches the task.
- Make optional relationships explicit. Linking a related order should not silently change quantities or other user-entered data.
- Define validation at the step that owns the required fields. Keep navigation reversible before the final save.
- State what the last action actually does. If it creates a draft, say so even when the button is confirming completion of the form. Do not imply that the entity has been operationally confirmed.

## 3. Build the dialog from named components

- Keep the dialog responsible for shared state, step navigation, validation, and persistence.
- Give each step a named component with focused data and action props. Extract repeated field, row, summary, progress, and footer patterns into named components.
- Avoid a large JSX tree with nested anonymous wrappers. Use sections and components whose names describe their content.
- Keep step components mounted but hidden when their local state must survive Back and Continue navigation.
- Use a reusable footer for navigation and the primary action. Keep it in normal document flow unless the user explicitly asks for a sticky footer.
- Keep the progress header aligned and spaced consistently across every step. Show completed, current, and upcoming states distinctly.

## 4. Apply the current dialog visual language

- Group each step's heading and related controls inside a card using the established blush step surface: `#fff9fa` with a subtle `#f2e7eb` border.
- Use white inner surfaces only where they make controls or distinct data groups easier to scan; avoid adding cards around every small block.
- Keep the review surface cool and pale, with white content areas and a clear cost summary.
- Use the shared orange primary action and green completed progress state. Match existing radius, border, and spacing patterns rather than introducing a new palette.
- At narrower widths, stack fields and actions without clipping the modal or footer.

## 5. Make forms self-explanatory

- Give every input a visible label. Placeholders can show an example, but should not be the only description of a field.
- Put units and currency next to the field label or value, including on totals and summaries. Distinguish source currency from converted currency.
- Give separate actions distinct labels and visual weight, such as creating a product versus adding a line item.
- Keep line items readable as rows: product, quantity, unit cost, line total, and a clearly labeled remove action.
- Keep fields controlled by the dialog's source of truth so their values survive navigation between steps.

## 6. Preserve data and lifecycle behavior

- Build the save payload from the current state and match the backend's documented field names and units.
- For currency conversion, confirm whether the API expects source currency or converted amounts and where conversion occurs. Do not convert twice.
- Send optional shipping and tax values explicitly when the form collects them; verify that the API route and persistence layer retain them.
- Keep line items, linked orders, notes, and costs intact while navigating. Do not silently replace user-entered quantities when linking demand.
- Do not combine "save as draft" with the entity's operational confirmation transition. Follow the lifecycle documented in `AGENTS.md` and the backend.
- Prevent implicit form submission from saving. A final save should require an explicit activation of the primary action; Enter in an input must not advance or create unexpectedly.
- After saving, show a clear success state and prevent duplicate submissions while the request is in flight.

## 7. Review and verify

- Review the final code for lifecycle accuracy, payload fields, currency units, and preserved step state.
- Check labels, keyboard operation, focus visibility, loading, errors, and narrow layouts.
- Run focused ESLint and `git diff --check` for the changed files. Run broader checks when the task asks for them or the change warrants them.
- Use a browser preview for visual changes when the local environment allows it. If preview is unavailable, report that limitation instead of claiming visual verification.
- Report what changed, what checks passed, and any behavior that could not be verified.
