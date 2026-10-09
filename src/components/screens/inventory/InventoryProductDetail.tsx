"use client";

import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import StatusBadge from "@/components/common/StatusBadge";
import type { StockStatus } from "@/types";

interface InventoryLot {
  id: string;
  product_id: string;
  purchase_order_item_id: string;
  quantity_total: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  lot_status: string;
  unit_cost: number;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  purchase_order_item?: { id: string; purchase_order_id: string; unit_cost: number } | null;
}

interface LedgerEntry {
  id: number;
  product_id: string;
  product_name: string | null;
  movement_type: string;
  quantity_change: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}


interface InventoryProductDetailProps { productId: string; }

export default function InventoryProductDetail({ productId }: InventoryProductDetailProps) {
  const { data: stockItems, loading, error } = useApi<StockStatus[]>("/api/inventory/stock-status");
  const { data: lots, error: lotsError } = useApi<InventoryLot[]>("/api/inventory/lots");
  const { data: ledger } = useApi<LedgerEntry[]>("/api/inventory/ledger");
  const stock = stockItems?.find((item) => item.product_id === productId);
  const productLots = (lots ?? []).filter((lot) => lot.product_id === productId);
  const productLedger = (ledger ?? []).filter((entry) => entry.product_id === productId).slice(0, 20);

  if (loading) return <p className="text-sm text-muted-foreground">Loading inventory…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load inventory: {error}</p>;
  if (!stock) return <p className="text-sm text-muted-foreground">Inventory product not found.</p>;

  return (
    <div className="space-y-6">
      <Link href="/inventory" className="text-sm font-medium text-primary hover:underline">← Inventory</Link>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-title">{stock.name}</h1><p className="mt-1 text-sm text-muted-foreground">{stock.category}{stock.sku ? ` · ${stock.sku}` : ""}</p></div>{StatusBadge({ status: stock.stock_status })}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg border border-border bg-card p-4"><p className="text-subheader">On-Hand</p><p className="mt-1 text-xl font-bold">{stock.qty_on_hand}</p></div><div className="rounded-lg border border-border bg-card p-4"><p className="text-subheader">Reserved</p><p className="mt-1 text-xl font-bold">{stock.qty_reserved}</p></div><div className="rounded-lg border border-border bg-card p-4"><p className="text-subheader">Available</p><p className="mt-1 text-xl font-bold">{stock.qty_available}</p></div><div className="rounded-lg border border-border bg-card p-4"><p className="text-subheader">In Transit</p><p className="mt-1 text-xl font-bold">{stock.qty_in_transit}</p></div></div>
      <section className="rounded-lg border border-border bg-card p-5"><h2 className="text-header mb-4">Inventory Lots</h2>{lotsError ? <p className="text-sm text-destructive">Unable to load inventory lots: {lotsError}</p> : <div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Lot</th><th className="px-3 py-2 font-medium">Received</th><th className="px-3 py-2 text-right font-medium">On-Hand</th><th className="px-3 py-2 text-right font-medium">Reserved</th><th className="px-3 py-2 text-right font-medium">Available</th><th className="px-3 py-2 text-right font-medium">Unit Cost</th><th className="px-3 py-2 font-medium">PO</th></tr></thead><tbody className="divide-y divide-border">{productLots.map((lot) => <tr key={lot.id}><td className="px-3 py-2 font-mono text-xs">{lot.id}</td><td className="px-3 py-2">{lot.received_at?.slice(0, 10) ?? "—"}</td><td className="px-3 py-2 text-right">{lot.quantity_on_hand}</td><td className="px-3 py-2 text-right">{lot.quantity_reserved}</td><td className="px-3 py-2 text-right">{Math.max(0, lot.quantity_on_hand - lot.quantity_reserved)}</td><td className="px-3 py-2 text-right">{`$${lot.unit_cost.toFixed(2)}`}</td><td className="px-3 py-2">{lot.purchase_order_item?.purchase_order_id ? <Link href={`/orders/procurement/${lot.purchase_order_item.purchase_order_id}`} className="text-primary hover:underline">View PO</Link> : "—"}</td></tr>)}{productLots.length === 0 && <tr><td colSpan={7} className="px-3 py-5 text-center text-muted-foreground">No inventory lots</td></tr>}</tbody></table></div>}</section>
      <section className="rounded-lg border border-border bg-card p-5"><h2 className="text-header mb-4">Recent Inventory History</h2><div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 text-right font-medium">Change</th><th className="px-3 py-2 font-medium">Reference</th></tr></thead><tbody className="divide-y divide-border">{productLedger.map((entry) => <tr key={entry.id}><td className="px-3 py-2">{new Date(entry.created_at).toLocaleString()}</td><td className="px-3 py-2">{entry.movement_type.replace(/_/g, " ")}</td><td className="px-3 py-2 text-right">{entry.quantity_change > 0 ? "+" : ""}{entry.quantity_change}</td><td className="px-3 py-2">{entry.reference_id && entry.reference_type === "sale_order" ? <Link href={`/orders/sales/${entry.reference_id}`} className="text-primary hover:underline">Sales Order</Link> : entry.reference_id && entry.reference_type === "purchase_order" ? <Link href={`/orders/procurement/${entry.reference_id}`} className="text-primary hover:underline">Purchase Order</Link> : entry.reference_id ?? "—"}</td></tr>)}{productLedger.length === 0 && <tr><td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">No inventory history</td></tr>}</tbody></table></div></section>
    </div>
  );
}
