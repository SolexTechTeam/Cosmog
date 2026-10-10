"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { SaleOrder, SaleOrderPoLink } from "@/types";

function OrderItemsTable({ items }: { items: SaleOrder["items"] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Unit Price</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(items ?? []).map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2 text-foreground">
                <span>{item.product?.name ?? "—"}</span>
                {item.product?.category && <span className="ml-2 text-xs text-muted-foreground">{item.product.category}</span>}
              </td>
              <td className="px-3 py-2 text-right text-foreground">{item.quantity}</td>
              <td className="px-3 py-2 text-right text-foreground">${item.unit_price.toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-foreground">${(item.quantity * item.unit_price).toFixed(2)}</td>
            </tr>
          ))}
          {(items ?? []).length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No items</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LinkedPurchaseOrders({ poLinks }: { poLinks: SaleOrderPoLink[] }) {
  if (!poLinks.length) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <ul className="space-y-1">
      {poLinks.map((link) => (
        <li key={link.purchase_order_id}>
          <Link
            href={`/orders/procurement/${link.purchase_order_id}`}
            className="font-medium text-primary hover:underline"
          >
            {link.purchase_order?.po_number ?? link.purchase_order_id}
          </Link>
          {link.purchase_order && <span className="ml-2 text-muted-foreground">{link.purchase_order.status}</span>}
        </li>
      ))}
    </ul>
  );
}

interface SaleOrderExpandedDetailsProps {
  saleOrder: SaleOrder;
  extraInfo?: ReactNode;
}

export default function SaleOrderExpandedDetails({ saleOrder, extraInfo }: SaleOrderExpandedDetailsProps) {
  return (
    <div className="grid gap-4 p-3 text-sm md:grid-cols-[minmax(13rem,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-3 self-center">
        <p className="min-w-0 truncate text-foreground">
          <span className="mr-2 text-muted-foreground">Customer</span>
          <Link href={`/customers/${saleOrder.customer_id}`} className="text-primary hover:underline">{saleOrder.customer?.name ?? "—"}</Link>
        </p>
        <p className="min-w-0 truncate text-foreground">
          <span className="mr-2 text-muted-foreground">Owner</span>
          {saleOrder.owner_name ?? "Unassigned"}
        </p>
        <div className="min-w-0 text-foreground">
          <span className="mr-2 text-muted-foreground">Linked POs</span>
          <LinkedPurchaseOrders poLinks={saleOrder.po_links ?? []} />
        </div>
        {extraInfo}
      </div>
      <div>
        <p className="mb-2 text-muted-foreground">Items</p>
        <OrderItemsTable items={saleOrder.items} />
      </div>
    </div>
  );
}
