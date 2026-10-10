"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import { useToast } from "@/components/ui/toast";
import type { PurchaseOrder, Supplier } from "@/types";

interface SupplierDetailProps {
  supplierId: string;
}

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-2 font-normal outline-none focus:ring-2 focus:ring-ring";

export default function SupplierDetail({ supplierId }: SupplierDetailProps) {
  const { toast } = useToast();
  const { data: suppliers, loading, error, refetch } = useApi<Supplier[]>([...queryKeys.suppliers], () => AetherClient.getSuppliers());
  const { data: purchaseOrders } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());

  const supplier = suppliers?.find((s) => s.id === supplierId);
  const orders = useMemo(
    () => (purchaseOrders ?? []).filter((o) => o.supplier_id === supplierId).sort((a, b) => b.order_date.localeCompare(a.order_date)),
    [purchaseOrders, supplierId]
  );

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-muted-foreground">Loading supplier...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load supplier: {error}</p>;
  if (!supplier) return <p className="text-sm text-muted-foreground">Supplier not found.</p>;

  const s = supplier;

  const totalCost = orders.reduce((sum, o) => {
    return sum + (o.items ?? []).reduce((si, i) => si + i.quantity_ordered * i.unit_cost, 0);
  }, 0);
  const activeOrders = orders.filter((o) => o.status !== "received" && o.status !== "cancelled");
  const receivedOrders = orders.filter((o) => o.status === "received");
  const contactEntries = Object.entries(s.contact_info ?? {}).filter(([, v]) => v != null && v !== "");

  function startEditing() {
    setEditValues({
      name: s.name,
      default_lead_days: String(s.default_lead_days),
      contact_email: String((s.contact_info as Record<string, unknown>)?.email ?? ""),
      contact_phone: String((s.contact_info as Record<string, unknown>)?.phone ?? ""),
    });
    setEditError(null);
    setEditing(true);
  }

  async function saveEdits() {
    setSaving(true);
    setEditError(null);
    try {
      const payload: Record<string, unknown> = {
        name: editValues.name,
        default_lead_days: Number(editValues.default_lead_days) || 1,
      };
      const contactInfo: Record<string, string> = {};
      if (editValues.contact_email) contactInfo.email = editValues.contact_email;
      if (editValues.contact_phone) contactInfo.phone = editValues.contact_phone;
      if (Object.keys(contactInfo).length) payload.contact_info = contactInfo;
      await AetherClient.updateSupplier(s.id, payload);
      setEditing(false);
      toast(`${s.name} updated`);
      refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/suppliers" className="text-sm font-medium text-primary hover:underline">← Suppliers</Link>

      <div className="border-l-4 border-primary pl-3">
        <h1 className="text-title">{supplier.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default lead time: {supplier.default_lead_days} day{supplier.default_lead_days !== 1 ? "s" : ""}
        </p>
        {!editing && (
          <button type="button" onClick={startEditing} className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Edit supplier</button>
        )}
      </div>

      {editing && (
        <section className="rounded-xl border border-primary/30 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-header">Edit Supplier</h2>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Name
              <input value={editValues.name ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Lead Days
              <input type="number" min="1" step="1" value={editValues.default_lead_days ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, default_lead_days: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Email
              <input type="email" value={editValues.contact_email ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, contact_email: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Phone
              <input value={editValues.contact_phone ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, contact_phone: e.target.value }))} className={inputClass} />
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

      <MetricCardRow>
        <MetricCard label="Total POs" value={orders.length} />
        <MetricCard label="Active POs" value={activeOrders.length} />
        <MetricCard label="Received" value={receivedOrders.length} />
        <MetricCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} />
      </MetricCardRow>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-header mb-4">Purchase Orders</h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">PO #</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Items</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const cost = (order.items ?? []).reduce((si, i) => si + i.quantity_ordered * i.unit_cost, 0);
                  return (
                    <tr key={order.id}>
                      <td className="px-3 py-2">
                        <Link href={`/orders/procurement/${order.id}`} className="font-medium text-primary hover:underline">{order.po_number}</Link>
                      </td>
                      <td className="px-3 py-2">{order.order_date}</td>
                      <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
                      <td className="px-3 py-2 capitalize">{order.fulfillment_type.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-right">{(order.items ?? []).length}</td>
                      <td className="px-3 py-2 text-right">${cost.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-5 text-center text-muted-foreground">No purchase orders</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Details</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Lead Time</dt><dd>{supplier.default_lead_days} day{supplier.default_lead_days !== 1 ? "s" : ""}</dd></div>
              <div><dt className="text-muted-foreground">Created</dt><dd>{new Date(supplier.created_at).toLocaleDateString()}</dd></div>
            </dl>
          </section>

          {contactEntries.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Contact Info</h2>
              <dl className="space-y-2 text-sm">
                {contactEntries.map(([key, value]) => (
                  <div key={key}><dt className="text-muted-foreground capitalize">{key}</dt><dd>{String(value)}</dd></div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
