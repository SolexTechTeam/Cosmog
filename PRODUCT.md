# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Warehouse staff** manage incoming procurement, receive shipments, track lot-level inventory, and fulfill outbound sale orders. **Sales staff** create and manage sale orders, monitor payment and allocation status, and track demand priority to inform procurement timing. Both roles share the same interface but focus on different screens.

## Product Purpose

Solext is a unified operations hub for managing inventory, sales orders, and procurement across the Solex and Lunex product lines. It replaces fragmented workflows (spreadsheets, separate tools per brand) with a single system where warehouse and sales staff can see real-time stock status, create and track orders end-to-end, and coordinate procurement against actual demand.

## Positioning

A single pane of glass across both Solex and Lunex brands — inventory, sales, procurement, and demand priority in one place, with lot-level stock tracking and automatic allocation that prevents overselling.

## Operating Context

Staff sign in with email/password (Supabase Auth). Day-to-day work centers on the home dashboard (active orders and inventory summary), the sales and procurement order screens, and the inventory stock/history views. Demand Priority ("cooking") ranks products by open-order pressure to guide procurement decisions. Customers are typed as B2B, B2C, or special. Orders carry priority levels, payment status, and fulfillment type. Inventory is tracked at the lot level with a full ledger of movements.

## Capabilities and Constraints

**Confirmed capabilities:**
- CRUD for customers, suppliers, products, and user profiles
- Sale order lifecycle: create, allocate inventory (auto or manual), ship, fulfill, return, cancel
- Purchase order lifecycle: create, ship, receive into inventory lots, cancel
- Real-time stock status with on-hand, in-transit, reserved, and available quantities
- Demand priority scoring across open sale orders
- Inventory ledger with full movement history and manual adjustments
- Sale-order-to-purchase-order linking
- Role-based access (admin, staff)

**Technical constraints:**
- Authentication: Supabase (non-negotiable)
- Backend API: Aether — all business logic and data access goes through AetherClient; no direct DB access from the frontend
- Frontend: Next.js 16 + React 19, Tailwind CSS 4, AG Grid for tables, shadcn/ui primitives

## Brand Commitments

- Product name: **Solext**
- Brand color: orange (#F97316) as primary accent
- Font: DM Sans
- Dark sidebar navigation with orange accent
- Two underlying brands: **Solex** and **Lunex** (product lines, not UI brands)

## Evidence on Hand

No testimonials, case studies, or external marketing materials. All content is operational — the product is an internal tool. Product images may exist via `image_url` on products but are not guaranteed.

## Product Principles

1. **One source of truth** — every number (stock, cost, order status) comes from one system, not reconciled across tools.
2. **Allocation before promise** — the system tracks what's reserved vs. available so sales staff don't promise what warehouse can't deliver.
3. **Demand drives procurement** — demand priority scoring surfaces what to buy next based on real open orders, not gut feel.
4. **Speed over ceremony** — this is a daily-driver ops tool; every workflow should be fast and direct, not form-heavy.
5. **Roles share context** — warehouse and sales see the same data, reducing miscommunication.
