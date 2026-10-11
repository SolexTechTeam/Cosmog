"use client";

import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { StockStatus } from "@/types";

interface InventoryOverviewCardsProps {
  items: StockStatus[];
  loading: boolean;
  error: string | null;
}

export default function InventoryOverviewCards({ items, loading, error }: InventoryOverviewCardsProps) {
  const totalSkus = items.length;
  const onHand = items.reduce((sum, i) => sum + i.qty_on_hand, 0);
  const inTransit = items.reduce((sum, i) => sum + i.qty_incoming, 0);
  const allocated = items.reduce((sum, i) => sum + i.qty_reserved, 0);
  const unallocated = onHand + inTransit - allocated;
  const demand = items.reduce((sum, i) => sum + i.qty_demand, 0);
  const outOfStock = items.filter((i) => i.stock_status === "Out of Stock").length;

  if (error) {
    return <p className="text-sm text-destructive">Failed to load inventory: {error}</p>;
  }

  return (
    <MetricCardRow className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:grid-cols-7">
      <MetricCard label="Total SKUs" loading={loading} value={totalSkus} />
      <MetricCard label="On-Hand" loading={loading} value={onHand.toLocaleString()} />
      <MetricCard label="Incoming" loading={loading} value={inTransit.toLocaleString()} accent="primary" />
      <MetricCard label="Allocated" loading={loading} value={allocated.toLocaleString()} accent="warning" />
      <MetricCard label="Unallocated" loading={loading} value={unallocated.toLocaleString()} accent="success" />
      <MetricCard label="Demand" loading={loading} value={demand.toLocaleString()} />
      <MetricCard label="Out of Stock" loading={loading} value={outOfStock} accent="danger" />
    </MetricCardRow>
  );
}
