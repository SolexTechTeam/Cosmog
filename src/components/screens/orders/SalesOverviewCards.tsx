"use client";

import { useApi } from "@/hooks/useApi";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { SaleOrder } from "@/types";

export default function SalesOverviewCards() {
  const { data, loading, error } = useApi<SaleOrder[]>("/api/sale-orders");

  const orders = data ?? [];
  const openCount = orders.filter((o) => o.status === "open").length;
  const totalCount = orders.length;

  const openValue = orders
    .filter((o) => o.status === "open")
    .reduce((sum, o) => {
      const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
      return sum + itemTotal + o.shipping_cost;
    }, 0);

  const totalValue = orders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return sum + itemTotal + o.shipping_cost;
  }, 0);

  if (error) {
    return <p className="text-sm text-red-500">Failed to load sales data: {error}</p>;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MetricCardRow>
      <MetricCard label="Open Sales" value={loading ? "—" : openCount} />
      <MetricCard label="Total Sales" value={loading ? "—" : totalCount} />
      <MetricCard label="Open Value" value={loading ? "—" : fmt(openValue)} />
      <MetricCard label="Total Value" value={loading ? "—" : fmt(totalValue)} />
    </MetricCardRow>
  );
}
