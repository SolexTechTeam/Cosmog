"use client";

import MetricCardRow from "@/components/common/MetricCardRow";
import { Divider } from "@/components/ui/divider";
import { Skeleton } from "@/components/ui/skeleton";
import type { SaleOrder } from "@/types";

interface SalesOverviewCardsProps {
  orders: SaleOrder[];
  loading: boolean;
  error: string | null;
}

interface OrderValueCardProps {
  count: number;
  countLabel: string;
  loading: boolean;
  primary?: boolean;
  value: string;
  valueLabel: string;
}

function OrderValueCard({ count, countLabel, loading, primary = false, value, valueLabel }: OrderValueCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${primary ? "bg-primary/60" : "bg-border"}`} />
      <div className="flex">
        <MetricValue label={countLabel} loading={loading} value={count} />
        <Divider orientation="vertical" className="bg-border" />
        <MetricValue label={valueLabel} loading={loading} value={value} />
      </div>
    </div>
  );
}

function MetricValue({ label, loading, value }: { label: string; loading: boolean; value: string | number }) {
  return (
    <div className="min-w-0 flex-1 px-3 py-2.5">
      <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-1 h-6 w-16" /> : <p className="mt-0.5 truncate text-xl font-bold tabular-nums text-foreground">{value}</p>}
    </div>
  );
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
    <div className="space-y-2.5">
      <MetricCardRow className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <OrderValueCard count={openCount} countLabel="Open Orders" loading={loading} primary value={fmt(openValue)} valueLabel="Open Value" />
        <OrderValueCard count={totalCount} countLabel="Total Orders" loading={loading} value={fmt(totalValue)} valueLabel="Total Value" />
      </MetricCardRow>
    </div>
  );
}
