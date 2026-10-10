"use client";

import { useApi } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import ErrorBlock from "@/components/ui/error-block";
import type { InventorySummary } from "@/types";

export default function InventorySummaryWidget() {
  const { data, loading, error, refetch } = useApi<InventorySummary[]>(() => AetherClient.getInventorySummary());

  const totals = (data ?? []).reduce(
    (acc, item) => ({
      available: acc.available + item.qty_available,
      onHand: acc.onHand + item.qty_on_hand,
      incoming: acc.incoming + item.qty_in_transit,
      reserved: acc.reserved + item.qty_reserved,
      value: acc.value + item.avg_cost * item.qty_on_hand,
    }),
    { available: 0, onHand: 0, incoming: 0, reserved: 0, value: 0 }
  );

  if (error) {
    return <ErrorBlock message={`Failed to load inventory: ${error}`} onRetry={refetch} />;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MetricCardRow className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <MetricCard label="Available" loading={loading} value={totals.available.toLocaleString()} accent="success" />
      <MetricCard label="On-Hand" loading={loading} value={totals.onHand.toLocaleString()} />
      <MetricCard label="Incoming" loading={loading} value={totals.incoming.toLocaleString()} accent="primary" />
      <MetricCard label="Reserved" loading={loading} value={totals.reserved.toLocaleString()} accent="warning" />
      <MetricCard label="On-Hand Value" loading={loading} value={fmt(totals.value)} />
    </MetricCardRow>
  );
}
