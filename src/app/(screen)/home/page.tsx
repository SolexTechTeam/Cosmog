"use client";

import { useApi } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import InventorySummaryWidget from "./InventorySummaryWidget";
import OrderMetricsWidget from "./OrderMetricsWidget";
import SalesTable from "@/components/common/orders/SalesTable";
import type { SaleOrder } from "@/types";

export default function HomeScreen() {
  const { data: saleOrders, loading, error } = useApi<SaleOrder[]>(() => AetherClient.getSaleOrders());

  return (
    <>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Inventory and order overview</p>
        </div>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Inventory</h2>
        <InventorySummaryWidget />
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Orders</h2>
        <OrderMetricsWidget orders={saleOrders ?? []} loading={loading} error={error} />
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active Orders</h2>
        <SalesTable orders={saleOrders} loading={loading} error={error} activeOnly compact pageSize={10} hiddenColumns={new Set(["Customer", "handle", "source", "fulfillment_type"])} />
      </section>
    </>
  );
}
