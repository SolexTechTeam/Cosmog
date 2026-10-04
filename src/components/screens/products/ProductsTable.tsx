"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { Product } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function ProductsTable() {
  const { data, loading, error } = useApi<Product[]>("/api/products");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const products = data ?? [];
  const activeCount = products.filter((p) => p.is_active).length;
  const inactiveCount = products.filter((p) => !p.is_active).length;

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).sort().map((c) => ({ label: c, value: c }));
  }, [products]);

  const filtered = useMemo(() => {
    let rows = products;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.sku ?? "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter) rows = rows.filter((r) => r.category === categoryFilter);
    if (activeFilter) rows = rows.filter((r) => String(r.is_active) === activeFilter);
    return rows;
  }, [products, search, categoryFilter, activeFilter]);

  const columns: ColDef<Product>[] = useMemo(
    () => [
      { field: "name", headerName: "Product", minWidth: 280 },
      { field: "sku", headerName: "SKU", minWidth: 110 },
      { field: "category", headerName: "Category", minWidth: 180 },
      {
        field: "is_active",
        headerName: "Status",
        minWidth: 100,
        cellRenderer: (p: { value: boolean }) =>
          StatusBadge({ status: p.value ? "active" : "depleted" }),
      },
      {
        field: "created_at",
        headerName: "Created",
        minWidth: 110,
        valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : "—",
      },
    ],
    []
  );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load products: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-muted p-5 shadow-sm">
        <h2 className="text-header mb-4">Overview</h2>
        <MetricCardRow>
          <MetricCard label="Total Products" value={loading ? "—" : products.length} />
          <MetricCard label="Active" value={loading ? "—" : activeCount} />
          <MetricCard label="Inactive" value={loading ? "—" : inactiveCount} />
          <MetricCard label="Categories" value={loading ? "—" : categories.length} />
        </MetricCardRow>
      </div>
      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchPlaceholder="Search products, SKU..."
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
              key: "active",
              label: "Status",
              options: [
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ],
              value: activeFilter,
              onChange: setActiveFilter,
            },
          ]}
        />
        <DataGrid<Product> rows={filtered} columns={columns} loading={loading} pageSize={25} />
      </div>
    </div>
  );
}
