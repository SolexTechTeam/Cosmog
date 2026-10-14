"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { useToast } from "@/components/ui/toast";
import { Tabs } from "@/components/ui/tabs";
import OrderDetailLayout from "@/components/common/orders/OrderDetailLayout";
import OrderStatusWidget from "@/components/common/orders/OrderStatusWidget";
import SidebarCard from "@/components/common/orders/SidebarCard";
import PaginatedTable from "@/components/common/PaginatedTable";
import LinkedSaleOrdersEditor from "@/components/common/orders/LinkedSaleOrdersEditor";
import CreateSaleOrderDialog from "@/components/common/orders/CreateSaleOrderDialog";
import ReceiveResultsDialog from "./ReceiveResultsDialog";
import StatusBadge from "@/components/common/StatusBadge";
import PoAllocationTab from "./PoAllocationTab";
import SoAllocationCard from "./SoAllocationCard";
import type { PurchaseOrder, SaleOrder, ReceivePoResponse, PoAllocationPreviewResponse } from "@/types";

interface PurchaseOrderDetailProps {
  purchaseOrderId: string;
}

type Tab = "items" | "allocation" | "details" | "notes";

type DialogData =
  | { type: "po-allocate"; data: PoAllocationPreviewResponse }
  | { type: "receive"; result: ReceivePoResponse };

