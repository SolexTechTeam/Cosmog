"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { useToast } from "@/components/ui/toast";
import OrderDetailLayout from "@/components/common/orders/OrderDetailLayout";
import OrderStatusWidget from "@/components/common/orders/OrderStatusWidget";
import SidebarCard from "@/components/common/orders/SidebarCard";
import LinkedSaleOrdersEditor from "@/components/common/orders/LinkedSaleOrdersEditor";
import CreateSaleOrderDialog from "@/components/common/orders/CreateSaleOrderDialog";
import type { PurchaseOrder, SaleOrder } from "@/types";

interface PurchaseOrderDetailProps {
  purchaseOrderId: string;
}

type Tab = "items" | "details" | "notes";

export default function PurchaseOrderDetail({ purchaseOrderId }: PurchaseOrderDetailProps) {
  const { toast } = useToast();
  const { data: purchaseOrders, loading, error, refetch } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());
  const { data: saleOrders, refetch: refetchSaleOrders } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const purchaseOrder = purchaseOrders?.find((order) => order.id === purchaseOrderId);

  const [activeTab, setActiveTab] = useState<Tab>("items");
  const [saving, setSaving] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [showCreateSo, setShowCreateSo] = useState(false);

  async function patch(changes: Record<string, unknown>) {
    if (!purchaseOrder) return;
    setSaving(true); setPatchError(null);
    try { await AetherClient.updatePurchaseOrder(purchaseOrder.id, changes); toast(`${purchaseOrder.po_number} updated`); refetch(); }
    catch (e) { setPatchError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading purchase order...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load purchase order: {error}</p>;
  if (!purchaseOrder) return <p className="text-sm text-muted-foreground">Purchase order not found.</p>;

  const items = purchaseOrder.items ?? [];
  const totalCost = items.reduce((total, item) => total + item.quantity_ordered * item.unit_cost, 0);
  const totalReceived = items.reduce((total, item) => total + item.quantity_received, 0);
  const totalOrdered = items.reduce((total, item) => total + item.quantity_ordered, 0);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "items", label: `Items (${items.length})` },
    { key: "details", label: "Details" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <OrderDetailLayout
      backHref="/orders/procurement"
      backLabel="Purchase Orders"
      orderNumber={purchaseOrder.po_number}
      subtitle={<>
        <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="text-primary hover:underline">{purchaseOrder.supplier?.name ?? "Unknown"}</Link>
        <span className="text-foreground/30"> · </span>{purchaseOrder.order_date}
        <span className="text-foreground/30"> · </span>{purchaseOrder.fulfillment_type.replace(/_/g, " ")}
      </>}
      statusWidget={
        <OrderStatusWidget
          status={purchaseOrder.status}
          isComplete={purchaseOrder.status === "received"}
          completionLabel="received and complete"
          options={[
            { label: "Draft", value: "draft" }, { label: "Confirmed", value: "confirmed" },
            { label: "In transit", value: "in transit" }, { label: "Received", value: "received" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          onUpdate={async (status) => {
            const current = purchaseOrder.status;
            if (status === "in transit") {
              if (current === "draft") await AetherClient.updatePurchaseOrder(purchaseOrder.id, { status: "confirmed" });
              await AetherClient.shipPurchaseOrder(purchaseOrder.id);
            } else if (status === "received") {
              if (current === "draft") { await AetherClient.updatePurchaseOrder(purchaseOrder.id, { status: "confirmed" }); await AetherClient.shipPurchaseOrder(purchaseOrder.id); }
              else if (current === "confirmed") await AetherClient.shipPurchaseOrder(purchaseOrder.id);
              await AetherClient.receivePurchaseOrder(purchaseOrder.id);
            } else { await AetherClient.updatePurchaseOrder(purchaseOrder.id, { status }); }
            toast(`${purchaseOrder.po_number} → ${status}`); refetch();
          }}
        />
      }

      mainContent={<>
        <div className="flex items-center border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-foreground/40 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "items" && (
          <section className="flex flex-col rounded-lg border border-zinc-300 bg-card overflow-hidden min-h-[300px]">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-zinc-300 bg-muted text-xs text-foreground/60">
                  <tr>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 text-right font-medium">Ordered</th>
                    <th className="px-4 py-2 text-right font-medium">Received</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
                    <th className="px-4 py-2 text-right font-medium">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/inventory/${item.product_id}`} className="font-medium text-primary hover:underline">{item.product?.name ?? item.product_id}</Link>
                        {item.product?.category && <span className="ml-2 text-xs text-foreground/40">{item.product.category}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity_ordered}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity_received}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">${item.unit_cost.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">${(item.quantity_ordered * item.unit_cost).toFixed(2)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-foreground/40">No items</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-auto border-t border-zinc-300 bg-muted/30 px-4 py-2">
              <dl className="ml-auto w-56 space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-xs text-foreground/60">Subtotal</dt><dd className="tabular-nums font-medium">${totalCost.toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-foreground/60">GST</dt><dd className="tabular-nums">$0.00</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-foreground/60">Tax</dt><dd className="tabular-nums">$0.00</dd></div>
                <div className="flex justify-between border-t border-zinc-300 pt-1.5 mt-1.5">
                  <dt className="text-xs font-bold text-foreground">Total</dt>
                  <dd className="tabular-nums text-base font-bold text-primary">${totalCost.toFixed(2)}</dd>
                </div>
              </dl>
            </div>
            {patchError && <p className="px-4 py-2 text-xs text-destructive">{patchError}</p>}
          </section>
        )}

        {activeTab === "details" && (
          <section className="rounded-lg border border-zinc-300 bg-card p-4">
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-xs text-foreground/60">Supplier</p><p className="text-sm font-medium">{purchaseOrder.supplier?.name ?? "—"}</p></div>
              <div><p className="text-xs text-foreground/60">Fulfillment</p><p className="text-sm font-medium capitalize">{purchaseOrder.fulfillment_type.replace(/_/g, " ")}</p></div>
              <div><p className="text-xs text-foreground/60">Order Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.order_date}</p></div>
              <div><p className="text-xs text-foreground/60">Expected Arrival</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.expected_arrival || "—"}</p></div>
              <div><p className="text-xs text-foreground/60">Shipped Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.shipped_date || "—"}</p></div>
              <div><p className="text-xs text-foreground/60">Received Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.received_date || "—"}</p></div>
              <div><p className="text-xs text-foreground/60">Total Cost</p><p className="text-sm font-bold tabular-nums text-primary">{fmt(totalCost)}</p></div>
              <div><p className="text-xs text-foreground/60">Items Ordered</p><p className="text-sm font-medium tabular-nums">{totalOrdered}</p></div>
              <div><p className="text-xs text-foreground/60">Items Received</p><p className="text-sm font-medium tabular-nums">{totalReceived} / {totalOrdered}</p></div>
              <div><p className="text-xs text-foreground/60">Created</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.created_at?.slice(0, 10)}</p></div>
              <div><p className="text-xs text-foreground/60">Updated</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.updated_at?.slice(0, 10)}</p></div>
            </div>
          </section>
        )}

        {activeTab === "notes" && (
          <section className="rounded-lg border border-zinc-300 bg-card p-4">
            {purchaseOrder.notes ? (
              <p className="text-sm whitespace-pre-wrap">{purchaseOrder.notes}</p>
            ) : (
              <p className="text-sm text-foreground/40">No notes on this order.</p>
            )}
          </section>
        )}
      </>}

      sidebar={<>
        <SidebarCard title="Cost">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between items-baseline"><dt className="text-xs text-foreground/60">Total</dt><dd className="font-bold tabular-nums text-primary">{fmt(totalCost)}</dd></div>
            <div className="flex justify-between items-baseline"><dt className="text-xs text-foreground/60">Items</dt><dd className="font-semibold tabular-nums">{items.length}</dd></div>
            <div className="flex justify-between items-baseline"><dt className="text-xs text-foreground/60">Received</dt><dd className="font-semibold tabular-nums">{totalReceived} / {totalOrdered}</dd></div>
          </dl>
        </SidebarCard>

        <SidebarCard title="Supplier">
          <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="block rounded-md -mx-1 px-1 py-0.5 hover:bg-background transition-colors">
            <span className="text-sm font-semibold text-foreground">{purchaseOrder.supplier?.name ?? "—"}</span>
          </Link>
        </SidebarCard>

        <SidebarCard title="Details">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-xs text-foreground/60">Fulfillment</dt><dd className="capitalize font-medium">{purchaseOrder.fulfillment_type.replace(/_/g, " ")}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-foreground/60">ETA</dt><dd className="tabular-nums">{purchaseOrder.expected_arrival || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-foreground/60">Shipped</dt><dd className="tabular-nums">{purchaseOrder.shipped_date || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-foreground/60">Received</dt><dd className="tabular-nums">{purchaseOrder.received_date || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-foreground/60">Created</dt><dd className="tabular-nums">{purchaseOrder.created_at?.slice(0, 10)}</dd></div>
          </dl>
        </SidebarCard>

        <LinkedSaleOrdersEditor
          purchaseOrderId={purchaseOrder.id}
          saleOrders={saleOrders ?? []}
          onUpdated={refetchSaleOrders}
          onCreateSo={() => setShowCreateSo(true)}
        />
      </>}

      dialog={showCreateSo ? (
        <CreateSaleOrderDialog
          onClose={() => setShowCreateSo(false)}
          onCreated={() => { setShowCreateSo(false); toast("Sales order created"); refetchSaleOrders(); }}
          initialItems={items.map((i) => ({ product_id: i.product_id, quantity: String(i.quantity_ordered), unit_price: "" }))}
          linkedPurchaseOrderId={purchaseOrder.id}
        />
      ) : undefined}
    />
  );
}
