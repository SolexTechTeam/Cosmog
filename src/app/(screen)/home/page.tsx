"use client";

import { useApi } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import PageHeader from "@/components/common/PageHeader";
import InventorySummaryWidget from "./InventorySummaryWidget";
import OrderMetricsWidget from "./OrderMetricsWidget";
import SalesTable from "@/components/common/orders/SalesTable";
import type { SaleOrder } from "@/types";

export default function HomeScreen() {
  const { data: saleOrders, loading, error } = useApi<SaleOrder[]>(() => AetherClient.getSaleOrders());

  return (
    <>
      <PageHeader title="Home" />
      <section className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Inventory Summary</h2>
        <InventorySummaryWidget />
      </section>
      <section className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Order Metrics</h2>
        <OrderMetricsWidget orders={saleOrders ?? []} loading={loading} error={error} />
      </section>
      <section>
        <h2 className="text-header mb-3">Active Orders</h2>
        <SalesTable orders={saleOrders} loading={loading} error={error} activeOnly compact pageSize={10} hiddenColumns={new Set(["Customer", "handle", "source", "fulfillment_type"])} />
      </section>
    </>
  );
}
