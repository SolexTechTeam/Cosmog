"use client";

import { useMemo } from "react";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import MetricCard from "@/components/common/MetricCard";
import { Card } from "@/components/ui/card";
import ErrorBlock from "@/components/ui/error-block";
import IncomingMetrics from "./IncomingMetrics";
import { Select } from "@/components/ui/select";
import { CircleCheck, PackageCheck, Truck, Warehouse } from "lucide-react";
import type { PurchaseOrder, StockStatus } from "@/types";

const metricHeightClass = "!h-[5rem]";
const dashboardMetricClass = `${metricHeightClass} w-[var(--metric-card-width)] shrink-0`;
const onHandMetricClass = `${metricHeightClass} w-[calc(var(--metric-card-width)_*_1.5_+1.5rem)] shrink-0`;
const incomingMetricClass = `${metricHeightClass} w-[calc(var(--metric-card-width)_*_2.15_+_1.5rem)] shrink-0`;
const inventoryMetricRowClass = `${metricHeightClass} flex flex-wrap gap-3 [--metric-card-width:calc((102%_-_4rem)_/_6)]`;

interface InventorySummaryWidgetProps {
  selectedProductId: string;
  onSelectedProductIdChange: (productId: string) => void;
  purchaseOrders: PurchaseOrder[];
  poLoading: boolean;
}

export default function InventorySummaryWidget({
  selectedProductId,
  onSelectedProductIdChange,
  purchaseOrders,
  poLoading,
}: InventorySummaryWidgetProps) {
  const { data, loading, error, refetch } = useApi<StockStatus[]>([...queryKeys.stockStatus], () => AetherClient.getStockStatus());

  const items = useMemo(() => data ?? [], [data]);

  const productOptions = useMemo(
    () => items.map((i) => ({ label: `${i.name} (${i.category})`, value: i.product_id })).sort((a, b) => a.label.localeCompare(b.label)),
    [items]
  );

  const selectedProduct = selectedProductId ? items.find((i) => i.product_id === selectedProductId) : null;

  const onHand = selectedProduct ? selectedProduct.qty_on_hand : items.reduce((sum, i) => sum + i.qty_on_hand, 0);
  const incoming = selectedProduct ? selectedProduct.qty_incoming : items.reduce((sum, i) => sum + i.qty_incoming, 0);
  const allocated = selectedProduct ? selectedProduct.qty_reserved : items.reduce((sum, i) => sum + i.qty_reserved, 0);
  const available = onHand + incoming - allocated;
  const value = selectedProduct ? selectedProduct.avg_cost * selectedProduct.qty_on_hand : items.reduce((sum, i) => sum + i.avg_cost * i.qty_on_hand, 0);
  const posInTransit = purchaseOrders.filter((po) => po.status === "in transit" && po.fulfillment_type === "warehouse");
  const posInTransitCount = posInTransit.length;
  const posInTransitValue = posInTransit.reduce((sum, po) => sum + po.order_total, 0);

  if (error) {
    return <ErrorBlock message={`Failed to load inventory: ${error}`} onRetry={refetch} />;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="flex items-center gap-2 font-heading text-L font-semibold tracking-wider">
          <Warehouse aria-hidden="true" className="size-4 text-primary" />
          Warehouse Inventory Overview
        </h2>
        <Select
          searchable
          value={selectedProductId}
          onChange={(e) => onSelectedProductIdChange(e.target.value)}
          className="h-6 w-48 rounded-md border border-border bg-background pl-2.5 pr-8 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">All Products</option>
          {productOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>
      <div className={inventoryMetricRowClass}>
        <Card className={onHandMetricClass} bodyClassName="!p-0 grid grid-cols-[minmax(0,2.25fr)_minmax(0,3fr)]">
          <MetricCard density="dashboard" autoSizeValue className="min-w-0 !border-none !bg-transparent" label="On-Hand" labelClassName="!text-[12px]" loading={loading} value={onHand.toLocaleString()} />
          <MetricCard density="dashboard" autoSizeValue className="min-w-0 !border-none !bg-transparent" label="OH Value" labelClassName="!text-[12px]" loading={loading} value={fmt(value)} />
        </Card>
        <MetricCard density="dashboard" className={incomingMetricClass} icon={<Truck size={18} />} iconClassName="text-primary" label="Incoming" value="">
          <IncomingMetrics units={incoming.toLocaleString()} purchaseOrders={String(posInTransitCount)} value={fmt(posInTransitValue)} loading={loading} poLoading={poLoading} />
        </MetricCard>
        <MetricCard density="dashboard" autoSizeValue className={dashboardMetricClass} icon={<PackageCheck size={18} />} iconClassName="text-amber-600" label="Allocated" loading={loading} value={allocated.toLocaleString()} />
        <MetricCard density="dashboard" autoSizeValue className={dashboardMetricClass} icon={<CircleCheck size={18} />} iconClassName="text-emerald-600" label="Available (incl. incoming)" loading={loading} value={available.toLocaleString()} />
      </div>
    </section>
  );
}
