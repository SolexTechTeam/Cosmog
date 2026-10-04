"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import ColumnPicker from "@/components/common/ColumnPicker";
import StatusBadge from "@/components/common/StatusBadge";
import type { StockStatus } from "@/types";
import type { ColDef } from "ag-grid-community";

interface InventoryLot {
  id: string;
  product_id: string;
  purchase_order_id?: string | null;
  quantity_received?: number | null;
  quantity_remaining?: number | null;
  qty_on_hand?: number | null;
  qty_reserved?: number | null;
  qty_available?: number | null;
  unit_cost?: number | null;
  received_date?: string | null;
  received_at?: string | null;
  status?: string | null;
}

function lotOnHand(lot: InventoryLot) {
  return lot.qty_on_hand ?? lot.quantity_remaining ?? lot.quantity_received ?? 0;
}

function lotAvailable(lot: InventoryLot) {
  return lot.qty_available ?? Math.max(0, lotOnHand(lot) - (lot.qty_reserved ?? 0));
}

function InventoryLots({ lots, error }: { lots: InventoryLot[]; error: string | null }) {
  if (error) {
    return <p className="text-sm text-destructive">Unable to load inventory lots: {error}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Lot</th>
            <th className="px-3 py-2 font-medium">Received</th>
            <th className="px-3 py-2 text-right font-medium">On-Hand</th>
            <th className="px-3 py-2 text-right font-medium">Reserved</th>
            <th className="px-3 py-2 text-right font-medium">Available</th>
            <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lots.map((lot) => (
            <tr key={lot.id}>
              <td className="px-3 py-2 font-mono text-xs text-foreground">{lot.id}</td>
              <td className="px-3 py-2 text-foreground">{lot.received_date ?? lot.received_at?.slice(0, 10) ?? "—"}</td>
              <td className="px-3 py-2 text-right text-foreground">{lotOnHand(lot)}</td>
              <td className="px-3 py-2 text-right text-foreground">{lot.qty_reserved ?? 0}</td>
              <td className="px-3 py-2 text-right text-foreground">{lotAvailable(lot)}</td>
              <td className="px-3 py-2 text-right text-foreground">{lot.unit_cost == null ? "—" : `$${lot.unit_cost.toFixed(2)}`}</td>
            </tr>
          ))}
          {lots.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No inventory lots</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InventoryStockDetails({ stock, lots, lotsError }: { stock: StockStatus; lots: InventoryLot[]; lotsError: string | null }) {
  return (
    <div className="space-y-5 p-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Product</dt>
          <dd className="mt-1 text-sm text-foreground">{stock.name}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Category</dt>
          <dd className="mt-1 text-sm text-foreground">{stock.category}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">On-Hand</dt>
          <dd className="mt-1 text-sm text-foreground">{stock.qty_on_hand}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Available</dt>
          <dd className="mt-1 text-sm text-foreground">{stock.qty_available}</dd>
        </div>
      </dl>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Inventory Lots</h3>
        <InventoryLots lots={lots} error={lotsError} />
      </div>
    </div>
  );
}

export default function InventoryTable() {
  const { data, loading, error } = useApi<StockStatus[]>("/api/inventory/stock-status");
  const { data: inventoryLots, error: lotsError } = useApi<InventoryLot[]>("/api/inventory/lots");
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

  const lotsByProductId = useMemo(() => {
    const lots = new Map<string, InventoryLot[]>();
    for (const lot of inventoryLots ?? []) {
      const productLots = lots.get(lot.product_id) ?? [];
      productLots.push(lot);
      lots.set(lot.product_id, productLots);
    }
    return lots;
  }, [inventoryLots]);

  const allColumns: ColDef<StockStatus>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Product",
        minWidth: 280,
        cellRenderer: (params: { value: string; data?: StockStatus }) => params.data ? (
          <Link href={`/inventory/${params.data.product_id}`} className="font-medium text-primary hover:underline">{params.value}</Link>
        ) : params.value,
      },
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
      <DataGrid<StockStatus>
        rows={filtered}
        columns={visibleColumns}
        loading={loading}
        pageSize={25}
        detailsTitle="Stock Details"
        showDetailsMenu
        detailsPageHref={(stock) => `/inventory/${stock.product_id}`}
        expandOnRowDoubleClick
        expandedRowHeight={300}
        getExpandedDetailsTitle={(stock) => `${stock.name} Lots`}
        renderRowDetails={(stock) => (
          <InventoryStockDetails
            stock={stock}
            lots={lotsByProductId.get(stock.product_id) ?? []}
            lotsError={lotsError}
          />
        )}
        renderExpandedRowDetails={(stock) => (
          <div className="p-3">
            <InventoryLots lots={lotsByProductId.get(stock.product_id) ?? []} error={lotsError} />
          </div>
        )}
      />
    </div>
  );
}
