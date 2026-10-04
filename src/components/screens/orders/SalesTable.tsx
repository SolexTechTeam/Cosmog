"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import ColumnPicker from "@/components/common/ColumnPicker";
import StatusBadge from "@/components/common/StatusBadge";
import type { SaleOrder } from "@/types";
import type { ColDef } from "ag-grid-community";

function SaleOrderExpandedDetails({ saleOrder }: { saleOrder: SaleOrder }) {
  return (
    <div className="grid gap-4 p-3 text-sm md:grid-cols-[minmax(12rem,0.75fr)_minmax(0,1.25fr)]">
      <div className="space-y-2 self-center">
        <p className="min-w-0 truncate text-foreground">
          <span className="mr-2 text-muted-foreground">Customer</span>
          {saleOrder.customer?.name ?? "—"}
        </p>
        <p className="min-w-0 truncate text-foreground">
          <span className="mr-2 text-muted-foreground">Assigned PO</span>
          {saleOrder.linked_po_id ?? "—"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(saleOrder.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-foreground">
                    <span>{item.product?.name ?? "—"}</span>
                    {item.product?.category && <span className="ml-2 text-xs text-muted-foreground">{item.product.category}</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-foreground">${(item.quantity * item.unit_price).toFixed(2)}</td>
                </tr>
              ))}
              {(saleOrder.items ?? []).length === 0 && (
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

export default function SalesTable() {
  const { data, loading, error, refetch } = useApi<SaleOrder[]>("/api/sale-orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const sources = useMemo(() => {
    const set = new Set((data ?? []).map((o) => o.source).filter(Boolean) as string[]);
    return Array.from(set).sort().map((s) => ({ label: s, value: s }));
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.so_number.toLowerCase().includes(q) ||
          (r.customer?.name ?? "").toLowerCase().includes(q) ||
          (r.customer?.handle ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (paymentFilter) rows = rows.filter((r) => r.payment_status === paymentFilter);
    if (sourceFilter) rows = rows.filter((r) => r.source === sourceFilter);
    return rows;
  }, [data, search, statusFilter, paymentFilter, sourceFilter]);

  const allColumns: ColDef<SaleOrder>[] = useMemo(
    () => [
      { field: "so_number", headerName: "SO #", minWidth: 130 },
      {
        headerName: "Owner",
        valueGetter: (p) => p.data?.owner?.name ?? "—",
        minWidth: 120,
      },
      {
        headerName: "Customer",
        valueGetter: (p) => p.data?.customer?.name ?? "—",
        minWidth: 160,
      },
      {
        headerName: "Handle",
        valueGetter: (p) => p.data?.customer?.handle ?? "—",
        minWidth: 140,
      },
      { field: "order_date", headerName: "Date", sort: "desc", minWidth: 110 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 120,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        field: "payment_status",
        headerName: "Payment",
        minWidth: 140,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        field: "priority",
        headerName: "Priority",
        minWidth: 110,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      { field: "source", headerName: "Source", minWidth: 110 },
      { field: "fulfillment_type", headerName: "Fulfillment", minWidth: 120 },
      {
        headerName: "Total",
        minWidth: 110,
        valueGetter: (p) => {
          const items = p.data?.items ?? [];
          const itemTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
          return `$${(itemTotal + (p.data?.shipping_cost ?? 0)).toFixed(2)}`;
        },
      },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(
    allColumns, 
    new Set(["so_number", "Customer", "Handle", "source"])
    );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load sales orders: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchFilterBar
        searchPlaceholder="Search orders, customers..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Open", value: "open" },
              { label: "Shipped", value: "shipped" },
              { label: "Completed", value: "completed" },
              { label: "Cancelled", value: "cancelled" },
              { label: "Returned", value: "returned" },
            ],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            key: "payment",
            label: "Payment",
            options: [
              { label: "Not Requested", value: "not_requested" },
              { label: "Awaiting Payment", value: "awaiting_payment" },
              { label: "Part Paid", value: "part_paid" },
              { label: "Paid", value: "paid" },
              { label: "Refunded", value: "refunded" },
            ],
            value: paymentFilter,
            onChange: setPaymentFilter,
          },
          {
            key: "source",
            label: "Source",
            options: sources,
            value: sourceFilter,
            onChange: setSourceFilter,
          },
        ]}
        trailing={<ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />}
      />
      <DataGrid<SaleOrder>
        rows={filtered}
        columns={visibleColumns}
        loading={loading}
        pageSize={25}
        detailsTitle="SO Details"
        showDetailsMenu
        expandOnRowDoubleClick
        expandedRowHeight={210}
        getExpandedDetailsTitle={(saleOrder) => `${saleOrder.so_number} Details`}
        renderExpandedRowDetails={(saleOrder) => <SaleOrderExpandedDetails saleOrder={saleOrder} />}
        editConfig={{
          fields: [
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { label: "Open", value: "open" },
                { label: "Shipped", value: "shipped" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" },
                { label: "Returned", value: "returned" },
              ],
            },
            {
              key: "payment_status",
              label: "Payment Status",
              type: "select",
              options: [
                { label: "Not Requested", value: "not_requested" },
                { label: "Awaiting Payment", value: "awaiting_payment" },
                { label: "Part Paid", value: "part_paid" },
                { label: "Paid", value: "paid" },
                { label: "Refunded", value: "refunded" },
                { label: "Cancelled", value: "cancelled" },
              ],
            },
            { key: "fulfillment_type", label: "Fulfillment", type: "text" },
            { key: "business_channel", label: "Business Channel", type: "text" },
            { key: "source", label: "Source", type: "text" },
            { key: "shipped_date", label: "Shipped Date", type: "date" },
            { key: "delivered_date", label: "Delivered Date", type: "date" },
            { key: "shipping_cost", label: "Shipping Cost", type: "number" },
            { key: "amount_paid", label: "Amount Paid", type: "number" },
            { key: "tracking_reference", label: "Tracking Reference", type: "text" },
            {
              key: "priority",
              label: "Priority",
              type: "select",
              options: [
                { label: "Low", value: "low" },
                { label: "Normal", value: "normal" },
                { label: "High", value: "high" },
                { label: "Urgent", value: "urgent" },
              ],
            },
            { key: "shipping_details", label: "Shipping Details", type: "textarea" },
            { key: "notes", label: "Notes", type: "textarea" },
          ],
          onSave: async (saleOrder, changes) => {
            await api.patch(`/api/sale-orders/${saleOrder.id}`, changes);
            refetch();
          },
        }}
        renderRowDetails={(saleOrder) => {
          const itemTotal = (saleOrder.items ?? []).reduce(
            (total, item) => total + item.quantity * item.unit_price,
            0
          );
          const total = itemTotal + saleOrder.shipping_cost;

          return (
            <div className="space-y-6 p-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">SO #</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.so_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Customer</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.customer?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Handle</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.customer?.handle ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Owner</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.owner?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                  <dd className="mt-1 text-sm capitalize text-foreground">{saleOrder.status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Payment Status</dt>
                  <dd className="mt-1 text-sm capitalize text-foreground">{saleOrder.payment_status.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Priority</dt>
                  <dd className="mt-1 text-sm capitalize text-foreground">{saleOrder.priority}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Fulfillment</dt>
                  <dd className="mt-1 text-sm capitalize text-foreground">{saleOrder.fulfillment_type.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Business Channel</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.business_channel || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Source</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.source ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Order Date</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.order_date}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Shipped Date</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.shipped_date ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Delivered Date</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.delivered_date ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Tracking Reference</dt>
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.tracking_reference ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Shipping Cost</dt>
                  <dd className="mt-1 text-sm text-foreground">${saleOrder.shipping_cost.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Amount Paid</dt>
                  <dd className="mt-1 text-sm text-foreground">${saleOrder.amount_paid.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Order Total</dt>
                  <dd className="mt-1 text-sm text-foreground">${total.toFixed(2)}</dd>
                </div>
                {saleOrder.shipping_details && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Shipping Details</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{saleOrder.shipping_details}</dd>
                  </div>
                )}
                {saleOrder.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{saleOrder.notes}</dd>
                  </div>
                )}
              </dl>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Attached Customer</h3>
                <dl className="rounded-md border border-border">
                  <div className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">Customer</dt>
                    <dd className="min-w-0 break-words text-sm text-foreground">{saleOrder.customer?.name ?? "—"}</dd>
                  </div>
                  <div className="grid gap-1 border-t border-border px-3 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">Handle</dt>
                    <dd className="min-w-0 break-words text-sm text-foreground">{saleOrder.customer?.handle ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Attached Procurement Order</h3>
                <dl className="rounded-md border border-border">
                  <div className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">Purchase Order</dt>
                    <dd className="min-w-0 break-words text-sm text-foreground">
                      {saleOrder.linked_po_id ?? "No procurement order attached"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Items</h3>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                        <th className="px-3 py-2 text-right font-medium">Quantity</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(saleOrder.items ?? []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-foreground">{item.product?.name ?? "—"}</td>
                          <td className="px-3 py-2 text-foreground">{item.product?.category ?? "—"}</td>
                          <td className="px-3 py-2 text-right text-foreground">${item.unit_price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-foreground">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-foreground">${(item.quantity * item.unit_price).toFixed(2)}</td>
                        </tr>
                      ))}
                      {(saleOrder.items ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No items</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Additional Fields</h3>
                <dl className="divide-y divide-border rounded-md border border-border">
                  {Object.entries(saleOrder)
                    .filter(([field]) => ![
                      "so_number",
                      "customer",
                      "owner",
                      "status",
                      "payment_status",
                      "priority",
                      "fulfillment_type",
                      "business_channel",
                      "source",
                      "linked_po_id",
                      "order_date",
                      "shipped_date",
                      "delivered_date",
                      "tracking_reference",
                      "shipping_cost",
                      "amount_paid",
                      "shipping_details",
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
          );
        }}
      />
    </div>
  );
}
