"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import type { PurchaseOrder } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function ProcurementTable() {
  const { data, loading, error } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

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

  const columns: ColDef<PurchaseOrder>[] = useMemo(
    () => [
      { field: "po_number", headerName: "PO #", minWidth: 130 },
      {
        headerName: "Supplier",
        valueGetter: (p) => p.data?.supplier?.name ?? "—",
        minWidth: 180,
      },
      { field: "order_date", headerName: "Order Date", minWidth: 110 },
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
      />
      <DataGrid<PurchaseOrder> rows={filtered} columns={columns} loading={loading} pageSize={25} />
    </div>
  );
}
