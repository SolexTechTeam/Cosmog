"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, PackagePlus, Plus, Trash2 } from "lucide-react";
import { CategoryComboBox } from "@/components/ui/category-combobox";
import { Input, TextArea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Product, SaleOrder, Supplier } from "@/types";

export interface PurchaseLine {
  product_id: string;
  quantity_ordered: string;
  unit_cost: string;
}

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring";

interface SupplierStepData {
  supplierId: string;
  suppliers: Supplier[];
  fulfillmentType: string;
  orderDate: string;
  fulfillmentOptions: { label: string; value: string }[];
  lockFulfillmentType: boolean;
  showSupplierForm: boolean;
  newSupplier: { name: string; email: string; phone: string; default_lead_days: string };
  creatingSupplier: boolean;
}

interface SupplierStepActions {
  setSupplierId: (value: string) => void;
  setFulfillmentType: (value: string) => void;
  setOrderDate: (value: string) => void;
  setShowSupplierForm: (value: (current: boolean) => boolean) => void;
  setNewSupplier: (value: (current: SupplierStepData["newSupplier"]) => SupplierStepData["newSupplier"]) => void;
  addSupplier: () => void;
}

export function SupplierOrderStep({ data, actions }: { data: SupplierStepData; actions: SupplierStepActions }) {
  return (
    <section className="rounded-xl border border-[#f2e7eb] bg-[#fff9fa] p-4 sm:p-5" aria-label="Supplier and order details">
      <StepHeading title="Who are you ordering from?" description="Choose the supplier and set the basic order details." />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 id="supplier-heading" className="text-sm font-semibold">Supplier</h3>
            <button type="button" onClick={() => actions.setShowSupplierForm((current) => !current)} className="text-sm font-medium text-primary hover:underline">
              {data.showSupplierForm ? "Cancel adding supplier" : "+ Add supplier"}
            </button>
          </div>
          <Select required value={data.supplierId} onChange={(event) => actions.setSupplierId(event.target.value)} className={inputClass} aria-label="Supplier">
            <option value="">Select supplier</option>
            {data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </Select>
          {data.showSupplierForm && <NewSupplierForm data={data} actions={actions} />}
        </div>
        <Field label="Purchase order type" htmlFor="po-fulfillment-type">
          <Select id="po-fulfillment-type" value={data.fulfillmentType} onChange={(event) => actions.setFulfillmentType(event.target.value)} disabled={data.lockFulfillmentType} className={inputClass}>
            {(data.fulfillmentOptions.length ? data.fulfillmentOptions : [{ label: "Warehouse", value: "warehouse" }, { label: "Direct delivery", value: "direct_delivery" }]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          {data.lockFulfillmentType && <p className="mt-1 text-xs text-muted-foreground">This type is set by the linked Sales Order.</p>}
        </Field>
        <Field label="Order date" htmlFor="po-order-date">
          <Input id="po-order-date" required type="date" value={data.orderDate} onChange={(event) => actions.setOrderDate(event.target.value)} className={inputClass} />
        </Field>
      </div>
    </section>
  );
}

function NewSupplierForm({ data, actions }: { data: SupplierStepData; actions: SupplierStepActions }) {
  return (
    <div className="mt-4 grid gap-3 rounded-md border border-dashed border-border bg-muted/40 p-3 sm:grid-cols-2">
      <Input aria-label="Supplier name" placeholder="Supplier name" value={data.newSupplier.name} onChange={(event) => actions.setNewSupplier((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
      <Input aria-label="Supplier email" type="email" placeholder="Email (optional)" value={data.newSupplier.email} onChange={(event) => actions.setNewSupplier((current) => ({ ...current, email: event.target.value }))} className={inputClass} />
      <Input aria-label="Supplier phone" placeholder="Phone (optional)" value={data.newSupplier.phone} onChange={(event) => actions.setNewSupplier((current) => ({ ...current, phone: event.target.value }))} className={inputClass} />
      <div className="flex gap-2">
        <Input aria-label="Default lead time in days" type="number" min="1" step="1" placeholder="Lead days" value={data.newSupplier.default_lead_days} onChange={(event) => actions.setNewSupplier((current) => ({ ...current, default_lead_days: event.target.value }))} className={inputClass} />
        <button type="button" onClick={actions.addSupplier} disabled={data.creatingSupplier} className="shrink-0 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60">{data.creatingSupplier ? "Adding…" : "Add supplier"}</button>
      </div>
    </div>
  );
}

interface ItemsStepData {
  saleOrders: SaleOrder[];
  linkedSaleOrderIds: string[];
  products: Product[];
  lines: PurchaseLine[];
  newProduct: { name: string; category: string; sku: string; low_stock_threshold: string };
  existingCategories: string[];
  showProductForm: boolean;
  creatingProduct: boolean;
  fxRate: number | null;
}

interface ItemsStepActions {
  setLinkedSaleOrderIds: (value: (current: string[]) => string[]) => void;
  setLines: (value: (current: PurchaseLine[]) => PurchaseLine[]) => void;
  updateLine: (index: number, changes: Partial<PurchaseLine>) => void;
  setNewProduct: (value: (current: ItemsStepData["newProduct"]) => ItemsStepData["newProduct"]) => void;
  setShowProductForm: (value: (current: boolean) => boolean) => void;
  addProduct: () => void;
}

export function ItemsAndLinksStep({ data, actions }: { data: ItemsStepData; actions: ItemsStepActions }) {
  const [search, setSearch] = useState("");
  const linkedOrders = data.saleOrders.filter((saleOrder) => data.linkedSaleOrderIds.includes(saleOrder.id));
  const matches = data.saleOrders.filter((saleOrder) => (
    !data.linkedSaleOrderIds.includes(saleOrder.id)
    && (saleOrder.so_number.toLowerCase().includes(search.toLowerCase()) || (saleOrder.customer?.name ?? "").toLowerCase().includes(search.toLowerCase()))
  )).slice(0, 8);

  function toggleLinkedOrder(id: string) {
    actions.setLinkedSaleOrderIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section className="space-y-4 rounded-xl border border-[#f2e7eb] bg-[#fff9fa] p-4 sm:p-5" aria-label="Sales orders and purchase order items">
      <StepHeading title="Connect demand and add products" description="Link relevant Sales Orders, then enter the quantities and supplier costs for this purchase." />
      <section className="space-y-3 rounded-lg border border-border bg-white p-4" aria-labelledby="linked-orders-heading">
        <div>
          <h3 id="linked-orders-heading" className="text-sm font-semibold">Linked Sales Orders <span className="font-normal text-muted-foreground">(optional)</span></h3>
          <p className="mt-1 text-xs text-muted-foreground">Linking an order does not change your PO item quantities. Add or adjust items below.</p>
        </div>
        {linkedOrders.length > 0 && <div className="flex flex-wrap gap-2">{linkedOrders.map((saleOrder) => (
          <span key={saleOrder.id} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {saleOrder.so_number} · {saleOrder.customer?.name ?? "Unknown customer"}
            <button type="button" aria-label={`Unlink ${saleOrder.so_number}`} onClick={() => toggleLinkedOrder(saleOrder.id)} className="rounded-full px-1 text-primary/70 hover:bg-primary/10 hover:text-primary">×</button>
          </span>
        ))}</div>}
        <div className="relative">
          <Input aria-label="Search Sales Orders" placeholder="Search by SO number or customer…" value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} />
          {search && <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-background p-1 shadow-lg">
            {matches.length > 0 ? matches.map((saleOrder) => (
              <button key={saleOrder.id} type="button" onClick={() => { toggleLinkedOrder(saleOrder.id); setSearch(""); }} className="flex w-full flex-col rounded px-3 py-2 text-left text-sm hover:bg-muted sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{saleOrder.so_number} · {saleOrder.customer?.name ?? "Unknown customer"}</span>
                <span className="text-xs capitalize text-muted-foreground">{saleOrder.status.replace(/_/g, " ")}</span>
              </button>
            )) : <p className="px-3 py-2 text-sm text-muted-foreground">No matching open Sales Orders.</p>}
          </div>}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="po-items-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="po-items-heading" className="text-sm font-semibold">Purchase order items</h3>
            <p className="mt-1 text-xs text-muted-foreground">Add products, quantities, and supplier costs for this order.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => actions.setShowProductForm((current) => !current)} aria-expanded={data.showProductForm} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-foreground hover:bg-muted">
              <PackagePlus aria-hidden="true" className="size-4 text-primary" />
              {data.showProductForm ? "Close product form" : "Create product"}
            </button>
            <button type="button" onClick={() => actions.setLines((current) => [...current, { product_id: "", quantity_ordered: "1", unit_cost: "" }])} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[#ea580c]">
              <Plus aria-hidden="true" className="size-4" />
              Add line item
            </button>
          </div>
        </div>
        {data.showProductForm && <NewProductForm data={data} actions={actions} />}
        <div className="space-y-2">
          {data.lines.map((line, index) => <PurchaseLineEditor key={index} index={index} line={line} products={data.products} fxRate={data.fxRate} canRemove={data.lines.length > 1} onChange={actions.updateLine} onRemove={() => actions.setLines((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current)} />)}
        </div>
      </section>
    </section>
  );
}

function NewProductForm({ data, actions }: { data: ItemsStepData; actions: ItemsStepActions }) {
  return (
    <section className="rounded-lg border border-border bg-white p-4" aria-label="Create a product">
      <h4 className="text-sm font-semibold">New product details</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Product name" htmlFor="new-po-product-name">
          <Input id="new-po-product-name" value={data.newProduct.name} onChange={(event) => actions.setNewProduct((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
        </Field>
        <label className="grid gap-1.5 text-sm font-medium">Category<CategoryComboBox value={data.newProduct.category} onChange={(value) => actions.setNewProduct((current) => ({ ...current, category: value }))} categories={data.existingCategories} className={inputClass} /></label>
        <Field label="SKU (optional)" htmlFor="new-po-product-sku">
          <Input id="new-po-product-sku" value={data.newProduct.sku} onChange={(event) => actions.setNewProduct((current) => ({ ...current, sku: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Low stock threshold" htmlFor="new-po-product-threshold">
          <Input id="new-po-product-threshold" type="number" min="0" step="1" value={data.newProduct.low_stock_threshold} onChange={(event) => actions.setNewProduct((current) => ({ ...current, low_stock_threshold: event.target.value }))} className={inputClass} />
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={actions.addProduct} disabled={data.creatingProduct} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[#ea580c] disabled:opacity-60">
          <PackagePlus aria-hidden="true" className="size-4" />
          {data.creatingProduct ? "Creating…" : "Add product to order"}
        </button>
      </div>
    </section>
  );
}

function PurchaseLineEditor({ index, line, products, fxRate, canRemove, onChange, onRemove }: {
  index: number;
  line: PurchaseLine;
  products: Product[];
  fxRate: number | null;
  canRemove: boolean;
  onChange: (index: number, changes: Partial<PurchaseLine>) => void;
  onRemove: () => void;
}) {
  const selectedProduct = products.find((product) => product.id === line.product_id);
  const total = Number(line.quantity_ordered) * Number(line.unit_cost);
  const productId = `po-line-${index + 1}-product`;
  const quantityId = `po-line-${index + 1}-quantity`;
  const costId = `po-line-${index + 1}-unit-cost`;

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto] sm:items-end">
      <Field label={`Product ${index + 1}`} htmlFor={productId}>
        <Select id={productId} searchable required value={line.product_id} onChange={(event) => onChange(index, { product_id: event.target.value })} className={inputClass}>
          <option value="">Select product</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.category}</option>)}
        </Select>
      </Field>
      <Field label="Quantity" htmlFor={quantityId}>
        <Input id={quantityId} type="number" min="1" step="1" value={line.quantity_ordered} onChange={(event) => onChange(index, { quantity_ordered: event.target.value })} className={inputClass} />
      </Field>
      <Field htmlFor={costId} label="Unit cost">
        <span className="relative block">
          <Input id={costId} type="number" min="0" step="0.01" value={line.unit_cost} onChange={(event) => onChange(index, { unit_cost: event.target.value })} className={`${inputClass} pr-14`} placeholder="0.00" />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground">SGD</span>
        </span>
      </Field>
      <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove item ${index + 1}`} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:mb-0.5">
        <Trash2 aria-hidden="true" className="size-4" />
        <span className="sm:sr-only">Remove</span>
      </button>
      {selectedProduct && <p className="text-xs text-muted-foreground sm:col-span-4">Line total: SGD {Number.isFinite(total) ? total.toFixed(2) : "—"}{fxRate ? ` · Approx. AUD ${(total * fxRate).toFixed(2)}` : ""}</p>}
    </div>
  );
}

interface ReviewStepData {
  supplier?: Supplier;
  fulfillmentType: string;
  orderDate: string;
  linkedSaleOrders: SaleOrder[];
  products: Product[];
  lines: PurchaseLine[];
  shippingCost: string;
  taxAmount: string;
  notes: string;
  fxRate: number | null;
}

interface ReviewStepActions {
  setShippingCost: (value: string) => void;
  setTaxAmount: (value: string) => void;
  setNotes: (value: string) => void;
}

export function ReviewAndCostsStep({ data, actions }: { data: ReviewStepData; actions: ReviewStepActions }) {
  const itemsSgd = data.lines.reduce((sum, line) => sum + Number(line.quantity_ordered) * Number(line.unit_cost), 0);
  const freightSgd = Number(data.shippingCost) || 0;
  const taxSgd = Number(data.taxAmount) || 0;
  const totalSgd = itemsSgd + freightSgd + taxSgd;

  return (
    <div>
      <section className="space-y-4 rounded-lg border border-[#dfe6ef] bg-[#f4f7fb] p-3 sm:p-4" aria-label="Purchase order review">
        <StepHeading title="Review before creating" description="Check the order details and add any remaining costs or receiving notes." />
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-4">
            <OrderOverview data={data} />
            <LineItemSummary data={data} />
          </div>
          <aside className="flex h-full flex-col gap-4">
            <section className="rounded-lg border border-[#dfe6ef] bg-white p-3" aria-labelledby="po-costs-heading">
              <div className="mb-3 flex items-center gap-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                <h3 id="po-costs-heading" className="text-xs font-semibold uppercase tracking-wide">Shipping and tax</h3>
                <span className="ml-auto text-xs text-muted-foreground">SGD</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label htmlFor="po-shipping-cost" className="grid gap-1 text-xs font-medium">Freight cost
                  <Input id="po-shipping-cost" type="number" min="0" step="0.01" value={data.shippingCost} onChange={(event) => actions.setShippingCost(event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label htmlFor="po-tax-amount" className="grid gap-1 text-xs font-medium">Tax
                  <Input id="po-tax-amount" type="number" min="0" step="0.01" value={data.taxAmount} onChange={(event) => actions.setTaxAmount(event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
              </div>
            </section>
            <details className="group rounded-lg border border-[#dfe6ef] bg-white">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center justify-between gap-3">Notes<ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></span>
              </summary>
              <div className="space-y-4 border-t border-[#e7edf4] px-4 py-4">
                <Field label="Notes (optional)" htmlFor="po-notes"><TextArea id="po-notes" rows={2} value={data.notes} onChange={(event) => actions.setNotes(event.target.value)} placeholder="Notes for the team" className="w-full" /></Field>
              </div>
            </details>
            <div className="mt-auto pt-1">
              <CostSummary itemsSgd={itemsSgd} freightSgd={freightSgd} taxSgd={taxSgd} totalSgd={totalSgd} fxRate={data.fxRate} />
            </div>
          </aside>
        </div>
        <p className="px-1 text-xs text-muted-foreground">This action creates a draft purchase order. You can confirm it from the order details when it is ready.</p>
      </section>
    </div>
  );
}

function OrderOverview({ data }: { data: ReviewStepData }) {
  return (
    <section className="rounded-lg border border-[#dfe6ef] bg-white p-4" aria-labelledby="po-review-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id="po-review-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />Supplier and order details</h3>
        <span className="rounded-md border border-[#e3e9f1] bg-[#f5f8fc] px-2 py-1 text-xs font-medium text-muted-foreground">Draft</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <ReviewDatum label="Supplier" value={data.supplier?.name ?? "—"} />
        <ReviewDatum label="Type" value={data.fulfillmentType.replace(/_/g, " ")} capitalize />
        <ReviewDatum label="Order date" value={data.orderDate} />
        <ReviewDatum label="Linked Sales Orders" value={data.linkedSaleOrders.length ? data.linkedSaleOrders.map((saleOrder) => saleOrder.so_number).join(", ") : "None"} />
      </dl>
    </section>
  );
}

function ReviewDatum({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className={`mt-1 break-words text-sm font-medium ${capitalize ? "capitalize" : ""}`}>{value}</dd></div>;
}

function LineItemSummary({ data }: { data: ReviewStepData }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#dfe6ef] bg-white" aria-labelledby="po-review-items-heading">
      <h3 id="po-review-items-heading" className="flex items-center gap-2 border-b border-[#dfe6ef] bg-[#f5f8fc] px-4 py-3 text-xs font-semibold uppercase tracking-wide"><span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />Line items configured ({data.lines.length})</h3>
      <div className="grid grid-cols-[minmax(0,1fr)_3rem_5rem_6rem] gap-2 border-b border-[#e7edf4] px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Product item</span><span className="text-right">Qty</span><span className="text-right">Cost (SGD)</span><span className="text-right">Total (SGD)</span>
      </div>
      <div className="divide-y divide-[#e7edf4]">
        {data.lines.map((line, index) => {
          const product = data.products.find((item) => item.id === line.product_id);
          const total = Number(line.quantity_ordered) * Number(line.unit_cost);
          return <div key={`${line.product_id}-${index}`} className="grid grid-cols-[minmax(0,1fr)_3rem_5rem_6rem] items-center gap-2 px-4 py-3 text-sm">
            <span className="min-w-0 truncate font-medium">{product?.name ?? "Unknown product"}</span>
            <span className="text-right tabular-nums">{line.quantity_ordered}</span>
            <span className="text-right tabular-nums">{Number(line.unit_cost).toFixed(2)}</span>
            <span className="text-right font-semibold tabular-nums">{total.toFixed(2)}</span>
          </div>;
        })}
      </div>
    </section>
  );
}

function CostSummary({ itemsSgd, freightSgd, taxSgd, totalSgd, fxRate }: { itemsSgd: number; freightSgd: number; taxSgd: number; totalSgd: number; fxRate: number | null }) {
  const currency = fxRate ? "AUD" : "SGD";
  const multiplier = fxRate ?? 1;
  const rows = [
    { label: "Items subtotal", value: itemsSgd },
    { label: "Freight", value: freightSgd },
    { label: "Tax", value: taxSgd },
  ];
  return (
    <section className="overflow-hidden rounded-lg border border-[#dfe6ef] bg-white" aria-label="Purchase order cost summary">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#dfe6ef] bg-[#f5f8fc] px-4 py-3">
        <div><h3 className="text-xs font-semibold uppercase tracking-wide">Cost summary</h3><p className="mt-1 text-xs text-muted-foreground">All costs entered in SGD</p></div>
        {fxRate && <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">1 SGD = {fxRate.toFixed(4)} AUD</span>}
      </div>
      <dl className="space-y-2 px-4 py-4 text-sm">
        {rows.map((row) => <div key={row.label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{row.label} ({currency})</dt><dd className="tabular-nums">{currency} {(row.value * multiplier).toFixed(2)}</dd></div>)}
        <div className="-mx-4 mt-3 border-t border-[#eee4da] bg-[#fff8f1] px-4 py-4">
          <div className="flex items-baseline justify-between gap-3 font-semibold"><dt className="text-xs uppercase tracking-wide text-[#7c4a27]">Total payable ({currency})</dt><dd className="text-lg tabular-nums text-primary">{currency} {(totalSgd * multiplier).toFixed(2)}</dd></div>
          {fxRate && <p className="mt-1 text-right text-xs text-muted-foreground">Equivalent to SGD {totalSgd.toFixed(2)}</p>}
        </div>
      </dl>
    </section>
  );
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-base font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}
