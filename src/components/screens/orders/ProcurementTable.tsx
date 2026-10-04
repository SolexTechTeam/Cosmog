"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import ColumnPicker from "@/components/common/ColumnPicker";
import StatusBadge from "@/components/common/StatusBadge";
import CreatePurchaseOrderDialog from "@/components/screens/orders/CreatePurchaseOrderDialog";
import LinkedSaleOrdersEditor from "@/components/screens/orders/LinkedSaleOrdersEditor";
import type { Product, PurchaseOrder, PurchaseOrderItem, SaleOrder } from "@/types";
import type { ColDef } from "ag-grid-community";

interface PurchaseOrderItemsProps {
  purchaseOrder: PurchaseOrder;
  products: Product[];
  onUpdated: () => void;
}

interface ItemDraft {
  product_id: string;
  quantity_ordered: string;
  unit_cost: string;
}

function PurchaseOrderExpandedDetails({ purchaseOrder }: { purchaseOrder: PurchaseOrder }) {
  return (
    <div className="grid gap-4 p-3 text-sm md:grid-cols-[minmax(12rem,0.75fr)_minmax(0,1.25fr)]">
      <div className="space-y-2 self-center">
        <p className="min-w-0 truncate text-foreground">
          <span className="mr-2 text-muted-foreground">Supplier</span>
          {purchaseOrder.supplier?.name ?? "—"}
        </p>
        <p className="min-w-0 truncate text-foreground">
          <span className="mr-2 text-muted-foreground">Fulfillment</span>
          {purchaseOrder.fulfillment_type.replace(/_/g, " ")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(purchaseOrder.items ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-foreground">
                  <span>{item.product?.name ?? "—"}</span>
                  {item.product?.category && <span className="ml-2 text-xs text-muted-foreground">{item.product.category}</span>}
                </td>
                <td className="px-3 py-2 text-right text-foreground">{item.quantity_ordered}</td>
                <td className="px-3 py-2 text-right text-foreground">${(item.quantity_ordered * item.unit_cost).toFixed(2)}</td>
              </tr>
            ))}
            {(purchaseOrder.items ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchaseOrderItems({ purchaseOrder, products, onUpdated }: PurchaseOrderItemsProps) {
  const [items, setItems] = useState<PurchaseOrderItem[]>(purchaseOrder.items ?? []);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDraft = purchaseOrder.status === "draft";

  function beginEditing(item: PurchaseOrderItem) {
    setEditingItemId(item.id);
    setDraft({
      product_id: item.product_id,
      quantity_ordered: String(item.quantity_ordered),
      unit_cost: String(item.unit_cost),
    });
    setError(null);
  }

  function beginAdding() {
    setIsAdding(true);
    setDraft({ product_id: products[0]?.id ?? "", quantity_ordered: "1", unit_cost: "" });
    setError(null);
  }

  async function saveItem(item: PurchaseOrderItem) {
    if (!draft) return;

    const quantityOrdered = Number(draft.quantity_ordered);
    const unitCost = Number(draft.unit_cost);

    if (!draft.product_id || !Number.isInteger(quantityOrdered) || quantityOrdered < 1 || !Number.isFinite(unitCost) || unitCost < 0) {
      setError("Choose a product, enter a whole quantity of at least 1, and enter a non-negative unit cost.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updatedItem = await api.patch<PurchaseOrderItem>(
        `/api/purchase-orders/${purchaseOrder.id}/items/${item.id}`,
        { product_id: draft.product_id, quantity_ordered: quantityOrdered, unit_cost: unitCost }
      );
      setItems((current) => current.map((currentItem) => currentItem.id === item.id ? updatedItem : currentItem));
      setEditingItemId(null);
      setDraft(null);
      onUpdated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the item.");
    } finally {
      setSaving(false);
    }
  }

  async function addItem() {
    if (!draft) return;

    const quantityOrdered = Number(draft.quantity_ordered);
    const unitCost = Number(draft.unit_cost);

    if (!draft.product_id || !Number.isInteger(quantityOrdered) || quantityOrdered < 1 || !Number.isFinite(unitCost) || unitCost < 0) {
      setError("Choose a product, enter a whole quantity of at least 1, and enter a non-negative unit cost.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const newItem = await api.post<PurchaseOrderItem>(`/api/purchase-orders/${purchaseOrder.id}/items`, {
        product_id: draft.product_id,
        quantity_ordered: quantityOrdered,
        unit_cost: unitCost,
      });
      setItems((current) => [...current, newItem]);
      setIsAdding(false);
      setDraft(null);
      onUpdated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add the item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Items</h3>
        {isDraft ? (
          <button
            type="button"
            onClick={beginAdding}
            disabled={editingItemId !== null || isAdding}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            Add Item
          </button>
        ) : <p className="text-xs text-muted-foreground">Items are locked after a PO leaves draft.</p>}
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
              <th className="px-3 py-2 text-right font-medium">Qty Ordered</th>
              <th className="px-3 py-2 text-right font-medium">Qty Received</th>
              {isDraft && <th className="px-3 py-2 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const isEditing = editingItemId === item.id && draft;
              const selectedProduct = products.find((product) => product.id === draft?.product_id);

              return (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-foreground">
                    {isEditing ? (
                      <select
                        value={draft.product_id}
                        onChange={(event) => setDraft((current) => current ? { ...current, product_id: event.target.value } : current)}
                        className="h-9 min-w-44 rounded-md border border-input bg-background px-2 outline-none focus:ring-2 focus:ring-ring"
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    ) : item.product?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {isEditing ? selectedProduct?.category ?? "—" : item.product?.category ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.unit_cost}
                        onChange={(event) => setDraft((current) => current ? { ...current, unit_cost: event.target.value } : current)}
                        className="h-9 w-24 rounded-md border border-input bg-background px-2 text-right outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : `$${item.unit_cost.toFixed(2)}`}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={draft.quantity_ordered}
                        onChange={(event) => setDraft((current) => current ? { ...current, quantity_ordered: event.target.value } : current)}
                        className="h-9 w-20 rounded-md border border-input bg-background px-2 text-right outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : item.quantity_ordered}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">{item.quantity_received}</td>
                  {isDraft && (
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => saveItem(item)}
                            disabled={saving}
                            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingItemId(null); setDraft(null); setError(null); }}
                            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginEditing(item)}
                          disabled={editingItemId !== null || isAdding}
                          className="rounded-md px-2 py-1 text-xs text-primary hover:bg-accent disabled:opacity-60"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={isDraft ? 6 : 5} className="px-3 py-6 text-center text-muted-foreground">No items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isAdding && draft && (
        <div className="mt-3 grid gap-3 rounded-md border border-border bg-muted p-3 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_auto] sm:items-end">
          <label className="block text-sm font-medium text-foreground">
            Product
            <select
              value={draft.product_id}
              onChange={(event) => setDraft((current) => current ? { ...current, product_id: event.target.value } : current)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 font-normal outline-none focus:ring-2 focus:ring-ring"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} · {product.category}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-foreground">
            Unit Cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.unit_cost}
              onChange={(event) => setDraft((current) => current ? { ...current, unit_cost: event.target.value } : current)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Quantity
            <input
              type="number"
              min="1"
              step="1"
              value={draft.quantity_ordered}
              onChange={(event) => setDraft((current) => current ? { ...current, quantity_ordered: event.target.value } : current)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addItem}
              disabled={saving}
              className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setDraft(null); setError(null); }}
              className="rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-background"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface ProcurementTableProps {
  detailsRowId?: string;
}

export default function ProcurementTable({ detailsRowId }: ProcurementTableProps) {
  const { data, loading, error, refetch } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const { data: products } = useApi<Product[]>("/api/products");
  const { data: saleOrders, refetch: refetchSaleOrders } = useApi<SaleOrder[]>("/api/sale-orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.po_number.toLowerCase().includes(q) ||
          (r.supplier?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (typeFilter) rows = rows.filter((r) => r.fulfillment_type === typeFilter);
    return rows;
  }, [data, search, statusFilter, typeFilter]);

  const allColumns: ColDef<PurchaseOrder>[] = useMemo(
    () => [
      {
        field: "po_number",
        headerName: "PO #",
        minWidth: 130,
        cellRenderer: (params: { value: string; data?: PurchaseOrder }) => params.data ? (
          <Link href={`/orders/procurement/${params.data.id}`} className="font-medium text-primary hover:underline">{params.value}</Link>
        ) : params.value,
      },
      {
        headerName: "Supplier",
        valueGetter: (p) => p.data?.supplier?.name ?? "—",
        minWidth: 180,
      },
      { field: "order_date", headerName: "Order Date", sort: "desc", minWidth: 110 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 120,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      { field: "fulfillment_type", headerName: "Type", minWidth: 130 },
      { field: "shipped_date", headerName: "Shipped", minWidth: 110 },
      { field: "expected_arrival", headerName: "Expected", minWidth: 110 },
      { field: "received_date", headerName: "Received", minWidth: 110 },
      {
        headerName: "Items",
        valueGetter: (p) => (p.data?.items ?? []).length,
        minWidth: 80,
      },
      {
        headerName: "Total Cost",
        minWidth: 120,
        valueGetter: (p) => {
          const total = (p.data?.items ?? []).reduce((s, i) => s + i.quantity_ordered * i.unit_cost, 0);
          return `$${total.toFixed(2)}`;
        },
      },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns,
    new Set(["Supplier", "received_date", "shipped_date", "expected_arrival"])
  );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load purchase orders: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchFilterBar
        searchPlaceholder="Search POs, suppliers..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Draft", value: "draft" },
              { label: "Confirmed", value: "confirmed" },
              { label: "In Transit", value: "in transit" },
              { label: "Received", value: "received" },
              { label: "Cancelled", value: "cancelled" },
            ],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            key: "type",
            label: "Fulfillment",
            options: [
              { label: "Warehouse", value: "warehouse" },
              { label: "Direct Delivery", value: "direct_delivery" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
        trailing={<div className="flex items-center gap-2"><button type="button" onClick={() => setIsCreating(true)} className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">Add Purchase Order</button><ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} /></div>}
      />
      <DataGrid<PurchaseOrder>
        rows={filtered}
        columns={visibleColumns}
        loading={loading}
        pageSize={25}
        detailsTitle="PO Details"
        detailsRowId={detailsRowId}
        showDetailsMenu
        detailsPageHref={(purchaseOrder) => `/orders/procurement/${purchaseOrder.id}`}
        expandOnRowDoubleClick
        expandedRowHeight={210}
        getExpandedDetailsTitle={(purchaseOrder) => `${purchaseOrder.po_number} Details`}
        renderExpandedRowDetails={(purchaseOrder) => <PurchaseOrderExpandedDetails purchaseOrder={purchaseOrder} />}
        editConfig={{
          fields: [
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { label: "Draft", value: "draft" },
                { label: "Confirmed", value: "confirmed" },
                { label: "In Transit", value: "in transit" },
                { label: "Received", value: "received" },
                { label: "Cancelled", value: "cancelled" },
              ],
            },
            {
              key: "fulfillment_type",
              label: "Fulfillment",
              type: "select",
              options: [
                { label: "Warehouse", value: "warehouse" },
                { label: "Direct Delivery", value: "direct_delivery" },
              ],
            },
            { key: "shipped_date", label: "Shipped Date", type: "date" },
            { key: "expected_arrival", label: "Expected Arrival", type: "date" },
            { key: "received_date", label: "Received Date", type: "date" },
            { key: "notes", label: "Notes", type: "textarea" },
          ],
          onSave: async (purchaseOrder, changes) => {
            const { status, ...headerChanges } = changes;
            if (Object.keys(headerChanges).length) {
              await api.patch(`/api/purchase-orders/${purchaseOrder.id}`, headerChanges);
            }
            if (status === "in transit") {
              if (purchaseOrder.status !== "confirmed") throw new Error("A PO can only enter transit after it is confirmed.");
              await api.post("/api/inventory/ship-po", { purchase_order_id: purchaseOrder.id });
            } else if (status === "received") {
              if (purchaseOrder.status !== "in transit") throw new Error("A PO must be in transit before it can be received.");
              await api.post("/api/inventory/receive-po", { purchase_order_id: purchaseOrder.id });
            } else if (status !== undefined) {
              await api.patch(`/api/purchase-orders/${purchaseOrder.id}`, { status });
            }
            refetch();
          },
        }}
        renderRowDetails={(purchaseOrder) => (
          <div className="space-y-6 p-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">PO #</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.po_number}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Supplier</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.supplier?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="mt-1 text-sm capitalize text-foreground">{purchaseOrder.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Fulfillment</dt>
                <dd className="mt-1 text-sm capitalize text-foreground">{purchaseOrder.fulfillment_type.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Order Date</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.order_date}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Expected Arrival</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.expected_arrival ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Shipped Date</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.shipped_date ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Received Date</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.received_date ?? "—"}</dd>
              </div>
              {purchaseOrder.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{purchaseOrder.notes}</dd>
                </div>
              )}
            </dl>

            <PurchaseOrderItems
              key={purchaseOrder.id}
              purchaseOrder={purchaseOrder}
              products={products ?? []}
              onUpdated={refetch}
            />

            <LinkedSaleOrdersEditor
              purchaseOrderId={purchaseOrder.id}
              saleOrders={saleOrders ?? []}
              onUpdated={refetchSaleOrders}
            />

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Additional Fields</h3>
              <dl className="divide-y divide-border rounded-md border border-border">
                {Object.entries(purchaseOrder)
                  .filter(([field]) => ![
                    "po_number",
                    "supplier",
                    "status",
                    "fulfillment_type",
                    "order_date",
                    "shipped_date",
                    "expected_arrival",
                    "received_date",
                    "notes",
                    "items",
                  ].includes(field))
                  .map(([field, value]) => (
                  <div key={field} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {field.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </dt>
                    <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground">
                      {value == null || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                    </dd>
                  </div>
                  ))}
              </dl>
            </div>
          </div>
        )}
      />
      {isCreating && <CreatePurchaseOrderDialog onClose={() => setIsCreating(false)} onCreated={refetch} />}
    </div>
  );
}
