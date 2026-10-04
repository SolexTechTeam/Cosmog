# Cosmog — Design Tokens

## Color Palette

White background, black text, orange accents.

### Base
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#FFFFFF` | Page background |
| `foreground` | `#0A0A0A` | Primary text |
| `muted` | `#F5F5F5` | Card backgrounds, subtle surfaces |
| `muted-foreground` | `#737373` | Secondary text, placeholders |
| `border` | `#E5E5E5` | Borders, dividers |

### Accent (Orange)
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#F97316` (orange-500) | Primary buttons, active nav, links |
| `primary-hover` | `#EA580C` (orange-600) | Button hover |
| `primary-foreground` | `#FFFFFF` | Text on orange buttons |
| `primary-light` | `#FFF7ED` (orange-50) | Orange tinted backgrounds (selected row, active card) |
| `primary-muted` | `#FDBA74` (orange-300) | Subtle orange accents |

### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#22C55E` (green-500) | Paid, In Stock, Completed, On-Hand |
| `warning` | `#EAB308` (yellow-500) | Awaiting Payment, Low Stock, Shipped |
| `danger` | `#EF4444` (red-500) | Cancelled, Out of Stock, Refunded |
| `info` | `#3B82F6` (blue-500) | Open, In-Transit, Incoming |
| `neutral` | `#6B7280` (gray-500) | Not Requested, Depleted, Archived |

### Surfaces
| Token | Value | Usage |
|-------|-------|-------|
| `card` | `#FFFFFF` | Card background |
| `card-border` | `#E5E5E5` | Card border |
| `sidebar` | `#FAFAFA` | Side nav background |
| `sidebar-active` | `#FFF7ED` | Active nav item background (orange tint) |
| `topbar` | `#FFFFFF` | Top nav background |
| `topbar-border` | `#E5E5E5` | Top nav bottom border |

## Typography
- **Font**: Inter (system fallback: sans-serif)
- **Page title**: 24px / semibold
- **Section title**: 18px / semibold
- **Body**: 14px / regular
- **Small/label**: 12px / medium
- **Metric value**: 28px / bold

## Spacing
- Page padding: 24px
- Card padding: 16px
- Card gap: 16px
- Section gap: 24px

## Border Radius
- Cards: 8px
- Buttons: 6px
- Badges: 9999px (pill)
- Inputs: 6px

## Shadows
- Cards: `0 1px 2px rgba(0,0,0,0.05)` (subtle)
- Dropdowns: `0 4px 12px rgba(0,0,0,0.1)`
