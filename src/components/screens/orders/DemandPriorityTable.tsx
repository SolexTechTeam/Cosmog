"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import { isActiveSaleOrderStatus } from "@/lib/utils";
import type { PurchaseOrder, SaleOrder } from "@/types";
import type { ColDef } from "ag-grid-community";

type PriorityLabel = "High Attention" | "Med Attention" | "Low Attention";

interface DemandPriorityLine {
  id: string;
  sale_order_id: string;
  so_number: string;
  customer_name: string;
  customer_handle: string | null;
  product_name: string;
  product_category: string | null;
  quantity: number;
  order_date: string;
  days_past: number;
  payment_status: SaleOrder["payment_status"];
  base_points: number;
  age_points: number;
  total_points: number;
  priority_label: PriorityLabel;
  items: SaleOrder["items"];
  linked_po_id: string | null;
  linked_purchase_order?: PurchaseOrder;
}

function agePoints(daysPast: number) {
  if (daysPast >= 14) return 3;
  if (daysPast >= 7) return 2;
  if (daysPast >= 4) return 1;
  return 0;
}

function daysPast(orderDate: string) {
  const date = new Date(`${orderDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
}

function basePoints(order: SaleOrder, quantity: number) {
  const orderContext = `${order.business_channel} ${order.source ?? ""}`.toLowerCase();
  if (orderContext.includes("eoi")) return quantity * 0.5;
  if (order.payment_status === "paid" || order.payment_status === "part_paid") return 3;
  if (order.payment_status === "awaiting_payment") return 2;
  return 0;
}

function priorityLabel(points: number): PriorityLabel {
  if (points >= 4) return "High Attention";
  if (points >= 3) return "Med Attention";
  return "Low Attention";
}

function priorityRank(priority: PriorityLabel) {
  return { "High Attention": 3, "Med Attention": 2, "Low Attention": 1 }[priority];
}

function OrderItems({ items }: { items: SaleOrder["items"] }) {
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

function AssociatedPurchaseOrder({ line }: { line: DemandPriorityLine }) {
  const purchaseOrder = line.linked_purchase_order;

  if (!line.linked_po_id) {
    return <p className="text-sm text-muted-foreground">No procurement order assigned</p>;
  }

  if (!purchaseOrder) {
    return (
      <Link
        href={{ pathname: "/orders/procurement", query: { po: line.linked_po_id } }}
        className="break-words text-sm font-medium text-primary hover:underline"
      >
        {line.linked_po_id}
      </Link>
    );
  }

  return (
    <div className="space-y-1 text-sm text-foreground">
      <Link
        href={{ pathname: "/orders/procurement", query: { po: purchaseOrder.id } }}
        className="font-medium text-primary hover:underline"
      >
        {purchaseOrder.po_number}
      </Link>
      <p className="text-muted-foreground">{purchaseOrder.supplier?.name ?? "—"} · {purchaseOrder.status}</p>
    </div>
  );
}

function DemandPriorityExpandedDetails({ line }: { line: DemandPriorityLine }) {
  return (
    <div className="grid gap-4 p-3 text-sm md:grid-cols-[minmax(13rem,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-muted-foreground">Customer</p>
          <p className="font-medium text-foreground">{line.customer_name}</p>
        </div>
        <div>
          <p className="mb-1 text-muted-foreground">Point breakdown</p>
          <p className="text-foreground">{line.base_points.toFixed(1)} base + {line.age_points} age = <span className="font-semibold">{line.total_points.toFixed(1)}</span></p>
        </div>
        <div>
          <p className="mb-1 text-muted-foreground">Associated PO</p>
          <AssociatedPurchaseOrder line={line} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-muted-foreground">Items</p>
        <OrderItems items={line.items} />
      </div>
    </div>
  );
}

function DemandPriorityDetails({ line }: { line: DemandPriorityLine }) {
  return (
    <div className="p-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-muted-foreground">SO #</dt>
          <dd className="mt-1 text-sm text-foreground">{line.so_number}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Priority</dt>
          <dd className="mt-1">{StatusBadge({ status: line.priority_label })}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Customer</dt>
          <dd className="mt-1 text-sm text-foreground">{line.customer_name}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Handle</dt>
          <dd className="mt-1 text-sm text-foreground">{line.customer_handle ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Product</dt>
          <dd className="mt-1 text-sm text-foreground">{line.product_name}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Quantity</dt>
          <dd className="mt-1 text-sm text-foreground">{line.quantity}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Open Date</dt>
          <dd className="mt-1 text-sm text-foreground">{line.order_date}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Days Past</dt>
          <dd className="mt-1 text-sm text-foreground">{line.days_past}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Payment</dt>
          <dd className="mt-1">{StatusBadge({ status: line.payment_status })}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Points</dt>
          <dd className="mt-1 text-sm text-foreground">
            {line.total_points.toFixed(1)} total ({line.base_points.toFixed(1)} base + {line.age_points} age)
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Associated Procurement Order</h3>
        <AssociatedPurchaseOrder line={line} />
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Items</h3>
        <OrderItems items={line.items} />
      </div>
    </div>
  );
}

export default function DemandPriorityTable() {
  const { data, loading, error } = useApi<SaleOrder[]>("/api/sale-orders");
  const { data: purchaseOrders } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const purchaseOrdersById = useMemo(
    () => new Map((purchaseOrders ?? []).map((purchaseOrder) => [purchaseOrder.id, purchaseOrder])),
    [purchaseOrders]
  );

  const lines = useMemo<DemandPriorityLine[]>(() => {
    return (data ?? [])
      .filter((order) => isActiveSaleOrderStatus(order.status))
      .map((order) => {
        const items = order.items ?? [];
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const orderDaysPast = daysPast(order.order_date);
        const orderAgePoints = agePoints(orderDaysPast);
        const orderBasePoints = basePoints(order, totalQuantity);
        const totalPoints = orderBasePoints + orderAgePoints;

        return {
          id: order.id,
          sale_order_id: order.id,
          so_number: order.so_number,
          customer_name: order.customer?.name ?? "—",
          customer_handle: order.customer?.handle ?? null,
          product_name: items.map((item) => item.product?.name ?? "—").join(", ") || "No items",
          product_category: null,
          quantity: totalQuantity,
          order_date: order.order_date,
          days_past: orderDaysPast,
          payment_status: order.payment_status,
          base_points: orderBasePoints,
          age_points: orderAgePoints,
          total_points: totalPoints,
          priority_label: priorityLabel(totalPoints),
          items,
          linked_po_id: order.linked_po_id,
          linked_purchase_order: order.linked_po_id ? purchaseOrdersById.get(order.linked_po_id) : undefined,
        };
      })
      .sort((first, second) =>
        second.total_points - first.total_points ||
        priorityRank(second.priority_label) - priorityRank(first.priority_label) ||
        second.days_past - first.days_past ||
        first.order_date.localeCompare(second.order_date)
      );
  }, [data, purchaseOrdersById]);

  const highCount = lines.filter((line) => line.priority_label === "High Attention").length;
  const medCount = lines.filter((line) => line.priority_label === "Med Attention").length;
  const lowCount = lines.filter((line) => line.priority_label === "Low Attention").length;
  const totalDemand = lines.reduce((sum, line) => sum + line.quantity, 0);

  const filtered = useMemo(() => {
    let rows = lines;
    if (search) {
      const query = search.toLowerCase();
      rows = rows.filter((line) =>
        line.so_number.toLowerCase().includes(query) ||
        line.customer_name.toLowerCase().includes(query) ||
        (line.customer_handle ?? "").toLowerCase().includes(query) ||
        line.product_name.toLowerCase().includes(query)
      );
    }
    if (priorityFilter) rows = rows.filter((line) => line.priority_label === priorityFilter);
    return rows;
  }, [lines, search, priorityFilter]);

  const allColumns: ColDef<DemandPriorityLine>[] = useMemo(
    () => [
      { field: "so_number", headerName: "SO #", minWidth: 130 },
      {
        field: "total_points",
        headerName: "Points",
        minWidth: 90,
        valueFormatter: (params) => (params.value ?? 0).toFixed(1),
        cellClass: "text-right font-semibold",
      },
      {
        field: "priority_label",
        headerName: "Priority",
        minWidth: 150,
        sort: "desc",
        comparator: (first: PriorityLabel, second: PriorityLabel) => priorityRank(first) - priorityRank(second),
        cellRenderer: (params: { value: PriorityLabel }) => StatusBadge({ status: params.value }),
      },
      { field: "order_date", headerName: "Open Date", minWidth: 115 },
      { field: "days_past", headerName: "Days Past", minWidth: 105, cellClass: "text-right" },
      {
        field: "payment_status",
        headerName: "Payment",
        minWidth: 145,
        cellRenderer: (params: { value: string }) => StatusBadge({ status: params.value }),
      },
      { field: "customer_name", headerName: "Customer", minWidth: 180 },
      { field: "product_name", headerName: "Product", minWidth: 180 },
      { field: "quantity", headerName: "Qty", minWidth: 85, cellClass: "text-right" },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(
    allColumns,
    new Set(["customer_name", "product_name", "quantity"])
  );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load open sales orders: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Open Order Priority</h2>
        <MetricCardRow>
          <MetricCard
            label="High Attention"
            value={loading ? "—" : highCount}
            labelClassName="!text-red-600"
            valueClassName="!text-red-600"
          />
          <MetricCard
            label="Med Attention"
            value={loading ? "—" : medCount}
            labelClassName="!text-yellow-500"
            valueClassName="!text-yellow-500"
          />
          <MetricCard
            label="Low Attention"
            value={loading ? "—" : lowCount}
            labelClassName="!text-green-600"
            valueClassName="!text-green-600"
          />
          <MetricCard label="Total Qty Demanded" value={loading ? "—" : totalDemand.toLocaleString()} />
        </MetricCardRow>
      </div>
      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchPlaceholder="Search orders, customers, products..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              key: "priority",
              label: "Priority",
              options: [
                { label: "High Attention", value: "High Attention" },
                { label: "Med Attention", value: "Med Attention" },
                { label: "Low Attention", value: "Low Attention" },
              ],
              value: priorityFilter,
              onChange: setPriorityFilter,
            },
          ]}
          trailing={<ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />}
        />
        <DataGrid<DemandPriorityLine>
          rows={filtered}
          columns={visibleColumns}
          loading={loading}
          pageSize={25}
          detailsTitle="Demand Priority Details"
          showDetailsMenu
          expandOnRowDoubleClick
          expandedRowHeight={360}
          getExpandedDetailsTitle={(line) => `${line.so_number} Details`}
          renderRowDetails={(line) => <DemandPriorityDetails line={line} />}
          renderExpandedRowDetails={(line) => <DemandPriorityExpandedDetails line={line} />}
        />
      </div>
    </div>
  );
}
