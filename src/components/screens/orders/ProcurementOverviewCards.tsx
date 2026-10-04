"use client";

import { useApi } from "@/hooks/useApi";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { PurchaseOrder } from "@/types";

export default function ProcurementOverviewCards() {
  const { data, loading, error } = useApi<PurchaseOrder[]>("/api/purchase-orders");

  const orders = data ?? [];
  const draft = orders.filter((o) => o.status === "draft").length;
  const inTransit = orders.filter((o) => o.status === "in transit").length;
  const received = orders.filter((o) => o.status === "received").length;

  const totalSpend = orders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity_ordered * i.unit_cost, 0);
    return sum + itemTotal;
  }, 0);

  if (error) {
    return <p className="text-sm text-red-500">Failed to load procurement data: {error}</p>;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MetricCardRow>
      <MetricCard label="Draft POs" value={loading ? "—" : draft} />
      <MetricCard label="In-Transit" value={loading ? "—" : inTransit} />
      <MetricCard label="Received" value={loading ? "—" : received} />
      <MetricCard label="Total Spend" value={loading ? "—" : fmt(totalSpend)} />
    </MetricCardRow>
  );
}
