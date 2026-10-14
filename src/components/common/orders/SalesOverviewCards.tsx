"use client";

import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import { CircleDollarSign, ClipboardList, ShoppingCart, WalletCards } from "lucide-react";
import type { SaleOrder } from "@/types";

interface SalesOverviewCardsProps {
  orders: SaleOrder[];
  loading: boolean;
  error: string | null;
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
    <MetricCardRow>
      <MetricCard autoSizeValue icon={<ClipboardList size={18} />} iconClassName="text-primary" label="Open Orders" loading={loading} value={openCount} />
      <MetricCard autoSizeValue icon={<WalletCards size={18} />} label="Open Value" loading={loading} value={fmt(openValue)} />
      <MetricCard autoSizeValue icon={<ShoppingCart size={18} />} iconClassName="text-primary" label="Total Orders" loading={loading} value={totalCount} />
      <MetricCard autoSizeValue icon={<CircleDollarSign size={18} />} label="Total Value" loading={loading} value={fmt(totalValue)} />
    </MetricCardRow>
  );
}
