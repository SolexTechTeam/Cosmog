"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { useToast } from "@/components/ui/toast";
import { AetherClient } from "@/lib/aether-client";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import ColumnPicker from "@/components/common/ColumnPicker";
import StatusBadge from "@/components/common/StatusBadge";
import InventoryOverviewCards from "./InventoryOverviewCards";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import ErrorBlock from "@/components/ui/error-block";
import TransformProductDialog from "@/components/common/TransformProductDialog";
import InventoryLotsTable from "@/components/common/InventoryLotsTable";
import type { StockStatus, PurchaseOrder, InventoryLot } from "@/types";
import type { ColDef } from "ag-grid-community";

function InventoryStockDetails({ stock, lots, lotsError, poMap }: { stock: StockStatus; lots: InventoryLot[]; lotsError: string | null; poMap: Map<string, PurchaseOrder> }) {
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
        <InventoryLotsTable lots={lots} error={lotsError} poMap={poMap} />
      </div>
    </div>
  );
}

export default function InventoryTable() {
  // Swap to once exec and memoised call because this is calling 4 times per mount render due to rebuilds
  const { data, loading, error, refetch } = useApi<StockStatus[]>([...queryKeys.stockStatus], () => AetherClient.getStockStatus());
  const { data: inventoryLots, error: lotsError } = useApi<InventoryLot[]>([...queryKeys.inventoryLots], () => AetherClient.getInventoryLots());
  const { data: purchaseOrders } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());
  const invalidate = useInvalidate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showReallocate, setShowReallocate] = useState(false);
  const [showTransform, setShowTransform] = useState(false);
  const [reallocating, setReallocating] = useState(false);

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

  const poMap = useMemo(() => {
    const map = new Map<string, PurchaseOrder>();
    for (const po of purchaseOrders ?? []) map.set(po.id, po);
    return map;
  }, [purchaseOrders]);

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
      { field: "qty_on_hand", headerName: "On-Hand", minWidth: 150, cellClass: "text-center text-base font-semibold", headerClass: "ag-center-header" },
      { field: "qty_incoming", headerName: "Incoming", minWidth: 150, cellClass: "text-center text-base font-semibold", headerClass: "ag-center-header" },
      { field: "qty_reserved", headerName: "Allocated", minWidth: 150, cellClass: "text-center text-base font-semibold", headerClass: "ag-center-header" },
      { field: "qty_available", headerName: "Available", minWidth: 150, cellClass: "text-center text-base font-semibold", headerClass: "ag-center-header" },
      { field: "qty_demand", headerName: "Demand", minWidth: 150, cellClass: "text-center text-base font-semibold", headerClass: "ag-center-header" },
      {
        field: "avg_cost",
        headerName: "Avg Cost",
        minWidth: 100,
        valueFormatter: (p) => `$${(p.value ?? 0).toFixed(2)}`,
      },
      { field: "sku", headerName: "SKU", minWidth: 110 },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns, new Set(["sku"]));

  if (error) {
    return <ErrorBlock message={`Failed to load inventory: ${error}`} onRetry={refetch} />;
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="shrink-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Stock levels and product tracking</p>
        </div>
        <div className="min-w-0 flex-1 lg:max-w-3xl">
          <InventoryOverviewCards items={data ?? []} loading={loading} error={error} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
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
        trailing={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTransform(true)}
              className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              Convert Products
            </button>
            <button
              type="button"
              onClick={() => setShowReallocate(true)}
              className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              Re-allocate Stock
            </button>
            <ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />
          </div>
        }
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
            poMap={poMap}
          />
        )}
        renderExpandedRowDetails={(stock) => (
          <div className="p-3">
            <InventoryLotsTable lots={lotsByProductId.get(stock.product_id) ?? []} error={lotsError} poMap={poMap} />
          </div>
        )}
      />
      </div>

      {showReallocate && (
        <ConfirmDialog
          title="Re-allocate all warehouse stock?"
          description="This will redistribute unassigned on-hand stock across all open sale orders by priority. Existing allocations are preserved — only unallocated stock is assigned."
          confirmLabel="Re-allocate"
          variant="primary"
          loading={reallocating}
          onConfirm={async () => {
            setReallocating(true);
            try {
              const result = await AetherClient.reallocatePool();
              const count = result.reallocations.filter(r => !r.error).length;
              toast(count > 0 ? `${count} orders re-allocated` : "No orders needed re-allocation");
              invalidate([...queryKeys.saleOrders]);
              invalidate([...queryKeys.stockStatus]);
            } catch (e) {
              toast(e instanceof Error ? e.message : "Re-allocation failed", "error");
            } finally {
              setReallocating(false);
              setShowReallocate(false);
            }
          }}
          onCancel={() => setShowReallocate(false)}
        />
      )}
      {showTransform && (
        <TransformProductDialog
          items={data ?? []}
          onClose={() => setShowTransform(false)}
          onTransformed={() => {
            invalidate([...queryKeys.stockStatus]);
            invalidate([...queryKeys.inventoryLots]);
            invalidate([...queryKeys.inventorySummary]);
            invalidate([...queryKeys.ledger]);
            toast("Product conversion recorded");
          }}
        />
      )}
    </>
  );
}
