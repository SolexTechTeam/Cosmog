"use client";

import { useState, useMemo } from "react";
import { FileText } from "lucide-react";
import { AetherClient } from "@/lib/aether-client";
import { cleanCustomerAddress, formatCustomerAddress } from "@/lib/customer-address";
import { useApi, queryKeys } from "@/hooks/useApi";
import { useLookup } from "@/hooks/useLookup";
import { Dialog } from "@/components/ui/dialog";
import { OrderWizardFooter } from "./order-wizard/OrderWizardFooter";
import { OrderWizardProgress } from "./order-wizard/OrderWizardProgress";
import { SalesOrderCustomerStep, SalesOrderItemsStep, SalesOrderReviewStep, type NewCustomer, type NewProduct, type SaleLine } from "./sales-order/SalesOrderWizardSteps";
import CreatePurchaseOrderDialog from "./CreatePurchaseOrderDialog";
import type { Customer, CustomerAddress, Product, PricingConfig, Profile, PurchaseOrder, StockStatus } from "@/types";

interface StockWarning {
  product_id: string;
  requested: number;
  available: number;
  incoming: number;
  shortfall: number;
  message: string;
}

interface CreatedOrderInfo {
  id: string;
  number: string;
  items: { product_id: string; quantity: number }[];
  stockWarnings: StockWarning[];
  fulfillmentType: string;
}

interface CreateSaleOrderDialogProps {
  onClose: () => void;
  onCreated: () => void;
  initialItems?: { product_id: string; quantity: string; unit_price: string }[];
  linkedPurchaseOrderId?: string;
}

const emptyAddress: CustomerAddress = { line1: "", line2: "", city: "", state: "", postcode: "", country: "" };

const stepTitles = ["Customer & order", "Purchase orders & items", "Review & create"];

