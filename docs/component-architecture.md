# Cosmog — Component Architecture

## Screen Map

```
/login                  → LoginScreen (no layout shell)
/                       → redirect to /home
/home                   → HomeScreen (dashboard)
/inventory              → InventoryScreen
/inventory/history      → InventoryHistoryScreen
/orders/sales           → SalesOrdersScreen
/orders/procurement     → PurchaseOrdersScreen
/orders/cooking         → DemandPriorityScreen (Inventory Cooking)
/customers              → CustomersScreen
/suppliers              → SuppliersScreen
/products               → ProductsScreen
/users                  → UsersScreen (admin only)
/profile                → ProfileScreen (own profile)
```

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  TopNavBar                          [User Profile ▾] │
├────────────┬────────────────────────────────────────┤
│            │                                         │
│  SideNav   │  PageContent                           │
│            │  ┌─────────────────────────────────┐   │
│  Home      │  │ PageHeader (title + actions)     │   │
│            │  ├─────────────────────────────────┤   │
│  Inventory │  │ CardWidgetRow                    │   │
│   - Stock  │  │ ┌──────┐┌──────┐┌──────┐┌─────┐│   │
│   - History│  │ │Metric││Metric││Metric││Metr.││   │
│            │  │ └──────┘└──────┘└──────┘└─────┘│   │
│  Orders    │  ├─────────────────────────────────┤   │
│   - Sales  │  │ SearchFilterBar                  │   │
│   - Procure│  │ [Search...] [Status ▾] [Date ▾] │   │
│   - Cooking│  ├─────────────────────────────────┤   │
│            │  │ DataGrid (AG Grid)               │   │
│  Customers │  │                                  │   │
│  Suppliers │  │                                  │   │
│  Products  │  │                                  │   │
│  Users     │  └─────────────────────────────────┘   │
│            │                                         │
└────────────┴────────────────────────────────────────┘
```

## Folder Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── login/
│   │   └── page.tsx              → LoginScreen
│   ├── page.tsx                   # Root redirect → /home
│   ├── (dashboard)/              # Layout group (shared shell)
│   │   ├── layout.tsx            → DashboardLayout (TopNav + SideNav + content)
│   │   ├── home/
│   │   │   └── page.tsx          → HomeScreen
│   │   ├── inventory/
│   │   │   ├── page.tsx          → InventoryScreen
│   │   │   └── history/
│   │   │       └── page.tsx      → InventoryHistoryScreen
│   │   ├── orders/
│   │   │   ├── sales/
│   │   │   │   └── page.tsx      → SalesOrdersScreen
│   │   │   ├── procurement/
│   │   │   │   └── page.tsx      → PurchaseOrdersScreen
│   │   │   └── cooking/
│   │   │       └── page.tsx      → DemandPriorityScreen
│   │   ├── customers/
│   │   │   └── page.tsx          → CustomersScreen
│   │   ├── suppliers/
│   │   │   └── page.tsx          → SuppliersScreen
│   │   ├── products/
│   │   │   └── page.tsx          → ProductsScreen
│   │   ├── users/
│   │   │   └── page.tsx          → UsersScreen
│   │   └── profile/
│   │       └── page.tsx          → ProfileScreen
│   ├── layout.tsx                # Root layout (providers, fonts)
│   └── globals.css
│
├── components/
│   ├── ui/                       # shadcn primitives (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── avatar.tsx
│   │   ├── sheet.tsx             # mobile nav drawer
│   │   └── ...
│   │
│   ├── common/                   # Reusable app components
│   │   ├── MetricCard.tsx        # Single stat card (value + label + trend)
│   │   ├── MetricCardRow.tsx     # Horizontal row of MetricCards
│   │   ├── StatusBadge.tsx       # Colored badge for order/lot/payment status
│   │   ├── SearchFilterBar.tsx   # Search input + filter dropdowns combo
│   │   ├── DataGrid.tsx          # AG Grid wrapper (typed, themed, reusable)
│   │   ├── PageHeader.tsx        # Page title + optional action buttons
│   │   ├── EmptyState.tsx        # "No data" placeholder
│   │   └── LoadingState.tsx      # Skeleton/spinner for loading
│   │
│   ├── layout/                   # Shell components
│   │   ├── TopNavBar.tsx         # "Solex" branding + user profile dropdown
│   │   ├── SideNav.tsx           # Collapsible nav with categories + sub-items
│   │   ├── SideNavItem.tsx       # Single nav item (icon + label + active state)
│   │   └── UserProfileMenu.tsx   # Avatar + dropdown (profile, logout)
│   │
│   └── screens/                  # Screen-specific widgets (not reusable)
│       ├── home/
│       │   ├── InventorySummaryWidget.tsx    # 4 cards: On-Hand, Incoming, Reserved, Value
│       │   ├── OrderMetricsWidget.tsx        # 3 cards: Open Orders, Awaiting Payment, Outstanding $
│       │   └── ActiveOrdersWidget.tsx        # Table of open orders by owner
│       │
│       ├── inventory/
│       │   ├── InventoryOverviewCards.tsx     # Cards: total SKUs, on-hand, in-transit, out of stock
│       │   └── InventoryFilters.tsx          # Category, stock status, search filters
│       │
│       ├── orders/
│       │   ├── SalesOverviewCards.tsx         # Cards: open sales, total sales, revenue
│       │   ├── ProcurementOverviewCards.tsx   # Cards: open POs, in-transit, total spent
│       │   ├── SalesFilters.tsx              # Status, payment, owner, source filters
│       │   └── ProcurementFilters.tsx        # Status, supplier, fulfillment type filters
│       │
│       ├── products/
│       │   └── ProductFilters.tsx            # Category, active status filters
│       │
│       └── users/
│           └── CreateUserDialog.tsx          # Modal form for admin user creation
│
├── lib/
│   ├── api.ts                    # Typed fetch wrapper for Aether API
│   ├── supabase.ts               # Supabase client (auth only — FE talks to Aether for data)
│   └── utils.ts                  # shadcn cn() helper + formatters
│
├── hooks/
│   ├── useAuth.ts                # Auth state, login, logout, session refresh
│   ├── useApi.ts                 # Generic fetch hook with loading/error states
│   └── useDebounce.ts            # Debounce for search inputs
│
├── types/
│   └── index.ts                  # Shared TypeScript types (Product, SaleOrder, etc.)
│
└── providers/
    └── AuthProvider.tsx           # Context provider wrapping Supabase auth
```

