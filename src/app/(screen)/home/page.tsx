"use client";

import { useApi } from "@/hooks/useApi";
import PageHeader from "@/components/common/PageHeader";
import InventorySummaryWidget from "@/components/screens/home/InventorySummaryWidget";
import OrderMetricsWidget from "@/components/screens/home/OrderMetricsWidget";
import ActiveOrdersWidget from "@/components/screens/home/ActiveOrdersWidget";
import type { SaleOrder } from "@/types";

export default function HomeScreen() {
  const { data: saleOrders, loading, error } = useApi<SaleOrder[]>("/api/sale-orders");

  return (
    <>
      <PageHeader title="Home" />
      <section className="w-[97.5%] mx-auto rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Inventory Summary</h2>
        <InventorySummaryWidget />
      </section>
      <section className="w-[97.5%] mx-auto rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Order Metrics</h2>
        <OrderMetricsWidget orders={saleOrders ?? []} loading={loading} error={error} />
      </section>
      <section>
        <h2 className="text-header mb-3 pl-[var(--radius)]">Active Orders</h2>
        <ActiveOrdersWidget orders={saleOrders ?? []} loading={loading} error={error} />
      </section>
    </>
  );
}
