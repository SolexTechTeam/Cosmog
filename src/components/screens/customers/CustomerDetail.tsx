"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import type { Customer, SaleOrder } from "@/types";

interface CustomerDetailProps {
  customerId: string;
}

export default function CustomerDetail({ customerId }: CustomerDetailProps) {
  const { data: customers, loading, error } = useApi<Customer[]>("/api/customers");
  const { data: saleOrders } = useApi<SaleOrder[]>("/api/sale-orders");

  const customer = customers?.find((c) => c.id === customerId);
  const orders = useMemo(
    () => (saleOrders ?? []).filter((o) => o.customer_id === customerId).sort((a, b) => b.order_date.localeCompare(a.order_date)),
    [saleOrders, customerId]
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading customer...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load customer: {error}</p>;
  if (!customer) return <p className="text-sm text-muted-foreground">Customer not found.</p>;

  const totalRevenue = orders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return sum + itemTotal + o.shipping_cost;
  }, 0);
  const openOrders = orders.filter((o) => o.status === "open" || o.status === "shipped");
  const totalPaid = orders.reduce((sum, o) => sum + o.amount_paid, 0);

  const contactEntries = Object.entries(customer.contact_info ?? {}).filter(([, v]) => v != null && v !== "");

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
      </div>

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
