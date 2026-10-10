"use client";

import { useMemo } from "react";
import { allocationLabel, isActiveSaleOrderStatus } from "@/lib/utils";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SaleOrder } from "@/types";

interface OrderMetricsWidgetProps {
  orders: SaleOrder[];
  loading: boolean;
  error: string | null;
}

export default function OrderMetricsWidget({ orders, loading, error }: OrderMetricsWidgetProps) {
  const openOrders = orders.filter((o) => o.status === "open");
  const activeOrders = orders.filter((o) => isActiveSaleOrderStatus(o.status));

  const procurementCounts = useMemo(() => {
    const counts = { need: 0, awaiting: 0, ready_to_ship: 0 };
    for (const o of activeOrders) {
      const label = allocationLabel(o.allocation_status);
      if (label in counts) counts[label as keyof typeof counts]++;
    }
    return counts;
  }, [activeOrders]);

  const totalOpenValue = openOrders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return sum + itemTotal + o.shipping_cost;
  }, 0);

  const outstanding = openOrders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return sum + itemTotal + o.shipping_cost - o.amount_paid;
  }, 0);

  const awaitingPayment = orders.filter((o) => o.payment_status === "awaiting_payment").length;

  if (error) {
    return <p className="text-sm text-destructive">Failed to load order metrics: {error}</p>;
  }

  return (
    <MetricCardRow className="grid grid-cols-2 gap-4 md:grid-cols-[1fr_minmax(14rem,1.5fr)_1fr_1fr_1fr]">
      <MetricCard label="Open Orders" loading={loading} value={openOrders.length} />
      <MetricCard label="Procurement Status" value="">
        {loading ? <Skeleton className="h-6 w-32" /> : (
          <div className="flex items-center gap-3">
            <span className="flex flex-col items-center gap-0.5"><StatusBadge status="need" /><span className="text-sm font-bold">{procurementCounts.need}</span></span>
            <span className="flex flex-col items-center gap-0.5"><StatusBadge status="awaiting" /><span className="text-sm font-bold">{procurementCounts.awaiting}</span></span>
            <span className="flex flex-col items-center gap-0.5"><StatusBadge status="ready_to_ship" /><span className="text-sm font-bold">{procurementCounts.ready_to_ship}</span></span>
          </div>
        )}
      </MetricCard>
      <MetricCard label="Awaiting Payment" loading={loading} value={awaitingPayment} />
      <MetricCard label="Total Open $" loading={loading} value={`$${totalOpenValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
      <MetricCard label="Outstanding $" loading={loading} value={`$${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
    </MetricCardRow>
  );
}
