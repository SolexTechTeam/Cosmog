# Solext Dashboard Design Philosophy & Guide

## Purpose

The dashboard is the team’s daily operational starting point: it should make the state of inventory and orders legible, surface work that needs attention, and provide a short path into the relevant workflow. It is a working surface, not an analytics report or a directory of every feature.

This guide describes the design direction for the existing `/home` dashboard. It complements the shared system in [`../DESIGN.md`](../DESIGN.md) and applies specifically to dashboard composition, information priority, and behavior.

## Design philosophy: The Operations Briefing

Treat the dashboard like a calm shift briefing. At a glance, a staff member should be able to answer:

1. **What is the current state?** Inventory position, open order volume, and financial exposure.
2. **What needs attention?** Procurement pressure, outstanding balances, and active orders.
3. **Where should I go next?** The relevant order, inventory, or demand workflow.

The interface should feel dependable and composed under frequent use. It earns trust through clear definitions, consistent status language, visible loading and error states, and direct links to the work behind each number. Orange remains the primary action signal; semantic status colors explain state and urgency. Density should support scanning without making every metric equally loud.

### Core principles

- **Lead with decisions.** Give operationally consequential information the strongest position and clearest labels. Keep secondary context visually quiet.
- **Make numbers interpretable.** Pair every metric with a plain-language label, unit or currency, and scope. Distinguish on-hand, incoming, allocated, and available quantities.
- **Make the next step obvious.** Where a number or status can lead to a workflow, make the relationship clear and provide a direct route.
- **Keep shared context visible.** Product and owner filters should communicate what they affect. Avoid controls whose scope is unclear or whose effect silently differs between nearby sections.
- **Use color semantically.** Orange means brand or action. Status colors retain their established meanings; color is always accompanied by text or another readable cue.
- **Respect operational focus.** Notes and onboarding help the team, but should not compete with live work or consume the space needed to scan orders.

## Current dashboard: observed structure

The current home screen contains:

- A dashboard heading and short subtitle.
- A dismissible welcome banner with links to Sales Orders, Inventory, and Demand Priority.
- A warehouse inventory summary with a product selector and on-hand, value, incoming, allocated, and available measures.
- Order metrics with an owner selector, open order count/value, outstanding amount, procurement status counts, and sales demand.
- A shared team notes panel.
- An Active Sale Orders table, with search, filtering, order details, and compact columns.

At wide desktop sizes, inventory and order metrics occupy the main column while notes sit in a narrow right rail; the active orders table follows below. The page therefore already supports a useful briefing-to-action sequence, but its first viewport can become crowded: multiple metric families, two selectors, notes, and a table heading compete for attention. The metric strips also use fixed proportional widths and wrapping, so their balance depends on available space. Keep these observations in mind when evolving the page.

## Information hierarchy

Use this order as the default dashboard reading path:

1. **Page identity and scope** — title, concise purpose, and any global context such as the active date range if one is introduced.
2. **Operational signals** — inventory availability and order pressure, grouped by subject rather than mixed into one undifferentiated KPI wall.
3. **Work requiring action** — active orders and clearly surfaced exceptions or shortfalls.
4. **Team context** — shared notes and onboarding links, available without displacing operational work.

Within a group, prioritize metrics that help staff decide what to do next. Do not add a metric merely because the underlying data is available. Each one should answer a recurring operational question and have a clear definition.

### Metric writing and semantics

- Use short, concrete labels: “Available,” “Incoming,” “Open orders,” and “Outstanding.”
- Show units consistently. Quantities are units; money uses the configured currency format; counts remain counts.
- Explain scope in the section heading or nearby control. Make “All products” and “All owners” explicit defaults.
- Preserve the distinction between physical stock and committed stock. “Available” should not be visually interchangeable with “On-hand.”
- If a metric is derived from status groups, show the labels as well as the counts. Do not rely on colored dots alone.
- Avoid implying trend or freshness unless the data and time comparison support it.

## Layout and responsive behavior

### Desktop

- Keep the page title first and the active orders table easy to reach without navigating away.
- Group inventory measures together and order measures together; preserve whitespace between groups so their meanings do not blur.
- Use the notes rail only when it has enough width for readable note text and controls. Let the operational content take priority over a fixed-width sidebar.
- Let metric cards flex to a deliberate grid. Avoid narrow cards that force labels or values to truncate or wrap unpredictably.
- Align section headings, controls, and card edges to a consistent content grid.

