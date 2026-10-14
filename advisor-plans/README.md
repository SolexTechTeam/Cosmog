# Cosmog Improvement Plans

Plans based on Cosmog `b87453d` and Aether `33a2cdb`, audited 2026-10-14. The Cosmog and Aether working trees were already substantially modified. Re-check the scoped changes before implementing each plan.

| Priority | Plan | Scope | Status | Depends on |
|---|---|---|---|---|
| P1 | [001 — Refresh inventory and ledger views after SO transitions](001-refresh-inventory-ledger-after-so-transitions.md) | Sales-order mutation cache invalidation | TODO | — |
| P2 | [002 — Render PO receive results from the response contract](002-render-po-receive-results.md) | Receive results dialog and toast | TODO | — |
| P2 | [003 — Align inventory Available metrics](003-align-inventory-available-metrics.md) | Home and inventory metric definitions | TODO | — |
| P3 | [004 — Label PO creation as draft](004-label-po-creation-as-draft.md) | Purchase-order wizard copy | TODO | — |
| P3 | [005 — Analysis page for business insights](005-analysis-business-insights.md) | Period-based business analysis, order mix, cash-position proxy, and profitability | TODO | — |

Recommended order: 001 first because stale inventory can affect operational decisions; 002 and 003 can proceed independently; 004 is a small copy correction. Aether plan `../Aether/advisor-plans/001-honor-po-confirm-allocation-edits.md` is a separate cross-repository P1 and can proceed independently of these UI-only plans.