export default function PurchaseOrderDetail({ purchaseOrderId }: PurchaseOrderDetailProps) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const { data: purchaseOrders, loading, error, refetch } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());
  const { data: saleOrders, refetch: refetchSaleOrders } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const purchaseOrder = purchaseOrders?.find((order) => order.id === purchaseOrderId);

  const [activeTab, setActiveTab] = useState<Tab>("items");
  const [showCreateSo, setShowCreateSo] = useState(false);
  const [dialogData, setDialogData] = useState<DialogData | null>(null);
  const [allocationEdits, setAllocationEdits] = useState<Map<string, Map<string, number>>>(new Map());
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [allocating, setAllocating] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({
    fulfillmentType: "warehouse", expectedArrival: "", trackingReference: "", shippingCost: "0", taxAmount: "0", shippingDetails: "", notes: "",
  });

  function buildProductBudget(): Map<string, number> {
    if (dialogData?.type === "po-allocate") {
      const budget = new Map<string, number>();
      for (const b of dialogData.data.product_budget) {
        budget.set(b.product_id, b.total);
      }
      return budget;
    }
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
    setAllocationError(null);
    setAllocationEdits((prev) => {
      const next = new Map(prev);
      const items = new Map(next.get(soId) ?? new Map());
      items.set(soItemId, value);
      next.set(soId, items);
      return next;
    });
  }

  function initEditsFromSuggestions(data: PoAllocationPreviewResponse) {
    const edits = new Map<string, Map<string, number>>();
    for (const order of data.shortfall_orders) {
      const items = new Map<string, number>();
      for (const item of order.items) {
        items.set(item.sale_order_item_id, item.suggested_quantity);
      }
      edits.set(order.sale_order_id, items);
    }
    return edits;
  }

  function resetToSuggested() {
    if (dialogData?.type !== "po-allocate") return;
    setAllocationEdits(initEditsFromSuggestions(dialogData.data));
  }

  async function handleSubmitAllocations() {
    if (!purchaseOrder || dialogData?.type !== "po-allocate") return;
    const accepted: { sale_order_id: string; sale_order_item_id: string; quantity: number }[] = [];
    const remainingByProduct = new Map(dialogData.data.product_budget.map((budget) => [budget.product_id, budget.total]));
    for (const order of dialogData.data.shortfall_orders) {
      for (const item of order.items) {
        const quantity = allocationEdits.get(order.sale_order_id)?.get(item.sale_order_item_id) ?? item.suggested_quantity;
        const remaining = remainingByProduct.get(item.product_id) ?? 0;
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > item.qty_shortfall || quantity > remaining) {
          setAllocationError(`Invalid allocation for ${item.product_name}. Check the quantity against its shortfall and PO budget.`);
          return;
        }
        remainingByProduct.set(item.product_id, remaining - quantity);
        accepted.push({ sale_order_id: order.sale_order_id, sale_order_item_id: item.sale_order_item_id, quantity });
      }
    }

    setAllocating(true);
    setAllocationError(null);
    try {
      await AetherClient.applyPoAllocation(purchaseOrder.id, { allocations: accepted });
      await Promise.all([
        invalidate([...queryKeys.saleOrders]),
        invalidate([...queryKeys.purchaseOrders]),
        invalidate([...queryKeys.stockStatus]),
        invalidate([...queryKeys.inventorySummary]),
        invalidate([...queryKeys.inventoryLots]),
        invalidate([...queryKeys.ledger]),
        invalidate([...queryKeys.demandPriority]),
        invalidate([...queryKeys.allocationRoot]),
        invalidate([...queryKeys.inventoryAllocationsRoot]),
      ]);
      toast("Allocation complete");
      setDialogData(null);
      setAllocationEdits(new Map());
      refetch();
    } catch (error) {
      setAllocationError(error instanceof Error ? error.message : "Allocation failed. Review the quantities and try again.");
    } finally {
      setAllocating(false);
    }
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
    const succeeded = result.reallocations?.filter((row) => !row.error).length ?? 0;
    const failed = result.reallocations?.filter((row) => row.error).length ?? 0;
    toast(`PO received — ${result.lots_received} lots on-hand${succeeded > 0 ? `, ${succeeded} orders checked` : ""}${failed > 0 ? `, ${failed} allocation${failed === 1 ? "" : "s"} failed` : ""}`);
    await Promise.all([
      invalidate([...queryKeys.saleOrders], "all"),
      invalidate([...queryKeys.purchaseOrders], "all"),
      invalidate([...queryKeys.stockStatus], "all"),
      invalidate([...queryKeys.inventorySummary], "all"),
      invalidate([...queryKeys.inventoryLots], "all"),
      invalidate([...queryKeys.ledger], "all"),
      invalidate([...queryKeys.demandPriority], "all"),
      invalidate([...queryKeys.allocationRoot], "all"),
      invalidate([...queryKeys.inventoryAllocationsRoot], "all"),
    ]);
    if (result.reallocations?.length) {
      setDialogData({ type: "receive", result });
    } else {
      refetch();
    }
  }

  function startEditingDetails() {
    if (!purchaseOrder) return;
    setDetailsDraft({
      fulfillmentType: purchaseOrder.fulfillment_type,
      expectedArrival: purchaseOrder.expected_arrival ?? "",
      trackingReference: purchaseOrder.tracking_reference ?? "",
      shippingCost: String(purchaseOrder.shipping_cost ?? 0),
      taxAmount: String(purchaseOrder.tax_amount ?? 0),
      shippingDetails: purchaseOrder.shipping_details ?? "",
      notes: purchaseOrder.notes ?? "",
    });
    setEditingDetails(true);
  }

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!purchaseOrder) return;
    const shippingCost = Number(detailsDraft.shippingCost);
    const taxAmount = Number(detailsDraft.taxAmount);
    if (!Number.isFinite(shippingCost) || shippingCost < 0 || !Number.isFinite(taxAmount) || taxAmount < 0) return;

    setSavingDetails(true);
    try {
      await AetherClient.updatePurchaseOrder(purchaseOrder.id, {
        fulfillment_type: detailsDraft.fulfillmentType,
        ...(detailsDraft.expectedArrival ? { expected_arrival: detailsDraft.expectedArrival } : {}),
        tracking_reference: detailsDraft.trackingReference.trim(),
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        shipping_details: detailsDraft.shippingDetails.trim(),
        notes: detailsDraft.notes.trim(),
      });
      setEditingDetails(false);
      toast(`${purchaseOrder.po_number} details updated`);
      invalidate([...queryKeys.purchaseOrders]);
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update purchase order", "error");
    } finally {
      setSavingDetails(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading purchase order...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load purchase order: {error}</p>;
  if (!purchaseOrder) return <p className="text-sm text-muted-foreground">Purchase order not found.</p>;

  const items = purchaseOrder.items ?? [];
  const hasForeignSourceCost = items.some((item) => (item.source_currency ?? "AUD") !== "AUD");
  const totalCost = purchaseOrder.order_total;
  const itemSubtotal = items.reduce((total, item) => total + item.quantity_ordered * (item.landed_unit_cost ?? item.unit_cost), 0);
  const totalReceived = items.reduce((total, item) => total + item.quantity_received, 0);
  const totalOrdered = items.reduce((total, item) => total + item.quantity_ordered, 0);

  const safeAmount = (value: number | null | undefined) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  };
  const fmt = (value: number | null | undefined) => `$${safeAmount(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fixed = (value: number | null | undefined, digits = 2) => safeAmount(value).toFixed(digits);

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
              const previewResult = await AetherClient.previewPoAllocation(purchaseOrder.id);
              setAllocationError(null);
              setAllocationEdits(initEditsFromSuggestions(previewResult));
              setDialogData({ type: "po-allocate", data: previewResult });
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
        <Tabs
          activeKey={activeTab}
          extra={activeTab === "details" && !editingDetails ? (
            <button type="button" onClick={startEditingDetails} className="text-xs font-medium text-primary hover:underline">Edit details</button>
          ) : undefined}
          items={tabs}
          onChange={setActiveTab}
        />

        {activeTab === "items" && (
          <section className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[300px]">
            <div className="flex-1 overflow-x-auto">
              <PaginatedTable className="border-0 rounded-none"><table className={`w-full ${hasForeignSourceCost ? "min-w-[680px]" : "min-w-[520px]"} text-left text-sm`}>
                <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 text-right font-medium">Ordered</th>
                    <th className="px-4 py-2 text-right font-medium">Received</th>
                    {hasForeignSourceCost && <th className="px-4 py-2 text-right font-medium">Source Cost</th>}
                    <th className="px-4 py-2 text-right font-medium">Unit Cost (AUD)</th>
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
                      {hasForeignSourceCost && <td className="px-4 py-2.5 text-right tabular-nums">
                        <div>{item.source_currency ?? "AUD"} ${fixed(item.source_unit_cost ?? item.unit_cost)}</div>
                        {(item.source_currency ?? "AUD") !== "AUD" && item.fx_rate && <div className="text-xs text-muted-foreground">Rate {fixed(item.fx_rate, 6)}</div>}
                      </td>}
                      <td className="px-4 py-2.5 text-right tabular-nums">AUD ${fixed(item.landed_unit_cost ?? item.unit_cost)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">${fixed(item.quantity_ordered * (item.landed_unit_cost ?? item.unit_cost))}</td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={hasForeignSourceCost ? 6 : 5} className="px-4 py-6 text-center text-muted-foreground/60">No items</td></tr>}
                </tbody>
              </table></PaginatedTable>
            </div>
            <div className="mt-auto border-t border-border bg-muted/30 px-4 py-2">
              <dl className="ml-auto w-56 space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Items subtotal</dt><dd className="tabular-nums font-medium">${fixed(itemSubtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Tax</dt><dd className="tabular-nums">${fixed(purchaseOrder.tax_amount)}</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Freight</dt><dd className="tabular-nums">${fixed(purchaseOrder.shipping_cost)}</dd></div>
                <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                  <dt className="text-xs font-bold text-foreground">Total</dt>
                  <dd className="tabular-nums text-base font-bold text-primary">${fixed(totalCost)}</dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {activeTab === "allocation" && (
          <PoAllocationTab purchaseOrderId={purchaseOrderId} />
        )}

        {activeTab === "details" && (
          editingDetails ? (
            <form onSubmit={saveDetails} className="rounded-lg border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Fulfillment
                  <select value={detailsDraft.fulfillmentType} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, fulfillmentType: event.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-ring">
                    <option value="warehouse">Warehouse</option>
                    <option value="direct_delivery">Direct delivery</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Expected arrival
                  <input type="date" value={detailsDraft.expectedArrival} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, expectedArrival: event.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Tracking reference
                  <input value={detailsDraft.trackingReference} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, trackingReference: event.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Freight cost
                  <input type="number" min="0" step="0.01" value={detailsDraft.shippingCost} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, shippingCost: event.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Tax
                  <input type="number" min="0" step="0.01" value={detailsDraft.taxAmount} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, taxAmount: event.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">Shipping details
                  <textarea rows={3} value={detailsDraft.shippingDetails} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, shippingDetails: event.target.value }))} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">Notes
                  <textarea rows={3} value={detailsDraft.notes} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, notes: event.target.value }))} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm font-normal text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </label>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button type="submit" disabled={savingDetails} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{savingDetails ? "Saving…" : "Save changes"}</button>
                <button type="button" onClick={() => setEditingDetails(false)} disabled={savingDetails} className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</button>
              </div>
            </form>
          ) : (
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Supplier</p><p className="text-sm font-medium">{purchaseOrder.supplier?.name ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Fulfillment</p><p className="text-sm font-medium capitalize">{purchaseOrder.fulfillment_type.replace(/_/g, " ")}</p></div>
              <div><p className="text-xs text-muted-foreground">Order Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.order_date}</p></div>
              <div><p className="text-xs text-muted-foreground">Expected Arrival</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.expected_arrival || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Shipped Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.shipped_date || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Received Date</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.received_date || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Tracking Reference</p><p className="text-sm font-medium">{purchaseOrder.tracking_reference || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Freight Cost</p><p className="text-sm font-medium tabular-nums">{fmt(purchaseOrder.shipping_cost)}</p></div>
              <div><p className="text-xs text-muted-foreground">Tax</p><p className="text-sm font-medium tabular-nums">{fmt(purchaseOrder.tax_amount)}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-sm font-bold tabular-nums text-primary">{fmt(totalCost)}</p></div>
              <div><p className="text-xs text-muted-foreground">Items Ordered</p><p className="text-sm font-medium tabular-nums">{totalOrdered}</p></div>
              <div><p className="text-xs text-muted-foreground">Items Received</p><p className="text-sm font-medium tabular-nums">{totalReceived} / {totalOrdered}</p></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.created_at?.slice(0, 10)}</p></div>
              <div><p className="text-xs text-muted-foreground">Updated</p><p className="text-sm font-medium tabular-nums">{purchaseOrder.updated_at?.slice(0, 10)}</p></div>
            </div>
          </section>
          )
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
              {dialogData.data.product_budget.map((b) => {
                let used = 0;
                for (const order of dialogData.data.shortfall_orders) {
                  const soEdits = allocationEdits.get(order.sale_order_id);
                  if (!soEdits) continue;
                  for (const item of order.items) {
                    if (item.product_id === b.product_id) used += soEdits.get(item.sale_order_item_id) ?? 0;
                  }
                }
                return (
                  <div key={b.product_id} className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">{b.product_name}:</span>
                    <span className={`font-semibold tabular-nums ${used > b.total ? "text-destructive" : used === b.total ? "text-primary" : ""}`}>{used}</span>
                    <span className="text-muted-foreground/60">/</span>
                    <span className="tabular-nums">{b.total}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-[60vh] overflow-y-auto px-5 py-3 space-y-3">
            {dialogData.data.current_orders.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Allocations</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                {dialogData.data.current_orders.map((order) => (
                  <div key={order.sale_order_id} className="rounded-lg border border-border overflow-hidden opacity-75">
                    <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
                      <span className="text-xs font-semibold text-primary">{order.so_number}</span>
                      <StatusBadge status={order.so_status} />
                      {order.customer_name && <span className="text-xs text-muted-foreground">{order.customer_name}</span>}
                    </div>
                    <PaginatedTable className="border-0 rounded-none"><table className="w-full text-left text-sm">
                      <thead className="border-b border-border text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-medium">Product</th>
                          <th className="px-4 py-2 text-right font-medium">Ordered</th>
                          <th className="px-4 py-2 text-right font-medium">Allocated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {order.items.map((item) => (
                          <tr key={item.product_id}>
                            <td className="px-4 py-2 font-medium">{item.product_name}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{item.quantity_ordered}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-medium">{item.quantity_allocated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></PaginatedTable>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shortfall Orders</span>
                  <div className="flex-1 border-t border-border" />
                </div>
              </>
            )}

            {dialogData.data.shortfall_orders.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No orders with shortfalls for this PO&apos;s products.</p>
            ) : (
              dialogData.data.shortfall_orders.map((order) => (
                <SoAllocationCard
                  key={order.sale_order_id}
                  soNumber={order.so_number}
                  soStatus={order.so_status}
                  customerName={order.customer_name}
                  priorityPoints={order.priority_points}
                  items={order.items}
                  allocations={allocationEdits.get(order.sale_order_id) ?? new Map()}
                  onAllocationChange={(soItemId, value) => handleAllocationChange(order.sale_order_id, soItemId, value)}
                  maxPerItem={computeMaxPerItem(order.sale_order_id)}
                />
              ))
            )}
          </div>

          <div className="flex justify-between border-t border-border px-5 py-3">
            <button type="button" disabled={allocating} onClick={handleSkipAllocation} className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
              Skip Allocation
            </button>
            <div className="flex gap-2">
              <button type="button" disabled={allocating} onClick={resetToSuggested} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                Reset to Suggested
              </button>
              <button type="button" disabled={allocating} onClick={handleSubmitAllocations} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {allocating ? "Allocating…" : "Accept & Allocate"}
              </button>
            </div>
          </div>
          {allocationError && <p role="alert" className="border-t border-border px-5 py-2 text-xs text-destructive">{allocationError}</p>}
        </div>
      </div>
    )}
    {dialogData?.type === "receive" && (
      <ReceiveResultsDialog
        result={dialogData.result}
        saleOrders={saleOrders ?? []}
        onClose={() => { setDialogData(null); refetch(); }}
      />
    )}
    </>
  );
}
