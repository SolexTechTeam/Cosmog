"use client";

import { useApi } from "@/hooks/useApi";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { SaleOrder } from "@/types";

export default function OrderMetricsWidget() {
  const { data, loading, error } = useApi<SaleOrder[]>("/api/sale-orders");

  const orders = data ?? [];
  const totalOpen = orders.filter((o) => o.status === "open").length;
  const awaitingPayment = orders.filter((o) => o.payment_status === "awaiting_payment").length;

  const openOrders = orders.filter((o) => o.status === "open");

  const totalOpenValue = openOrders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return sum + itemTotal + o.shipping_cost;
  }, 0);

  const outstanding = openOrders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return sum + itemTotal + o.shipping_cost - o.amount_paid;
  }, 0);

  if (error) {
    return <p className="text-sm text-red-500">Failed to load order metrics: {error}</p>;
  }

  return (
    <MetricCardRow>
      <MetricCard label="Open Orders" value={loading ? "—" : totalOpen} />
      <MetricCard label="Awaiting Payment" value={loading ? "—" : awaitingPayment} />
      <MetricCard label="Total Open $" value={loading ? "—" : `$${totalOpenValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
      <MetricCard label="Total Outstanding $" value={loading ? "—" : `$${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
    </MetricCardRow>
  );
}
