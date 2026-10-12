"use client";

import { useState } from "react";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import { Select } from "@/components/ui/select";
import type { SaleOrder } from "@/types";

interface SalesOverviewCardsProps {
  orders: SaleOrder[];
  loading: boolean;
  error: string | null;
}

export default function SalesOverviewCards({ orders, loading, error }: SalesOverviewCardsProps) {
  const [orderType, setOrderType] = useState<"total" | "dtc" | "warehouse">("total");
  const scopedOrders = orders.filter((order) =>
    orderType === "total" || (orderType === "dtc"
      ? order.fulfillment_type === "direct_to_customer"
      : order.fulfillment_type !== "direct_to_customer")
  );
  const openCount = scopedOrders.filter((o) => o.status === "open").length;
  const totalCount = scopedOrders.length;

  const openValue = scopedOrders
    .filter((o) => o.status === "open")
    .reduce((sum, o) => sum + o.order_total, 0);

  const totalValue = scopedOrders.reduce((sum, o) => sum + o.order_total, 0);

  if (error) {
    return <p className="text-sm text-destructive">Failed to load sales data: {error}</p>;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-2.5">
      <label className="ml-auto flex w-fit items-center gap-2 text-xs font-medium text-muted-foreground">
        Order type
        <Select value={orderType} onChange={(event) => setOrderType(event.target.value as "total" | "dtc" | "warehouse")} className="h-8 px-2">
          <option value="total">Total</option>
          <option value="dtc">DTC</option>
          <option value="warehouse">Warehouse</option>
        </Select>
      </label>
      <MetricCardRow className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label="Open" loading={loading} value={openCount} accent="primary" />
        <MetricCard label="Total" loading={loading} value={totalCount} />
        <MetricCard label="Open Value" loading={loading} value={fmt(openValue)} accent="warning" />
        <MetricCard label="Total Value" loading={loading} value={fmt(totalValue)} />
      </MetricCardRow>
    </div>
  );
}
