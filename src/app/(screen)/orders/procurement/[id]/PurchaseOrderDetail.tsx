"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { useToast } from "@/components/ui/toast";
import OrderDetailLayout from "@/components/common/orders/OrderDetailLayout";
import OrderStatusWidget from "@/components/common/orders/OrderStatusWidget";
import SidebarCard from "@/components/common/orders/SidebarCard";
import LinkedSaleOrdersEditor from "@/components/common/orders/LinkedSaleOrdersEditor";
import CreateSaleOrderDialog from "@/components/common/orders/CreateSaleOrderDialog";
import AllocationConfirmDialog from "@/components/common/orders/AllocationConfirmDialog";
import PoAllocationTab from "./PoAllocationTab";
import SoAllocationCard from "./SoAllocationCard";
import type { PurchaseOrder, SaleOrder, ConfirmPoResponse, ReceivePoResponse, PoReallocateResponse, PoReallocateShortfallOrder } from "@/types";

interface PurchaseOrderDetailProps {
  purchaseOrderId: string;
}

type Tab = "items" | "allocation" | "details" | "notes";

type DialogData =
  | { type: "po-allocate"; data: PoReallocateResponse }
  | { type: "receive"; result: ReceivePoResponse };

export default function PurchaseOrderDetail({ purchaseOrderId }: PurchaseOrderDetailProps) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const { data: purchaseOrders, loading, error, refetch } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());
  const { data: saleOrders, refetch: refetchSaleOrders } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const purchaseOrder = purchaseOrders?.find((order) => order.id === purchaseOrderId);

  const [activeTab, setActiveTab] = useState<Tab>("items");
  const [saving, setSaving] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [showCreateSo, setShowCreateSo] = useState(false);
  const [dialogData, setDialogData] = useState<DialogData | null>(null);
  const [allocationEdits, setAllocationEdits] = useState<Map<string, Map<string, number>>>(new Map());

  async function patch(changes: Record<string, unknown>) {
    if (!purchaseOrder) return;
    setSaving(true); setPatchError(null);
    try { await AetherClient.updatePurchaseOrder(purchaseOrder.id, changes); toast(`${purchaseOrder.po_number} updated`); refetch(); }
    catch (e) { setPatchError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  }

  function buildProductBudget(): Map<string, number> {
    const budget = new Map<string, number>();
    for (const item of purchaseOrder?.items ?? []) {
      budget.set(item.product_id, (budget.get(item.product_id) ?? 0) + item.quantity_ordered);
    }
    return budget;
  }

  function computeMaxPerItem(targetSoId: string): Map<string, number> {
    if (dialogData?.type !== "po-allocate") return new Map();
    const remaining = buildProductBudget();

    for (const order of dialogData.data.shortfall_orders) {
      if (order.sale_order_id === targetSoId) continue;
      const soEdits = allocationEdits.get(order.sale_order_id);
      if (!soEdits) continue;
      for (const item of order.items) {
        const qty = soEdits.get(item.sale_order_item_id) ?? 0;
        if (qty > 0) {
          const cur = remaining.get(item.product_id) ?? 0;
          remaining.set(item.product_id, Math.max(0, cur - qty));
        }
      }
    }

    const targetOrder = dialogData.data.shortfall_orders.find((o) => o.sale_order_id === targetSoId);
    const maxMap = new Map<string, number>();
    for (const item of targetOrder?.items ?? []) {
      maxMap.set(item.sale_order_item_id, remaining.get(item.product_id) ?? 0);
    }
    return maxMap;
  }

  function handleAllocationChange(soId: string, soItemId: string, value: number) {
    setAllocationEdits((prev) => {
      const next = new Map(prev);
      const items = new Map(next.get(soId) ?? new Map());
      items.set(soItemId, value);
      next.set(soId, items);
      return next;
    });
  }

  function autoFillAllocations() {
    if (dialogData?.type !== "po-allocate") return;
    const remaining = buildProductBudget();
    const result = new Map<string, Map<string, number>>();

    for (const order of dialogData.data.shortfall_orders) {
      const items = new Map<string, number>();
      for (const item of order.items) {
        const available = remaining.get(item.product_id) ?? 0;
        const toAllocate = Math.min(item.qty_shortfall, available);
        items.set(item.sale_order_item_id, toAllocate);
        remaining.set(item.product_id, available - toAllocate);
      }
      result.set(order.sale_order_id, items);
    }
    setAllocationEdits(result);
  }

  async function handleSubmitAllocations() {
    if (!purchaseOrder || dialogData?.type !== "po-allocate") return;
    const shortfallOrders = dialogData.data.shortfall_orders;
    setDialogData(null);

    for (const order of shortfallOrders) {
      const edits = allocationEdits.get(order.sale_order_id);
      const hasAllocation = edits && Array.from(edits.values()).some((v) => v > 0);
      if (!hasAllocation) continue;
      try {
        await AetherClient.allocateInventory({ sale_order_id: order.sale_order_id, mode: "auto" });
      } catch { /* non-blocking */ }
    }

    invalidate([...queryKeys.saleOrders]);
    invalidate([...queryKeys.purchaseOrders]);
    toast("Allocation complete");
    setAllocationEdits(new Map());
    refetch();
  }

  async function handleSkipAllocation() {
    setDialogData(null);
    setAllocationEdits(new Map());
    invalidate([...queryKeys.purchaseOrders]);
    refetch();
  }

  async function doReceive() {
    if (!purchaseOrder) return;
    const result = await AetherClient.receivePurchaseOrder(purchaseOrder.id);
    const reallocated = result.reallocations?.filter(r => !r.error).length ?? 0;
    toast(`PO received — ${result.lots_received} lots on-hand${reallocated > 0 ? `, ${reallocated} orders re-allocated` : ""}`);
    invalidate([...queryKeys.saleOrders]);
    invalidate([...queryKeys.purchaseOrders]);
    if (result.reallocations?.length) {
      setDialogData({ type: "receive", result });
    } else {
      refetch();
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading purchase order...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load purchase order: {error}</p>;
  if (!purchaseOrder) return <p className="text-sm text-muted-foreground">Purchase order not found.</p>;

  const items = purchaseOrder.items ?? [];
  const totalCost = purchaseOrder.order_total;
  const totalReceived = items.reduce((total, item) => total + item.quantity_received, 0);
  const totalOrdered = items.reduce((total, item) => total + item.quantity_ordered, 0);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "items", label: `Items (${items.length})` },
    { key: "allocation", label: "Allocation" },
    { key: "details", label: "Details" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <>
    <OrderDetailLayout
      backHref="/orders/procurement"
      backLabel="Purchase Orders"
      orderNumber={purchaseOrder.po_number}
      subtitle={<>
        <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="text-primary hover:underline">{purchaseOrder.supplier?.name ?? "Unknown"}</Link>
        <span className="text-muted-foreground/40"> · </span>{purchaseOrder.order_date}
        <span className="text-muted-foreground/40"> · </span>{purchaseOrder.fulfillment_type.replace(/_/g, " ")}
      </>}
      statusWidget={
        <OrderStatusWidget
          status={purchaseOrder.status}
          isComplete={purchaseOrder.status === "received"}
          completionLabel="received and complete"
          skipConfirm
          options={[
            { label: "Draft", value: "draft" }, { label: "Confirmed", value: "confirmed" },
            { label: "In transit", value: "in transit" }, { label: "Received", value: "received" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          onUpdate={async (status) => {
            const current = purchaseOrder.status;

            if (status === "confirmed" && current === "draft") {
              // draft → confirmed: create lots, then show allocation preview
              const result = await AetherClient.confirmPurchaseOrder(purchaseOrder.id);
              toast(`PO confirmed — ${result.lots_created} lots created`);
              const reallocateResult = await AetherClient.poReallocateResources(purchaseOrder.id);
              const edits = new Map<string, Map<string, number>>();
              for (const order of reallocateResult.shortfall_orders) {
                const items = new Map<string, number>();
                for (const item of order.items) {
                  items.set(item.sale_order_item_id, 0);
                }
                edits.set(order.sale_order_id, items);
              }
              setAllocationEdits(edits);
              setDialogData({ type: "po-allocate", data: reallocateResult });
            } else if (status === "in transit") {
              // confirmed → in transit: just a status update
              await AetherClient.updatePurchaseOrder(purchaseOrder.id, { status });
              toast(`${purchaseOrder.po_number} → in transit`);
              invalidate([...queryKeys.purchaseOrders]);
              refetch();
            } else if (status === "received") {
              // in transit → received: receive PO, show results
              await doReceive();
            } else {
              await AetherClient.updatePurchaseOrder(purchaseOrder.id, { status });
              toast(`${purchaseOrder.po_number} → ${status}`);
              invalidate([...queryKeys.saleOrders]);
              refetch();
            }
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
                  : "border-transparent text-muted-foreground/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "items" && (
          <section className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[300px]">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
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
                        {item.product?.category && <span className="ml-2 text-xs text-muted-foreground/60">{item.product.category}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity_ordered}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity_received}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">${item.unit_cost.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">${(item.quantity_ordered * item.unit_cost).toFixed(2)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground/60">No items</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-auto border-t border-border bg-muted/30 px-4 py-2">
              <dl className="ml-auto w-56 space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Subtotal</dt><dd className="tabular-nums font-medium">${totalCost.toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">GST</dt><dd className="tabular-nums">$0.00</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Tax</dt><dd className="tabular-nums">$0.00</dd></div>
                <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                  <dt className="text-xs font-bold text-foreground">Total</dt>
                  <dd className="tabular-nums text-base font-bold text-primary">${totalCost.toFixed(2)}</dd>
                </div>
              </dl>
            </div>
            {patchError && <p className="px-4 py-2 text-xs text-destructive">{patchError}</p>}
          </section>
        )}

        {activeTab === "allocation" && (
          <PoAllocationTab purchaseOrderId={purchaseOrderId} />
        )}

        {activeTab === "details" && (
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Supplier</p><p className="text-sm font-medium">{purchaseOrder.supplier?.name ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Fulfillment</p><p className="text-sm font-medium capitalize">{purchaseOrder.fulfillment_type.replace(/_/g, " ")}</p></div>
              <div><p className="text-xs text-muted-foreground">Order Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.order_date}</p></div>
              <div><p className="text-xs text-muted-foreground">Expected Arrival</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.expected_arrival || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Shipped Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.shipped_date || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Received Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.received_date || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-sm font-bold tabular-nums text-primary">{fmt(totalCost)}</p></div>
              <div><p className="text-xs text-muted-foreground">Items Ordered</p><p className="text-sm font-medium tabular-nums">{totalOrdered}</p></div>
              <div><p className="text-xs text-muted-foreground">Items Received</p><p className="text-sm font-medium tabular-nums">{totalReceived} / {totalOrdered}</p></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.created_at?.slice(0, 10)}</p></div>
              <div><p className="text-xs text-muted-foreground">Updated</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.updated_at?.slice(0, 10)}</p></div>
            </div>
          </section>
        )}

        {activeTab === "notes" && (
          <section className="rounded-lg border border-border bg-card p-4">
            {purchaseOrder.notes ? (
              <p className="text-sm whitespace-pre-wrap">{purchaseOrder.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground/60">No notes on this order.</p>
            )}
          </section>
        )}
      </>}

      sidebar={<>
        <SidebarCard title="Cost">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between items-baseline"><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-bold tabular-nums text-primary">{fmt(totalCost)}</dd></div>
            <div className="flex justify-between items-baseline"><dt className="text-xs text-muted-foreground">Items</dt><dd className="font-semibold tabular-nums">{items.length}</dd></div>
            <div className="flex justify-between items-baseline"><dt className="text-xs text-muted-foreground">Received</dt><dd className="font-semibold tabular-nums">{totalReceived} / {totalOrdered}</dd></div>
          </dl>
        </SidebarCard>

        <SidebarCard title="Supplier">
          <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="block rounded-md -mx-1 px-1 py-0.5 hover:bg-background transition-colors">
            <span className="text-sm font-semibold text-foreground">{purchaseOrder.supplier?.name ?? "—"}</span>
          </Link>
        </SidebarCard>

        <SidebarCard title="Details">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Fulfillment</dt><dd className="capitalize font-medium">{purchaseOrder.fulfillment_type.replace(/_/g, " ")}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">ETA</dt><dd className="tabular-nums">{purchaseOrder.expected_arrival || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Shipped</dt><dd className="tabular-nums">{purchaseOrder.shipped_date || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Received</dt><dd className="tabular-nums">{purchaseOrder.received_date || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Created By</dt><dd>{purchaseOrder.created_by_profile?.name ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Created</dt><dd className="tabular-nums">{purchaseOrder.created_at?.slice(0, 10)}</dd></div>
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

    {dialogData?.type === "po-allocate" && (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
        <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Allocation Preview</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Review allocations before confirming. Edit quantities if needed.</p>
          </div>

          <div className="border-b border-border px-5 py-2 bg-muted/30">
            <div className="flex flex-wrap gap-4">
              {Array.from(buildProductBudget()).map(([productId, budget]) => {
                let used = 0;
                for (const order of dialogData.data.shortfall_orders) {
                  const soEdits = allocationEdits.get(order.sale_order_id);
                  if (!soEdits) continue;
                  for (const item of order.items) {
                    if (item.product_id === productId) used += soEdits.get(item.sale_order_item_id) ?? 0;
                  }
                }
                const productName = dialogData.data.shortfall_orders.flatMap((o) => o.items).find((i) => i.product_id === productId)?.product_name
                  ?? (purchaseOrder?.items ?? []).find((i) => i.product_id === productId)?.product?.name ?? productId.slice(0, 8);
                return (
                  <div key={productId} className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">{productName}:</span>
                    <span className={`font-semibold tabular-nums ${used > budget ? "text-destructive" : used === budget ? "text-primary" : ""}`}>{used}</span>
                    <span className="text-muted-foreground/60">/</span>
                    <span className="tabular-nums">{budget}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-5 py-3 space-y-3">
            {dialogData.data.shortfall_orders.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No orders with shortfalls for this PO's products.</p>
            ) : (
              dialogData.data.shortfall_orders.map((order) => (
                <SoAllocationCard
                  key={order.sale_order_id}
                  soNumber={order.so_number}
                  soStatus={order.so_status}
                  customerName={order.customer_name}
                  items={order.items}
                  allocations={allocationEdits.get(order.sale_order_id) ?? new Map()}
                  onAllocationChange={(soItemId, value) => handleAllocationChange(order.sale_order_id, soItemId, value)}
                  maxPerItem={computeMaxPerItem(order.sale_order_id)}
                />
              ))
            )}
          </div>

          <div className="flex justify-between border-t border-border px-5 py-3">
            <button type="button" onClick={handleSkipAllocation} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Skip Allocation
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={autoFillAllocations} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                Auto-fill
              </button>
              <button type="button" onClick={handleSubmitAllocations} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                Accept &amp; Allocate
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {dialogData?.type === "receive" && (
      <AllocationConfirmDialog
        title="Re-allocation Results"
        description="Stock was automatically re-allocated to these orders."
        suggestions={dialogData.result.reallocations}
        mode="review"
        onClose={() => { setDialogData(null); refetch(); }}
      />
    )}
    </>
  );
}
