"use client";

import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { SaleOrder } from "@/types";

interface SalesOverviewCardsProps {
  orders: SaleOrder[];
  loading: boolean;
  error: string | null;
}

export default function SalesOverviewCards({ orders, loading, error }: SalesOverviewCardsProps) {
  const openCount = orders.filter((o) => o.status === "open").length;
  const totalCount = orders.length;

  const openValue = orders
    .filter((o) => o.status === "open")
    .reduce((sum, o) => sum + o.order_total, 0);

  const totalValue = orders.reduce((sum, o) => sum + o.order_total, 0);

  if (error) {
    return <p className="text-sm text-destructive">Failed to load sales data: {error}</p>;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MetricCardRow className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      <MetricCard label="Open" loading={loading} value={openCount} accent="primary" />
      <MetricCard label="Total" loading={loading} value={totalCount} />
      <MetricCard label="Open Value" loading={loading} value={fmt(openValue)} accent="warning" />
      <MetricCard label="Total Value" loading={loading} value={fmt(totalValue)} />
    </MetricCardRow>
  );
}
