"use client";

import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import ErrorBlock from "@/components/ui/error-block";
import type { StockStatus } from "@/types";

export default function InventorySummaryWidget() {
  const { data, loading, error, refetch } = useApi<StockStatus[]>([...queryKeys.stockStatus], () => AetherClient.getStockStatus());

  const items = data ?? [];
  const onHand = items.reduce((sum, i) => sum + i.qty_on_hand, 0);
  const incoming = items.reduce((sum, i) => sum + i.qty_incoming, 0);
  const allocated = items.reduce((sum, i) => sum + i.qty_reserved, 0);
  const unallocated = onHand + incoming - allocated;
  const demand = items.reduce((sum, i) => sum + i.qty_demand, 0);
  const value = items.reduce((sum, i) => sum + i.avg_cost * i.qty_on_hand, 0);

  if (error) {
    return <ErrorBlock message={`Failed to load inventory: ${error}`} onRetry={refetch} />;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MetricCardRow className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      <MetricCard label="On-Hand" loading={loading} value={onHand.toLocaleString()} />
      <MetricCard label="Incoming" loading={loading} value={incoming.toLocaleString()} accent="primary" />
      <MetricCard label="Allocated" loading={loading} value={allocated.toLocaleString()} accent="warning" />
      <MetricCard label="Unallocated" loading={loading} value={unallocated.toLocaleString()} accent="success" />
      <MetricCard label="Demand" loading={loading} value={demand.toLocaleString()} />
      <MetricCard label="On-Hand Value" loading={loading} value={fmt(value)} />
    </MetricCardRow>
  );
}
