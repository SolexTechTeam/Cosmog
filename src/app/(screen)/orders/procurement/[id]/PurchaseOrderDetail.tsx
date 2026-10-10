"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { useToast } from "@/components/ui/toast";
import StatusBadge from "@/components/common/StatusBadge";
import OrderDetailLayout from "@/components/common/orders/OrderDetailLayout";
import OrderStatusWidget from "@/components/common/orders/OrderStatusWidget";
import SidebarCard from "@/components/common/orders/SidebarCard";
import LinkedSaleOrdersEditor from "@/components/common/orders/LinkedSaleOrdersEditor";
import CreateSaleOrderDialog from "@/components/common/orders/CreateSaleOrderDialog";
import type { PurchaseOrder, SaleOrder } from "@/types";

interface PurchaseOrderDetailProps {
  purchaseOrderId: string;
}

export default function PurchaseOrderDetail({ purchaseOrderId }: PurchaseOrderDetailProps) {
  const { toast } = useToast();
  const { data: purchaseOrders, loading, error, refetch } = useApi<PurchaseOrder[]>(() => AetherClient.getPurchaseOrders());
  const { data: saleOrders, refetch: refetchSaleOrders } = useApi<SaleOrder[]>(() => AetherClient.getSaleOrders());
  const purchaseOrder = purchaseOrders?.find((order) => order.id === purchaseOrderId);

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
  const isDone = purchaseOrder.status === "received" || purchaseOrder.status === "cancelled";
  const fieldClass = `h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring ${isDone ? "opacity-50" : ""}`;

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <OrderDetailLayout
      backHref="/orders/procurement"
      backLabel="Purchase Orders"
      orderNumber={purchaseOrder.po_number}
      subtitle={<>
        <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="text-primary hover:underline">{purchaseOrder.supplier?.name ?? "Unknown"}</Link>
        <span className="text-muted-foreground/50"> · </span>{purchaseOrder.order_date}
        <span className="text-muted-foreground/50"> · </span>{purchaseOrder.fulfillment_type.replace(/_/g, " ")}
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

      mainContent={
        <section className="rounded-lg border border-border bg-card overflow-hidden min-h-[300px]">
          <div className="bg-muted px-4 py-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
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
                      {item.product?.category && <span className="ml-2 text-xs text-muted-foreground">{item.product.category}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity_ordered}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity_received}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">${item.unit_cost.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">${(item.quantity_ordered * item.unit_cost).toFixed(2)}</td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No items</td></tr>}
              </tbody>
              <tfoot className="border-t border-border bg-muted/30">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-foreground">Total</td>
                  <td className="px-4 py-2 text-right tabular-nums text-base font-bold text-primary">${totalCost.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {patchError && <p className="px-4 py-2 text-xs text-destructive">{patchError}</p>}
        </section>
      }

      sidebar={<>
        <SidebarCard title="Cost">
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold tabular-nums text-primary">{fmt(totalCost)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Items</span>
              <span className="text-sm font-semibold tabular-nums">{items.length}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Received</span>
              <span className="text-sm font-semibold tabular-nums">{totalReceived} / {totalOrdered}</span>
            </div>
          </div>
        </SidebarCard>

        <SidebarCard title="Supplier">
          <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">{purchaseOrder.supplier?.name ?? "—"}</Link>
        </SidebarCard>

        <SidebarCard title="Dates & Logistics">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">Fulfillment</span>
              <select defaultValue={purchaseOrder.fulfillment_type} onChange={(e) => patch({ fulfillment_type: e.target.value })} disabled={saving || isDone} className={fieldClass}>
                <option value="warehouse">Warehouse</option>
                <option value="direct_delivery">Direct delivery</option>
              </select>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">ETA</span>
              <input type="date" defaultValue={purchaseOrder.expected_arrival ?? ""} onChange={(e) => patch({ expected_arrival: e.target.value || undefined })} disabled={saving || isDone} className={fieldClass} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">Shipped</span>
              <span className="text-xs tabular-nums">{purchaseOrder.shipped_date || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">Received</span>
              <span className="text-xs tabular-nums">{purchaseOrder.received_date || "—"}</span>
            </div>
          </div>
        </SidebarCard>

        {purchaseOrder.notes && (
          <SidebarCard title="Notes">
            <p className="text-xs text-foreground whitespace-pre-wrap">{purchaseOrder.notes}</p>
          </SidebarCard>
        )}

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
