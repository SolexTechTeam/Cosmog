"use client";

import { useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ChevronDown, PackagePlus, Plus, Trash2 } from "lucide-react";
import CustomerAddressFields from "@/components/common/CustomerAddressFields";
import { CategoryComboBox } from "@/components/ui/category-combobox";
import { Input, TextArea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Customer, CustomerAddress, Product, PricingConfig, Profile, PurchaseOrder, StockStatus } from "@/types";

export interface SaleLine {
  product_id: string;
  quantity: string;
  unit_price: string;
}

export interface NewCustomer {
  name: string;
  handle: string;
  email: string;
  customer_type: string;
  address: CustomerAddress;
}

export interface NewProduct {
  name: string;
  category: string;
  sku: string;
  low_stock_threshold: string;
}

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring";
type LookupOption = { label: string; value: string };

interface CustomerStepData {
  customers: Customer[];
  customerId: string;
  ownerId: string;
  profiles: Profile[];
  fulfillmentType: string;
  fulfillmentOptions: LookupOption[];
  orderDate: string;
  businessChannel: string;
  channelOptions: LookupOption[];
  source: string;
  sourceOptions: LookupOption[];
  priority: string;
  priorityOptions: LookupOption[];
  customerTypeOptions: LookupOption[];
  showCustomerForm: boolean;
  newCustomer: NewCustomer;
  creatingCustomer: boolean;
}

interface CustomerStepActions {
  selectCustomer: (id: string) => void;
  setOwnerId: (id: string) => void;
  setFulfillmentType: (value: string) => void;
  setOrderDate: (value: string) => void;
  setBusinessChannel: (value: string) => void;
  setSource: (value: string) => void;
  setPriority: (value: string) => void;
  setShowCustomerForm: Dispatch<SetStateAction<boolean>>;
  setNewCustomer: Dispatch<SetStateAction<NewCustomer>>;
  addCustomer: () => void;
}

