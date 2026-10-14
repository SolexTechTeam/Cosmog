"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import InventorySummaryWidget from "./InventorySummaryWidget";
import OrderMetricsWidget from "./OrderMetricsWidget";
import NotesWidget from "./NotesWidget";
import SalesTable from "@/components/common/orders/SalesTable";
import { ClipboardList, X } from "lucide-react";
import type { SaleOrder, PurchaseOrder } from "@/types";

const ONBOARDED_KEY = "solext_onboarded";
const ONBOARDING_CHANGE_EVENT = "solext-onboarding-change";

function subscribeToOnboarding(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(ONBOARDING_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ONBOARDING_CHANGE_EVENT, onChange);
  };
}

function getOnboardingVisibility() {
  return localStorage.getItem(ONBOARDED_KEY) !== "true";
}

function WelcomeBanner() {
  const visible = useSyncExternalStore(subscribeToOnboarding, getOnboardingVisibility, () => false);

  function dismiss() {
    localStorage.setItem(ONBOARDED_KEY, "true");
    window.dispatchEvent(new Event(ONBOARDING_CHANGE_EVENT));
  }

  if (!visible) return null;

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
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
  const [selectedProductId, setSelectedProductId] = useState("");

  return (
    <>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Inventory and order overview</p>
        </div>
      </div>

      <WelcomeBanner />

      <section className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="xl:col-start-1 xl:row-start-1">
          <InventorySummaryWidget
            selectedProductId={selectedProductId}
            onSelectedProductIdChange={setSelectedProductId}
            purchaseOrders={purchaseOrders ?? []}
            poLoading={poLoading}
          />
        </div>
        <div className="xl:col-start-1 xl:row-start-2">
          <OrderMetricsWidget orders={saleOrders ?? []} selectedProductId={selectedProductId} loading={loading} error={error} />
        </div>
        <aside className="min-h-0 xl:absolute xl:inset-y-0 xl:right-0 xl:w-80">
          <NotesWidget />
        </aside>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-l font-semibold tracking-wider text-black">
          <ClipboardList aria-hidden="true" className="size-4 text-primary" />
          Active Sale Orders
        </h2>
        <SalesTable orders={saleOrders} loading={loading} error={error} activeOnly compact hiddenColumns={new Set(["Customer", "handle", "source", "fulfillment_type"])} />
      </section>
    </>
  );
}
