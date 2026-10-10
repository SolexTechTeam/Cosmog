"use client";

import { useState, useMemo, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useLookup } from "@/hooks/useLookup";
import CreatePurchaseOrderDialog from "@/components/screens/orders/CreatePurchaseOrderDialog";
import type { Customer, Product, Profile, PurchaseOrder, SaleOrder, StockStatus } from "@/types";

interface SaleLine {
  product_id: string;
  quantity: string;
  unit_price: string;
}

interface StockWarning {
  product_id: string;
  requested: number;
  available: number;
  in_transit: number;
  shortfall: number;
  message: string;
}

interface CreateResponse extends SaleOrder {
  stock_warnings?: StockWarning[];
}

interface CreatedOrderInfo {
  id: string;
  number: string;
  items: { product_id: string; quantity: number }[];
  stockWarnings: StockWarning[];
}

interface CreateSaleOrderDialogProps {
  onClose: () => void;
  onCreated: () => void;
  initialItems?: { product_id: string; quantity: string; unit_price: string }[];
  linkedPurchaseOrderId?: string;
}

const inputClass = "h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function LookupSelect({ value, onChange, options, placeholder, className }: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className ?? inputClass}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}

export default function CreateSaleOrderDialog({ onClose, onCreated, initialItems, linkedPurchaseOrderId }: CreateSaleOrderDialogProps) {
  const { data: fetchedCustomers, refetch: refetchCustomers } = useApi<Customer[]>("/api/customers");
  const { data: fetchedProducts, refetch: refetchProducts } = useApi<Product[]>("/api/products");
  const { data: fetchedPurchaseOrders } = useApi<PurchaseOrder[]>("/api/purchase-orders");
  const { data: fetchedProfiles } = useApi<Profile[]>("/api/profiles");
  const { data: fetchedStock } = useApi<StockStatus[]>("/api/inventory/stock-status");

  const { options: fulfillmentOptions } = useLookup("so_fulfillment_type");
  const { options: channelOptions } = useLookup("so_business_channel");
  const { options: sourceOptions } = useLookup("so_source");
  const { options: priorityOptions } = useLookup("so_priority");
  const { options: customerTypeOptions } = useLookup("customer_type");

  const [customerId, setCustomerId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [linkedPoIds, setLinkedPoIds] = useState<string[]>(linkedPurchaseOrderId ? [linkedPurchaseOrderId] : []);
  const [fulfillmentType, setFulfillmentType] = useState("shipping");
  const [businessChannel, setBusinessChannel] = useState("retail_b2c");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("normal");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [shippingCost, setShippingCost] = useState("0");
  const [shippingDetails, setShippingDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<SaleLine[]>(initialItems?.length ? initialItems : [{ product_id: "", quantity: "1", unit_price: "" }]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", handle: "", email: "", customer_type: "b2b" });
  const [newProduct, setNewProduct] = useState({ name: "", category: "", sku: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrderInfo | null>(null);
  const [showCreatePo, setShowCreatePo] = useState(false);

  const customers = fetchedCustomers ?? [];
  const products = fetchedProducts ?? [];
  const profiles = (fetchedProfiles ?? []).filter((p) => p.is_active);
  const purchaseOrders = (fetchedPurchaseOrders ?? []).filter((po) => po.status !== "cancelled" && po.status !== "received");
  const stockByProductId = useMemo(() => {
    const map = new Map<string, StockStatus>();
    for (const s of fetchedStock ?? []) map.set(s.product_id, s);
    return map;
  }, [fetchedStock]);
  const [poSearch, setPoSearch] = useState("");

  function updateLine(index: number, changes: Partial<SaleLine>) {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const updated = { ...line, ...changes };
      if (changes.product_id && changes.product_id !== line.product_id) {
        const stock = stockByProductId.get(changes.product_id);
        if (stock && stock.avg_cost > 0) {
          updated.unit_price = (stock.avg_cost * 1.25 * 1.14).toFixed(2);
        }
      }
      return updated;
    }));
  }

  async function addCustomer() {
    if (!newCustomer.name.trim()) {
      setError("New customer name is required.");
      return;
    }
    try {
      setCreatingCustomer(true);
      setError(null);
      const customer = await api.post<Customer>("/api/customers", {
        name: newCustomer.name.trim(),
        handle: newCustomer.handle.trim() || null,
        email: newCustomer.email.trim() || null,
        customer_type: newCustomer.customer_type,
        payment_terms: null,
        contact_info: {},
      });
      setCustomerId(customer.id);
      setNewCustomer({ name: "", handle: "", email: "", customer_type: "b2b" });
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
      const created = await api.post<CreateResponse>("/api/sale-orders", {
        customer_id: customerId,
        order_date: orderDate,
        fulfillment_type: fulfillmentType,
        business_channel: businessChannel,
        priority,
        ...(ownerId ? { owner_id: ownerId } : {}),
        ...(source ? { source } : {}),
        ...(linkedPoIds.length ? { linked_po_ids: linkedPoIds } : {}),
        shipping_cost: cost,
        ...(shippingDetails.trim() ? { shipping_details: shippingDetails.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: normalizedLines,
      });
      onCreated();
      setCreatedOrder({
        id: created.id,
        number: created.so_number,
        items: normalizedLines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        stockWarnings: created.stock_warnings ?? [],
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create sales order.");
    } finally {
      setSaving(false);
    }
  }

  if (showCreatePo && createdOrder) {
    return (
      <CreatePurchaseOrderDialog
        onClose={onClose}
        onCreated={onCreated}
        initialItems={createdOrder.items.map((i) => ({ product_id: i.product_id, quantity_ordered: String(i.quantity), unit_cost: "" }))}
        linkedSaleOrderId={createdOrder.id}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" onMouseDown={() => !saving && onClose()}>
      <form onSubmit={createOrder} onMouseDown={(event) => event.stopPropagation()} className="mx-auto my-8 w-full max-w-3xl rounded-xl border border-border bg-card p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="create-so-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-so-title" className="text-lg font-semibold">New Sales Order</h2>
            <p className="mt-1 text-sm text-muted-foreground">The order number is assigned automatically.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">Close</button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Customer */}
          <label className="grid gap-1 text-sm font-medium">
            Customer
            <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.handle ? ` (${c.handle})` : ""}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" onClick={() => setShowCustomerForm((v) => !v)} className="h-10 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
              {showCustomerForm ? "Cancel new customer" : "Add customer"}
            </button>
          </div>

          {showCustomerForm && (
            <div className="grid gap-3 rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3 sm:col-span-2 sm:grid-cols-4">
              <input placeholder="Customer name" value={newCustomer.name} onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} className={inputClass} />
              <input placeholder="Handle" value={newCustomer.handle} onChange={(e) => setNewCustomer((c) => ({ ...c, handle: e.target.value }))} className={inputClass} />
              <input type="email" placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))} className={inputClass} />
              <div className="flex gap-2">
                <LookupSelect value={newCustomer.customer_type} onChange={(v) => setNewCustomer((c) => ({ ...c, customer_type: v }))} options={customerTypeOptions.length ? customerTypeOptions : [{ label: "B2B", value: "b2b" }, { label: "B2C", value: "b2c" }, { label: "Special", value: "special" }]} className={inputClass} />
                <button type="button" onClick={addCustomer} disabled={creatingCustomer} className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60">{creatingCustomer ? "…" : "Add"}</button>
              </div>
            </div>
          )}

          {/* Order details */}
          <label className="grid gap-1 text-sm font-medium">
            Type
            <LookupSelect value={fulfillmentType} onChange={setFulfillmentType} options={fulfillmentOptions.length ? fulfillmentOptions : [{ label: "Shipping", value: "shipping" }]} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Order date
            <input required type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Business channel
            <LookupSelect value={businessChannel} onChange={setBusinessChannel} options={channelOptions.length ? channelOptions : [{ label: "Retail B2C", value: "retail_b2c" }]} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Source
            <LookupSelect value={source} onChange={setSource} options={sourceOptions} placeholder="Not specified" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Priority
            <LookupSelect value={priority} onChange={setPriority} options={priorityOptions.length ? priorityOptions : [{ label: "Normal", value: "normal" }]} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Owner
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
              <option value="">Current user (default)</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Shipping cost
            <input type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className={inputClass} />
          </label>

          {/* PO links */}
          <fieldset className="grid gap-2 rounded-lg border border-border p-3 sm:col-span-2">
            <legend className="px-1 text-sm font-medium">Link purchase orders</legend>
            {linkedPoIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {linkedPoIds.map((id) => {
                  const po = purchaseOrders.find((p) => p.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {po?.po_number ?? id.slice(0, 8)}
                      <button type="button" onClick={() => setLinkedPoIds((cur) => cur.filter((i) => i !== id))} className="ml-0.5 text-primary/60 hover:text-primary">x</button>
                    </span>
                  );
                })}
              </div>
            )}
            <input placeholder="Search purchase orders..." value={poSearch} onChange={(e) => setPoSearch(e.target.value)} className={inputClass} />
            {poSearch && (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
                {purchaseOrders
                  .filter((po) => !linkedPoIds.includes(po.id) && (
                    po.po_number.toLowerCase().includes(poSearch.toLowerCase()) ||
                    (po.supplier?.name ?? "").toLowerCase().includes(poSearch.toLowerCase())
                  ))
                  .slice(0, 10)
                  .map((po) => (
                    <button key={po.id} type="button" onClick={() => { setLinkedPoIds((cur) => [...cur, po.id]); setPoSearch(""); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted">
                      <span className="font-medium">{po.po_number}</span>
                      <span className="text-muted-foreground">{po.supplier?.name ?? "Unknown"} · {po.status}</span>
                    </button>
                  ))}
                {purchaseOrders.filter((po) => !linkedPoIds.includes(po.id) && (po.po_number.toLowerCase().includes(poSearch.toLowerCase()) || (po.supplier?.name ?? "").toLowerCase().includes(poSearch.toLowerCase()))).length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">No matching purchase orders</p>
                )}
              </div>
            )}
          </fieldset>
        </div>

        {/* Items */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Items</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowProductForm((v) => !v)} className="text-sm font-medium text-primary hover:underline">Add product</button>
              <button type="button" onClick={() => setLines((c) => [...c, { product_id: "", quantity: "1", unit_price: "" }])} className="text-sm font-medium text-primary hover:underline">Add line</button>
            </div>
          </div>
          {showProductForm && (
            <div className="mb-3 grid gap-3 rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input placeholder="Product name" value={newProduct.name} onChange={(e) => setNewProduct((c) => ({ ...c, name: e.target.value }))} className={inputClass} />
              <input placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct((c) => ({ ...c, category: e.target.value }))} className={inputClass} />
              <input placeholder="SKU" value={newProduct.sku} onChange={(e) => setNewProduct((c) => ({ ...c, sku: e.target.value }))} className={inputClass} />
              <button type="button" onClick={addProduct} disabled={creatingProduct} className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60">{creatingProduct ? "…" : "Add"}</button>
            </div>
          )}
          {lines.length > 0 && (
            <div className="mb-1 grid gap-2 sm:grid-cols-[1fr_7rem_8rem_4rem]">
              <p className="text-xs font-medium text-muted-foreground text-left">Product name</p>
              <p className="text-xs font-medium text-muted-foreground text-left">Quantity</p>
              <p className="text-xs font-medium text-muted-foreground text-left">Sale price</p>
              <span />
            </div>
          )}
          <div className="space-y-2">
            {lines.map((line, index) => {
              const stock = line.product_id ? stockByProductId.get(line.product_id) : undefined;
              return (
                <div key={index} className="space-y-1">
                  <div className="grid gap-2 sm:grid-cols-[1fr_7rem_8rem_4rem]">
                    <select value={line.product_id} onChange={(e) => updateLine(index, { product_id: e.target.value })} className={inputClass}>
                      <option value="">Select product</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min="1" step="1" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} className={inputClass} placeholder="Qty" />
                    <input type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, { unit_price: e.target.value })} className={inputClass} placeholder="Sale price" />
                    <button type="button" onClick={() => setLines((c) => c.length === 1 ? c : c.filter((_, i) => i !== index))} disabled={lines.length === 1} className="rounded-md px-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-40">Remove</button>
                  </div>
                  {stock && stock.avg_cost > 0 && (
                    <p className="pl-1 text-xs text-muted-foreground">
                      AC: ${stock.avg_cost.toFixed(2)} · Recommended: ${(stock.avg_cost * 1.25 * 1.14).toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping details + Notes */}
        <label className="mt-5 grid gap-1 text-sm font-medium">
          Shipping details
          <textarea value={shippingDetails} onChange={(e) => setShippingDetails(e.target.value)} rows={2} placeholder="Shipping address or delivery instructions" className="rounded-md border border-input bg-background px-3 py-2 font-normal" />
        </label>
        <label className="mt-4 grid gap-1 text-sm font-medium">
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-md border border-input bg-background px-3 py-2 font-normal" />
        </label>

        {!createdOrder && (
          <>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Creating…" : "Create Sales Order"}</button>
            </div>
          </>
        )}

        {createdOrder && (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-4">
            <p className="text-sm font-medium text-emerald-700">Sales order {createdOrder.number} created successfully.</p>
            {createdOrder.stockWarnings.length > 0 && (
              <div className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/50 p-3">
                <p className="text-xs font-semibold text-amber-700">Stock warnings</p>
                <ul className="mt-1 space-y-0.5">
                  {createdOrder.stockWarnings.map((w) => (
                    <li key={w.product_id} className="text-xs text-amber-600">{w.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {createdOrder.stockWarnings.length > 0 && (
                <button type="button" onClick={() => setShowCreatePo(true)} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Create linked Purchase Order</button>
              )}
              <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Done</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
