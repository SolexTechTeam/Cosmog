"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { Customer, Product, PurchaseOrder, SaleOrder } from "@/types";

interface SaleLine {
  product_id: string;
  quantity: string;
  unit_price: string;
}

interface CreateSaleOrderDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

const inputClass = "h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

export default function CreateSaleOrderDialog({ onClose, onCreated }: CreateSaleOrderDialogProps) {
  const { data: fetchedCustomers, refetch: refetchCustomers } = useApi<Customer[]>("/api/customers");
  const { data: fetchedProducts, refetch: refetchProducts } = useApi<Product[]>("/api/products");
  const { data: fetchedPurchaseOrders } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const [customerId, setCustomerId] = useState("");
  const [linkedPoId, setLinkedPoId] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("shipping");
  const [businessChannel, setBusinessChannel] = useState("retail_b2c");
  const [source, setSource] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [shippingCost, setShippingCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<SaleLine[]>([{ product_id: "", quantity: "1", unit_price: "" }]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", handle: "", email: "" });
  const [newProduct, setNewProduct] = useState({ name: "", category: "", sku: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = fetchedCustomers ?? [];
  const products = fetchedProducts ?? [];
  const purchaseOrders = (fetchedPurchaseOrders ?? []).filter((purchaseOrder) => purchaseOrder.status !== "cancelled");

  function updateLine(index: number, changes: Partial<SaleLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line));
  }

  async function addCustomer() {
    if (!newCustomer.name.trim()) {
      setError("New customer name is required.");
      return;
    }
    try {
      setCreatingCustomer(true);
      setError(null);
      const customer = await api.post<Customer>("/api/customers", { name: newCustomer.name.trim(), handle: newCustomer.handle.trim() || null, email: newCustomer.email.trim() || null, customer_type: "b2b", payment_terms: null, contact_info: {} });
      setCustomerId(customer.id);
      setNewCustomer({ name: "", handle: "", email: "" });
      setShowCustomerForm(false);
      refetchCustomers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add customer.");
    } finally {
      setCreatingCustomer(false);
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
    const normalizedLines = lines.map((line) => ({ product_id: line.product_id, quantity: Number(line.quantity), unit_price: Number(line.unit_price) }));
    const cost = Number(shippingCost);
    if (!customerId || !orderDate || !Number.isFinite(cost) || cost < 0 || normalizedLines.some((line) => !line.product_id || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line.unit_price) || line.unit_price < 0)) {
      setError("Choose a customer, complete every line item, and enter valid order details.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await api.post<SaleOrder>("/api/sale-orders", { customer_id: customerId, order_date: orderDate, fulfillment_type: fulfillmentType, business_channel: businessChannel, ...(source ? { source } : {}), ...(linkedPoId ? { linked_po_id: linkedPoId } : {}), shipping_cost: cost, ...(notes.trim() ? { notes: notes.trim() } : {}), items: normalizedLines });
      onCreated();
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create sales order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" onMouseDown={() => !saving && onClose()}>
      <form onSubmit={createOrder} onMouseDown={(event) => event.stopPropagation()} className="mx-auto my-8 w-full max-w-3xl rounded-xl border border-border bg-card p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="create-so-title">
        <div className="flex items-start justify-between gap-4"><div><h2 id="create-so-title" className="text-lg font-semibold">New Sales Order</h2><p className="mt-1 text-sm text-muted-foreground">The order number is assigned automatically.</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">Close</button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">Customer<select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={inputClass}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.handle ? ` (${customer.handle})` : ""}</option>)}</select></label>
          <div className="flex items-end"><button type="button" onClick={() => setShowCustomerForm((value) => !value)} className="h-10 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">{showCustomerForm ? "Cancel new customer" : "Add customer"}</button></div>
          {showCustomerForm && <div className="grid gap-3 rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3 sm:col-span-2 sm:grid-cols-3"><input placeholder="Customer name" value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} className={inputClass} /><input placeholder="Handle" value={newCustomer.handle} onChange={(event) => setNewCustomer((current) => ({ ...current, handle: event.target.value }))} className={inputClass} /><div className="flex gap-2"><input type="email" placeholder="Email" value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} className={inputClass} /><button type="button" onClick={addCustomer} disabled={creatingCustomer} className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60">{creatingCustomer ? "…" : "Add"}</button></div></div>}
          <label className="grid gap-1 text-sm font-medium">Type<select value={fulfillmentType} onChange={(event) => setFulfillmentType(event.target.value)} className={inputClass}><option value="shipping">Shipping</option><option value="pickup">Pickup</option><option value="local_delivery">Local delivery</option><option value="event_pickup">Event pickup</option><option value="hold">Hold</option><option value="drop_ship">Drop ship</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Order date<input required type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} className={inputClass} /></label>
          <label className="grid gap-1 text-sm font-medium">Business channel<select value={businessChannel} onChange={(event) => setBusinessChannel(event.target.value)} className={inputClass}><option value="retail_b2c">Retail B2C</option><option value="wholesale_b2b">Wholesale B2B</option><option value="special_consideration">Special consideration</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Source<select value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}><option value="">Not specified</option><option value="discord">Discord</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="marketplace">Marketplace</option><option value="whatsapp">WhatsApp</option><option value="referral">Referral</option><option value="auskado">Auskado</option><option value="drop_sale">Drop sale</option><option value="b2b">B2B</option><option value="friends_family">Friends &amp; family</option><option value="website">Website</option><option value="other">Other</option></select></label>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">Assigned purchase order<select value={linkedPoId} onChange={(event) => setLinkedPoId(event.target.value)} className={inputClass}><option value="">No purchase order assigned</option>{purchaseOrders.map((purchaseOrder) => <option key={purchaseOrder.id} value={purchaseOrder.id}>{purchaseOrder.po_number} · {purchaseOrder.supplier?.name ?? "Unknown supplier"} · {purchaseOrder.status}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Shipping cost<input type="number" min="0" step="0.01" value={shippingCost} onChange={(event) => setShippingCost(event.target.value)} className={inputClass} /></label>
        </div>
        <div className="mt-6"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Items</h3><div className="flex gap-2"><button type="button" onClick={() => setShowProductForm((value) => !value)} className="text-sm font-medium text-primary hover:underline">Add product</button><button type="button" onClick={() => setLines((current) => [...current, { product_id: "", quantity: "1", unit_price: "" }])} className="text-sm font-medium text-primary hover:underline">Add line</button></div></div>{showProductForm && <div className="mb-3 grid gap-3 rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><input placeholder="Product name" value={newProduct.name} onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))} className={inputClass} /><input placeholder="Category" value={newProduct.category} onChange={(event) => setNewProduct((current) => ({ ...current, category: event.target.value }))} className={inputClass} /><input placeholder="SKU" value={newProduct.sku} onChange={(event) => setNewProduct((current) => ({ ...current, sku: event.target.value }))} className={inputClass} /><button type="button" onClick={addProduct} disabled={creatingProduct} className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60">{creatingProduct ? "…" : "Add"}</button></div>}<div className="space-y-2">{lines.map((line, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_8rem_auto]"><select value={line.product_id} onChange={(event) => updateLine(index, { product_id: event.target.value })} className={inputClass}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} className={inputClass} placeholder="Qty" /><input type="number" min="0" step="0.01" value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: event.target.value })} className={inputClass} placeholder="Unit price" /><button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length === 1} className="rounded-md px-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-40">Remove</button></div>)}</div></div>
        <label className="mt-5 grid gap-1 text-sm font-medium">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="rounded-md border border-input bg-background px-3 py-2 font-normal" /></label>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button><button type="submit" disabled={saving} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Creating…" : "Create Sales Order"}</button></div>
      </form>
    </div>
  );
}
