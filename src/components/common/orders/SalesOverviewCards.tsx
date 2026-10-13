"use client";

import { Statistic } from "antd";
import MetricCardRow from "@/components/common/MetricCardRow";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { cn } from "@/lib/utils";
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
    <Card bodyClassName="!p-4" className={cn("h-full", primary && "!border-primary/40")}>
      <div className="flex items-stretch">
        <MetricValue label={countLabel} loading={loading} value={count} />
        <Divider orientation="vertical" className="bg-border" />
        <MetricValue label={valueLabel} loading={loading} value={value} />
      </div>
    </Card>
  );
}

function MetricValue({ label, loading, value }: { label: string; loading: boolean; value: string | number }) {
  return (
    <div className="min-w-0 flex-1">
      <Statistic
        classNames={{
          content: "!text-xl !font-bold !leading-6 !text-foreground",
          title: "!mb-1 !truncate !text-xs !font-medium !uppercase !tracking-wider !text-muted-foreground",
          value: "!tabular-nums",
        }}
        loading={loading}
        title={label}
        value={value}
      />
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