export default function CreateSaleOrderDialog({ onClose, onCreated, initialItems, linkedPurchaseOrderId }: CreateSaleOrderDialogProps) {
  const { data: fetchedCustomers, refetch: refetchCustomers } = useApi<Customer[]>([...queryKeys.customers], () => AetherClient.getCustomers());
  const { data: fetchedProducts, refetch: refetchProducts } = useApi<Product[]>([...queryKeys.products], () => AetherClient.getProducts());
  const { data: fetchedPurchaseOrders } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());
  const { data: fetchedProfiles } = useApi<Profile[]>([...queryKeys.profiles], () => AetherClient.getProfiles());
  const { data: fetchedStock } = useApi<StockStatus[]>([...queryKeys.stockStatus], () => AetherClient.getStockStatus());
  const { data: pricingConfig } = useApi<PricingConfig>([...queryKeys.pricingConfig], () => AetherClient.getPricingConfig());

  const { options: fulfillmentOptions } = useLookup("so_fulfillment_type");
  const { options: channelOptions } = useLookup("so_business_channel");
  const { options: sourceOptions } = useLookup("so_source");
  const { options: priorityOptions } = useLookup("so_priority");
  const { options: customerTypeOptions } = useLookup("customer_type");

  const [activeStep, setActiveStep] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [linkedPoIds, setLinkedPoIds] = useState<string[]>(linkedPurchaseOrderId ? [linkedPurchaseOrderId] : []);
  const [fulfillmentType, setFulfillmentType] = useState("shipping");
  const [businessChannel, setBusinessChannel] = useState("retail_b2c");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("normal");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [gstRateOverride, setGstRate] = useState<string | null>(null);
  const gstRate = gstRateOverride ?? (pricingConfig?.gst_rate ?? 0.10).toString();
  const [shippingCost, setShippingCost] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");
  const [shippingDetails, setShippingDetails] = useState("");
  const [shippingDetailsPreFilled, setShippingDetailsPreFilled] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<SaleLine[]>(initialItems?.length ? initialItems : [{ product_id: "", quantity: "1", unit_price: "" }]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomer>({ name: "", handle: "", email: "", customer_type: "b2b", address: emptyAddress });
  const [newProduct, setNewProduct] = useState<NewProduct>({ name: "", category: "", sku: "", low_stock_threshold: "5" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrderInfo | null>(null);
  const [showCreatePo, setShowCreatePo] = useState(false);

  const customers = fetchedCustomers ?? [];
  const products = useMemo(() => fetchedProducts ?? [], [fetchedProducts]);
  const existingCategories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);
  const profiles = (fetchedProfiles ?? []).filter((p) => p.is_active);
  const purchaseOrders = (fetchedPurchaseOrders ?? []).filter((po) => (
    po.status !== "cancelled"
    && po.status !== "received"
    && (fulfillmentType === "direct_to_customer"
      ? po.fulfillment_type === "direct_delivery"
      : po.fulfillment_type !== "direct_delivery")
  ));
  const stockByProductId = useMemo(() => {
    const map = new Map<string, StockStatus>();
    for (const s of fetchedStock ?? []) map.set(s.product_id, s);
    return map;
  }, [fetchedStock]);

  function updateLine(index: number, changes: Partial<SaleLine>) {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const updated = { ...line, ...changes };
      if (changes.product_id && changes.product_id !== line.product_id) {
        const stock = stockByProductId.get(changes.product_id);
        if (stock && stock.avg_cost > 0) {
          const margin = pricingConfig?.margin_multiplier ?? 1.25;
          const parsedGstRate = Number(gstRate);
          const gst = Number.isFinite(parsedGstRate) ? parsedGstRate : 0;
          updated.unit_price = (stock.avg_cost * margin * (1 + gst)).toFixed(2);
        }
      }
      return updated;
    }));
  }

  function selectCustomer(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    const address = formatCustomerAddress(customers.find((customer) => customer.id === nextCustomerId)?.address);

    if (address) setShippingDetails(address);
    setShippingDetailsPreFilled(Boolean(address));
  }

  async function addCustomer() {
    if (!newCustomer.name.trim()) {
      setError("New customer name is required.");
      return;
    }
    try {
      setCreatingCustomer(true);
      setError(null);
      const customer = await AetherClient.createCustomer({
        name: newCustomer.name.trim(),
        handle: newCustomer.handle.trim() || undefined,
        email: newCustomer.email.trim() || undefined,
        customer_type: newCustomer.customer_type,
        contact_info: {},
        address: cleanCustomerAddress(newCustomer.address),
      });
      setCustomerId(customer.id);
      const address = formatCustomerAddress(customer.address);
      if (address) setShippingDetails(address);
      setShippingDetailsPreFilled(Boolean(address));
      setNewCustomer({ name: "", handle: "", email: "", customer_type: "b2b", address: emptyAddress });
      setShowCustomerForm(false);
      refetchCustomers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add customer.");
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function addProduct() {
    const lowStockThreshold = Number(newProduct.low_stock_threshold);
    if (!newProduct.name.trim() || !newProduct.category.trim() || !Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      setError("New product name, category, and a valid low stock threshold are required.");
      return;
    }
    try {
      setCreatingProduct(true);
      setError(null);
      const product = await AetherClient.createProduct({ name: newProduct.name.trim(), category: newProduct.category.trim(), sku: newProduct.sku.trim() || undefined, low_stock_threshold: lowStockThreshold });
      setLines((current) => {
        const emptyLineIndex = current.findLastIndex((line) => !line.product_id);
        if (emptyLineIndex < 0) return [...current, { product_id: product.id, quantity: "1", unit_price: "" }];
        return current.map((line, index) => index === emptyLineIndex ? { ...line, product_id: product.id } : line);
      });
      setNewProduct({ name: "", category: "", sku: "", low_stock_threshold: "5" });
      setShowProductForm(false);
      refetchProducts();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add product.");
    } finally {
      setCreatingProduct(false);
    }
  }

  function validateStep(step: number) {
    if (step === 0 && (!customerId || !orderDate || !fulfillmentType || !businessChannel)) {
      return "Choose a customer and complete the required order details.";
    }
    if (step === 1) {
      const rate = Number(gstRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 1) return "Enter a GST rate between 0% and 100%.";
      if (lines.length === 0) return "Add at least one product to the sales order.";
      if (lines.some((line) => (
        !line.product_id
        || !Number.isInteger(Number(line.quantity))
        || Number(line.quantity) < 1
        || !Number.isFinite(Number(line.unit_price))
        || Number(line.unit_price) < 0
        || line.unit_price.trim() === ""
      ))) return "Complete each product, quantity, and sale price or remove any empty rows.";
    }
    if (step === 2) {
      const cost = Number(shippingCost);
      const tax = Number(taxAmount);
      if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(tax) || tax < 0) {
        return "Enter valid non-negative shipping and tax amounts.";
      }
    }
    return null;
  }

  const customerStepProps = {
    data: {
      customers, customerId, ownerId, profiles, fulfillmentType, fulfillmentOptions,
      orderDate, businessChannel, channelOptions, source, sourceOptions, priority,
      priorityOptions, customerTypeOptions, showCustomerForm, newCustomer, creatingCustomer,
    },
    actions: {
      selectCustomer, setOwnerId,
      setFulfillmentType: (value: string) => { setFulfillmentType(value); setLinkedPoIds([]); },
      setOrderDate, setBusinessChannel, setSource, setPriority, setShowCustomerForm,
      setNewCustomer, addCustomer: () => { void addCustomer(); },
    },
  };

  const itemsStepProps = {
    data: {
      fulfillmentType, purchaseOrders, linkedPoIds, products, lines, stockByProductId,
      pricingConfig, gstRate, newProduct, existingCategories, showProductForm, creatingProduct,
    },
    actions: {
      setLinkedPoIds, setLines, updateLine, setNewProduct, setShowProductForm,
      setGstRate: (value: string | null) => setGstRate(value === null ? null : (Number(value) / 100).toString()),
      addProduct: () => { void addProduct(); },
    },
  };

  const reviewStepProps = {
    data: {
      customer: customers.find((customer) => customer.id === customerId),
      fulfillmentType, orderDate, businessChannel, source, priority,
      ownerName: profiles.find((profile) => profile.id === ownerId)?.name ?? "Current user",
      linkedPurchaseOrders: purchaseOrders.filter((order) => linkedPoIds.includes(order.id)),
      products, lines, shippingCost, taxAmount, shippingDetails, shippingDetailsPreFilled, paymentNotes, notes,
    },
    actions: { setShippingCost, setTaxAmount, setShippingDetails, setPaymentNotes, setNotes },
  };

  const itemsTotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0), 0);
  const totalPayable = itemsTotal + (Number(shippingCost) || 0) + (Number(taxAmount) || 0);

  function continueToNextStep() {
    const validationError = validateStep(activeStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setActiveStep((step) => Math.min(step + 1, stepTitles.length - 1));
  }

  function goBack() {
    setError(null);
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  async function createOrder() {
    if (activeStep !== stepTitles.length - 1 || saving || createdOrder) return;
    const validationError = validateStep(0) ?? validateStep(1) ?? validateStep(2);
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalizedLines = lines.map((line) => ({ product_id: line.product_id, quantity: Number(line.quantity), unit_price: Number(line.unit_price) }));
    const cost = Number(shippingCost);
    const tax = Number(taxAmount);
    try {
      setSaving(true);
      setError(null);
      const created = await AetherClient.createSaleOrder({
        customer_id: customerId,
        order_date: orderDate,
        fulfillment_type: fulfillmentType,
        business_channel: businessChannel,
        priority,
        ...(ownerId ? { owner_id: ownerId } : {}),
        ...(source ? { source } : {}),
        ...(linkedPoIds.length ? { linked_po_ids: linkedPoIds } : {}),
        shipping_cost: cost,
        tax_amount: tax,
        ...(shippingDetails.trim() ? { shipping_details: shippingDetails.trim() } : {}),
        ...(paymentNotes.trim() ? { payment_notes: paymentNotes.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: normalizedLines,
      });
      onCreated();
      setCreatedOrder({
        id: created.id,
        number: created.so_number,
        items: normalizedLines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        stockWarnings: (created.stock_warnings ?? []) as StockWarning[],
        fulfillmentType: fulfillmentType,
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
        initialFulfillmentType={createdOrder.fulfillmentType === "direct_to_customer" ? "direct_delivery" : undefined}
        lockFulfillmentType={createdOrder.fulfillmentType === "direct_to_customer"}
      />
    );
  }

  return (
    <Dialog
      compact
      description="The order number is assigned automatically. Review everything before creating the order."
      loading={saving}
      onClose={onClose}
      title={<span className="inline-flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-md border border-primary/20 bg-primary/10"><FileText aria-hidden="true" className="size-4 text-primary" /></span><span>New Sales Order</span></span>}
      width={810}
    >
      <form className="w-full min-w-0 max-w-full overflow-x-clip px-1" style={{ zoom: 0.9, width: "100%" }} onSubmit={(event) => event.preventDefault()}>
        <OrderWizardProgress activeStep={activeStep} titles={stepTitles} completed={Boolean(createdOrder && !error)} />
        {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <section hidden={activeStep !== 0} aria-label="Customer and order details" className="min-w-0">
          <SalesOrderCustomerStep {...customerStepProps} />
        </section>
        <section hidden={activeStep !== 1} aria-label="Purchase orders and items" className="min-w-0">
          <SalesOrderItemsStep {...itemsStepProps} />
        </section>
        <section hidden={activeStep !== 2} aria-label="Review and create" className="min-w-0">
          <SalesOrderReviewStep {...reviewStepProps} />
        </section>

        {createdOrder && (
          <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-4">
            <p className="text-sm font-medium text-emerald-700">Sales order {createdOrder.number} created successfully.</p>
            {createdOrder.stockWarnings.length > 0 && (
              <div className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/50 p-3">
                <p className="text-xs font-semibold text-amber-700">Stock warnings</p>
                <ul className="mt-1 space-y-0.5">{createdOrder.stockWarnings.map((warning) => <li key={warning.product_id} className="text-xs text-amber-600">{warning.message}</li>)}</ul>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowCreatePo(true)} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">{createdOrder.fulfillmentType === "direct_to_customer" ? "Create Direct-Delivery PO" : "Create linked Purchase Order"}</button>
              <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Done</button>
            </div>
          </div>
        )}

        {!createdOrder && (
          <OrderWizardFooter
            activeStep={activeStep}
            totalSteps={stepTitles.length}
            saving={saving}
            fullBleed={false}
            summary={<div aria-live="polite" className="text-right leading-tight"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total payable</p><p className="text-sm font-bold tabular-nums text-foreground">AUD {totalPayable.toFixed(2)}</p></div>}
            saveLabel="Create sales order"
            savingLabel="Creating…"
            onBack={goBack}
            onCancel={onClose}
            onNext={continueToNextStep}
            onSave={() => { void createOrder(); }}
          />
        )}
      </form>
    </Dialog>
  );
}
