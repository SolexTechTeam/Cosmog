"use client";

import { useState, useMemo } from "react";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { allocationLabel, isActiveSaleOrderStatus } from "@/lib/utils";
import MetricCard from "@/components/common/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { CircleDollarSign, ClipboardList, PackageSearch, ShoppingCart, WalletCards } from "lucide-react";
import type { Profile, SaleOrder, StockStatus } from "@/types";

const metricHeightClass = "!h-auto min-h-[6rem] min-w-0";
const dashboardMetricClass = metricHeightClass;
const procurementMetricClass = `col-span-2 ${metricHeightClass} sm:col-span-3 xl:col-span-2`;
const orderMetricRowClass = "grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6";
interface OrderMetricsWidgetProps {
  orders: SaleOrder[];
  selectedProductId: string;
  loading: boolean;
  error: string | null;
}

export default function OrderMetricsWidget({ orders, selectedProductId, loading, error }: OrderMetricsWidgetProps) {
  const { data: profiles } = useApi<Profile[]>([...queryKeys.profiles], () => AetherClient.getProfiles());
  const { data: stockStatus, loading: demandLoading, error: demandError } = useApi<StockStatus[]>([...queryKeys.stockStatus], () => AetherClient.getStockStatus());
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
  const demandItems = stockStatus ?? [];
  const selectedProduct = selectedProductId ? demandItems.find((item) => item.product_id === selectedProductId) : null;
  const demand = selectedProduct ? selectedProduct.qty_demand : demandItems.reduce((sum, item) => sum + item.qty_demand, 0);

  if (error) {
    return <p className="text-sm text-destructive">Failed to load order metrics: {error}</p>;
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section className="space-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
        <h2 className="flex items-center gap-2 font-heading text-l font-semibold tracking-wider">
          <ShoppingCart aria-hidden="true" className="size-4 text-primary" />
          Order Metrics
        </h2>
        <Select
          value={selectedOwnerId}
          onChange={(e) => setSelectedOwnerId(e.target.value)}
          className="h-6 w-32 rounded-md pl-2.5 pr-8 text-xs text-foreground outline   focus:ring-1 focus:ring-primary/50"
        >
          <option value="">All Owners</option>
          <option value="__unassigned__">Unassigned</option>
          {ownerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      <div className={orderMetricRowClass}>
        <MetricCard density="dashboard" autoSizeValue className={dashboardMetricClass} icon={<ClipboardList size={18} />} iconClassName="text-primary" label="Open Orders" labelClassName="!text-[10px]" loading={loading} value={openOrders.length} />
        <MetricCard density="dashboard" autoSizeValue className={dashboardMetricClass} icon={<WalletCards size={18} />} label="Open Value" labelClassName="!text-[10px]" loading={loading} value={fmt(totalOpenValue)} />
        <MetricCard density="dashboard" autoSizeValue className={dashboardMetricClass} icon={<CircleDollarSign size={18} />} iconClassName={outstanding > 0 ? "text-destructive" : "text-emerald-600"} label="Outstanding" labelClassName="!text-[10px]" loading={loading} value={fmt(outstanding)} />
        <MetricCard density="dashboard" className={procurementMetricClass} icon={<PackageSearch size={18} />} iconClassName="text-primary" label="Procurement" labelClassName="!text-[10px]" value="">
          {loading ? <Skeleton className="h-7 w-36" /> : (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              {([
                { key: "need", label: "Need", dot: "bg-red-500" },
                { key: "awaiting", label: "Awaiting", dot: "bg-orange-500" },
                { key: "ready_to_ship", label: "Ready", dot: "bg-emerald-500" },
                { key: "done", label: "Done", dot: "bg-blue-500" },
              ] as const).map(({ key, label, dot }) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-metric text-sm font-semibold tabular-nums [font-stretch:semi-expanded]">{procurementCounts[key]}</span>
                </span>
              ))}
            </div>
          )}
        </MetricCard>
        {!demandError && <MetricCard density="dashboard" autoSizeValue className={dashboardMetricClass} icon={<ShoppingCart size={18} />} iconClassName="text-primary" label="Sales Demand" labelClassName="!text-[10px]" valueSuffix="Units" loading={demandLoading} value={demand.toLocaleString()} />}
      </div>
    </section>
  );
}