## Component Hierarchy Per Screen

### LoginScreen
```
LoginScreen
└── Card
    ├── Logo + "Solex" title
    ├── Input (email)
    ├── Input (password)
    └── Button (sign in)
```

### HomeScreen (Dashboard)
```
DashboardLayout
├── TopNavBar
│   ├── Logo ("Solex")
│   └── UserProfileMenu
├── SideNav
│   └── SideNavItem × N
└── HomeScreen
    ├── PageHeader ("Home")
    ├── InventorySummaryWidget
    │   └── MetricCardRow
    │       ├── MetricCard (On-Hand: 50)
    │       ├── MetricCard (Incoming: 12)
    │       ├── MetricCard (Reserved: 24)
    │       └── MetricCard (Total Value: $100)
    ├── OrderMetricsWidget
    │   └── MetricCardRow
    │       ├── MetricCard (Open Orders)
    │       ├── MetricCard (Awaiting Payment)
    │       └── MetricCard (Outstanding $)
    └── ActiveOrdersWidget
        └── DataGrid (open orders, grouped/filterable by owner)
```

### InventoryScreen
```
DashboardLayout
└── InventoryScreen
    ├── PageHeader ("Inventory")
    ├── InventoryOverviewCards
    │   └── MetricCardRow
    │       ├── MetricCard (Total SKUs)
    │       ├── MetricCard (On-Hand Units)
    │       ├── MetricCard (In-Transit)
    │       └── MetricCard (Out of Stock)
    ├── InventoryFilters
    │   └── SearchFilterBar
    │       ├── SearchInput
    │       ├── FilterDropdown (Category)
    │       └── FilterDropdown (Stock Status)
    └── DataGrid (AG Grid — product inventory with stock status)
```

