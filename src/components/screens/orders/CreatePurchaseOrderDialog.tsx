"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { Product, PurchaseOrder, Supplier } from "@/types";

interface PurchaseLine {
  product_id: string;
  quantity_ordered: string;
  unit_cost: string;
}

interface CreatePurchaseOrderDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

const inputClass = "h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

export default function CreatePurchaseOrderDialog({ onClose, onCreated }: CreatePurchaseOrderDialogProps) {
  const { data: fetchedSuppliers, refetch: refetchSuppliers } = useApi<Supplier[]>("/api/suppliers");
  const { data: fetchedProducts, refetch: refetchProducts } = useApi<Product[]>("/api/products");
  const [poNumber, setPoNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("warehouse");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedArrival, setExpectedArrival] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([{ product_id: "", quantity_ordered: "1", unit_cost: "" }]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", email: "", phone: "", default_lead_days: "0" });
  const [newProduct, setNewProduct] = useState({ name: "", category: "", sku: "" });
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suppliers = fetchedSuppliers ?? [];
  const products = fetchedProducts ?? [];

  function updateLine(index: number, changes: Partial<PurchaseLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line));
  }

  async function addSupplier() {
    const leadDays = Number(newSupplier.default_lead_days);
    if (!newSupplier.name.trim() || !Number.isFinite(leadDays) || leadDays < 0) {
      setError("New supplier name and a non-negative lead time are required.");
      return;
    }
    try {
      setCreatingSupplier(true);
      setError(null);
      const supplier = await api.post<Supplier>("/api/suppliers", { name: newSupplier.name.trim(), default_lead_days: leadDays, contact_info: { ...(newSupplier.email.trim() ? { email: newSupplier.email.trim() } : {}), ...(newSupplier.phone.trim() ? { phone: newSupplier.phone.trim() } : {}) } });
      setSupplierId(supplier.id);
      setNewSupplier({ name: "", email: "", phone: "", default_lead_days: "0" });
      setShowSupplierForm(false);
      refetchSuppliers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add supplier.");
    } finally {
      setCreatingSupplier(false);
    }
  }

  async function addProduct() {
    if (!newProduct.name.trim() || !newProduct.category.trim()) {
      setError("New product name and category are required.");
      return;
    }
    try {
      setCreatingProduct(true);
      setError(null);
      const product = await api.post<Product>("/api/products", { name: newProduct.name.trim(), category: newProduct.category.trim(), sku: newProduct.sku.trim() || undefined });
      setLines((current) => current.map((line, index) => index === current.length - 1 && !line.product_id ? { ...line, product_id: product.id } : line));
      setNewProduct({ name: "", category: "", sku: "" });
      setShowProductForm(false);
      refetchProducts();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add product.");
    } finally {
      setCreatingProduct(false);
    }
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedLines = lines.map((line) => ({ product_id: line.product_id, quantity_ordered: Number(line.quantity_ordered), unit_cost: Number(line.unit_cost) }));
    if (!poNumber.trim() || !supplierId || !orderDate || normalizedLines.some((line) => !line.product_id || !Number.isInteger(line.quantity_ordered) || line.quantity_ordered < 1 || !Number.isFinite(line.unit_cost) || line.unit_cost < 0)) {
      setError("Enter a PO number, choose a supplier, and complete every line item.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await api.post<PurchaseOrder>("/api/purchase-orders", { po_number: poNumber.trim(), supplier_id: supplierId, status: "draft", fulfillment_type: fulfillmentType, order_date: orderDate, expected_arrival: expectedArrival || null, notes: notes.trim() || null, items: normalizedLines });
      onCreated();
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create purchase order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" onMouseDown={() => !saving && onClose()}>
      <form onSubmit={createOrder} onMouseDown={(event) => event.stopPropagation()} className="mx-auto my-8 w-full max-w-3xl rounded-xl border border-border bg-card p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="create-po-title">
        <div className="flex items-start justify-between gap-4"><div><h2 id="create-po-title" className="text-lg font-semibold">New Purchase Order</h2><p className="mt-1 text-sm text-muted-foreground">New purchase orders start as drafts.</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">Close</button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">PO number<input required value={poNumber} onChange={(event) => setPoNumber(event.target.value)} placeholder="e.g. PO-1024" className={inputClass} /></label>
          <label className="grid gap-1 text-sm font-medium">Supplier<select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={inputClass}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <div className="flex items-end sm:col-span-2"><button type="button" onClick={() => setShowSupplierForm((value) => !value)} className="h-10 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">{showSupplierForm ? "Cancel new supplier" : "Add supplier"}</button></div>
          {showSupplierForm && <div className="grid gap-3 rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3 sm:col-span-2 sm:grid-cols-[1fr_1fr_1fr_6rem_auto]"><input placeholder="Supplier name" value={newSupplier.name} onChange={(event) => setNewSupplier((current) => ({ ...current, name: event.target.value }))} className={inputClass} /><input type="email" placeholder="Email" value={newSupplier.email} onChange={(event) => setNewSupplier((current) => ({ ...current, email: event.target.value }))} className={inputClass} /><input placeholder="Phone" value={newSupplier.phone} onChange={(event) => setNewSupplier((current) => ({ ...current, phone: event.target.value }))} className={inputClass} /><input type="number" min="0" placeholder="Lead days" value={newSupplier.default_lead_days} onChange={(event) => setNewSupplier((current) => ({ ...current, default_lead_days: event.target.value }))} className={inputClass} /><button type="button" onClick={addSupplier} disabled={creatingSupplier} className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60">{creatingSupplier ? "…" : "Add"}</button></div>}
          <label className="grid gap-1 text-sm font-medium">Type<select value={fulfillmentType} onChange={(event) => setFulfillmentType(event.target.value)} className={inputClass}><option value="warehouse">Warehouse</option><option value="direct_delivery">Direct delivery</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Order date<input required type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} className={inputClass} /></label>
          <label className="grid gap-1 text-sm font-medium">Expected arrival<input type="date" value={expectedArrival} onChange={(event) => setExpectedArrival(event.target.value)} className={inputClass} /></label>
        </div>
        <div className="mt-6"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Items</h3><div className="flex gap-2"><button type="button" onClick={() => setShowProductForm((value) => !value)} className="text-sm font-medium text-primary hover:underline">Add product</button><button type="button" onClick={() => setLines((current) => [...current, { product_id: "", quantity_ordered: "1", unit_cost: "" }])} className="text-sm font-medium text-primary hover:underline">Add line</button></div></div>{showProductForm && <div className="mb-3 grid gap-3 rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><input placeholder="Product name" value={newProduct.name} onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))} className={inputClass} /><input placeholder="Category" value={newProduct.category} onChange={(event) => setNewProduct((current) => ({ ...current, category: event.target.value }))} className={inputClass} /><input placeholder="SKU" value={newProduct.sku} onChange={(event) => setNewProduct((current) => ({ ...current, sku: event.target.value }))} className={inputClass} /><button type="button" onClick={addProduct} disabled={creatingProduct} className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60">{creatingProduct ? "…" : "Add"}</button></div>}<div className="space-y-2">{lines.map((line, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_8rem_auto]"><select value={line.product_id} onChange={(event) => updateLine(index, { product_id: event.target.value })} className={inputClass}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input type="number" min="1" step="1" value={line.quantity_ordered} onChange={(event) => updateLine(index, { quantity_ordered: event.target.value })} className={inputClass} placeholder="Qty" /><input type="number" min="0" step="0.01" value={line.unit_cost} onChange={(event) => updateLine(index, { unit_cost: event.target.value })} className={inputClass} placeholder="Unit cost" /><button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length === 1} className="rounded-md px-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-40">Remove</button></div>)}</div></div>
        <label className="mt-5 grid gap-1 text-sm font-medium">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="rounded-md border border-input bg-background px-3 py-2 font-normal" /></label>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button><button type="submit" disabled={saving} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Creating…" : "Create Purchase Order"}</button></div>
      </form>
    </div>
  );
}
