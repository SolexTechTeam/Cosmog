"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import OrderStatusWidget from "@/components/screens/orders/OrderStatusWidget";
import LinkedSaleOrdersEditor from "@/components/screens/orders/LinkedSaleOrdersEditor";
import CreateSaleOrderDialog from "@/components/screens/orders/CreateSaleOrderDialog";
import type { PurchaseOrder, SaleOrder } from "@/types";

interface PurchaseOrderDetailProps {
  purchaseOrderId: string;
}

const fieldClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-normal outline-none focus:ring-1 focus:ring-ring";

export default function PurchaseOrderDetail({ purchaseOrderId }: PurchaseOrderDetailProps) {
  const { data: purchaseOrders, loading, error, refetch } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const { data: saleOrders, refetch: refetchSaleOrders } = useApi<SaleOrder[]>("/api/sale-orders");
  const purchaseOrder = purchaseOrders?.find((order) => order.id === purchaseOrderId);

  const [saving, setSaving] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [showCreateSo, setShowCreateSo] = useState(false);
  const poId = purchaseOrder?.id;

  async function patch(changes: Record<string, unknown>) {
    if (!poId) return;
    setSaving(true);
    setPatchError(null);
    try {
      await api.patch(`/api/purchase-orders/${poId}`, changes);
      refetch();
    } catch (e) {
      setPatchError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading purchase order…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load purchase order: {error}</p>;
  if (!purchaseOrder) return <p className="text-sm text-muted-foreground">Purchase order not found.</p>;

  const totalCost = (purchaseOrder.items ?? []).reduce((total, item) => total + item.quantity_ordered * item.unit_cost, 0);
  const isDone = purchaseOrder.status === "received" || purchaseOrder.status === "cancelled";

  return (
    <div className="space-y-6">
      <Link href="/orders/procurement" className="text-sm font-medium text-primary hover:underline">← Purchase Orders</Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="border-l-4 border-primary pl-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title">{purchaseOrder.po_number}</h1>
            <StatusBadge status={purchaseOrder.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="text-primary hover:underline">{purchaseOrder.supplier?.name ?? "Unknown supplier"}</Link> · {purchaseOrder.order_date}
          </p>
        </div>
        <OrderStatusWidget
          status={purchaseOrder.status}
          isComplete={purchaseOrder.status === "received"}
          completionLabel="received and complete"
          options={[
            { label: "Draft", value: "draft" },
            { label: "Confirmed", value: "confirmed" },
            { label: "In transit", value: "in transit" },
            { label: "Received", value: "received" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          onUpdate={async (status) => {
            const current = purchaseOrder.status;

            if (status === "in transit") {
              if (current === "draft") {
                await api.patch(`/api/purchase-orders/${purchaseOrder.id}`, { status: "confirmed" });
              }
              await api.post("/api/inventory/ship-po", { purchase_order_id: purchaseOrder.id });
            } else if (status === "received") {
              if (current === "draft") {
                await api.patch(`/api/purchase-orders/${purchaseOrder.id}`, { status: "confirmed" });
                await api.post("/api/inventory/ship-po", { purchase_order_id: purchaseOrder.id });
              } else if (current === "confirmed") {
                await api.post("/api/inventory/ship-po", { purchase_order_id: purchaseOrder.id });
              }
              await api.post("/api/inventory/receive-po", { purchase_order_id: purchaseOrder.id });
            } else {
              await api.patch(`/api/purchase-orders/${purchaseOrder.id}`, { status });
            }
            refetch();
          }}
        />
      </div>

      {patchError && <p className="text-sm text-destructive">{patchError}</p>}

      {/* Metrics */}
      <MetricCardRow>
        <MetricCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} />
        <MetricCard label="Items" value={(purchaseOrder.items ?? []).length} />
        <MetricCard label="Fulfillment" value={purchaseOrder.fulfillment_type.replace(/_/g, " ")} valueClassName="capitalize" />
        <MetricCard label="Expected Arrival" value={purchaseOrder.expected_arrival ?? "—"} />
      </MetricCardRow>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        {/* Items table */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-header mb-4">Items</h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Ordered</th>
                  <th className="px-3 py-2 text-right font-medium">Received</th>
                  <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(purchaseOrder.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <Link href={`/inventory/${item.product_id}`} className="font-medium text-primary hover:underline">
                        {item.product?.name ?? item.product_id}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right">{item.quantity_ordered}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_received}</td>
                    <td className="px-3 py-2 text-right">${item.unit_cost.toFixed(2)}</td>
                  </tr>
                ))}
                {(purchaseOrder.items ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">No items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sidebar — inline editable */}
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Fulfillment</label>
                <select defaultValue={purchaseOrder.fulfillment_type} onChange={(e) => patch({ fulfillment_type: e.target.value })} disabled={saving || isDone} className={fieldClass}>
                  <option value="warehouse">Warehouse</option>
                  <option value="direct_delivery">Direct delivery</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Expected arrival</label>
                <input type="date" defaultValue={purchaseOrder.expected_arrival ?? ""} onChange={(e) => patch({ expected_arrival: e.target.value || undefined })} disabled={saving || isDone} className={fieldClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Shipped</label>
                  <input type="date" defaultValue={purchaseOrder.shipped_date ?? ""} onChange={(e) => patch({ shipped_date: e.target.value || undefined })} disabled={saving || isDone} className={fieldClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Received</label>
                  <input type="date" defaultValue={purchaseOrder.received_date ?? ""} onChange={(e) => patch({ received_date: e.target.value || undefined })} disabled={saving || isDone} className={fieldClass} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea defaultValue={purchaseOrder.notes ?? ""} onBlur={(e) => { if (e.target.value !== (purchaseOrder.notes ?? "")) patch({ notes: e.target.value || undefined }); }} disabled={saving || isDone} rows={2} className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-normal outline-none focus:ring-1 focus:ring-ring" placeholder="—" />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Supplier</h2>
            <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="font-medium text-primary hover:underline">{purchaseOrder.supplier?.name ?? "—"}</Link>
          </section>

          <LinkedSaleOrdersEditor
            purchaseOrderId={purchaseOrder.id}
            saleOrders={saleOrders ?? []}
            onUpdated={refetchSaleOrders}
            onCreateSo={() => setShowCreateSo(true)}
          />
        </div>
      </div>
      {showCreateSo && (
        <CreateSaleOrderDialog
          onClose={() => setShowCreateSo(false)}
          onCreated={() => { setShowCreateSo(false); refetchSaleOrders(); }}
          initialItems={(purchaseOrder.items ?? []).map((i) => ({ product_id: i.product_id, quantity: String(i.quantity_ordered), unit_price: "" }))}
          linkedPurchaseOrderId={purchaseOrder.id}
        />
      )}
    </div>
  );
}
