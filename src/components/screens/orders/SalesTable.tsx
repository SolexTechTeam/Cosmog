"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import ColumnPicker from "@/components/common/ColumnPicker";
import StatusBadge from "@/components/common/StatusBadge";
import type { SaleOrder } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function SalesTable() {
  const { data, loading, error } = useApi<SaleOrder[]>("/api/sale-orders");
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
      <DataGrid<SaleOrder> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
    </div>
  );
}