export function SalesOrderCustomerStep({ data, actions }: { data: CustomerStepData; actions: CustomerStepActions }) {
  const fulfillmentOptions = data.fulfillmentOptions.length ? data.fulfillmentOptions : [{ label: "Shipping", value: "shipping" }];
  const businessChannelOptions = data.channelOptions.length ? data.channelOptions : [{ label: "Retail B2C", value: "retail_b2c" }];
  const priorityOptions = data.priorityOptions.length ? data.priorityOptions : [{ label: "Normal", value: "normal" }];
  const customerTypes = data.customerTypeOptions.length ? data.customerTypeOptions : [
    { label: "B2B", value: "b2b" },
    { label: "B2C", value: "b2c" },
    { label: "Special", value: "special" },
  ];

  return (
    <section className="space-y-4 rounded-xl border border-[#f2e7eb] bg-[#fff9fa] p-4 sm:p-5" aria-label="Customer and order setup">
      <StepHeading title="Who is this order for?" description="Choose the customer and set the order details." />

      <section className="rounded-lg border border-[#eee4e8] bg-white p-4" aria-labelledby="so-customer-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="so-customer-heading" className="text-sm font-semibold">Customer</h3>
          <button type="button" onClick={() => actions.setShowCustomerForm((current) => !current)} aria-expanded={data.showCustomerForm} className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
            {data.showCustomerForm ? "Close customer form" : "Add customer"}
          </button>
        </div>
        <Field label="Select customer" htmlFor="so-customer">
          <Select id="so-customer" required value={data.customerId} onChange={(event) => actions.selectCustomer(event.target.value)} className={inputClass}>
            <option value="">Choose a customer</option>
            {data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.handle ? ` (${customer.handle})` : ""}</option>)}
          </Select>
        </Field>
        {data.showCustomerForm && <NewCustomerForm data={data} actions={actions} customerTypes={customerTypes} />}
      </section>

      <section className="rounded-lg border border-[#eee4e8] bg-white p-4" aria-labelledby="so-order-details-heading">
        <h3 id="so-order-details-heading" className="mb-3 text-sm font-semibold">Order details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fulfillment type" htmlFor="so-fulfillment-type">
            <LookupSelect id="so-fulfillment-type" value={data.fulfillmentType} onChange={actions.setFulfillmentType} options={fulfillmentOptions} />
          </Field>
          <Field label="Order date" htmlFor="so-order-date">
            <Input id="so-order-date" required type="date" value={data.orderDate} onChange={(event) => actions.setOrderDate(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Business channel" htmlFor="so-business-channel">
            <LookupSelect id="so-business-channel" value={data.businessChannel} onChange={actions.setBusinessChannel} options={businessChannelOptions} />
          </Field>
          <Field label="Source (optional)" htmlFor="so-source">
            <LookupSelect id="so-source" value={data.source} onChange={actions.setSource} options={data.sourceOptions} placeholder="Not specified" />
          </Field>
          <Field label="Priority" htmlFor="so-priority">
            <LookupSelect id="so-priority" value={data.priority} onChange={actions.setPriority} options={priorityOptions} />
          </Field>
          <Field label="Order owner" htmlFor="so-owner">
            <Select id="so-owner" value={data.ownerId} onChange={(event) => actions.setOwnerId(event.target.value)} className={inputClass}>
              <option value="">Current user (default)</option>
              {data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </Select>
          </Field>
        </div>
        {data.fulfillmentType === "direct_to_customer" && (
          <p className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            This order ships from a supplier directly to the customer. It skips warehouse allocation and can link only to direct-delivery purchase orders.
          </p>
        )}
      </section>
    </section>
  );
}

function NewCustomerForm({ data, actions, customerTypes }: { data: CustomerStepData; actions: CustomerStepActions; customerTypes: LookupOption[] }) {
  return (
    <section className="mt-4 rounded-lg border border-dashed border-border bg-[#fff9fa] p-4" aria-label="New customer details">
      <h4 className="text-sm font-semibold">New customer details</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Customer name" htmlFor="so-new-customer-name">
          <Input id="so-new-customer-name" value={data.newCustomer.name} onChange={(event) => actions.setNewCustomer((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Handle (optional)" htmlFor="so-new-customer-handle">
          <Input id="so-new-customer-handle" value={data.newCustomer.handle} onChange={(event) => actions.setNewCustomer((current) => ({ ...current, handle: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Email (optional)" htmlFor="so-new-customer-email">
          <Input id="so-new-customer-email" type="email" value={data.newCustomer.email} onChange={(event) => actions.setNewCustomer((current) => ({ ...current, email: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Customer type" htmlFor="so-new-customer-type">
          <LookupSelect id="so-new-customer-type" value={data.newCustomer.customer_type} onChange={(value) => actions.setNewCustomer((current) => ({ ...current, customer_type: value }))} options={customerTypes} />
        </Field>
        <div className="sm:col-span-2">
          <CustomerAddressFields value={data.newCustomer.address} onChange={(address) => actions.setNewCustomer((current) => ({ ...current, address }))} />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={actions.addCustomer} disabled={data.creatingCustomer} className="inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[#ea580c] disabled:opacity-60">
          {data.creatingCustomer ? "Adding…" : "Add customer"}
        </button>
      </div>
    </section>
  );
}

interface ItemsStepData {
  fulfillmentType: string;
  purchaseOrders: PurchaseOrder[];
  linkedPoIds: string[];
  products: Product[];
  lines: SaleLine[];
  stockByProductId: Map<string, StockStatus>;
  pricingConfig?: PricingConfig | null;
  gstRate: string;
  newProduct: NewProduct;
  existingCategories: string[];
  showProductForm: boolean;
  creatingProduct: boolean;
}

interface ItemsStepActions {
  setLinkedPoIds: Dispatch<SetStateAction<string[]>>;
  setLines: Dispatch<SetStateAction<SaleLine[]>>;
  updateLine: (index: number, changes: Partial<SaleLine>) => void;
  setNewProduct: Dispatch<SetStateAction<NewProduct>>;
  setShowProductForm: Dispatch<SetStateAction<boolean>>;
  setGstRate: (value: string | null) => void;
  addProduct: () => void;
}

export function SalesOrderItemsStep({ data, actions }: { data: ItemsStepData; actions: ItemsStepActions }) {
  const [poSearch, setPoSearch] = useState("");
  const linkedOrders = data.purchaseOrders.filter((order) => data.linkedPoIds.includes(order.id));
  const matches = data.purchaseOrders.filter((order) => (
    !data.linkedPoIds.includes(order.id)
    && (order.po_number.toLowerCase().includes(poSearch.toLowerCase()) || (order.supplier?.name ?? "").toLowerCase().includes(poSearch.toLowerCase()))
  )).slice(0, 8);
  const gstRate = Number(data.gstRate);

  function toggleLinkedPo(id: string) {
    actions.setLinkedPoIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section className="space-y-4 rounded-xl border border-[#f2e7eb] bg-[#fff9fa] p-4 sm:p-5" aria-label="Purchase orders and sale items">
      <StepHeading title="Add products and connect supply" description="Build the order items, then link any purchase orders that will cover them." />

      <section className="space-y-3 rounded-lg border border-[#eee4e8] bg-white p-4" aria-labelledby="so-linked-pos-heading">
        <div>
          <h3 id="so-linked-pos-heading" className="text-sm font-semibold">Linked purchase orders <span className="font-normal text-muted-foreground">(optional)</span></h3>
          <p className="mt-1 text-xs text-muted-foreground">{data.fulfillmentType === "direct_to_customer" ? "Only direct-delivery purchase orders can be linked to this order." : "Link purchase orders that will supply these items. Linking does not change your quantities."}</p>
        </div>
        {linkedOrders.length > 0 && <div className="flex flex-wrap gap-2">{linkedOrders.map((order) => (
          <span key={order.id} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {order.po_number} · {order.supplier?.name ?? "Supplier"}
            <button type="button" aria-label={`Unlink ${order.po_number}`} onClick={() => toggleLinkedPo(order.id)} className="rounded-full px-1 text-primary/70 hover:bg-primary/10 hover:text-primary">×</button>
          </span>
        ))}</div>}
        <div className="relative">
          <Field label="Search purchase orders" htmlFor="so-po-search">
            <Input id="so-po-search" placeholder="Search by PO number or supplier" value={poSearch} onChange={(event) => setPoSearch(event.target.value)} className={inputClass} />
          </Field>
          {poSearch && <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-background p-1 shadow-lg">
            {matches.length > 0 ? matches.map((order) => (
              <button key={order.id} type="button" onClick={() => { toggleLinkedPo(order.id); setPoSearch(""); }} className="flex w-full flex-col rounded px-3 py-2 text-left text-sm hover:bg-muted sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{order.po_number} · {order.supplier?.name ?? "Supplier"}</span>
                <span className="text-xs capitalize text-muted-foreground">{order.status}</span>
              </button>
            )) : <p className="px-3 py-2 text-sm text-muted-foreground">No matching purchase orders.</p>}
          </div>}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="so-items-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 id="so-items-heading" className="text-sm font-semibold">Sales order items</h3>
            <p className="mt-1 text-xs text-muted-foreground">Sale prices are entered in AUD. Selecting a product suggests a price using cost, margin, and GST.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
            <button type="button" onClick={() => actions.setShowProductForm((current) => !current)} aria-expanded={data.showProductForm} className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-white px-3 text-sm font-medium text-foreground hover:bg-muted">
              <PackagePlus aria-hidden="true" className="size-4 text-primary" />
              {data.showProductForm ? "Close product form" : "Create product"}
            </button>
            <button type="button" onClick={() => actions.setLines((current) => [...current, { product_id: "", quantity: "1", unit_price: "" }])} className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[#ea580c]">
              <Plus aria-hidden="true" className="size-4" />
              Add line item
            </button>
          </div>
        </div>
        {data.showProductForm && <NewProductForm data={data} actions={actions} />}
        <div className="space-y-2">
          {data.lines.map((line, index) => <SaleLineEditor key={index} index={index} line={line} products={data.products} stock={data.stockByProductId.get(line.product_id)} pricingConfig={data.pricingConfig} gstRate={Number.isFinite(gstRate) ? gstRate : 0} showStock={data.fulfillmentType !== "direct_to_customer"} onChange={actions.updateLine} onRemove={() => actions.setLines((current) => current.length > 1 ? current.filter((_, lineIndex) => lineIndex !== index) : current)} canRemove={data.lines.length > 1} />)}
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
        <Field label="Product name" htmlFor="so-new-product-name">
          <Input id="so-new-product-name" value={data.newProduct.name} onChange={(event) => actions.setNewProduct((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
        </Field>
        <label className="grid gap-1.5 text-sm font-medium">Category<CategoryComboBox value={data.newProduct.category} onChange={(value) => actions.setNewProduct((current) => ({ ...current, category: value }))} categories={data.existingCategories} className={inputClass} /></label>
        <Field label="SKU (optional)" htmlFor="so-new-product-sku">
          <Input id="so-new-product-sku" value={data.newProduct.sku} onChange={(event) => actions.setNewProduct((current) => ({ ...current, sku: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Low stock threshold" htmlFor="so-new-product-threshold">
          <Input id="so-new-product-threshold" type="number" min="0" step="1" value={data.newProduct.low_stock_threshold} onChange={(event) => actions.setNewProduct((current) => ({ ...current, low_stock_threshold: event.target.value }))} className={inputClass} />
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

function SaleLineEditor({ index, line, products, stock, pricingConfig, gstRate, showStock, onChange, onRemove, canRemove }: {
  index: number;
  line: SaleLine;
  products: Product[];
  stock?: StockStatus;
  pricingConfig?: PricingConfig | null;
  gstRate: number;
  showStock: boolean;
  onChange: (index: number, changes: Partial<SaleLine>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const selectedProduct = products.find((product) => product.id === line.product_id);
  const total = Number(line.quantity) * Number(line.unit_price);
  const productId = `so-line-${index + 1}-product`;
  const quantityId = `so-line-${index + 1}-quantity`;
  const priceId = `so-line-${index + 1}-price`;
  const suggestedPrice = stock?.avg_cost
    ? stock.avg_cost * (pricingConfig?.margin_multiplier ?? 1.25) * (1 + gstRate)
    : null;

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto] sm:items-end">
      <Field label={`Product ${index + 1}`} htmlFor={productId}>
        <Select id={productId} searchable required value={line.product_id} onChange={(event) => onChange(index, { product_id: event.target.value })} className={inputClass}>
          <option value="">Choose a product</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.category}</option>)}
        </Select>
      </Field>
      <Field label="Quantity" htmlFor={quantityId}>
        <Input id={quantityId} type="number" min="1" step="1" value={line.quantity} onChange={(event) => onChange(index, { quantity: event.target.value })} className={inputClass} />
      </Field>
      <Field label="Sale price" htmlFor={priceId}>
        <span className="relative block">
          <Input id={priceId} type="number" min="0" step="0.01" value={line.unit_price} onChange={(event) => onChange(index, { unit_price: event.target.value })} className={`${inputClass} pr-14`} placeholder="0.00" />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground">AUD</span>
        </span>
      </Field>
      <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove item ${index + 1}`} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:mb-0.5">
        <Trash2 aria-hidden="true" className="size-4" />
        <span className="sm:sr-only">Remove</span>
      </button>
      {(selectedProduct || stock) && <div className="text-xs text-muted-foreground sm:col-span-4">
        {selectedProduct && <p>Line total: AUD {Number.isFinite(total) ? total.toFixed(2) : "—"}{suggestedPrice ? ` · Suggested unit price AUD ${suggestedPrice.toFixed(2)}` : ""}</p>}
        {showStock && stock && <p className="mt-1">Available: {stock.qty_available} · Incoming: {stock.qty_incoming} · {stock.stock_status}</p>}
      </div>}
    </div>
  );
}

interface ReviewStepData {
  customer?: Customer;
  fulfillmentType: string;
  orderDate: string;
  businessChannel: string;
  source: string;
  priority: string;
  ownerName: string;
  linkedPurchaseOrders: PurchaseOrder[];
  products: Product[];
  lines: SaleLine[];
  shippingCost: string;
  taxAmount: string;
  shippingDetails: string;
  shippingDetailsPreFilled: boolean;
  paymentNotes: string;
  notes: string;
}

interface ReviewStepActions {
  setShippingCost: (value: string) => void;
  setTaxAmount: (value: string) => void;
  setShippingDetails: (value: string) => void;
  setPaymentNotes: (value: string) => void;
  setNotes: (value: string) => void;
}

export function SalesOrderReviewStep({ data, actions }: { data: ReviewStepData; actions: ReviewStepActions }) {
  const itemsTotal = data.lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0), 0);
  const shippingTotal = Number(data.shippingCost) || 0;
  const orderTotal = itemsTotal + shippingTotal;

  return (
    <section className="space-y-4 rounded-xl border border-[#dfe6ef] bg-[#f4f7fb] p-3 sm:p-4" aria-label="Review sales order">
      <StepHeading title="Review before creating" description="Confirm the customer, items, and order total. Add any delivery or payment notes before creating the order." />
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <SalesOrderOverview data={data} />
          <SalesOrderItemSummary data={data} />
        </div>
        <aside className="flex h-full flex-col gap-3">
          <section className="rounded-lg border border-[#dfe6ef] bg-white p-3" aria-labelledby="so-cost-heading">
            <div className="mb-3 flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              <h3 id="so-cost-heading" className="text-xs font-semibold uppercase tracking-wide">Shipping</h3>
              <span className="ml-auto text-xs text-muted-foreground">AUD</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Shipping cost" htmlFor="so-shipping-cost">
                <Input id="so-shipping-cost" type="number" min="0" step="0.01" value={data.shippingCost} onChange={(event) => actions.setShippingCost(event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring" />
              </Field>
            </div>
          </section>

          <details className="group rounded-lg border border-[#dfe6ef] bg-white">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex items-center justify-between gap-3">Delivery, payment, and order notes<ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></span>
            </summary>
            <div className="space-y-3 border-t border-[#e7edf4] px-4 py-4">
              <Field label="Shipping details" htmlFor="so-shipping-details">
                <TextArea id="so-shipping-details" rows={2} value={data.shippingDetails} onChange={(event) => actions.setShippingDetails(event.target.value)} placeholder="Delivery address or instructions" className="w-full" />
                {data.shippingDetailsPreFilled && <span className="text-xs font-normal text-muted-foreground">Pre-filled from the customer address.</span>}
              </Field>
              <Field label="Payment notes" htmlFor="so-payment-notes">
                <TextArea id="so-payment-notes" rows={2} maxLength={2000} value={data.paymentNotes} onChange={(event) => actions.setPaymentNotes(event.target.value)} placeholder="Invoice, deposit, payment method, or follow-up" className="w-full" />
                <span className="text-xs font-normal text-muted-foreground">Visible in the order&apos;s payment card.</span>
              </Field>
              <Field label="Order notes" htmlFor="so-order-notes">
                <TextArea id="so-order-notes" rows={2} value={data.notes} onChange={(event) => actions.setNotes(event.target.value)} placeholder="Notes for your team" className="w-full" />
              </Field>
            </div>
          </details>

          <section className="mt-auto rounded-lg border border-[#dfe6ef] bg-white" aria-label="Sales order cost summary">
            <dl className="space-y-2 px-4 py-4 text-sm">
              <CostRow label="Items" amount={itemsTotal} />
              <CostRow label="Shipping" amount={shippingTotal} />
              <CostRow label="Tax" amount={taxTotal} />
              <div className="-mx-4 mt-3 border-t border-[#eee4da] bg-[#fff8f1] px-4 py-4">
                <div className="flex items-baseline justify-between gap-3 font-semibold"><dt className="text-xs uppercase tracking-wide text-[#7c4a27]">Total payable (AUD)</dt><dd className="text-lg tabular-nums text-primary">AUD {orderTotal.toFixed(2)}</dd></div>
              </div>
            </dl>
          </section>
        </aside>
      </div>
      <p className="px-1 text-xs text-muted-foreground">Creating this order opens it and attempts inventory allocation. Any stock shortfall will be shown after creation.</p>
    </section>
  );
}

function SalesOrderOverview({ data }: { data: ReviewStepData }) {
  const fields = [
    { label: "Customer", value: data.customer?.name ?? "—" },
    { label: "Fulfillment", value: data.fulfillmentType.replace(/_/g, " "), capitalize: true },
    { label: "Order date", value: data.orderDate },
    { label: "Business channel", value: data.businessChannel.replace(/_/g, " "), capitalize: true },
    { label: "Source", value: data.source ? data.source.replace(/_/g, " ") : "Not specified", capitalize: true },
    { label: "Priority", value: data.priority, capitalize: true },
    { label: "Owner", value: data.ownerName },
    { label: "Linked purchase orders", value: data.linkedPurchaseOrders.length ? data.linkedPurchaseOrders.map((order) => order.po_number).join(", ") : "None" },
  ];

  return (
    <section className="rounded-lg border border-[#dfe6ef] bg-white p-4" aria-labelledby="so-review-heading">
      <h3 id="so-review-heading" className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />Customer and order details</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">{fields.map((field) => (
        <div key={field.label} className="min-w-0"><dt className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</dt><dd className={`mt-1 break-words text-sm font-medium ${field.capitalize ? "capitalize" : ""}`}>{field.value}</dd></div>
      ))}</dl>
    </section>
  );
}

function SalesOrderItemSummary({ data }: { data: ReviewStepData }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#dfe6ef] bg-white" aria-labelledby="so-review-items-heading">
      <h3 id="so-review-items-heading" className="flex items-center gap-2 border-b border-[#dfe6ef] bg-[#f5f8fc] px-4 py-3 text-xs font-semibold uppercase tracking-wide"><span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />Items ({data.lines.length})</h3>
      <div className="divide-y divide-[#e7edf4]">
        {data.lines.map((line, index) => {
          const product = data.products.find((item) => item.id === line.product_id);
          const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
          return (
            <div key={`${line.product_id}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-sm">
              <div className="min-w-0"><p className="truncate font-medium">{product?.name ?? "Product"}</p><p className="mt-0.5 text-xs text-muted-foreground">{line.quantity} × AUD {Number(line.unit_price || 0).toFixed(2)} per unit</p></div>
              <p className="self-center font-semibold tabular-nums">AUD {lineTotal.toFixed(2)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CostRow({ label, amount }: { label: string; amount: number }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label} (AUD)</dt><dd className="tabular-nums">AUD {amount.toFixed(2)}</dd></div>;
}

function LookupSelect({ id, value, onChange, options, placeholder }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: LookupOption[];
  placeholder?: string;
}) {
  return (
    <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </Select>
  );
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-base font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}
