"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import ColumnPicker from "@/components/common/ColumnPicker";
import StatusBadge from "@/components/common/StatusBadge";
import { Select } from "@/components/ui/select";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import ErrorBlock from "@/components/ui/error-block";
import OrderScreenLayout from "./OrderScreenLayout";
import CreateSaleOrderDialog from "./CreateSaleOrderDialog";
import SalesOverviewCards from "./SalesOverviewCards";
import SaleOrderExpandedDetails from "./SaleOrderExpandedDetails";
import { useToast } from "@/components/ui/toast";
import { allocationLabel } from "@/lib/utils";
import { canTransitionSaleOrder, getSaleOrderTransitions } from "@/lib/order-status";
import type { Profile, SaleOrder } from "@/types";
import type { ColDef } from "ag-grid-community";

interface SalesTableProps {
  orders?: SaleOrder[] | null;
  loading?: boolean;
  error?: string | null;
  activeOnly?: boolean;
  hiddenColumns?: Set<string>;
  pageSize?: number;
  compact?: boolean;
}

export default function SalesTable({ orders: externalOrders, loading: externalLoading, error: externalError, activeOnly, hiddenColumns, pageSize = 25, compact }: SalesTableProps = {}) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const hasExternal = externalOrders !== undefined;
  const own = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders(), { enabled: !hasExternal });
  const data = hasExternal ? externalOrders : own.data;
  const loading = hasExternal ? (externalLoading ?? false) : own.loading;
  const error = hasExternal ? (externalError ?? null) : own.error;
  const refetch = own.refetch;
  const { data: profiles } = useApi<Profile[]>([...queryKeys.profiles], () => AetherClient.getProfiles(), { enabled: !compact });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [procurementFilter, setProcurementFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"" | "dtc" | "warehouse">("");
  const [monthFilter, setMonthFilter] = useState("");
  const [viewMode, setViewMode] = useState<"total" | "open">("total");
  const [isCreating, setIsCreating] = useState(false);

  const sources = useMemo(() => {
    const set = new Set((data ?? []).map((o) => o.source).filter(Boolean) as string[]);
    return Array.from(set).sort().map((s) => ({ label: s, value: s }));
  }, [data]);
  const ownerOptions = useMemo(() => [
    { label: "Unassigned", value: "__unassigned__" },
    ...(profiles ?? []).filter((p) => p.is_active).map((p) => ({ label: p.name, value: p.id })),
  ], [profiles]);
  const months = useMemo(() => {
    const values = new Set((data ?? []).map((order) => order.order_date?.slice(0, 7)).filter(Boolean) as string[]);
    return Array.from(values).sort().reverse();
  }, [data]);
  const monthFiltered = useMemo(() => {
    const rows = data ?? [];
    return monthFilter ? rows.filter((order) => order.order_date?.startsWith(monthFilter)) : rows;
  }, [data, monthFilter]);
  const filtered = useMemo(() => {
    let rows = monthFiltered;
    if (activeOnly) rows = rows.filter((r) => r.status === "open");
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
    if (orderTypeFilter === "dtc") rows = rows.filter((r) => r.fulfillment_type === "direct_to_customer");
    if (orderTypeFilter === "warehouse") rows = rows.filter((r) => r.fulfillment_type !== "direct_to_customer");
    if (procurementFilter) rows = rows.filter((r) => allocationLabel(r.allocation_status) === procurementFilter);
    if (ownerFilter === "__unassigned__") rows = rows.filter((r) => !r.owner_id);
    else if (ownerFilter) rows = rows.filter((r) => r.owner_id === ownerFilter);
    if (viewMode === "open") rows = rows.filter((r) => r.status === "open");
    return rows;
  }, [monthFiltered, activeOnly, search, statusFilter, paymentFilter, sourceFilter, orderTypeFilter, procurementFilter, ownerFilter, viewMode]);

  const allColumns: ColDef<SaleOrder>[] = useMemo(
    () => [
      {
        field: "so_number",
        headerName: "SO #",
        minWidth: 130,
        cellRenderer: (params: { value: string; data?: SaleOrder }) => params.data ? (
          <Link href={`/orders/sales/${params.data.id}`} className="font-medium text-primary hover:underline">{params.value}</Link>
        ) : params.value,
      },
      {
        headerName: "Owner",
        valueGetter: (p) => p.data?.owner_name ?? "Unassigned",
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
        colId: "procurement",
        headerName: "Procurement",
        minWidth: 140,
        valueGetter: (p) => p.data ? allocationLabel(p.data.allocation_status) : "—",
        cellRenderer: (p: { value: string; data?: SaleOrder }) => {
          if (!p.data || (p.data.status !== "open" && p.data.status !== "shipped")) return "—";
          return StatusBadge({ status: p.value });
        },
      },
      {
        field: "priority",
        headerName: "Priority",
        minWidth: 110,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      { field: "source", headerName: "Source", minWidth: 110 },
      { field: "fulfillment_type", headerName: "Type", minWidth: 120 },
      {
        headerName: "Total",
        minWidth: 110,
        valueGetter: (p) => `$${(p.data?.order_total ?? 0).toFixed(2)}`,
      },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(
    allColumns,
    hiddenColumns ?? new Set(["Customer", "handle", "source"])
  );

  if (error) {
    return <ErrorBlock message={`Failed to load sales orders: ${error}`} onRetry={refetch} />;
  }

  if (compact) {
    return (
      <DataGrid<SaleOrder>
        rows={filtered}
        columns={visibleColumns}
        loading={loading}
        pageSize={pageSize}
        showDetailsMenu
        detailsPageHref={(so) => `/orders/sales/${so.id}`}
        expandOnRowDoubleClick
        expandedRowHeight={210}
        getExpandedDetailsTitle={(so) => `${so.so_number} Details`}
        renderExpandedRowDetails={(so) => <SaleOrderExpandedDetails saleOrder={so} />}
        onSaveSuccess={(so) => toast(`${so.so_number} updated`)}
      />
    );
  }

  return (
    <OrderScreenLayout
      title="Sales Orders"
      subtitle="Manage customer orders and fulfillment"
      overview={<SalesOverviewCards orders={monthFiltered} loading={loading} error={error} />}
      filters={<SearchFilterBar
        searchPlaceholder="Search orders, customers..."
        searchValue={search}
        onSearchChange={setSearch}
        trailing={<>
          <Select aria-label="Filter by month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-8 w-40 shrink-0 rounded-md border-border pl-2.5 text-xs focus:ring-primary/30">
            <option value="">All months</option>
            {months.map((month) => <option key={month} value={month}>{new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</option>)}
          </Select>
          <SegmentedToggle
            ariaLabel="Sales view mode"
            value={viewMode}
            onValueChange={setViewMode}
            options={[{ label: "Total", value: "total" }, { label: "Open", value: "open" }]}
          />
          <button type="button" onClick={() => setIsCreating(true)} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90">Add Sales Order</button>
          <ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />
        </>}
      />}
      table={<DataGrid<SaleOrder>
        rows={filtered}
        columns={visibleColumns}
        loading={loading}
        pageSize={25}
        detailsTitle="SO Details"
        showDetailsMenu
        detailsPageHref={(saleOrder) => `/orders/sales/${saleOrder.id}`}
        expandOnRowDoubleClick
        expandedRowHeight={210}
        getExpandedDetailsTitle={(saleOrder) => `${saleOrder.so_number} Details`}
        renderExpandedRowDetails={(saleOrder) => <SaleOrderExpandedDetails saleOrder={saleOrder} />}
        onSaveSuccess={(so) => toast(`${so.so_number} updated`)}
        editConfig={{
          fields: [
            {
              key: "status",
              label: "Status",
              type: "status",
              options: (order) => [order.status, ...getSaleOrderTransitions(order.status)].map((status) => ({
                label: status.charAt(0).toUpperCase() + status.slice(1),
                value: status,
              })),
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
            {
              key: "fulfillment_type",
              label: "Fulfillment",
              type: "select",
              options: [
                { label: "Shipping", value: "shipping" },
                { label: "Pickup", value: "pickup" },
                { label: "Local Delivery", value: "local_delivery" },
                { label: "Event Pickup", value: "event_pickup" },
                { label: "Hold", value: "hold" },
                { label: "Drop Ship", value: "drop_ship" },
              ],
            },
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
            {
              key: "owner_id",
              label: "Owner",
              type: "select",
              options: [
                { label: "Unassigned", value: "" },
                ...(profiles ?? []).filter((p) => p.is_active).map((p) => ({
                  label: p.name,
                  value: p.id,
                })),
              ],
            },
            { key: "shipping_details", label: "Shipping Details", type: "textarea" },
            { key: "notes", label: "Notes", type: "textarea" },
          ],
          onSave: async (saleOrder, changes) => {
            const { status, ...otherChanges } = changes;
            if (typeof status === "string") {
              if (!canTransitionSaleOrder(saleOrder.status, status)) {
                throw new Error(`Unsupported sales-order transition: ${saleOrder.status} → ${status}`);
              }
              if (status === "completed" && (saleOrder.items ?? []).some((item) => !item.unit_price || item.unit_price <= 0)) {
                throw new Error("All items must have a sale price before completing.");
              }
              const confirmation = status === "shipped"
                ? `Mark SO ${saleOrder.so_number} as shipped? This will allocate and fulfill inventory.`
                : status === "cancelled"
                  ? `Cancel SO ${saleOrder.so_number}? This will release its inventory reservations.`
                  : status === "returned"
                    ? `Return SO ${saleOrder.so_number}? This will reverse fulfillment and return inventory to stock.`
                    : null;
              if (confirmation && !window.confirm(confirmation)) throw new Error("Status change cancelled.");
            }
            if (Object.keys(otherChanges).length) await AetherClient.updateSaleOrder(saleOrder.id, otherChanges);
            if (typeof status === "string") {
              if (status === "shipped") await AetherClient.fulfillSaleOrder(saleOrder.id);
              else if (status === "cancelled") await AetherClient.releaseSaleOrder(saleOrder.id);
              else if (status === "returned") await AetherClient.returnSaleOrder(saleOrder.id);
              else await AetherClient.updateSaleOrder(saleOrder.id, { status });
              if (["shipped", "cancelled", "returned"].includes(status)) {
                await Promise.all([
                  invalidate([...queryKeys.saleOrders], "all"),
                  invalidate([...queryKeys.stockStatus], "all"),
                  invalidate([...queryKeys.inventorySummary], "all"),
                  invalidate([...queryKeys.inventoryLots], "all"),
                  invalidate([...queryKeys.ledger], "all"),
                  invalidate([...queryKeys.demandPriority], "all"),
                  invalidate([...queryKeys.allocationRoot], "all"),
                  invalidate([...queryKeys.inventoryAllocationsRoot], "all"),
                ]);
              } else {
                await invalidate([...queryKeys.saleOrders]);
              }
            }
            refetch();
          },
        }}
        renderRowDetails={(saleOrder) => {
          const total = saleOrder.order_total;

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
                  <dd className="mt-1 text-sm text-foreground">{saleOrder.owner_name ?? "Unassigned"}</dd>
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
                <h3 className="mb-3 text-sm font-semibold text-foreground">Linked Purchase Orders</h3>
                {(saleOrder.po_links ?? []).length ? (
                  <ul className="space-y-1">
                    {(saleOrder.po_links ?? []).map((link) => (
                      <li key={link.purchase_order_id} className="flex flex-wrap items-center gap-1.5 text-sm text-foreground">
                        <Link href={`/orders/procurement/${link.purchase_order_id}`} className="font-medium text-primary hover:underline">
                          {link.purchase_order?.po_number ?? link.purchase_order_id}
                        </Link>
                        {link.purchase_order && <StatusBadge status={link.purchase_order.status} />}
                        {link.purchase_order?.supplier && <span className="text-xs text-muted-foreground">{link.purchase_order.supplier.name}</span>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">No purchase orders linked</p>}
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
                      "owner_id",
                      "status",
                      "payment_status",
                      "priority",
                      "fulfillment_type",
                      "business_channel",
                      "source",
                      "po_links",
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
      />}
      dialog={isCreating ? <CreateSaleOrderDialog onClose={() => setIsCreating(false)} onCreated={() => { refetch(); toast("Sales order created"); }} /> : undefined}
    />
  );
}
