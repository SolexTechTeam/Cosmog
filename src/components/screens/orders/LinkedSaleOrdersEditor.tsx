"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { allocationLabel } from "@/lib/utils";
import StatusBadge from "@/components/common/StatusBadge";
import type { SaleOrder } from "@/types";

interface LinkedSaleOrdersEditorProps {
  purchaseOrderId: string;
  saleOrders: SaleOrder[];
  onUpdated: () => void;
  onCreateSo?: () => void;
}

function isLinkedTo(order: SaleOrder, poId: string) {
  return (order.po_links ?? []).some((link) => link.purchase_order_id === poId);
}

export default function LinkedSaleOrdersEditor({ purchaseOrderId, saleOrders, onUpdated, onCreateSo }: LinkedSaleOrdersEditorProps) {
  const [soSearch, setSoSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const linkedOrders = saleOrders.filter((order) => isLinkedTo(order, purchaseOrderId));
  const searchableOrders = saleOrders.filter((so) =>
    (so.status === "open" || so.status === "shipped") && !isLinkedTo(so, purchaseOrderId)
  );

  async function linkSo(soId: string) {
    setError(null);
    try {
      await api.post(`/api/sale-orders/${soId}/po-links`, { purchase_order_id: purchaseOrderId });
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to link SO.");
    }
  }

  async function unlinkSo(soId: string) {
    setError(null);
    try {
      await api.delete(`/api/sale-orders/${soId}/po-links/${purchaseOrderId}`);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unlink SO.");
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-header border-b border-primary/20 pb-2 mb-3">Linked Sales Orders</h2>

      {linkedOrders.length > 0 ? (
        <ul className="space-y-2 mb-3">
          {linkedOrders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center gap-2">
              <Link href={`/orders/sales/${order.id}`} className="font-medium text-primary hover:underline">{order.so_number}</Link>
              <span className="text-xs text-muted-foreground">{order.customer?.name ?? "Unknown"}</span>
              {order.allocation_status && <StatusBadge status={allocationLabel(order.allocation_status)} />}
              <button type="button" onClick={() => unlinkSo(order.id)} className="text-xs text-muted-foreground hover:text-destructive">unlink</button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground mb-3">No sales orders linked.</p>}

      <div className="relative">
        <input placeholder="Search SOs to link..." value={soSearch} onChange={(e) => setSoSearch(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        {soSearch && (
          <div className="absolute z-10 mt-1 max-h-32 w-full space-y-0.5 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
            {searchableOrders
              .filter((so) => so.so_number.toLowerCase().includes(soSearch.toLowerCase()) || (so.customer?.name ?? "").toLowerCase().includes(soSearch.toLowerCase()))
              .slice(0, 8)
              .map((so) => (
                <button key={so.id} type="button" onClick={() => { linkSo(so.id); setSoSearch(""); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted">
                  <span className="font-medium">{so.so_number}</span>
                  <span className="text-muted-foreground">{so.customer?.name ?? "—"} · {so.status}</span>
                </button>
              ))}
            {searchableOrders.filter((so) => so.so_number.toLowerCase().includes(soSearch.toLowerCase()) || (so.customer?.name ?? "").toLowerCase().includes(soSearch.toLowerCase())).length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">No matching SOs</p>
            )}
          </div>
        )}
      </div>

      {onCreateSo && (
        <button type="button" onClick={onCreateSo} className="mt-2 w-full rounded-md border border-dashed border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5">+ Create new SO</button>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}
