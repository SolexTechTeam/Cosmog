"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { getLedgerReference } from "@/lib/ledger-reference";
import StatusBadge from "@/components/common/StatusBadge";
import SidebarCard from "@/components/common/orders/SidebarCard";
import InventoryLotsTable from "@/components/common/InventoryLotsTable";
import PaginatedTable from "@/components/common/PaginatedTable";
import ErrorBlock from "@/components/ui/error-block";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Tabs } from "@/components/ui/tabs";
import { Pencil } from "lucide-react";
import type { StockStatus, PurchaseOrder, InventoryLot, InventoryAllocationRecord, LedgerEntry } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InventoryProductDetailProps {
  productId: string;
}

type Tab = "lots" | "allocations" | "history" | "details";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const tabs: { key: Tab; label: string }[] = [
  { key: "lots", label: "Lots" },
  { key: "allocations", label: "Allocations" },
  { key: "history", label: "History" },
  { key: "details", label: "Details" },
];

const fmt = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InventoryProductDetail({ productId }: InventoryProductDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("lots");
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

  const ledgerQuery = useInfiniteQuery({
    queryKey: [...queryKeys.ledger, "product", productId, 50],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => AetherClient.getLedger({ product_id: productId, limit: 50, cursor: pageParam ?? undefined }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: activeTab === "history",
  });

  const {
    data: currentAllocations,
    loading: allocationsLoading,
    error: allocationsError,
    refetch: refetchAllocations,
  } = useApi<InventoryAllocationRecord[]>(
    [...queryKeys.inventoryAllocations(productId)],
    () => AetherClient.getCurrentProductAllocations(productId),
    { enabled: activeTab === "allocations" },
  );

  const { toast } = useToast();
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(0);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [editingProduct, setEditingProduct] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productDraft, setProductDraft] = useState({ name: "", category: "", sku: "" });

  /* Derived data */
  const stock = stockItems?.find((item) => item.product_id === productId);

  const productLots = (lots ?? []).filter((lot) => lot.product_id === productId);

  const poMap = new Map<string, PurchaseOrder>();
  for (const po of purchaseOrders ?? []) poMap.set(po.id, po);

  const allProductLedger = ledgerQuery.data?.pages.flatMap((page) => page.items) ?? [];

  function startEditingThreshold() {
    setThresholdValue(stock?.low_stock_threshold ?? 5);
    setEditingThreshold(true);
  }

  async function saveThreshold() {
    setSavingThreshold(true);
    try {
      await AetherClient.updateProduct(productId, { low_stock_threshold: thresholdValue });
      setEditingThreshold(false);
      toast("Low stock threshold updated");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update threshold", "error");
    } finally {
      setSavingThreshold(false);
    }
  }

  function startEditingProduct() {
    if (!stock) return;
    setProductDraft({ name: stock.name, category: stock.category, sku: stock.sku ?? "" });
    setEditingProduct(true);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productDraft.name.trim() || !productDraft.category.trim()) return;
    setSavingProduct(true);
    try {
      await AetherClient.updateProduct(productId, {
        name: productDraft.name.trim(),
        category: productDraft.category.trim(),
        sku: productDraft.sku.trim(),
      });
      setEditingProduct(false);
      toast("Product details updated");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update product", "error");
    } finally {
      setSavingProduct(false);
    }
  }

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
      <div className="-mx-6 bg-background px-6 pt-1">
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
              <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">{stock.name}</h1>
              <StatusBadge status={stock.stock_status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {stock.category}
              {stock.sku ? ` · ${stock.sku}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] pt-1">
        {/* Main content */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Tab bar */}
          <Tabs
            activeKey={activeTab}
            extra={activeTab === "details" && !editingProduct ? (
              <button type="button" onClick={startEditingProduct} className="text-xs font-medium text-primary hover:underline">Edit product</button>
            ) : undefined}
            items={tabs}
            onChange={setActiveTab}
          />

          {/* Lots tab */}
          {activeTab === "lots" && (
            <InventoryLotsTable lots={productLots} error={lotsError} poMap={poMap} />
          )}

          {activeTab === "allocations" && (
            <InventoryAllocationsTab
              allocations={currentAllocations ?? []}
              loading={allocationsLoading}
              error={allocationsError}
              onRetry={() => refetchAllocations()}
            />
          )}

          {/* History tab */}
          {activeTab === "history" && (
            <HistoryTab
              productLedger={allProductLedger}
              loading={ledgerQuery.isLoading}
              error={ledgerQuery.isError ? ledgerQuery.error.message : null}
              hasMore={Boolean(ledgerQuery.hasNextPage)}
              loadingMore={ledgerQuery.isFetchingNextPage}
              onLoadMore={() => void ledgerQuery.fetchNextPage()}
              onRetry={() => void (allProductLedger.length ? ledgerQuery.fetchNextPage() : ledgerQuery.refetch())}
            />
          )}

          {/* Details tab */}
          {activeTab === "details" && (
            editingProduct ? (
              <form onSubmit={saveProduct} className="rounded-lg border border-border bg-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">Product name
                    <input required autoFocus value={productDraft.name} onChange={(event) => setProductDraft((draft) => ({ ...draft, name: event.target.value }))} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-primary/50" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">Category
                    <input required value={productDraft.category} onChange={(event) => setProductDraft((draft) => ({ ...draft, category: event.target.value }))} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-primary/50" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">SKU
                    <input value={productDraft.sku} onChange={(event) => setProductDraft((draft) => ({ ...draft, sku: event.target.value }))} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-primary/50" />
                  </label>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button type="submit" disabled={savingProduct} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{savingProduct ? "Saving…" : "Save changes"}</button>
                  <button type="button" onClick={() => setEditingProduct(false)} disabled={savingProduct} className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</button>
                </div>
              </form>
            ) : <DetailsTab stock={stock} />
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
                <SidebarRow label="Available (incl. incoming)" value={String(stock.qty_on_hand + stock.qty_incoming - stock.qty_reserved)} />
                <SidebarRow label="Demand" value={String(stock.qty_demand)} />
              </dl>
            </SidebarCard>

            <SidebarCard title="Cost">
              <dl className="space-y-1.5 text-sm">
                <SidebarRow label="Avg Cost" value={fmt(stock.avg_cost)} bold />
              </dl>
            </SidebarCard>

            <SidebarCard title="Low Stock Threshold">
              {editingThreshold ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveThreshold();
                      if (e.key === "Escape") setEditingThreshold(false);
                    }}
                    className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveThreshold}
                    disabled={savingThreshold}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {savingThreshold ? "..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingThreshold(false)}
                    className="text-xs text-muted-foreground/60 hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{stock.low_stock_threshold} units</p>
                  <button
                    type="button"
                    onClick={startEditingThreshold}
                    className="text-muted-foreground/40 hover:text-primary transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
            </SidebarCard>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  History Tab                                                        */
/* ------------------------------------------------------------------ */

function HistoryTab({
  productLedger,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onRetry,
}: {
  productLedger: LedgerEntry[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[300px]">
      <div className="flex-1 overflow-x-auto">
        <PaginatedTable className="border-0 rounded-none"><table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Qty Change</th>
              <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
              <th className="px-4 py-2 font-medium">Reference</th>
              <th className="px-4 py-2 font-medium">Initiated By</th>
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
                <td className="px-4 py-2.5">{entry.performed_by_name ?? "—"}</td>
              </tr>
            ))}
            {loading && productLedger.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading history…</td></tr>
            )}
            {!loading && !error && productLedger.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No inventory history
                </td>
              </tr>
            )}
          </tbody>
        </table></PaginatedTable>
      </div>
      {error && <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm"><span className="text-destructive">Failed to load history: {error}</span><button type="button" onClick={onRetry} className="rounded border border-border px-3 py-1.5 hover:bg-muted">Retry</button></div>}
      {!error && hasMore && <button type="button" disabled={loadingMore} onClick={onLoadMore} className="mx-auto my-3 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60">{loadingMore ? "Loading…" : "Load more"}</button>}
      {!error && !hasMore && !loading && <p className="py-3 text-center text-xs text-muted-foreground">End of history · {productLedger.length} entries loaded</p>}
    </section>
  );
}

function InventoryAllocationsTab({
  allocations,
  loading,
  error,
  onRetry,
}: {
  allocations: InventoryAllocationRecord[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) return <Skeleton className="h-56 rounded-lg" />;
  if (error) return <ErrorBlock message={`Failed to load allocations: ${error}`} onRetry={onRetry} />;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <PaginatedTable className="border-0 rounded-none">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Sale Order</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Lot</th>
              <th className="px-4 py-2 font-medium">Source PO</th>
              <th className="px-4 py-2 text-right font-medium">Allocated / Ordered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allocations.map((allocation) => (
              <tr key={allocation.allocation_id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-2.5">
                  {allocation.sale_order_id ? (
                    <div className="flex items-center gap-2">
                      <Link href={`/orders/sales/${allocation.sale_order_id}`} className="font-medium text-primary hover:underline">
                        {allocation.so_number ?? allocation.sale_order_id.slice(0, 8)}
                      </Link>
                      {allocation.so_status && <StatusBadge status={allocation.so_status} />}
                    </div>
                  ) : "—"}
                </td>
                <td className="px-4 py-2.5">{allocation.customer_name ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {allocation.inventory_lot_id.slice(0, 8)}
                  {allocation.lot_status && <span className="ml-2 font-sans"><StatusBadge status={allocation.lot_status} /></span>}
                </td>
                <td className="px-4 py-2.5">
                  {allocation.purchase_order_id ? (
                    <Link href={`/orders/procurement/${allocation.purchase_order_id}`} className="text-primary hover:underline">
                      {allocation.po_number ?? allocation.purchase_order_id.slice(0, 8)}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                  {allocation.quantity_allocated} / {allocation.quantity_ordered ?? "—"}
                </td>
              </tr>
            ))}
            {allocations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No current allocations for this product.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </PaginatedTable>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Details Tab                                                        */
/* ------------------------------------------------------------------ */

function DetailsTab({
  stock,
}: {
  stock: StockStatus;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Product Name" value={stock.name} />
        <DetailField label="Category" value={stock.category} />
        <DetailField label="SKU" value={stock.sku ?? "—"} mono />
        <DetailField label="Avg Cost" value={fmt(stock.avg_cost)} />
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
  const { label, href } = getLedgerReference(entry);
  return href
    ? <Link href={href} className="text-primary hover:underline">{label}</Link>
    : <span className="text-muted-foreground">{label}</span>;
}
