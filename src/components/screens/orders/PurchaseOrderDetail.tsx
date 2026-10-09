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
import type { PurchaseOrder, SaleOrder } from "@/types";

interface PurchaseOrderDetailProps {
  purchaseOrderId: string;
}

interface DraftPurchaseOrderValues {
  fulfillment_type: string;
  shipped_date: string;
  expected_arrival: string;
  received_date: string;
  notes: string;
}

function DraftPurchaseOrderEditor({ purchaseOrder, onSaved }: { purchaseOrder: PurchaseOrder; onSaved: () => void }) {
  const [values, setValues] = useState<DraftPurchaseOrderValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setValues({
      fulfillment_type: purchaseOrder.fulfillment_type,
      shipped_date: purchaseOrder.shipped_date ?? "",
      expected_arrival: purchaseOrder.expected_arrival ?? "",
      received_date: purchaseOrder.received_date ?? "",
      notes: purchaseOrder.notes ?? "",
    });
    setError(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values) return;

    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/purchase-orders/${purchaseOrder.id}`, {
        ...values,
        shipped_date: values.shipped_date || null,
        expected_arrival: values.expected_arrival || null,
        received_date: values.received_date || null,
        notes: values.notes || null,
      });
      setValues(null);
      onSaved();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!values) {
    return (
      <button type="button" onClick={startEditing} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
        Edit draft
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-primary/30 bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-header">Edit draft</h2>
        <button type="button" onClick={() => setValues(null)} disabled={saving} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">Type<select value={values.fulfillment_type} onChange={(event) => setValues({ ...values, fulfillment_type: event.target.value })} className="h-9 rounded-md border border-border bg-background px-2 font-normal"><option value="warehouse">Warehouse</option><option value="direct_delivery">Direct delivery</option></select></label>
        <label className="grid gap-1 text-sm font-medium">Expected arrival<input type="date" value={values.expected_arrival} onChange={(event) => setValues({ ...values, expected_arrival: event.target.value })} className="h-9 rounded-md border border-border bg-background px-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">Shipped date<input type="date" value={values.shipped_date} onChange={(event) => setValues({ ...values, shipped_date: event.target.value })} className="h-9 rounded-md border border-border bg-background px-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">Received date<input type="date" value={values.received_date} onChange={(event) => setValues({ ...values, received_date: event.target.value })} className="h-9 rounded-md border border-border bg-background px-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium sm:col-span-2">Notes<textarea value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} rows={3} className="rounded-md border border-border bg-background px-2 py-2 font-normal" /></label>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2"><button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button></div>
      </form>
    </section>
  );
}

export default function PurchaseOrderDetail({ purchaseOrderId }: PurchaseOrderDetailProps) {
  const { data: purchaseOrders, loading, error, refetch } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const { data: saleOrders, refetch: refetchSaleOrders } = useApi<SaleOrder[]>("/api/sale-orders");
  const purchaseOrder = purchaseOrders?.find((order) => order.id === purchaseOrderId);

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-muted-foreground">Loading purchase order…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load purchase order: {error}</p>;
  if (!purchaseOrder) return <p className="text-sm text-muted-foreground">Purchase order not found.</p>;

  const totalCost = (purchaseOrder.items ?? []).reduce((total, item) => total + item.quantity_ordered * item.unit_cost, 0);
  const po = purchaseOrder;
  const canEdit = po.status !== "received" && po.status !== "cancelled";

  function startEditing() {
    setEditValues({
      fulfillment_type: po.fulfillment_type,
      expected_arrival: po.expected_arrival ?? "",
      shipped_date: po.shipped_date ?? "",
      received_date: po.received_date ?? "",
      notes: po.notes ?? "",
    });
    setEditError(null);
    setEditing(true);
  }

  async function saveEdits() {
    setSavingEdit(true);
    setEditError(null);
    try {
      const payload: Record<string, unknown> = {
        fulfillment_type: editValues.fulfillment_type,
      };
      if (editValues.expected_arrival) payload.expected_arrival = editValues.expected_arrival;
      if (editValues.shipped_date) payload.shipped_date = editValues.shipped_date;
      if (editValues.received_date) payload.received_date = editValues.received_date;
      if (editValues.notes) payload.notes = editValues.notes;
      await api.patch(`/api/purchase-orders/${po.id}`, payload);
      setEditing(false);
      refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSavingEdit(false);
    }
  }

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
        <div className="flex items-center gap-3">
          {canEdit && !editing && purchaseOrder.status !== "draft" && (
            <button type="button" onClick={startEditing} className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Edit</button>
          )}
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
            if (status === "in transit" && purchaseOrder.status !== "confirmed") {
              throw new Error("A PO can only enter transit after it is confirmed.");
            }
            if (status === "received" && purchaseOrder.status !== "in transit") {
              throw new Error("A PO must be in transit before it can be received.");
            }
            if (status === "in transit") {
              await api.post("/api/inventory/ship-po", { purchase_order_id: purchaseOrder.id });
            } else if (status === "received") {
              await api.post("/api/inventory/receive-po", { purchase_order_id: purchaseOrder.id });
            } else {
              await api.patch(`/api/purchase-orders/${purchaseOrder.id}`, { status });
            }
            refetch();
          }}
        />
        </div>
      </div>

      {purchaseOrder.status === "draft" && <DraftPurchaseOrderEditor purchaseOrder={purchaseOrder} onSaved={refetch} />}

      {editing && (
        <section className="rounded-xl border border-primary/30 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-header">Edit Order</h2>
            <button type="button" onClick={() => setEditing(false)} disabled={savingEdit} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">Fulfillment type<select value={editValues.fulfillment_type} onChange={(e) => setEditValues((v) => ({ ...v, fulfillment_type: e.target.value }))} className="h-9 rounded-md border border-border bg-background px-2 font-normal"><option value="warehouse">Warehouse</option><option value="direct_delivery">Direct delivery</option></select></label>
            <label className="grid gap-1 text-sm font-medium">Expected arrival<input type="date" value={editValues.expected_arrival} onChange={(e) => setEditValues((v) => ({ ...v, expected_arrival: e.target.value }))} className="h-9 rounded-md border border-border bg-background px-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium">Shipped date<input type="date" value={editValues.shipped_date} onChange={(e) => setEditValues((v) => ({ ...v, shipped_date: e.target.value }))} className="h-9 rounded-md border border-border bg-background px-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium">Received date<input type="date" value={editValues.received_date} onChange={(e) => setEditValues((v) => ({ ...v, received_date: e.target.value }))} className="h-9 rounded-md border border-border bg-background px-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-medium sm:col-span-2">Notes<textarea value={editValues.notes} onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))} rows={3} className="rounded-md border border-border bg-background px-2 py-2 font-normal" /></label>
          </div>
          {editError && <p className="mt-3 text-sm text-destructive">{editError}</p>}
          <div className="mt-4">
            <button type="button" onClick={saveEdits} disabled={savingEdit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{savingEdit ? "Saving..." : "Save changes"}</button>
          </div>
        </section>
      )}

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

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Supplier</h2>
            <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="font-medium text-primary hover:underline">{purchaseOrder.supplier?.name ?? "—"}</Link>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Dates</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Order date</dt><dd>{purchaseOrder.order_date}</dd></div>
              <div><dt className="text-muted-foreground">Shipped</dt><dd>{purchaseOrder.shipped_date ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Received</dt><dd>{purchaseOrder.received_date ?? "—"}</dd></div>
            </dl>
          </section>

          <LinkedSaleOrdersEditor
            purchaseOrderId={purchaseOrder.id}
            saleOrders={saleOrders ?? []}
            onUpdated={refetchSaleOrders}
          />
        </div>
      </div>
    </div>
  );
}
