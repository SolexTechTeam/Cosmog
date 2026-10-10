"use client";

import { useState, useMemo } from "react";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { Product } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function ProductsTable() {
  const { data, loading, error, refetch } = useApi<Product[]>(() => AetherClient.getProducts());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", category: "", sku: "", image_url: "" });

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

  const allColumns: ColDef<Product>[] = useMemo(
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

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns);

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newProduct.name.trim();
    const category = newProduct.category.trim();

    if (!name || !category) {
      setAddError("Product name and category are required.");
      return;
    }

    try {
      setAdding(true);
      setAddError(null);
      await AetherClient.createProduct({
        name,
        category,
        sku: newProduct.sku.trim() || undefined,
        image_url: newProduct.image_url.trim() || undefined,
      });
      setNewProduct({ name: "", category: "", sku: "", image_url: "" });
      setIsAdding(false);
      refetch();
    } catch (addProductError) {
      setAddError(addProductError instanceof Error ? addProductError.message : "Unable to add the product.");
    } finally {
      setAdding(false);
    }
  }

  if (error) {
    return <p className="text-sm text-red-500">Failed to load products: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Overview</h2>
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
          trailing={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setAddError(null); setIsAdding(true); }}
                className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Add Product
              </button>
              <ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />
            </div>
          }
        />
        <DataGrid<Product>
          rows={filtered}
          columns={visibleColumns}
          loading={loading}
          pageSize={25}
          detailsTitle="Product Details"
          editLabel="Edit Product"
          editConfig={{
            fields: [
              { key: "name", label: "Product Name" },
              { key: "category", label: "Category" },
              { key: "sku", label: "SKU" },
              { key: "image_url", label: "Image URL" },
              { key: "is_active", label: "Active", type: "checkbox" },
            ],
            onSave: async (product, changes) => {
              await AetherClient.updateProduct(product.id, changes);
              refetch();
            },
          }}
          archiveAction={{
            label: "Archive Product",
            isAvailable: (product) => product.is_active,
            onArchive: async (product) => {
              await AetherClient.updateProduct(product.id, { is_active: false });
              refetch();
            },
          }}
        />
      </div>
      {isAdding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={() => !adding && setIsAdding(false)}
        >
          <form
            onSubmit={addProduct}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
          >
            <h2 id="add-product-title" className="text-lg font-semibold text-foreground">Add Product</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Product Name
                <input
                  required
                  value={newProduct.name}
                  onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Category
                <input
                  required
                  value={newProduct.category}
                  onChange={(event) => setNewProduct((current) => ({ ...current, category: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                SKU
                <input
                  value={newProduct.sku}
                  onChange={(event) => setNewProduct((current) => ({ ...current, sku: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Image URL
                <input
                  type="url"
                  value={newProduct.image_url}
                  onChange={(event) => setNewProduct((current) => ({ ...current, image_url: event.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={adding}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {adding ? "Adding…" : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
