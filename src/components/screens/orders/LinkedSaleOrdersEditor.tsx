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
}

function isLinkedTo(order: SaleOrder, poId: string) {
  return (order.po_links ?? []).some((link) => link.purchase_order_id === poId);
}

export default function LinkedSaleOrdersEditor({ purchaseOrderId, saleOrders, onUpdated }: LinkedSaleOrdersEditorProps) {
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkedOrders = saleOrders.filter((order) => isLinkedTo(order, purchaseOrderId));
  const selectableOrders = saleOrders.filter((order) =>
    order.status === "open" || order.status === "shipped" || isLinkedTo(order, purchaseOrderId)
  );

  const allocationCounts = linkedOrders.length
    ? linkedOrders.reduce((acc, order) => {
        const label = allocationLabel(order.allocation_status);
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : null;

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
      const currentlyLinked = isLinkedTo(order, purchaseOrderId);
      if (shouldLink && !currentlyLinked) {
        return [api.post(`/api/sale-orders/${order.id}/po-links`, { purchase_order_id: purchaseOrderId })];
      }
      if (!shouldLink && currentlyLinked) {
        return [api.delete(`/api/sale-orders/${order.id}/po-links/${purchaseOrderId}`)];
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
        <h2 className="text-header border-b border-primary/20 pb-2 flex-1">Linked Sales Orders</h2>
        {selectedIds === null && (
          <button type="button" onClick={beginEditing} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Edit links
          </button>
        )}
      </div>

      {selectedIds === null ? (
        <>
          {linkedOrders.length ? (
            <ul className="mt-3 space-y-2">
              {linkedOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/orders/sales/${order.id}`} className="font-medium text-primary hover:underline">{order.so_number}</Link>
                  <span className="text-xs text-muted-foreground">{order.customer?.name ?? "Unknown customer"}</span>
                  {order.allocation_status && (
                    <StatusBadge status={allocationLabel(order.allocation_status)} />
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">No sales orders linked.</p>}
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Select sales orders to link to this PO.</p>
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {selectableOrders.length ? selectableOrders.map((order) => (
              <label key={order.id} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleOrder(order.id)} disabled={saving} className="mt-0.5 size-4 accent-primary" />
                <span>
                  <span className="font-medium">{order.so_number}</span>
                  <span className="text-muted-foreground"> · {order.customer?.name ?? "Unknown customer"} · {order.status}</span>
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
