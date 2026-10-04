"use client";

import { useState, useMemo } from "react";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import type { ColDef } from "ag-grid-community";

interface LedgerEntry {
  id: number;
  product_id: string;
  inventory_lot_id: string | null;
  movement_type: string;
  quantity_change: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

export default function HistoryTable() {
  const { data, loading, error } = useApi<LedgerEntry[]>("/api/inventory/ledger");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.movement_type.toLowerCase().includes(q) ||
          (r.notes ?? "").toLowerCase().includes(q) ||
          (r.reference_type ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter) rows = rows.filter((r) => r.movement_type === typeFilter);
    return rows;
  }, [data, search, typeFilter]);

  const allColumns: ColDef<LedgerEntry>[] = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "Date",
        minWidth: 170,
        sort:"desc",
        valueFormatter: (p) => p.value ? new Date(p.value).toLocaleString() : "—",
      },
      {
        field: "movement_type",
        headerName: "Type",
        minWidth: 130,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        field: "quantity_change",
        headerName: "Qty Change",
        minWidth: 110,
        valueFormatter: (p) => {
          const val = p.value ?? 0;
          return `${val > 0 ? "+" : ""}${val}`;
        },
        cellStyle: (p) => {
          const val = p.value as number;
          if (val > 0) return { color: "#16a34a", fontWeight: 500 } as const;
          if (val < 0) return { color: "#dc2626", fontWeight: 500 } as const;
          return null;
        },
      },
      {
        field: "unit_cost",
        headerName: "Unit Cost",
        minWidth: 100,
        valueFormatter: (p) => p.value != null ? `$${p.value.toFixed(2)}` : "—",
      },
      // TODO: Add reference to the attribute
      {
        headerName: "Cost Sold",
        minWidth: 120,
        valueGetter: (p) => {
          const quantityChange = p.data?.quantity_change ?? 0;
          const unitCost = p.data?.unit_cost;
          return quantityChange < 0 && unitCost != null ? Math.abs(quantityChange) * unitCost : null;
        },
        valueFormatter: (p) => p.value != null ? `$${p.value.toFixed(2)}` : "—",
      },
      { field: "reference_type", headerName: "Ref Type", minWidth: 140 },
      {
        field: "reference_id",
        headerName: "Ref ID",
        minWidth: 120,
        valueFormatter: (p) => p.value ? p.value.slice(0, 8) + "..." : "—",
      },
      { field: "notes", headerName: "Notes", minWidth: 180 },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(
    allColumns,
    new Set(["reference_type", "reference_id", "notes"])
  );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load ledger: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchFilterBar
        searchPlaceholder="Search ledger entries..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: "type",
            label: "Movement Type",
            options: [
              { label: "Lot Created", value: "lot_created" },
              { label: "Received", value: "received" },
              { label: "Reserved", value: "reserved" },
              { label: "Released", value: "released" },
              { label: "Fulfilled", value: "fulfilled" },
              { label: "Returned", value: "returned" },
              { label: "Adjustment", value: "adjustment" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
        trailing={<ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />}
      />
      <DataGrid<LedgerEntry> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
    </div>
  );
}
