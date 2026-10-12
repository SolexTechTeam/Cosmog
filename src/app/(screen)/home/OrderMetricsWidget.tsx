"use client";

import { useState, useMemo } from "react";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { allocationLabel, isActiveSaleOrderStatus } from "@/lib/utils";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import { Skeleton } from "@/components/ui/skeleton";
import type { SaleOrder, PurchaseOrder, Profile } from "@/types";

interface OrderMetricsWidgetProps {
  orders: SaleOrder[];
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  poLoading: boolean;
  error: string | null;
}

export default function OrderMetricsWidget({ orders, purchaseOrders, loading, poLoading, error }: OrderMetricsWidgetProps) {
  const { data: profiles } = useApi<Profile[]>([...queryKeys.profiles], () => AetherClient.getProfiles());
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  const ownerOptions = useMemo(
    () => (profiles ?? []).filter((p) => p.is_active).map((p) => ({ label: p.name, value: p.id })),
    [profiles]
  );

  const filteredOrders = useMemo(() => {
    if (!selectedOwnerId) return orders;
    if (selectedOwnerId === "__unassigned__") return orders.filter((o) => !o.owner_id);
    return orders.filter((o) => o.owner_id === selectedOwnerId);
  }, [orders, selectedOwnerId]);

  const openOrders = filteredOrders.filter((o) => o.status === "open");
  const activeOrders = filteredOrders.filter((o) => isActiveSaleOrderStatus(o.status));

  const procurementCounts = useMemo(() => {
    const counts = { need: 0, awaiting: 0, ready_to_ship: 0, done: 0, unallocated: 0 };
    for (const o of activeOrders) {
      const label = allocationLabel(o.allocation_status);
      if (label in counts) counts[label as keyof typeof counts]++;
    }
    return counts;
  }, [activeOrders]);

  const totalOpenValue = openOrders.reduce((sum, o) => sum + o.order_total, 0);

  const outstanding = openOrders.reduce((sum, o) => sum + o.order_total - o.amount_paid, 0);

  const awaitingPayment = filteredOrders.filter((o) => o.payment_status === "awaiting_payment").length;

  const posInTransit = purchaseOrders.filter((po) => po.status === "in transit");
  const posInTransitCount = posInTransit.length;
  const posInTransitValue = posInTransit.reduce((sum, po) => sum + po.order_total, 0);

  if (error) {
    return <p className="text-sm text-destructive">Failed to load order metrics: {error}</p>;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex flex-col gap-3">
      <select
        value={selectedOwnerId}
        onChange={(e) => setSelectedOwnerId(e.target.value)}
        className="h-8 w-64 rounded-md border border-border bg-background pl-2.5 pr-8 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50"
      >
        <option value="">All Owners</option>
        <option value="__unassigned__">Unassigned</option>
        {ownerOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <MetricCardRow className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <MetricCard label="Open Orders" loading={loading} value={openOrders.length} accent="primary" />
        <MetricCard label="Procurement" value="">
          {loading ? <Skeleton className="h-7 w-32" /> : (
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
              {([
                { key: "need", label: "Need", dot: "bg-red-500" },
                { key: "awaiting", label: "Awaiting", dot: "bg-orange-500" },
                { key: "ready_to_ship", label: "Ready", dot: "bg-emerald-500" },
                { key: "done", label: "Done", dot: "bg-blue-500" },
              ] as const).map(({ key, label, dot }) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="ml-auto text-sm font-bold tabular-nums">{procurementCounts[key]}</span>
                </span>
              ))}
            </div>
          )}
        </MetricCard>
        <MetricCard label="Awaiting Payment" loading={loading} value={awaitingPayment} accent={awaitingPayment > 0 ? "warning" : "default"} />
        <MetricCard label="Open Value" loading={loading} value={fmt(totalOpenValue)} />
        <MetricCard label="Outstanding" loading={loading} value={fmt(outstanding)} accent={outstanding > 0 ? "danger" : "default"} />
        <MetricCard label="POs In Transit" loading={poLoading} value={posInTransitCount} accent="primary" />
        <MetricCard label="In Transit Value" loading={poLoading} value={fmt(posInTransitValue)} />
      </MetricCardRow>
    </div>
  );
}
