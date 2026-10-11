"use client";

import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { PurchaseOrder } from "@/types";

interface ProcurementOverviewCardsProps {
  orders: PurchaseOrder[];
  loading: boolean;
  error: string | null;
}

export default function ProcurementOverviewCards({ orders, loading, error }: ProcurementOverviewCardsProps) {
  const draft = orders.filter((o) => o.status === "draft").length;
  const inTransit = orders.filter((o) => o.status === "in transit").length;
  const received = orders.filter((o) => o.status === "received").length;

  const totalSpend = orders.reduce((sum, o) => sum + o.order_total, 0);

  if (error) {
    return <p className="text-sm text-destructive">Failed to load procurement data: {error}</p>;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MetricCardRow className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      <MetricCard label="Draft" loading={loading} value={draft} accent="default" />
      <MetricCard label="In-Transit" loading={loading} value={inTransit} accent="primary" />
      <MetricCard label="Received" loading={loading} value={received} accent="success" />
      <MetricCard label="Total Spend" loading={loading} value={fmt(totalSpend)} />
    </MetricCardRow>
  );
}
