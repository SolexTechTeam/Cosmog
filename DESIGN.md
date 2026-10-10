---
name: Solext
description: Unified inventory and order operations for Solex & Lunex
colors:
  primary-orange: "#F97316"
  primary-foreground: "#FFFFFF"
  secondary-warm: "#FFF7ED"
  secondary-foreground: "#9A3412"
  destructive-red: "#DC2626"
  background-white: "#FFFFFF"
  foreground-ink: "#111827"
  muted-surface: "#F9FAFB"
  muted-text: "#6B7280"
  border-gray: "#E5E7EB"
  sidebar-dark: "#18181B"
  sidebar-text: "#A1A1AA"
  sidebar-border: "#27272A"
  accent-glow: "rgba(249, 115, 22, 0.1)"
  status-blue: "#3B82F6"
  status-green: "#22C55E"
  status-amber: "#EAB308"
  status-violet: "#8B5CF6"
typography:
  display:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.05em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-orange}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "#EA580C"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: "{colors.background-white}"
    textColor: "{colors.foreground-ink}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground-ink}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost-hover:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.foreground-ink}"
  button-destructive:
    backgroundColor: "rgba(220, 38, 38, 0.1)"
    textColor: "{colors.destructive-red}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  card-default:
    backgroundColor: "{colors.background-white}"
    textColor: "{colors.foreground-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-default:
    backgroundColor: "{colors.background-white}"
    textColor: "{colors.foreground-ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  status-badge:
    rounded: "{rounded.full}"
    padding: "2px 10px"
    height: "22px"
  metric-card:
    backgroundColor: "{colors.background-white}"
    textColor: "{colors.foreground-ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

# Design System: Solext

## Overview

**Creative North Star: "The Control Room"**

Solext's visual system is built around the metaphor of a clean, focused control room: a dark navigation spine anchoring a bright, spacious operational workspace. Orange is the signal color — it draws the eye precisely where action is needed, from the brand mark in the sidebar to primary buttons and active states. The system pairs this operational precision with soft, approachable component shapes that keep the interface from feeling clinical, even when displaying dense data tables and inventory metrics.

The overall density is moderate. Screens breathe — metric cards sit in generous grid layouts, tables have comfortable row heights, and sections are clearly separated by muted surface bands. The interface is designed for extended use by warehouse and sales staff who live in it all day; nothing shouts, but the hierarchy is always clear.

**Key Characteristics:**
- Dark sidebar, bright content area — high-contrast structural split
- Orange as the singular accent and action color
- Soft radii on all interactive elements (gently curved edges, 8px)
- DM Sans throughout — a humanist sans-serif that reads cleanly at small sizes and carries warmth at display scale
- Status communicated through tinted pill badges, not icons alone
- AG Grid tables as the primary data surface, wrapped in bordered card containers

## Colors

A warm-neutral palette anchored by a single vibrant accent. Orange is the only chromatic voice in the primary UI; all other color comes from semantic status badges.

