"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import type { PurchaseOrder, Supplier } from "@/types";

interface SupplierDetailProps {
  supplierId: string;
}

export default function SupplierDetail({ supplierId }: SupplierDetailProps) {
  const { data: suppliers, loading, error } = useApi<Supplier[]>("/api/suppliers");
  const { data: purchaseOrders } = useApi<PurchaseOrder[]>("/api/purchase-orders");

  const supplier = suppliers?.find((s) => s.id === supplierId);
  const orders = useMemo(
    () => (purchaseOrders ?? []).filter((o) => o.supplier_id === supplierId).sort((a, b) => b.order_date.localeCompare(a.order_date)),
    [purchaseOrders, supplierId]
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading supplier...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load supplier: {error}</p>;
  if (!supplier) return <p className="text-sm text-muted-foreground">Supplier not found.</p>;

  const totalCost = orders.reduce((sum, o) => {
    return sum + (o.items ?? []).reduce((s, i) => s + i.quantity_ordered * i.unit_cost, 0);
  }, 0);
  const activeOrders = orders.filter((o) => o.status !== "received" && o.status !== "cancelled");
  const receivedOrders = orders.filter((o) => o.status === "received");

  const contactEntries = Object.entries(supplier.contact_info ?? {}).filter(([, v]) => v != null && v !== "");

  return (
    <div className="space-y-6">
      <Link href="/suppliers" className="text-sm font-medium text-primary hover:underline">← Suppliers</Link>

      <div className="border-l-4 border-primary pl-3">
        <h1 className="text-title">{supplier.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default lead time: {supplier.default_lead_days} day{supplier.default_lead_days !== 1 ? "s" : ""}
        </p>
      </div>

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
                  const cost = (order.items ?? []).reduce((s, i) => s + i.quantity_ordered * i.unit_cost, 0);
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
