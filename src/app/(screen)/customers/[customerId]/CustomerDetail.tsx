"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useLookup } from "@/hooks/useLookup";
import { AetherClient } from "@/lib/aether-client";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import type { Customer, SaleOrder } from "@/types";

interface CustomerDetailProps {
  customerId: string;
}

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-2 font-normal outline-none focus:ring-2 focus:ring-ring";

export default function CustomerDetail({ customerId }: CustomerDetailProps) {
  const { data: customers, loading, error, refetch } = useApi<Customer[]>(() => AetherClient.getCustomers());
  const { data: saleOrders } = useApi<SaleOrder[]>(() => AetherClient.getSaleOrders());
  const { options: customerTypeOptions } = useLookup("customer_type");

  const customer = customers?.find((c) => c.id === customerId);
  const orders = useMemo(
    () => (saleOrders ?? []).filter((o) => o.customer_id === customerId).sort((a, b) => b.order_date.localeCompare(a.order_date)),
    [saleOrders, customerId]
  );

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-muted-foreground">Loading customer...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load customer: {error}</p>;
  if (!customer) return <p className="text-sm text-muted-foreground">Customer not found.</p>;

  const c = customer;

  const totalRevenue = orders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return sum + itemTotal + o.shipping_cost;
  }, 0);
  const openOrders = orders.filter((o) => o.status === "open" || o.status === "shipped");
  const totalPaid = orders.reduce((sum, o) => sum + o.amount_paid, 0);
  const contactEntries = Object.entries(c.contact_info ?? {}).filter(([, v]) => v != null && v !== "");

  function startEditing() {
    setEditValues({
      name: c.name,
      handle: c.handle ?? "",
      email: c.email ?? "",
      customer_type: c.customer_type,
      payment_terms: c.payment_terms ?? "",
      contact_email: String((c.contact_info as Record<string, unknown>)?.email ?? ""),
      contact_phone: String((c.contact_info as Record<string, unknown>)?.phone ?? ""),
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
        customer_type: editValues.customer_type,
      };
      if (editValues.handle) payload.handle = editValues.handle;
      if (editValues.email) payload.email = editValues.email;
      if (editValues.payment_terms) payload.payment_terms = editValues.payment_terms;
      const contactInfo: Record<string, string> = {};
      if (editValues.contact_email) contactInfo.email = editValues.contact_email;
      if (editValues.contact_phone) contactInfo.phone = editValues.contact_phone;
      if (Object.keys(contactInfo).length) payload.contact_info = contactInfo;
      await AetherClient.updateCustomer(c.id, payload);
      setEditing(false);
      refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/customers" className="text-sm font-medium text-primary hover:underline">← Customers</Link>

      <div className="border-l-4 border-primary pl-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title">{customer.name}</h1>
          <StatusBadge status={customer.customer_type} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {customer.handle ?? "No handle"} · {customer.email ?? "No email"}
        </p>
        {!editing && (
          <button type="button" onClick={startEditing} className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Edit customer</button>
        )}
      </div>

      {editing && (
        <section className="rounded-xl border border-primary/30 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-header">Edit Customer</h2>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Name
              <input value={editValues.name ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Type
              <select value={editValues.customer_type ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, customer_type: e.target.value }))} className={inputClass}>
                {(customerTypeOptions.length ? customerTypeOptions : [{ label: "B2B", value: "b2b" }, { label: "B2C", value: "b2c" }, { label: "Special", value: "special" }]).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Handle
              <input value={editValues.handle ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, handle: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Email
              <input type="email" value={editValues.email ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, email: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Payment Terms
              <input value={editValues.payment_terms ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, payment_terms: e.target.value }))} className={inputClass} />
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
        <MetricCard label="Total Orders" value={orders.length} />
        <MetricCard label="Open Orders" value={openOrders.length} />
        <MetricCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} />
        <MetricCard label="Total Paid" value={`$${totalPaid.toFixed(2)}`} />
      </MetricCardRow>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-header mb-4">Sales Orders</h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">SO #</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const itemTotal = (order.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
                  return (
                    <tr key={order.id}>
                      <td className="px-3 py-2">
                        <Link href={`/orders/sales/${order.id}`} className="font-medium text-primary hover:underline">{order.so_number}</Link>
                      </td>
                      <td className="px-3 py-2">{order.order_date}</td>
                      <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
                      <td className="px-3 py-2"><StatusBadge status={order.payment_status} /></td>
                      <td className="px-3 py-2 text-right">${(itemTotal + order.shipping_cost).toFixed(2)}</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-5 text-center text-muted-foreground">No sales orders</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Details</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Type</dt><dd className="capitalize">{customer.customer_type}</dd></div>
              <div><dt className="text-muted-foreground">Handle</dt><dd>{customer.handle ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd>{customer.email ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Payment Terms</dt><dd>{customer.payment_terms ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Created</dt><dd>{new Date(customer.created_at).toLocaleDateString()}</dd></div>
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
