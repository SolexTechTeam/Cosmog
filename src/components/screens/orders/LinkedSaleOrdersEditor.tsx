"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { SaleOrder } from "@/types";

interface LinkedSaleOrdersEditorProps {
  purchaseOrderId: string;
  saleOrders: SaleOrder[];
  onUpdated: () => void;
}

export default function LinkedSaleOrdersEditor({ purchaseOrderId, saleOrders, onUpdated }: LinkedSaleOrdersEditorProps) {
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkedOrders = saleOrders.filter((order) => order.linked_po_id === purchaseOrderId);
  const selectableOrders = saleOrders.filter((order) =>
    order.status === "open" || order.status === "shipped" || order.linked_po_id === purchaseOrderId
  );

  function beginEditing() {
    setSelectedIds(linkedOrders.map((order) => order.id));
    setError(null);
  }

  function toggleOrder(orderId: string) {
    setSelectedIds((current) => {
      if (!current) return current;
      return current.includes(orderId)
        ? current.filter((currentId) => currentId !== orderId)
        : [...current, orderId];
    });
  }

  async function saveLinks() {
    if (!selectedIds) return;

    const updates = saleOrders.flatMap((order) => {
      const shouldLink = selectedIds.includes(order.id);
      if (shouldLink && order.linked_po_id !== purchaseOrderId) {
        return [api.patch(`/api/sale-orders/${order.id}`, { linked_po_id: purchaseOrderId })];
      }
      if (!shouldLink && order.linked_po_id === purchaseOrderId) {
        return [api.patch(`/api/sale-orders/${order.id}`, { linked_po_id: null })];
      }
      return [];
    });

    try {
      setSaving(true);
      setError(null);
      await Promise.all(updates);
      setSelectedIds(null);
      onUpdated();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update Sales Order links.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-header">Linked Sales Orders</h2>
        {selectedIds === null && (
          <button type="button" onClick={beginEditing} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Edit links
          </button>
        )}
      </div>

      {selectedIds === null ? (
        linkedOrders.length ? (
          <ul className="mt-3 space-y-2">
            {linkedOrders.map((order) => (
              <li key={order.id}>
                <Link href={`/orders/sales/${order.id}`} className="font-medium text-primary hover:underline">{order.so_number}</Link>
                <span className="ml-2 text-xs text-muted-foreground">{order.customer?.name ?? "Unknown customer"}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted-foreground">No sales orders linked.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Selecting an SO already assigned elsewhere will move it to this PO.</p>
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {selectableOrders.length ? selectableOrders.map((order) => (
              <label key={order.id} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleOrder(order.id)} disabled={saving} className="mt-0.5 size-4 accent-primary" />
                <span>
                  <span className="font-medium">{order.so_number}</span>
                  <span className="text-muted-foreground"> · {order.customer?.name ?? "Unknown customer"} · {order.status}</span>
                  {order.linked_po_id && order.linked_po_id !== purchaseOrderId && <span className="block text-xs text-amber-600">Currently assigned to another PO</span>}
                </span>
              </label>
            )) : <p className="text-sm text-muted-foreground">No active sales orders available.</p>}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSelectedIds(null)} disabled={saving} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="button" onClick={saveLinks} disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save links"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