### Primary
- **Signal Orange** (#F97316): The singular accent. Used for the brand mark, primary buttons, active navigation states, focus rings, and any element that says "act here." Its warmth is the human counterpoint to the data-heavy workspace.
- **Primary Foreground** (#FFFFFF): Text on orange surfaces.

### Secondary
- **Warm Cream** (#FFF7ED): A barely-there orange tint for secondary button fills and highlighted containers. Connects back to the primary without competing.
- **Burnt Sienna** (#9A3412): Text on warm cream surfaces — a deeper, muted orange that reads as brown.

### Neutral
- **Paper White** (#FFFFFF): The dominant content background. Cards, dialogs, and the main workspace.
- **Ink** (#111827): Primary text. Near-black with a hint of warmth.
- **Quiet Gray** (#F9FAFB): Muted surface for section bands, hover states, and secondary containers.
- **Mid Gray** (#6B7280): Secondary text, labels, timestamps, and placeholders.
- **Edge Gray** (#E5E7EB): Borders, dividers, and input strokes. The structural skeleton of the content area.
- **Sidebar Charcoal** (#18181B): The dark navigation surface.
- **Sidebar Zinc** (#A1A1AA): Navigation text at rest.
- **Sidebar Divider** (#27272A): Subtle borders within the dark sidebar.

### Semantic Status Palette
Status badges use a consistent tinted-surface formula: light background tint + saturated text + subtle border, all from the same hue family.
- **Blue** (#3B82F6): Open, active, confirmed, normal priority
- **Green** (#22C55E): Completed, paid, in stock, fulfilled, ready to ship
- **Amber** (#EAB308): Shipped, awaiting payment, low stock, high priority, reserved
- **Red** (#DC2626): Cancelled, refunded, out of stock, urgent, destructive actions
- **Indigo** (#6366F1): In transit, lot created
- **Orange** (#F97316): Returned, part paid, awaiting allocation
- **Violet** (#8B5CF6): Chart accent only

### Named Rules
**The One Signal Rule.** Orange is the only chromatic accent in the primary UI. If you're reaching for a second accent color outside of status badges, stop — orange should be doing that job. Its scarcity is what makes it effective.

## Typography

**Display Font:** DM Sans (with system sans-serif fallback)
**Body Font:** DM Sans (with system sans-serif fallback)

**Character:** A single-family system. DM Sans is a geometric humanist that stays crisp at 12px label sizes and gains personality at display scale through its distinctive lowercase 'a' and generous counters. Weight variation does the work that font switching would do elsewhere.

### Hierarchy
- **Display** (extrabold 800, 2.25rem/36px, tight tracking -0.025em): Page titles only. The `text-title` utility. One per screen, always the first thing read.
- **Headline** (bold 700, 1.5rem/24px): Section headings within a screen. The `text-header` utility.
- **Title/Subheader** (semibold 600, 0.875rem/14px, wide tracking 0.05em, uppercase): Category labels, metric card labels, form labels. The `text-subheader` utility. The uppercase + letter-spacing treatment creates a distinct register without needing a second typeface.
- **Body** (regular 400, 0.875rem/14px, relaxed leading 1.625): Running text, table cells, detail panel values. The `text-body` utility.
- **Label** (medium 500, 0.75rem/12px): Navigation items, button text, badge text, timestamps.
- **Large Number** (extrabold 800, 1.875rem/30px, tabular-nums): Metric card values. The `text-large-number` utility. Tabular numerals keep columns aligned.

### Named Rules
**The Weight-Not-Face Rule.** Never introduce a second typeface. DM Sans at weights 400-800 covers every hierarchical need. If you need more contrast, adjust weight and case, not font family.

## Layout

The app uses a fixed sidebar + scrolling content area pattern. The sidebar is a fixed-width panel (224px expanded, 64px collapsed) on the left; the content area fills the remaining viewport width with `overflow-y: auto` and 24px padding on all sides.

Content is organized vertically in sections separated by `gap-6` (24px). Metric cards use a responsive grid: `grid-cols-2` on small screens, `grid-cols-4` on medium and up, with 16px gaps. Tables span full width within their container. Section containers (inventory summary, order metrics) use a 97.5% width with auto margins and muted surface backgrounds.

There are no fixed breakpoints beyond the Tailwind defaults. The layout is desktop-first; no mobile-specific adaptations are implemented.

**The Vertical Stack.** Every screen follows the same composition: PageHeader (display title + optional actions) at the top, followed by metric cards or summary sections, followed by the primary data table. No multi-column content layouts, no tabbed views within the main area.

## Elevation & Depth

The system is predominantly flat. Depth is conveyed through tonal layering and borders rather than shadows.

- **Level 0 (workspace):** The content area background (`#FFFFFF`)
- **Level 1 (surface):** Cards and table containers sit at the same plane, distinguished by a 1px `#E5E7EB` border and identical white background
- **Level 2 (muted sections):** Summary sections use `#F9FAFB` background within a border to create a subtle inset
- **Level 3 (overlay):** Dialogs and detail panels use `shadow-xl` and a `bg-black/40` backdrop — the only real shadow in the system

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. The only shadow in the entire system is on dialogs and dropdown menus. If a new component wants a shadow, it's probably trying to be a dialog.

## Shapes

Gently curved edges throughout. The base radius is `0.5rem` (8px) applied to cards, table containers, buttons, and inputs. Status badges use full rounding (`9999px`) to read as pills. The sidebar collapse toggle is the only sharp-edged element (flush with the sidebar's right edge).

Borders are structural, not decorative: 1px `#E5E7EB` on cards, inputs, table wrappers, and section dividers. No double borders, no gradient borders, no colored borders except on the active sidebar nav item (which uses a `border-l-3` in primary orange — a detected pattern to be reconsidered in future polish passes).

## Components

### Buttons
- **Shape:** Gently rounded (8px radius via `rounded-lg`)
- **Primary:** Orange fill (#F97316) with white text, 32px height, compact horizontal padding. Hover darkens to #EA580C.
- **Focus:** 3px ring in orange at 50% opacity with a solid border matching the ring color.
- **Outline:** White background with gray border, darkens background on hover.
- **Ghost:** Transparent background, gains muted fill on hover. Used for close/cancel actions.
- **Destructive:** Tinted red background (10% opacity) with red text; deepens on hover. Never a solid red fill.
- **Link:** Orange text with underline on hover. No background.
- **Sizing:** Default 32px, xs 24px, sm 28px, lg 36px. Icon-only variants at matching sizes.

### Status Badges
- **Shape:** Fully rounded pill (`rounded-full`), 1px border
- **Formula:** Light tinted background + saturated text + matching border, all from the same hue. The `colorMap` in StatusBadge provides ~30 semantic mappings across order status, payment status, stock status, lot status, priority, and ledger movement types.
- **Size:** 22px height, 10px horizontal padding, 12px text, medium weight, capitalized.

### Cards / Containers
- **Corner Style:** Gently rounded (8px)
- **Background:** White (#FFFFFF) for cards, Quiet Gray (#F9FAFB) for muted sections
- **Shadow Strategy:** None. Flat with 1px border.
- **Border:** 1px Edge Gray (#E5E7EB)
- **Internal Padding:** 16px standard (MetricCard: 12px vertical, 16px horizontal)

### Metric Cards
- **Signature component.** A compact card with a subheader label (uppercase, tracked, muted) and a large number value (extrabold, tabular-nums). Arranged in 2-column or 4-column responsive grids via MetricCardRow. Optionally accepts children for custom content instead of the number.

### Inputs / Fields
- **Style:** White background, 1px gray border, 6px radius, 40px height, 12px horizontal padding
- **Focus:** 2px ring in primary orange at 30% opacity, border shifts to primary
- **Placeholder:** Mid Gray (#6B7280)
- **Select dropdowns:** Same base style with a custom SVG chevron positioned at right edge

### Data Tables (AG Grid)
- **Container:** Bordered card wrapper (8px radius, 1px border, white background, overflow hidden)
- **Row height:** Default AG Grid sizing
- **Pagination:** Built-in AG Grid pagination
- **Row actions:** Three-dot menu (kebab) in leftmost column, opening a portal-rendered dropdown with Open Details / Open Page / Edit options
- **Details panel:** Modal dialog centered on viewport, 672px max width, 85vh max height, with header bar containing action buttons and a scrollable content area
- **Expanded row:** Full-width inline detail below the data row, with a muted background and collapsible header

### Search & Filter Bar
- **Container:** Bordered card (8px radius, 16px padding, white background)
- **Layout:** Horizontal flex with wrapping. Search input takes `flex-1` (min 200px), filters and trailing actions fill remaining space.
- **Filter selects:** Match input styling with custom chevron

### Navigation (Sidebar)
- **Surface:** Dark charcoal (#18181B) with zinc text (#A1A1AA)
- **Brand:** "Solext" in bold orange, top-left
- **Groups:** Uppercase, tracked, bold orange group labels (Inventory, Orders, Data)
- **Items:** 14px text, 8px vertical padding. Hover brightens text to white with a subtle lighter background.
- **Active state:** Muted accent background with white text and a 3px left border in orange.
- **Collapse:** 12px-wide clickable strip on the right edge with a centered chevron. Collapses to 64px width showing single-letter abbreviations.
- **User info:** Bottom section with user name and sign-out link, separated by a border.

### Dialogs
- **Backdrop:** Semi-transparent black at 40% opacity
- **Container:** White card, 672px max width, 8px radius, 1px border, `shadow-xl`
- **Header:** Semibold title + action buttons (edit, archive, close), separated by bottom border
- **Content:** Scrollable area with definition-list layout for field display, form layout for editing

## Do's and Don'ts

### Do:
- **Do** use orange exclusively as the action/accent color. Every interactive highlight, focus ring, and brand element is orange or transparent-orange.
- **Do** use the tinted-surface formula for status badges: `bg-{hue}-50 text-{hue}-700 border-{hue}-200`. This is the only place raw Tailwind color scales appear.
- **Do** use the `text-title`, `text-header`, `text-subheader`, `text-body`, `text-body-muted`, and `text-large-number` utility classes for typography. They are the canonical hierarchy.
- **Do** wrap every AG Grid instance in a bordered card container (`rounded-lg border border-border bg-card overflow-hidden`).
- **Do** use MetricCard + MetricCardRow for any numeric summary. The pattern is established across home, sales, procurement, and inventory screens.

### Don't:
- **Don't** introduce shadows on cards or containers. The system is flat; depth comes from borders and tonal surfaces.
- **Don't** use a second typeface. DM Sans at varying weights covers every need.
- **Don't** use solid-fill destructive buttons. Destructive actions use tinted backgrounds (10-20% opacity) with colored text.
- **Don't** use colored left borders as active-state indicators (the `border-l-3` pattern in the sidebar is a detected anti-pattern to be cleaned up).
- **Don't** add icons to navigation items. The current system uses text-only nav; adding icons would change the sidebar's character.