### SalesOrdersScreen
```
DashboardLayout
└── SalesOrdersScreen
    ├── PageHeader ("Sales Orders" + [New Order] button)
    ├── SalesOverviewCards
    │   └── MetricCardRow
    │       ├── MetricCard (Open Sales)
    │       ├── MetricCard (Total Sales)
    │       ├── MetricCard (Open Procurement)
    │       └── MetricCard (Total Procurement)
    ├── SalesFilters
    │   └── SearchFilterBar
    │       ├── SearchInput
    │       ├── FilterDropdown (Status)
    │       ├── FilterDropdown (Payment)
    │       └── FilterDropdown (Owner)
    └── DataGrid (AG Grid — sale orders with status, payment, customer)
```

### PurchaseOrdersScreen
```
DashboardLayout
└── PurchaseOrdersScreen
    ├── PageHeader ("Purchase Orders" + [New PO] button)
    ├── ProcurementOverviewCards
    │   └── MetricCardRow
    │       ├── MetricCard (Draft POs)
    │       ├── MetricCard (In-Transit)
    │       ├── MetricCard (Received This Month)
    │       └── MetricCard (Total Spend)
    ├── ProcurementFilters
    │   └── SearchFilterBar
    │       ├── SearchInput
    │       ├── FilterDropdown (Status)
    │       └── FilterDropdown (Supplier)
    └── DataGrid (AG Grid — purchase orders with items, status, supplier)
```

## Reusable Component Specs

### MetricCard
```
Props:
  label: string          — "On-Hand"
  value: string | number — "50" or "$1,234"
  icon?: ReactNode       — optional icon
  trend?: { value: number, direction: 'up' | 'down' }  — optional delta
```

### StatusBadge
```
Props:
  status: string         — "open", "shipped", "paid", etc.
  type: 'order' | 'payment' | 'lot' | 'stock'

Color mapping:
  order:   open=blue, shipped=yellow, completed=green, cancelled=red, returned=orange
  payment: not_requested=gray, awaiting=yellow, part_paid=orange, paid=green, refunded=red
  lot:     in_transit=blue, on_hand=green, depleted=gray
  stock:   In Stock=green, Low Stock=yellow, Out of Stock=red, Incoming=blue
```

### DataGrid (AG Grid wrapper)
```
Props:
  rows: T[]
  columns: ColDef<T>[]
  loading?: boolean
  onRowClick?: (row: T) => void
  pagination?: boolean
  pageSize?: number

Includes:
  - AG Grid Community theme (match shadcn dark/light)
  - Default column sizing
  - Built-in pagination
  - Row click handler
  - Loading overlay
  - Empty state overlay
```

### SearchFilterBar
```
Props:
  searchPlaceholder: string
  searchValue: string
  onSearchChange: (value: string) => void
  filters: Array<{
    key: string
    label: string
    options: { label: string, value: string }[]
    value: string
    onChange: (value: string) => void
  }>

Renders:
  [🔍 Search input (debounced)] [Filter1 ▾] [Filter2 ▾] [Clear all]
```

## SideNav Categories

```
Home                    → /home

Inventory
  ├── Stock             → /inventory
  └── History           → /inventory/history

Orders
  ├── Sales             → /orders/sales
  ├── Procurement       → /orders/procurement
  └── Demand Priority   → /orders/cooking

Customers               → /customers
Suppliers               → /suppliers
Products                → /products
Users                   → /users (admin only)
```

## Data Flow

```
Screen (page.tsx)
  → calls useApi('/api/inventory/stock-status')
  → passes data to Widget
  → Widget passes to MetricCardRow / DataGrid
  → DataGrid renders AG Grid with typed columns

All API calls go through lib/api.ts which:
  1. Reads auth token from Supabase session
  2. Adds Authorization: Bearer <token> header
  3. Hits Aether API (NEXT_PUBLIC_API_URL env var)
  4. Returns typed response or throws
```

## API Client (lib/api.ts)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL

async function api<T>(path: string, options?: RequestInit): Promise<T>
  → reads token from supabase.auth.getSession()
  → fetches API_URL + path with Bearer token
  → returns parsed JSON as T
  → throws on 4xx/5xx

// Convenience methods
api.get<T>(path, params?)
api.post<T>(path, body)
api.patch<T>(path, body)
```
