"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useLookup } from "@/hooks/useLookup";
import { api } from "@/lib/api";
import { allocationLabel, isActiveSaleOrderStatus } from "@/lib/utils";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import OrderStatusWidget from "@/components/screens/orders/OrderStatusWidget";
import CreatePurchaseOrderDialog from "@/components/screens/orders/CreatePurchaseOrderDialog";
import type { Profile, PurchaseOrder, SaleOrder } from "@/types";

interface SaleOrderDetailProps {
  saleOrderId: string;
}

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-2 font-normal outline-none focus:ring-2 focus:ring-ring";

export default function SaleOrderDetail({ saleOrderId }: SaleOrderDetailProps) {
  const { data: orders, loading, error, refetch } = useApi<SaleOrder[]>("/api/sale-orders");
  const { data: profiles } = useApi<Profile[]>("/api/profiles");
  const { data: purchaseOrders } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const { options: priorityOptions } = useLookup("so_priority");
  const { options: fulfillmentOptions } = useLookup("so_fulfillment_type");

  const saleOrder = orders?.find((order) => order.id === saleOrderId);
  const isActive = isActiveSaleOrderStatus(saleOrder?.status ?? "");
  const procurementStatus = saleOrder ? allocationLabel(saleOrder.allocation_status) : undefined;

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [poSearch, setPoSearch] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showCreatePo, setShowCreatePo] = useState(false);

  if (loading) return <p className="text-sm text-muted-foreground">Loading sales order...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load sales order: {error}</p>;
  if (!saleOrder) return <p className="text-sm text-muted-foreground">Sales order not found.</p>;

  const poLinks = saleOrder.po_links ?? [];
  const itemTotal = (saleOrder.items ?? []).reduce((total, item) => total + item.quantity * item.unit_price, 0);
  const orderTotal = itemTotal + saleOrder.shipping_cost;
  const activeProfiles = (profiles ?? []).filter((p) => p.is_active);
  const canEdit = saleOrder.status === "open";
  const so = saleOrder;

  function startEditing() {
    setEditValues({
      priority: so.priority,
      owner_id: so.owner_id ?? "",
      fulfillment_type: so.fulfillment_type,
      payment_status: so.payment_status,
      shipping_cost: String(so.shipping_cost),
      amount_paid: String(so.amount_paid),
      shipped_date: so.shipped_date ?? "",
      delivered_date: so.delivered_date ?? "",
      tracking_reference: so.tracking_reference ?? "",
      shipping_details: so.shipping_details ?? "",
      notes: so.notes ?? "",
    });
    setEditError(null);
    setEditing(true);
  }

  async function saveEdits() {
    setSaving(true);
    setEditError(null);
    try {
      const payload: Record<string, unknown> = {
        priority: editValues.priority,
        fulfillment_type: editValues.fulfillment_type,
        payment_status: editValues.payment_status,
        shipping_cost: Number(editValues.shipping_cost) || 0,
        amount_paid: Number(editValues.amount_paid) || 0,
      };
      if (editValues.owner_id) payload.owner_id = editValues.owner_id;
      if (editValues.shipped_date) payload.shipped_date = editValues.shipped_date;
      if (editValues.delivered_date) payload.delivered_date = editValues.delivered_date;
      if (editValues.tracking_reference) payload.tracking_reference = editValues.tracking_reference;
      if (editValues.shipping_details) payload.shipping_details = editValues.shipping_details;
      if (editValues.notes) payload.notes = editValues.notes;
      await api.patch(`/api/sale-orders/${so.id}`, payload);
      setEditing(false);
      refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function inlinePatch(changes: Record<string, unknown>) {
    setInlineError(null);
    try {
      await api.patch(`/api/sale-orders/${so.id}`, changes);
      refetch();
    } catch (e) {
      setInlineError(e instanceof Error ? e.message : "Failed to save.");
    }
  }

  async function linkPo(poId: string) {
    setInlineError(null);
    try {
      await api.post(`/api/sale-orders/${so.id}/po-links`, { purchase_order_id: poId });
      refetch();
    } catch (e) {
      setInlineError(e instanceof Error ? e.message : "Failed to link PO.");
    }
  }

  async function unlinkPo(poId: string) {
    setInlineError(null);
    try {
      await api.delete(`/api/sale-orders/${so.id}/po-links/${poId}`);
      refetch();
    } catch (e) {
      setInlineError(e instanceof Error ? e.message : "Failed to unlink PO.");
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/orders/sales" className="text-sm font-medium text-primary hover:underline">← Sales Orders</Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="border-l-4 border-primary pl-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title">{saleOrder.so_number}</h1>
            <StatusBadge status={saleOrder.priority} />
            {isActive && procurementStatus && <StatusBadge status={procurementStatus} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/customers/${saleOrder.customer_id}`} className="text-primary hover:underline">{saleOrder.customer?.name ?? "Unknown customer"}</Link> · {saleOrder.order_date}
          </p>
          {canEdit && !editing && (
            <button type="button" onClick={startEditing} className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Edit order</button>
          )}
        </div>
        <OrderStatusWidget
          status={saleOrder.status}
          isComplete={saleOrder.status === "completed"}
          options={[
            { label: "Open", value: "open" },
            { label: "Shipped", value: "shipped" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
            { label: "Returned", value: "returned" },
          ]}
          onUpdate={async (status) => {
            if (status === "completed") {
              const missingPrice = (saleOrder.items ?? []).some((item) => !item.unit_price || item.unit_price <= 0);
              if (missingPrice) {
                throw new Error("All items must have a sale price before completing this order.");
              }
            }
            if (status === "shipped") {
              await api.post("/api/inventory/fulfill", { sale_order_id: saleOrder.id });
            } else if (status === "cancelled") {
              await api.post("/api/inventory/release", { sale_order_id: saleOrder.id });
            } else if (status === "returned") {
              await api.post("/api/inventory/return", { sale_order_id: saleOrder.id });
            } else {
              await api.patch(`/api/sale-orders/${saleOrder.id}`, { status });
            }
            refetch();
          }}
        />
      </div>

      {/* Metrics */}
      <MetricCardRow>
        <MetricCard label="Order Total" value={`$${orderTotal.toFixed(2)}`} />
        <MetricCard label="Amount Paid" value={`$${saleOrder.amount_paid.toFixed(2)}`} />
        <MetricCard label="Payment" value="">
          <StatusBadge status={saleOrder.payment_status} />
        </MetricCard>
        <MetricCard label="Procurement" value="">
          {isActive && procurementStatus
            ? <StatusBadge status={procurementStatus} />
            : <span className="text-sm text-muted-foreground">—</span>}
        </MetricCard>
      </MetricCardRow>

      {/* Edit form */}
      {editing && (
        <section className="rounded-xl border border-primary/30 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-header">Edit Order</h2>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Priority
              <select value={editValues.priority} onChange={(e) => setEditValues((v) => ({ ...v, priority: e.target.value }))} className={inputClass}>
                {(priorityOptions.length ? priorityOptions : [{ label: "Low", value: "low" }, { label: "Normal", value: "normal" }, { label: "High", value: "high" }, { label: "Urgent", value: "urgent" }]).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Owner
              <select value={editValues.owner_id} onChange={(e) => setEditValues((v) => ({ ...v, owner_id: e.target.value }))} className={inputClass}>
                <option value="">Unassigned</option>
                {activeProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Fulfillment type
              <select value={editValues.fulfillment_type} onChange={(e) => setEditValues((v) => ({ ...v, fulfillment_type: e.target.value }))} className={inputClass}>
                {(fulfillmentOptions.length ? fulfillmentOptions : [{ label: "Shipping", value: "shipping" }]).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Payment status
              <select value={editValues.payment_status} onChange={(e) => setEditValues((v) => ({ ...v, payment_status: e.target.value }))} className={inputClass}>
                <option value="not_requested">Not requested</option>
                <option value="awaiting_payment">Awaiting payment</option>
                <option value="part_paid">Part paid</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Shipping cost
              <input type="number" min="0" step="0.01" value={editValues.shipping_cost} onChange={(e) => setEditValues((v) => ({ ...v, shipping_cost: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Amount paid
              <input type="number" min="0" step="0.01" value={editValues.amount_paid} onChange={(e) => setEditValues((v) => ({ ...v, amount_paid: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Shipped date
              <input type="date" value={editValues.shipped_date} onChange={(e) => setEditValues((v) => ({ ...v, shipped_date: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Delivered date
              <input type="date" value={editValues.delivered_date} onChange={(e) => setEditValues((v) => ({ ...v, delivered_date: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Tracking reference
              <input value={editValues.tracking_reference} onChange={(e) => setEditValues((v) => ({ ...v, tracking_reference: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium sm:col-span-2">
              Shipping details
              <textarea value={editValues.shipping_details} onChange={(e) => setEditValues((v) => ({ ...v, shipping_details: e.target.value }))} rows={2} className="rounded-md border border-input bg-background px-2 py-2 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-medium sm:col-span-2">
              Notes
              <textarea value={editValues.notes} onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))} rows={2} className="rounded-md border border-input bg-background px-2 py-2 font-normal" />
            </label>
          </div>
          {editError && <p className="mt-3 text-sm text-destructive">{editError}</p>}
          <div className="mt-4">
            <button type="button" onClick={saveEdits} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      )}

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
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(saleOrder.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <Link href={`/inventory/${item.product_id}`} className="font-medium text-primary hover:underline">
                        {item.product?.name ?? item.product_id}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">${item.unit_price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">${(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
                {(saleOrder.items ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">No items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Owner & Priority</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Owner</dt>
                <dd className="mt-0.5 font-medium">{saleOrder.owner_id ? <Link href={`/users/${saleOrder.owner_id}`} className="text-primary hover:underline">{saleOrder.owner_name ?? "Unknown"}</Link> : "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="mt-1"><StatusBadge status={saleOrder.priority} /></dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Customer</h2>
            <Link href={`/customers/${saleOrder.customer_id}`} className="font-medium text-primary hover:underline">{saleOrder.customer?.name ?? "—"}</Link>
            <p className="mt-1 text-sm text-muted-foreground">{saleOrder.customer?.handle ?? "No handle"}</p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Linked Purchase Orders</h2>
            {poLinks.length > 0 && (
              <ul className="space-y-2 mb-3">
                {poLinks.map((link) => (
                  <li key={link.purchase_order_id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/orders/procurement/${link.purchase_order_id}`} className="font-medium text-primary hover:underline">
                      {link.purchase_order?.po_number ?? link.purchase_order_id}
                    </Link>
                    {link.purchase_order && <StatusBadge status={link.purchase_order.status} />}
                    {link.purchase_order?.supplier && (
                      <span className="text-xs text-muted-foreground">{link.purchase_order.supplier.name}</span>
                    )}
                    <button type="button" onClick={() => unlinkPo(link.purchase_order_id)} className="text-xs text-muted-foreground hover:text-destructive">unlink</button>
                  </li>
                ))}
              </ul>
            )}
            {!poLinks.length && <p className="text-sm text-muted-foreground mb-3">No purchase orders linked.</p>}
            <div className="relative">
              <input placeholder="Search POs to link..." value={poSearch} onChange={(e) => setPoSearch(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
              {poSearch && (
                <div className="absolute z-10 mt-1 max-h-32 w-full space-y-0.5 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
                  {(purchaseOrders ?? [])
                    .filter((po) => po.status !== "cancelled" && po.status !== "received" && !poLinks.some((l) => l.purchase_order_id === po.id) && (po.po_number.toLowerCase().includes(poSearch.toLowerCase()) || (po.supplier?.name ?? "").toLowerCase().includes(poSearch.toLowerCase())))
                    .slice(0, 8)
                    .map((po) => (
                      <button key={po.id} type="button" onClick={() => { linkPo(po.id); setPoSearch(""); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted">
                        <span className="font-medium">{po.po_number}</span>
                        <span className="text-muted-foreground">{po.supplier?.name ?? "—"} · {po.status}</span>
                      </button>
                    ))}
                  {(purchaseOrders ?? []).filter((po) => po.status !== "cancelled" && po.status !== "received" && !poLinks.some((l) => l.purchase_order_id === po.id) && (po.po_number.toLowerCase().includes(poSearch.toLowerCase()) || (po.supplier?.name ?? "").toLowerCase().includes(poSearch.toLowerCase()))).length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No matching POs</p>
                  )}
                </div>
              )}
            </div>
            {procurementStatus !== "ready_to_ship" && (
              <button type="button" onClick={() => setShowCreatePo(true)} className="mt-2 w-full rounded-md border border-dashed border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5">+ Create new PO</button>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Fulfillment</h2>
            <div className="space-y-2 text-sm">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select defaultValue={saleOrder.fulfillment_type} onChange={(e) => inlinePatch({ fulfillment_type: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring">
                  {(fulfillmentOptions.length ? fulfillmentOptions : [{ label: "Shipping", value: "shipping" }, { label: "Pickup", value: "pickup" }, { label: "Local delivery", value: "local_delivery" }, { label: "Event pickup", value: "event_pickup" }, { label: "Hold", value: "hold" }, { label: "Drop ship", value: "drop_ship" }]).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tracking</label>
                <input defaultValue={saleOrder.tracking_reference ?? ""} onBlur={(e) => { if (e.target.value !== (saleOrder.tracking_reference ?? "")) inlinePatch({ tracking_reference: e.target.value || undefined }); }} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="—" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Shipped</label>
                <input type="date" defaultValue={saleOrder.shipped_date ?? ""} onChange={(e) => inlinePatch({ shipped_date: e.target.value || undefined })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            {inlineError && <p className="mt-2 text-xs text-destructive">{inlineError}</p>}
          </section>
        </div>
      </div>
      {showCreatePo && (
        <CreatePurchaseOrderDialog
          onClose={() => setShowCreatePo(false)}
          onCreated={() => { setShowCreatePo(false); refetch(); }}
          initialItems={(saleOrder.items ?? []).map((i) => ({ product_id: i.product_id, quantity_ordered: String(i.quantity), unit_cost: "" }))}
          linkedSaleOrderId={saleOrder.id}
        />
      )}
    </div>
  );
}
