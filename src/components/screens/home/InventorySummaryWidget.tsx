"use client";

import { useApi } from "@/hooks/useApi";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { InventorySummary } from "@/types";

export default function InventorySummaryWidget() {
  const { data, loading, error } = useApi<InventorySummary[]>("/api/inventory/summary");

  const totals = (data ?? []).reduce(
    (acc, item) => ({
      onHand: acc.onHand + item.qty_on_hand,
      incoming: acc.incoming + item.qty_in_transit,
      reserved: acc.reserved + item.qty_reserved,
      value: acc.value + item.avg_cost * item.qty_on_hand,
    }),
    { onHand: 0, incoming: 0, reserved: 0, value: 0 }
  );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load inventory: {error}</p>;
  }

  return (
    <MetricCardRow>
      <MetricCard label="On-Hand" value={loading ? "—" : totals.onHand.toLocaleString()} />
      <MetricCard label="Incoming" value={loading ? "—" : totals.incoming.toLocaleString()} />
      <MetricCard label="Reserved" value={loading ? "—" : totals.reserved.toLocaleString()} />
      <MetricCard label="Total Value" value={loading ? "—" : `$${totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
    </MetricCardRow>
  );
}
