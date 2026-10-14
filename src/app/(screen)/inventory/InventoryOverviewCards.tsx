"use client";

import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import { CircleCheck, PackageCheck, PackageOpen, Truck } from "lucide-react";
import type { StockStatus } from "@/types";

interface InventoryOverviewCardsProps {
  items: StockStatus[];
  loading: boolean;
  error: string | null;
}

export default function InventoryOverviewCards({ items, loading, error }: InventoryOverviewCardsProps) {
  const onHand = items.reduce((sum, i) => sum + i.qty_on_hand, 0);
  const inTransit = items.reduce((sum, i) => sum + i.qty_incoming, 0);
  const allocated = items.reduce((sum, i) => sum + i.qty_reserved, 0);
  const unallocated = onHand + inTransit - allocated;

  if (error) {
    return <p className="text-sm text-destructive">Failed to load inventory: {error}</p>;
  }

  return (
    <MetricCardRow>
      <MetricCard autoSizeValue icon={<PackageCheck size={18} />} iconClassName="text-primary" label="On-Hand" loading={loading} value={onHand.toLocaleString()} />
      <MetricCard autoSizeValue icon={<Truck size={18} />} iconClassName="text-primary" label="Incoming" loading={loading} value={inTransit.toLocaleString()} />
      <MetricCard autoSizeValue icon={<PackageOpen size={18} />} iconClassName="text-amber-600" label="Allocated" loading={loading} value={allocated.toLocaleString()} />
      <MetricCard autoSizeValue icon={<CircleCheck size={18} />} iconClassName="text-emerald-600" label="Unallocated (incl. incoming)" loading={loading} value={unallocated.toLocaleString()} />
    </MetricCardRow>
  );
}
