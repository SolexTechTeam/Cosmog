"use client";

import { useState, useMemo } from "react";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { DemandPriority } from "@/types";
import type { ColDef } from "ag-grid-community";

const priorityColorMap: Record<string, string> = {
  "High Attention": "bg-red-100 text-red-700",
  "Med Attention": "bg-yellow-100 text-yellow-700",
  "Low Attention": "bg-blue-100 text-blue-700",
};

export default function DemandPriorityTable() {
  const { data, loading, error } = useApi<DemandPriority[]>("/api/inventory/demand-priority");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const items = data ?? [];
  const highCount = items.filter((i) => i.priority_label === "High Attention").length;
  const medCount = items.filter((i) => i.priority_label === "Med Attention").length;
  const totalDemand = items.reduce((sum, i) => sum + i.total_qty_demanded, 0);

  const filtered = useMemo(() => {
    let rows = items;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }
    if (priorityFilter) rows = rows.filter((r) => r.priority_label === priorityFilter);
    return rows;
  }, [items, search, priorityFilter]);

  const allColumns: ColDef<DemandPriority>[] = useMemo(
    () => [
      { field: "product_name", headerName: "Product", minWidth: 250 },
      { field: "category", headerName: "Category", minWidth: 150 },
      { field: "total_qty_demanded", headerName: "Qty Demanded", minWidth: 130 },
      { field: "open_order_count", headerName: "Open Orders", minWidth: 120 },
      {
        field: "total_points",
        headerName: "Points",
        minWidth: 100,
        sort: "desc",
        valueFormatter: (p) => (p.value ?? 0).toFixed(1),
      },
      {
        field: "priority_label",
        headerName: "Priority",
        minWidth: 150,
        cellRenderer: (p: { value: string }) => {
          const colors = priorityColorMap[p.value] || "bg-gray-100 text-gray-600";
          return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}">${p.value}</span>`;
        },
      },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns);

  if (error) {
    return <p className="text-sm text-red-500">Failed to load demand priority: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Overview</h2>
        <MetricCardRow>
          <MetricCard label="High Attention" value={loading ? "—" : highCount} />
          <MetricCard label="Med Attention" value={loading ? "—" : medCount} />
          <MetricCard label="Products in Demand" value={loading ? "—" : items.length} />
          <MetricCard label="Total Qty Demanded" value={loading ? "—" : totalDemand.toLocaleString()} />
        </MetricCardRow>
      </div>
      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchPlaceholder="Search products..."
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
        <DataGrid<DemandPriority> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
      </div>
    </div>
  );
}
