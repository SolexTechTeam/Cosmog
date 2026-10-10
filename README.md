# Cosmog

Front-end dashboard for Solex & Lunex operations. Connects to [Aether](../Aether) (the backend API) and gives teams a single place to manage inventory, orders, customers, suppliers, and products.

Built with Next.js 16, React 19, Tailwind CSS 4, and AG Grid.

## Developing

```bash
npm install
npm run dev        # starts on localhost:3000
```

Needs a running Aether backend and a `.env` with Supabase + Aether credentials.

### How the code is organised

The project follows a strict top-down component hierarchy — each layer only talks to the one below it:

```
Layout          Shared shell (sidebar, top nav)
  Screen          A full page the user sees (page.tsx — kept thin)
    Section         A visual block of the screen (overview cards, table panel)
      Widget          Smallest reusable piece (metric card, badge, search bar)
```

### Project structure

```
src/
  app/
    (screen)/              # All authenticated pages live here (shared sidebar layout)
      home/                # Dashboard
      orders/
        sales/             # Sale orders list + detail
        procurement/       # Purchase orders list + detail
        cooking/           # Demand priority view
      inventory/           # Stock list, detail, and history
      customers/           # Customer list + detail
      suppliers/           # Supplier list + detail
      products/            # Product list
      users/               # User list + detail
      profile/             # Current user profile
    login/                 # Login page (no sidebar)
  components/
    ui/                    # Primitives — button, skeleton, toast, etc.
    common/                # Shared composites — DataGrid, MetricCard, SearchFilterBar, dialogs
    layout/                # SideNav, TopNavBar
  hooks/                   # useApi, useLookup, useColumnVisibility, etc.
  lib/
    aether-client.ts       # Single API client — all backend calls go through here
    supabase.ts            # Supabase browser client
    supabase-server.ts     # Supabase server client
  types/                   # Shared TypeScript types
  middleware.ts            # Auth guard
```

### Key rules

- **All API calls go through `AetherClient`** — no raw `fetch` anywhere in components.
- **Screen-specific sections** live next to their `page.tsx`. If reused across screens, they move to `components/common/`.
- **Server components by default** — only add `"use client"` when the component needs interactivity.

## Pages

| Route | What it does |
|---|---|
| `/home` | Dashboard with inventory summary, order metrics, and active orders table |
| `/orders/sales` | Browse, search, and create sale orders |
| `/orders/sales/[id]` | Sale order detail |
| `/orders/procurement` | Browse and create purchase orders |
| `/orders/procurement/[id]` | Purchase order detail |
| `/orders/cooking` | Demand priority — shows what needs to be fulfilled next |
| `/inventory` | Current stock levels across all products |
| `/inventory/[productId]` | Stock detail for a single product |
| `/inventory/history` | Inventory movement history |
| `/customers` | Customer list |
| `/customers/[customerId]` | Customer detail |
| `/suppliers` | Supplier list |
| `/suppliers/[supplierId]` | Supplier detail |
| `/products` | Product catalogue |
| `/users` | User management |
| `/users/[userId]` | User detail |
| `/profile` | Current user's profile |
| `/login` | Authentication |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
