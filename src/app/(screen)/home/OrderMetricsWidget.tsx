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

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MetricCardRow className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <MetricCard label="Open Orders" loading={loading} value={openOrders.length} accent="primary" />
      <MetricCard label="Procurement" value="">
        {loading ? <Skeleton className="h-7 w-32" /> : (
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="flex items-center gap-1.5"><StatusBadge status="need" /><span className="text-sm font-bold tabular-nums">{procurementCounts.need}</span></span>
            <span className="flex items-center gap-1.5"><StatusBadge status="awaiting" /><span className="text-sm font-bold tabular-nums">{procurementCounts.awaiting}</span></span>
            <span className="flex items-center gap-1.5"><StatusBadge status="ready_to_ship" /><span className="text-sm font-bold tabular-nums">{procurementCounts.ready_to_ship}</span></span>
          </div>
        )}
      </MetricCard>
      <MetricCard label="Awaiting Payment" loading={loading} value={awaitingPayment} accent={awaitingPayment > 0 ? "warning" : "default"} />
      <MetricCard label="Open Value" loading={loading} value={fmt(totalOpenValue)} />
      <MetricCard label="Outstanding" loading={loading} value={fmt(outstanding)} accent={outstanding > 0 ? "danger" : "default"} />
    </MetricCardRow>
  );
}
