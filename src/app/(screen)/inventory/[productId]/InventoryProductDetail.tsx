"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import StatusBadge from "@/components/common/StatusBadge";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import SidebarCard from "@/components/common/orders/SidebarCard";
import ErrorBlock from "@/components/ui/error-block";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockStatus, PurchaseOrder, InventoryLot, LedgerEntry } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InventoryProductDetailProps {
  productId: string;
}

type Tab = "lots" | "history" | "details";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_HISTORY_COUNT = 40;
const HISTORY_PAGE_SIZE = 40;

const tabs: { key: Tab; label: string }[] = [
  { key: "lots", label: "Lots" },
  { key: "history", label: "History" },
  { key: "details", label: "Details" },
];

const fmt = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InventoryProductDetail({ productId }: InventoryProductDetailProps) {
  const {
    data: stockItems,
    loading,
    error,
    refetch,
  } = useApi<StockStatus[]>([...queryKeys.stockStatus], () => AetherClient.getStockStatus());

  const { data: lots, error: lotsError } = useApi<InventoryLot[]>(
    [...queryKeys.inventoryLots],
    () => AetherClient.getInventoryLots(),
  );

  const { data: purchaseOrders } = useApi<PurchaseOrder[]>(
    [...queryKeys.purchaseOrders],
    () => AetherClient.getPurchaseOrders(),
  );

  const { data: ledger } = useApi<LedgerEntry[]>(
    [...queryKeys.ledger],
    () => AetherClient.getLedger(),
  );

  const [activeTab, setActiveTab] = useState<Tab>("lots");
  const [historyLimit, setHistoryLimit] = useState(INITIAL_HISTORY_COUNT);

  /* Derived data */
  const stock = stockItems?.find((item) => item.product_id === productId);

  const productLots = (lots ?? []).filter((lot) => lot.product_id === productId);

  const poMap = new Map<string, PurchaseOrder>();
  for (const po of purchaseOrders ?? []) poMap.set(po.id, po);

  const allProductLedger = (ledger ?? []).filter((entry) => entry.product_id === productId);
  const productLedger = allProductLedger.slice(0, historyLimit);
  const hasMoreHistory = allProductLedger.length > historyLimit;

  const sellPrice = stock ? stock.avg_cost * 1.25 * 1.14 : 0;

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Error state                                                      */
  /* ---------------------------------------------------------------- */

  if (error) {
    return <ErrorBlock message={`Failed to load inventory: ${error}`} onRetry={() => refetch()} />;
  }

  if (!stock) {
    return <ErrorBlock message="Inventory product not found." />;
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      {/* Back link */}
      <div className="-mx-6 bg-card px-6 pt-1">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>&larr;</span> Inventory
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{stock.name}</h1>
              <StatusBadge status={stock.stock_status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {stock.category}
              {stock.sku ? ` · ${stock.sku}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="mt-4">
        <MetricCardRow>
          <MetricCard label="On-Hand" value={stock.qty_on_hand} accent="default" />
          <MetricCard label="Incoming" value={stock.qty_incoming} accent="primary" />
          <MetricCard label="Allocated" value={stock.qty_reserved} accent="warning" />
          <MetricCard label="Available" value={stock.qty_available} accent="success" />
          <MetricCard label="Demand" value={stock.qty_demand} />
        </MetricCardRow>
      </div>

      {/* Charcoal divider */}
      <div className="h-0.5 bg-sidebar mt-4" />

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] pt-1">
        {/* Main content */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Tab bar */}
          <div className="flex items-center border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Lots tab */}
          {activeTab === "lots" && (
            <LotsTab
              productLots={productLots}
              poMap={poMap}
              lotsError={lotsError}
            />
          )}

          {/* History tab */}
          {activeTab === "history" && (
            <HistoryTab
              productLedger={productLedger}
              hasMore={hasMoreHistory}
              onShowMore={() => setHistoryLimit((prev) => prev + HISTORY_PAGE_SIZE)}
            />
          )}

          {/* Details tab */}
          {activeTab === "details" && (
            <DetailsTab stock={stock} sellPrice={sellPrice} />
          )}
        </div>

        {/* Sidebar */}
        <div className="mt-10">
          <div className="flex flex-col gap-3">
            <SidebarCard title="Stock Summary">
              <dl className="space-y-1.5 text-sm">
                <SidebarRow label="On-Hand" value={String(stock.qty_on_hand)} />
                <SidebarRow label="Incoming" value={String(stock.qty_incoming)} />
                <SidebarRow label="Allocated" value={String(stock.qty_reserved)} />
                <SidebarRow label="Available" value={String(stock.qty_available)} />
                <SidebarRow label="Demand" value={String(stock.qty_demand)} />
              </dl>
            </SidebarCard>

            <SidebarCard title="Cost">
              <dl className="space-y-1.5 text-sm">
                <SidebarRow label="Avg Cost" value={fmt(stock.avg_cost)} bold />
                <SidebarRow label="Est. Sell Price" value={fmt(sellPrice)} bold />
              </dl>
            </SidebarCard>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Lots Tab                                                           */
/* ------------------------------------------------------------------ */

function LotsTab({
  productLots,
  poMap,
  lotsError,
}: {
  productLots: InventoryLot[];
  poMap: Map<string, PurchaseOrder>;
  lotsError: string | null;
}) {
  if (lotsError) {
    return <ErrorBlock message={`Unable to load inventory lots: ${lotsError}`} />;
  }

  return (
    <section className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[300px]">
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">PO #</th>
              <th className="px-4 py-2 font-medium">Received</th>
              <th className="px-4 py-2 text-right font-medium">On-Hand</th>
              <th className="px-4 py-2 text-right font-medium">Reserved</th>
              <th className="px-4 py-2 text-right font-medium">Available</th>
              <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {productLots.map((lot) => {
              const poId = lot.purchase_order_item?.purchase_order_id;
              const po = poId ? poMap.get(poId) : undefined;
              return (
                <tr key={lot.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-2.5">
                    {po ? (
                      <Link
                        href={`/orders/procurement/${po.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {po.po_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5">{lot.received_at?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{lot.quantity_on_hand}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{lot.quantity_reserved}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {Math.max(0, (lot.lot_status === "incoming" ? lot.quantity_total : lot.quantity_on_hand) - lot.quantity_reserved)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(lot.unit_cost)}</td>
                </tr>
              );
            })}
            {productLots.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No inventory lots
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  History Tab                                                        */
/* ------------------------------------------------------------------ */

function HistoryTab({
  productLedger,
  hasMore,
  onShowMore,
}: {
  productLedger: LedgerEntry[];
  hasMore: boolean;
  onShowMore: () => void;
}) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[300px]">
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Qty Change</th>
              <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
              <th className="px-4 py-2 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {productLedger.map((entry) => (
              <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-2.5 tabular-nums">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={entry.movement_type} />
                </td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                    entry.quantity_change > 0
                      ? "text-emerald-600"
                      : entry.quantity_change < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {entry.quantity_change > 0
                    ? `+${entry.quantity_change}`
                    : String(entry.quantity_change)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {entry.unit_cost != null ? fmt(entry.unit_cost) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <ReferenceLink entry={entry} />
                </td>
              </tr>
            ))}
            {productLedger.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No inventory history
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="border-t border-border bg-muted/30 px-4 py-2 text-center">
          <button
            type="button"
            onClick={onShowMore}
            className="text-xs font-medium text-primary hover:underline"
          >
            Show more entries
          </button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Details Tab                                                        */
/* ------------------------------------------------------------------ */

function DetailsTab({
  stock,
  sellPrice,
}: {
  stock: StockStatus;
  sellPrice: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Product Name" value={stock.name} />
        <DetailField label="Category" value={stock.category} />
        <DetailField label="SKU" value={stock.sku ?? "—"} mono />
        <DetailField label="Avg Cost" value={fmt(stock.avg_cost)} />
        <div>
          <p className="text-xs text-muted-foreground">Est. Sell Price</p>
          <p className="text-sm font-medium tabular-nums">{fmt(sellPrice)}</p>
          <p className="text-[11px] text-muted-foreground/60">Avg Cost &times; 1.25 &times; 1.14</p>
        </div>
        <DetailField label="Stock Status">
          <div className="mt-0.5">
            <StatusBadge status={stock.stock_status} />
          </div>
        </DetailField>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function DetailField({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {children ?? (
        <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
      )}
    </div>
  );
}

function SidebarRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums ${bold ? "font-bold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

function ReferenceLink({ entry }: { entry: LedgerEntry }) {
  if (!entry.reference_id) return <span className="text-muted-foreground/60">—</span>;

  if (entry.reference_type === "sale_order") {
    return (
      <Link
        href={`/orders/sales/${entry.reference_id}`}
        className="text-primary hover:underline"
      >
        Sales Order
      </Link>
    );
  }

  if (entry.reference_type === "purchase_order") {
    return (
      <Link
        href={`/orders/procurement/${entry.reference_id}`}
        className="text-primary hover:underline"
      >
        Purchase Order
      </Link>
    );
  }

  return <span className="text-muted-foreground">{entry.reference_id.slice(0, 8)}</span>;
}