### Tablet and narrow screens

- Collapse the notes rail into a full-width section in the reading order after operational summaries, or place it below the active work surface when screen height is constrained.
- Reflow metric cards into fewer columns before their content becomes cramped. Each card must retain a readable label and complete value.
- Allow selectors and section controls to wrap onto their own row without colliding with headings.
- Keep the active orders table usable at narrow widths. Prefer intentional horizontal scrolling or a compact row presentation over squeezed columns and clipped status text.
- Ensure the welcome banner can wrap its links and dismiss control without obscuring content.

## Filters and interactions

- Place each filter beside the section it controls and state its scope in the label or section context.
- The product selector currently changes inventory totals and sales-demand calculation; the owner selector filters order metrics. Preserve that meaning explicitly, or make the controls shared only if all affected sections truly use the same selection.
- Keep the active orders table’s filters local to the table and make active-only behavior evident in its title or supporting copy.
- Use links from actionable metrics to the relevant filtered workflow when that route can preserve the intended scope.
- Provide clear selected, hover, keyboard-focus, disabled, and loading states using the shared component system.
- Keep dismissible onboarding dismissed consistently and provide a way to find help again if the banner contains essential guidance.

## States and trust

Every dashboard section should have a considered state for:

- **Loading:** Use stable skeletons or placeholders that preserve the section’s shape and avoid large layout jumps.
- **Empty:** Say what is empty and what action, if any, can populate it. For example, an empty notes panel can invite a first note; an empty active-order list should not look like a loading failure.
- **Error:** Identify which section failed and offer a retry. Keep unaffected dashboard sections available.
- **Partial data:** Make missing data apparent rather than presenting a partial total as complete.
- **Stale data:** If freshness matters to an operational decision, show when the data was last updated and how to refresh it.

Do not use red merely to decorate a metric. Reserve urgent treatment for a meaningful condition, and pair it with explicit wording. Currency, quantities, status labels, and order identity should remain understandable without color perception.

## Visual direction

Follow the shared Solext system in [`../DESIGN.md`](../DESIGN.md): DM Sans, white workspace, dark navigation, restrained borders, and orange as the primary action accent. The dashboard should apply that system with a slightly stronger information hierarchy than general forms and detail screens.

- Use section headings to distinguish inventory, orders, notes, and active work.
- Keep metric cards visually related; vary emphasis through typography and grouping, not a different color for every card.
- Use semantic status colors only where they communicate a defined state.
- Prefer borders and quiet surface shifts for grouping. Reserve shadows for overlays as established by the system.
- Keep notes visually supportive: readable text, clear authorship and timestamp, and low-emphasis edit/delete controls.
- Use icons as quick recognition cues beside labels, not as substitutes for labels.

## Accessibility and usability

- Maintain readable contrast for muted labels, status badges, focus indicators, and disabled controls.
- Preserve visible keyboard focus and logical tab order from page heading through filters, notes, and table actions.
- Give icon-only actions accessible names; ensure status and procurement meaning is available as text.
- Avoid communicating the meaning of a metric or alert through color or position alone.
- Keep interactive targets comfortable to use and ensure controls remain reachable when sections wrap.
- Use semantic headings in a predictable order so assistive technology can navigate the page by section.

## Guardrails for future changes

### Do

- Do make the dashboard answer “what needs attention?” before adding more summary data.
- Do keep inventory and order metrics grouped by operational domain.
- Do use the shared `MetricCard`, typography, color, and spacing patterns where they fit.
- Do make filter scope and metric definitions clear in the interface.
- Do provide section-level loading, empty, error, and retry behavior.
- Do keep the active orders table as a direct route from summary to execution.

### Avoid

- Avoid adding more cards without deciding which existing information should lose emphasis.
- Avoid tiny labels or compressed values to fit a fixed number of columns.
- Avoid duplicating filters in multiple places without a clear distinction in scope.
- Avoid making every metric clickable if it does not lead to a meaningful filtered view.
- Avoid allowing team notes or onboarding content to dominate the operational summary.
- Avoid adding charts unless they answer a decision question that current counts and lists cannot answer.

## Success criteria

The dashboard is working when a staff member can quickly identify the current inventory and order situation, spot the important exception or next action, understand what each displayed number includes, and reach the relevant order or workflow without interpreting ambiguous controls. On smaller screens, the same priorities should remain intact in a sensible vertical reading order.
