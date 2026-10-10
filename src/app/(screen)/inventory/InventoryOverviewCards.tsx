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
  const inTransit = items.reduce((sum, i) => sum + i.qty_in_transit, 0);
  const outOfStock = items.filter((i) => i.stock_status === "Out of Stock").length;

  if (error) {
    return <p className="text-sm text-red-500">Failed to load inventory: {error}</p>;
  }

  return (
    <MetricCardRow>
      <MetricCard label="Total SKUs" value={loading ? "—" : totalSkus} />
      <MetricCard label="On-Hand Units" value={loading ? "—" : onHand.toLocaleString()} />
      <MetricCard label="In-Transit" value={loading ? "—" : inTransit.toLocaleString()} />
      <MetricCard label="Out of Stock" value={loading ? "—" : outOfStock} />
    </MetricCardRow>
  );
}
