"use client";

import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import StatusBadge from "@/components/common/StatusBadge";
import OrderStatusWidget from "@/components/screens/orders/OrderStatusWidget";
import type { PurchaseOrder, SaleOrder } from "@/types";

interface SaleOrderDetailProps {
  saleOrderId: string;
}

export default function SaleOrderDetail({ saleOrderId }: SaleOrderDetailProps) {
  const { data: orders, loading, error, refetch } = useApi<SaleOrder[]>("/api/sale-orders");
  const { data: purchaseOrders } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const saleOrder = orders?.find((order) => order.id === saleOrderId);
  const purchaseOrder = saleOrder?.linked_po_id
    ? purchaseOrders?.find((order) => order.id === saleOrder.linked_po_id)
    : undefined;

  if (loading) return <p className="text-sm text-muted-foreground">Loading sales order…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load sales order: {error}</p>;
  if (!saleOrder) return <p className="text-sm text-muted-foreground">Sales order not found.</p>;

  const itemTotal = (saleOrder.items ?? []).reduce((total, item) => total + item.quantity * item.unit_price, 0);
  const orderTotal = itemTotal + saleOrder.shipping_cost;

  return (
    <div className="space-y-6">
      <Link href="/orders/sales" className="text-sm font-medium text-primary hover:underline">← Sales Orders</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-title">{saleOrder.so_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sales order details</p>
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
            await api.patch(`/api/sale-orders/${saleOrder.id}`, { status });
            refetch();
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-subheader">Order Total</p><p className="mt-1 text-xl font-bold">${orderTotal.toFixed(2)}</p></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-subheader">Amount Paid</p><p className="mt-1 text-xl font-bold">${saleOrder.amount_paid.toFixed(2)}</p></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-subheader">Payment</p><div className="mt-2">{StatusBadge({ status: saleOrder.payment_status })}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-subheader">Priority</p><div className="mt-2">{StatusBadge({ status: saleOrder.priority })}</div></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-header mb-4">Items</h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Product</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Unit Price</th><th className="px-3 py-2 text-right font-medium">Total</th></tr></thead>
              <tbody className="divide-y divide-border">
                {(saleOrder.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2"><Link href={`/inventory/${item.product_id}`} className="font-medium text-primary hover:underline">{item.product?.name ?? item.product_id}</Link></td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">${item.unit_price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">${(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
                {(saleOrder.items ?? []).length === 0 && <tr><td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">No items</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3">Customer</h2>
            <p className="font-medium">{saleOrder.customer?.name ?? "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{saleOrder.customer?.handle ?? "No handle"}</p>
            <p className="mt-4 text-sm text-muted-foreground">Owner</p>
            <p className="font-medium">{saleOrder.owner?.name ?? "—"}</p>
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3">Associated Purchase Order</h2>
            {saleOrder.linked_po_id ? (
              <Link href={`/orders/procurement/${saleOrder.linked_po_id}`} className="font-medium text-primary hover:underline">
                {purchaseOrder?.po_number ?? saleOrder.linked_po_id}
              </Link>
            ) : <p className="text-sm text-muted-foreground">No purchase order assigned.</p>}
            {purchaseOrder && <p className="mt-1 text-sm text-muted-foreground">{purchaseOrder.supplier?.name ?? "—"} · {purchaseOrder.status}</p>}
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-header mb-3">Fulfillment</h2>
            <dl className="space-y-2 text-sm"><div><dt className="text-muted-foreground">Type</dt><dd>{saleOrder.fulfillment_type.replace(/_/g, " ")}</dd></div><div><dt className="text-muted-foreground">Tracking</dt><dd>{saleOrder.tracking_reference ?? "—"}</dd></div><div><dt className="text-muted-foreground">Shipped</dt><dd>{saleOrder.shipped_date ?? "—"}</dd></div></dl>
          </section>
        </div>
      </div>
    </div>
  );
}
