"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import DirectoryPageHeader from "@/components/common/DirectoryPageHeader";
import ErrorBlock from "@/components/ui/error-block";
import { CategoryComboBox } from "@/components/ui/category-combobox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Archive, Boxes, CircleCheck, Tags } from "lucide-react";
import type { Product } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function ProductsTable() {
  const { data, loading, error, refetch } = useApi<Product[]>([...queryKeys.products], () => AetherClient.getProducts());
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", category: "", sku: "", image_url: "", low_stock_threshold: "5" });

  const products = useMemo(() => data ?? [], [data]);
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
      {
        field: "name",
        headerName: "Product",
        minWidth: 280,
        cellRenderer: (params: { value: string; data?: Product }) =>
          params.data ? (
            <Link href={`/inventory/${params.data.id}`} className="font-medium text-primary hover:underline">
              {params.value}
            </Link>
          ) : (
            params.value
          ),
      },
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
    const lowStockThreshold = Number(newProduct.low_stock_threshold);

    if (!name || !category) {
      setAddError("Product name and category are required.");
      return;
    }
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      setAddError("Low stock threshold must be a whole number of zero or more.");
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
        low_stock_threshold: lowStockThreshold,
      });
      setNewProduct({ name: "", category: "", sku: "", image_url: "", low_stock_threshold: "5" });
      setIsAdding(false);
      toast("Product created");
      refetch();
    } catch (addProductError) {
      setAddError(addProductError instanceof Error ? addProductError.message : "Unable to add the product.");
    } finally {
      setAdding(false);
    }
  }

  if (error) {
    return <ErrorBlock message={`Failed to load products: ${error}`} onRetry={refetch} />;
  }

  return (
    <>
      <DirectoryPageHeader
        title="Products"
        description="Catalog records, stock thresholds, and active product lines."
        loading={loading}
        summary={[
          { label: "Products", value: products.length, icon: <Boxes size={18} /> },
          { label: "Active", value: activeCount, icon: <CircleCheck size={18} /> },
          { label: "Inactive", value: inactiveCount, icon: <Archive size={18} /> },
          { label: "Categories", value: categories.length, icon: <Tags size={18} /> },
        ]}
        actions={
          <button type="button" onClick={() => { setAddError(null); setIsAdding(true); }} className="h-9 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-auto">
            Add product
          </button>
        }
      />

      <section aria-label="Product catalog" className="flex min-w-0 flex-col gap-2">
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
          trailing={<ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />}
        />
        <p className="px-1 text-xs text-muted-foreground" aria-live="polite">
          {loading ? "Loading product records…" : `Showing ${filtered.length} of ${products.length} products`}
          {(search || categoryFilter || activeFilter) && !loading && <button type="button" onClick={() => { setSearch(""); setCategoryFilter(""); setActiveFilter(""); }} className="ml-2 font-medium text-primary hover:underline">Clear filters</button>}
        </p>
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
              { key: "category", label: "Category", type: "select", options: categories },
              { key: "sku", label: "SKU" },
              { key: "image_url", label: "Image URL" },
              { key: "low_stock_threshold", label: "Low Stock Threshold", type: "number" },
              { key: "is_active", label: "Active", type: "checkbox" },
            ],
            onSave: async (product, changes) => {
              await AetherClient.updateProduct(product.id, changes);
              toast(`Product "${product.name}" updated`);
              refetch();
            },
          }}
          archiveAction={{
            label: "Archive Product",
            isAvailable: (product) => product.is_active,
            onArchive: async (product) => {
              await AetherClient.updateProduct(product.id, { is_active: false });
              toast(`Product "${product.name}" archived`);
              refetch();
            },
          }}
        />
      </section>

      {isAdding && (
        <Dialog loading={adding} onClose={() => setIsAdding(false)} title="Add Product" width={512}>
          <form className="px-1" onSubmit={addProduct}>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Product Name
                <Input
                  required
                  value={newProduct.name}
                  onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1 h-8 text-sm font-normal"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Category
                <div className="mt-1">
                  <CategoryComboBox
                    required
                    value={newProduct.category}
                    onChange={(v) => setNewProduct((current) => ({ ...current, category: v }))}
                    categories={categories.map((c) => c.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-foreground">
                SKU
                <Input
                  value={newProduct.sku}
                  onChange={(event) => setNewProduct((current) => ({ ...current, sku: event.target.value }))}
                  className="mt-1 h-8 text-sm font-normal"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Low stock threshold
                <Input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={newProduct.low_stock_threshold}
                  onChange={(event) => setNewProduct((current) => ({ ...current, low_stock_threshold: event.target.value }))}
                  className="mt-1 h-8 text-sm font-normal"
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">Stock at or below this quantity is flagged as low.</span>
              </label>
              <label className="block text-sm font-medium text-foreground">
                Image URL
                <Input
                  type="url"
                  value={newProduct.image_url}
                  onChange={(event) => setNewProduct((current) => ({ ...current, image_url: event.target.value }))}
                  className="mt-1 h-8 text-sm font-normal"
                />
              </label>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={adding}
                className="h-8 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {adding ? "Adding..." : "Add Product"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
