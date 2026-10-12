"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import InventorySummaryWidget from "./InventorySummaryWidget";
import OrderMetricsWidget from "./OrderMetricsWidget";
import SalesTable from "@/components/common/orders/SalesTable";
import { X } from "lucide-react";
import type { SaleOrder, PurchaseOrder } from "@/types";

function WelcomeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("solext_onboarded");
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("solext_onboarded", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss welcome banner"
      >
        <X size={16} />
      </button>
      <p className="text-sm font-semibold text-foreground">Welcome to Solext</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Your inventory and order operations hub. Here&apos;s where to start:</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Link href="/orders/sales" className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
          Sales Orders
        </Link>
        <Link href="/inventory" className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
          Inventory
        </Link>
        <Link href="/orders/cooking" className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
          Demand Priority
        </Link>
      </div>
    </div>
  );
}

export default function HomeScreen() {
  const { data: saleOrders, loading, error } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const { data: purchaseOrders, loading: poLoading } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());

  return (
    <>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Inventory and order overview</p>
        </div>
      </div>

      <WelcomeBanner />

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Inventory</h2>
        <InventorySummaryWidget />
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Orders</h2>
        <OrderMetricsWidget orders={saleOrders ?? []} purchaseOrders={purchaseOrders ?? []} loading={loading} poLoading={poLoading} error={error} />
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active Sale Orders</h2>
        <SalesTable orders={saleOrders} loading={loading} error={error} activeOnly compact pageSize={10} hiddenColumns={new Set(["Customer", "handle", "source", "fulfillment_type"])} />
      </section>
    </>
  );
}
