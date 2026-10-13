"use client";

import { useState, useMemo } from "react";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import MetricCard from "@/components/common/MetricCard";
import ErrorBlock from "@/components/ui/error-block";
import { Divider } from "@/components/ui/divider";
import { Select } from "@/components/ui/select";
import type { StockStatus } from "@/types";

const dashboardMetricClass = "min-w-[110px] flex-[0_1_180px] rounded-none border-0 bg-transparent text-center";

export default function InventorySummaryWidget() {
  const { data, loading, error, refetch } = useApi<StockStatus[]>([...queryKeys.stockStatus], () => AetherClient.getStockStatus());
  const [selectedProductId, setSelectedProductId] = useState("");

  const items = data ?? [];

  const productOptions = useMemo(
    () => items.map((i) => ({ label: `${i.name} (${i.category})`, value: i.product_id })).sort((a, b) => a.label.localeCompare(b.label)),
    [items]
  );

  const selectedProduct = selectedProductId ? items.find((i) => i.product_id === selectedProductId) : null;

  const onHand = selectedProduct ? selectedProduct.qty_on_hand : items.reduce((sum, i) => sum + i.qty_on_hand, 0);
  const incoming = selectedProduct ? selectedProduct.qty_incoming : items.reduce((sum, i) => sum + i.qty_incoming, 0);
  const allocated = selectedProduct ? selectedProduct.qty_reserved : items.reduce((sum, i) => sum + i.qty_reserved, 0);
  const available = selectedProduct ? selectedProduct.qty_available : onHand + incoming - allocated;
  const demand = selectedProduct ? selectedProduct.qty_demand : items.reduce((sum, i) => sum + i.qty_demand, 0);
  const value = selectedProduct ? selectedProduct.avg_cost * selectedProduct.qty_on_hand : items.reduce((sum, i) => sum + i.avg_cost * i.qty_on_hand, 0);

  if (error) {
    return <ErrorBlock message={`Failed to load inventory: ${error}`} onRetry={refetch} />;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-row gap-4">

        <h1 className="text-s font-semibold uppercase tracking-wider">Warehouse Inventory Overview</h1>
        <Select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="h-6 w-48 rounded-md border border-border bg-background pl-2.5 pr-8 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">All Products</option>
          {productOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

      </div>
      <div className="overflow-x-auto">
        <div className="flex items-stretch">
          <MetricCard showAccent={false} className={dashboardMetricClass} label="On-Hand" loading={loading} value={onHand.toLocaleString()} />
          <Divider orientation="vertical" className="!my-auto !h-12 self-auto" />
          <MetricCard showAccent={false} className={dashboardMetricClass} label="Incoming" loading={loading} value={incoming.toLocaleString()} accent="primary" />
          <Divider orientation="vertical" className="!my-auto !h-12 self-auto" />
          <MetricCard showAccent={false} className={dashboardMetricClass} label="Allocated" loading={loading} value={allocated.toLocaleString()} accent="warning" />
          <Divider orientation="vertical" className="!my-auto !h-12 self-auto" />
          <MetricCard showAccent={false} className={dashboardMetricClass} label="Available" loading={loading} value={available.toLocaleString()} accent="success" />
          <Divider orientation="vertical" className="!my-auto !h-12 self-auto" />
          <MetricCard showAccent={false} className={dashboardMetricClass} label="Demand" loading={loading} value={demand.toLocaleString()} />
          <Divider orientation="vertical" className="!my-auto !h-12 self-auto" />
          <MetricCard showAccent={false} className={dashboardMetricClass} label="On-Hand Value" loading={loading} value={fmt(value)} />
        </div>
      </div>
    </section>
  );
}
