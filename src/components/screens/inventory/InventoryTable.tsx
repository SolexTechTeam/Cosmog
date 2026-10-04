"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import ColumnPicker from "@/components/common/ColumnPicker";
import StatusBadge from "@/components/common/StatusBadge";
import type { StockStatus } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function InventoryTable() {
  const { data, loading, error } = useApi<StockStatus[]>("/api/inventory/stock-status");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const categories = useMemo(() => {
    const set = new Set((data ?? []).map((i) => i.category));
    return Array.from(set).sort().map((c) => ({ label: c, value: c }));
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
    }
    if (categoryFilter) rows = rows.filter((r) => r.category === categoryFilter);
    if (statusFilter) rows = rows.filter((r) => r.stock_status === statusFilter);
    return rows;
  }, [data, search, categoryFilter, statusFilter]);

  const allColumns: ColDef<StockStatus>[] = useMemo(
    () => [
      { field: "name", headerName: "Product", minWidth: 280 },
      { field: "category", headerName: "Category", minWidth: 180 },
      {
        field: "stock_status",
        headerName: "Status",
        minWidth: 120,
        sort: "asc",
        cellClass: "overflow-hidden text-ellipsis whitespace-nowrap",
        comparator: (a: string, b: string) => {
          const order: Record<string, number> = { "In Stock": 0, "Low Stock": 1, "Incoming": 2, "Out of Stock": 3 };
          return (order[a] ?? 99) - (order[b] ?? 99);
        },
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      { field: "qty_on_hand", headerName: "On-Hand", minWidth: 150, cellClass: "text-center text-[15px] font-semibold", headerClass: "ag-center-header" },
      { field: "qty_reserved", headerName: "Reserved", minWidth: 150, cellClass: "text-center text-[15px] font-semibold", headerClass: "ag-center-header" },
      { field: "qty_available", headerName: "Available", minWidth: 150, cellClass: "text-center text-[15px] font-semibold", headerClass: "ag-center-header" },
      { field: "qty_in_transit", headerName: "In-Transit", minWidth: 150, cellClass: "text-center text-[15px] font-semibold", headerClass: "ag-center-header" },
      {
        field: "avg_cost",
        headerName: "Avg Cost",
        minWidth: 100,
        valueFormatter: (p) => `$${(p.value ?? 0).toFixed(2)}`,
      },
      {
        headerName: "Sell Price",
        minWidth: 130,
        valueGetter: (p) => {
          const cost = p.data?.avg_cost ?? 0;
          return cost > 0 ? (cost * 1.25) * 1.14 : 0;
        },
        valueFormatter: (p) => p.value > 0 ? `$${p.value.toFixed(2)}` : "—",
        cellClass: "text-center font-semibold",
      },
      { field: "sku", headerName: "SKU", minWidth: 110 },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns, new Set(["sku"]));

  if (error) {
    return <p className="text-sm text-red-500">Failed to load inventory: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchFilterBar
        searchPlaceholder="Search products..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: "category",
            label: "Category",
            options: categories,
            value: categoryFilter,
            onChange: setCategoryFilter,
          },
          {
            key: "status",
            label: "Stock Status",
            options: [
              { label: "In Stock", value: "In Stock" },
              { label: "Low Stock", value: "Low Stock" },
              { label: "Out of Stock", value: "Out of Stock" },
              { label: "Incoming", value: "Incoming" },
            ],
            value: statusFilter,
            onChange: setStatusFilter,
          },
        ]}
        trailing={<ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />}
      />
      <DataGrid<StockStatus> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
    </div>
  );
}
