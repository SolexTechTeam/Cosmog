"use client";

import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import { CircleDollarSign, FileText, PackageCheck, ShoppingCart, Truck, Ban } from "lucide-react";
import type { PurchaseOrder } from "@/types";

interface ProcurementOverviewCardsProps {
  orders: PurchaseOrder[];
  loading: boolean;
  error: string | null;
}

export default function ProcurementOverviewCards({ orders, loading, error }: ProcurementOverviewCardsProps) {
  const draft = orders.filter((o) => o.status === "draft").length;
  const confirmed = orders.filter((o) => o.status === "confirmed").length;
  const inTransit = orders.filter((o) => o.status === "in transit").length;
  const directToConsumer = orders.filter((o) => o.fulfillment_type === "direct_delivery" && o.status !== "cancelled").length;
  const received = orders.filter((o) => o.status === "received").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const nonCancelledPoValue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.order_total, 0);

  if (error) {
    return <p className="text-sm text-destructive">Failed to load procurement data: {error}</p>;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MetricCardRow className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-7">
      <MetricCard autoSizeValue icon={<FileText size={18} />} label="Draft" loading={loading} value={draft} />
      <MetricCard autoSizeValue icon={<FileText size={18} />} label="Confirmed" loading={loading} value={confirmed} />
      <MetricCard autoSizeValue icon={<Truck size={18} />} iconClassName="text-primary" label="In-Transit" loading={loading} value={inTransit} />
      <MetricCard autoSizeValue icon={<ShoppingCart size={18} />} iconClassName="text-primary" label="Direct Delivery POs" loading={loading} value={directToConsumer} />
      <MetricCard autoSizeValue icon={<PackageCheck size={18} />} iconClassName="text-emerald-600" label="Received" loading={loading} value={received} />
      <MetricCard autoSizeValue icon={<Ban size={18} />} iconClassName="text-muted-foreground" label="Cancelled" loading={loading} value={cancelled} />
      <MetricCard autoSizeValue icon={<CircleDollarSign size={18} />} label="Non-cancelled PO Value" loading={loading} value={fmt(nonCancelledPoValue)} />
    </MetricCardRow>
  );
}
