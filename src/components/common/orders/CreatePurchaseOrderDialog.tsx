"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { AetherClient } from "@/lib/aether-client";
import { useApi, queryKeys } from "@/hooks/useApi";
import { useLookup } from "@/hooks/useLookup";
import { Dialog } from "@/components/ui/dialog";
import { OrderWizardProgress } from "./order-wizard/OrderWizardProgress";
import CreateSaleOrderDialog from "./CreateSaleOrderDialog";
import {
  ItemsAndLinksStep,
  ReviewAndCostsStep,
  SupplierOrderStep,
  type PurchaseLine,
} from "./purchase-order/PurchaseOrderWizardSteps";
import { PurchaseOrderWizardFooter } from "./purchase-order/PurchaseOrderWizardFooter";
import type { Product, SaleOrder, Supplier } from "@/types";

interface CreatedPOInfo {
  id: string;
  number: string;
  items: { product_id: string; quantity: number }[];
}

interface CreatePurchaseOrderDialogProps {
  onClose: () => void;
  onCreated: () => void;
  initialItems?: { product_id: string; quantity_ordered: string; unit_cost: string }[];
  linkedSaleOrderId?: string;
  initialFulfillmentType?: string;
  lockFulfillmentType?: boolean;
}

const stepTitles = ["Supplier & order", "Sales orders & items", "Review"];

export default function CreatePurchaseOrderDialog({
  onClose,
  onCreated,
  initialItems,
  linkedSaleOrderId,
  initialFulfillmentType,
  lockFulfillmentType = false,
}: CreatePurchaseOrderDialogProps) {
  const { data: fetchedSuppliers, refetch: refetchSuppliers } = useApi<Supplier[]>([...queryKeys.suppliers], () => AetherClient.getSuppliers());
  const { data: fetchedProducts, refetch: refetchProducts } = useApi<Product[]>([...queryKeys.products], () => AetherClient.getProducts());
  const { data: fetchedSaleOrders } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const { options: fulfillmentOptions } = useLookup("po_fulfillment_type");
  const { data: fxData } = useApi<{ from: string; to: string; rate: number }>(
    [...queryKeys.fxRate("SGD", "AUD")],
    () => AetherClient.getFxRate("SGD", "AUD"),
  );

  const [activeStep, setActiveStep] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [linkedSaleOrderIds, setLinkedSaleOrderIds] = useState<string[]>(linkedSaleOrderId ? [linkedSaleOrderId] : []);
  const [fulfillmentType, setFulfillmentType] = useState(initialFulfillmentType ?? "warehouse");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>(initialItems?.length
    ? initialItems.map((item) => ({ ...item, shipping_cost: "0" }))
    : [{ product_id: "", quantity_ordered: "1", unit_cost: "", shipping_cost: "0" }]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", email: "", phone: "", default_lead_days: "1" });
  const [newProduct, setNewProduct] = useState({ name: "", category: "", sku: "", low_stock_threshold: "5" });
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedPOInfo | null>(null);
  const [showCreateSo, setShowCreateSo] = useState(false);
  const [parentNotified, setParentNotified] = useState(false);

  const suppliers = fetchedSuppliers ?? [];
  const products = useMemo(() => fetchedProducts ?? [], [fetchedProducts]);
  const existingCategories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const fxRate = fxData?.rate ?? null;
  const saleOrders = useMemo(() => (fetchedSaleOrders ?? []).filter((saleOrder) => (
    (saleOrder.status === "open" || saleOrder.status === "shipped")
    && (fulfillmentType === "direct_delivery"
      ? saleOrder.fulfillment_type === "direct_to_customer"
      : saleOrder.fulfillment_type !== "direct_to_customer")
  )), [fetchedSaleOrders, fulfillmentType]);
  const totalPayableSgd = lines.reduce((sum, line) => sum
    + (Number(line.quantity_ordered) || 0) * (Number(line.unit_cost) || 0)
    + (Number(line.shipping_cost) || 0), 0);

  function updateLine(index: number, changes: Partial<PurchaseLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line));
  }

  async function addSupplier() {
    const leadDays = Number(newSupplier.default_lead_days);
    if (!newSupplier.name.trim() || !Number.isInteger(leadDays) || leadDays < 1) {
      setError("Enter a supplier name and a lead time of at least one day.");
      return;
    }
    try {
      setCreatingSupplier(true);
      setError(null);
      const supplier = await AetherClient.createSupplier({
        name: newSupplier.name.trim(),
        default_lead_days: leadDays,
        contact_info: {
          ...(newSupplier.email.trim() ? { email: newSupplier.email.trim() } : {}),
          ...(newSupplier.phone.trim() ? { phone: newSupplier.phone.trim() } : {}),
        },
      });
      setSupplierId(supplier.id);
      setNewSupplier({ name: "", email: "", phone: "", default_lead_days: "1" });
      setShowSupplierForm(false);
      refetchSuppliers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add supplier.");
    } finally {
      setCreatingSupplier(false);
    }
  }

  async function addProduct() {
    const lowStockThreshold = Number(newProduct.low_stock_threshold);
    if (!newProduct.name.trim() || !newProduct.category.trim() || !Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      setError("Enter a product name, category, and valid low stock threshold.");
      return;
    }
    try {
      setCreatingProduct(true);
      setError(null);
      const product = await AetherClient.createProduct({
        name: newProduct.name.trim(),
        category: newProduct.category.trim(),
        sku: newProduct.sku.trim() || undefined,
        low_stock_threshold: lowStockThreshold,
      });
      setLines((current) => current.map((line, index) => index === current.length - 1 && !line.product_id ? { ...line, product_id: product.id } : line));
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
    if (step === 0 && (!supplierId || !orderDate)) return "Choose a supplier and order date to continue.";
    if (step === 1) {
      if (lines.length === 0) return "Add at least one item to the purchase order.";
      if (lines.some((line) => (
        !line.product_id
        || !Number.isInteger(Number(line.quantity_ordered))
        || Number(line.quantity_ordered) < 1
        || !Number.isFinite(Number(line.unit_cost))
        || Number(line.unit_cost) < 0
        || line.unit_cost.trim() === ""
        || !Number.isFinite(Number(line.shipping_cost))
        || Number(line.shipping_cost) < 0
      ))) return "Complete each item line or remove any empty rows.";
    }
    return null;
  }

  function continueToNextStep() {
    const validationError = validateStep(activeStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setActiveStep((step) => Math.min(step + 1, 2));
  }

  function goBack() {
    setError(null);
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function closeDialog() {
    if (createdOrder && !parentNotified) onCreated();
    onClose();
  }

  async function createOrder() {
    if (activeStep < 2) {
      continueToNextStep();
      return;
    }
    if (createdOrder || saving) return;

    const validationError = validateStep(0) ?? validateStep(1);
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalizedLines = lines.map((line) => ({
      product_id: line.product_id,
      quantity_ordered: Number(line.quantity_ordered),
      unit_cost: Number(line.unit_cost),
      shipping_cost: Number(line.shipping_cost),
    }));

    try {
      setSaving(true);
      setError(null);
      const purchaseOrder = await AetherClient.createPurchaseOrder({
        supplier_id: supplierId,
        fulfillment_type: fulfillmentType,
        order_date: orderDate,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        source_currency: "SGD",
        items: normalizedLines,
      });

      setCreatedOrder({
        id: purchaseOrder.id,
        number: purchaseOrder.po_number,
        items: normalizedLines.map((line) => ({ product_id: line.product_id, quantity: line.quantity_ordered })),
      });
      try {
        await Promise.all(linkedSaleOrderIds.map((saleOrderId) => (
          fulfillmentType === "direct_delivery"
            ? AetherClient.linkDtcPurchaseOrder(saleOrderId, purchaseOrder.id)
            : AetherClient.linkPurchaseOrder(saleOrderId, purchaseOrder.id)
        )));
      } catch (linkError) {
        setError(`PO ${purchaseOrder.po_number} was created, but one or more Sales Order links could not be saved. You can link them from the order details. ${linkError instanceof Error ? linkError.message : ""}`.trim());
        return;
      }
      setParentNotified(true);
      onCreated();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create purchase order.");
    } finally {
      setSaving(false);
    }
  }

  if (showCreateSo && createdOrder) {
    return (
      <CreateSaleOrderDialog
        onClose={closeDialog}
        onCreated={onCreated}
        initialItems={createdOrder.items.map((item) => ({ product_id: item.product_id, quantity: String(item.quantity), unit_price: "" }))}
        linkedPurchaseOrderId={createdOrder.id}
      />
    );
  }

  const supplierStepProps = {
    data: {
      supplierId, suppliers, fulfillmentType, orderDate, fulfillmentOptions, lockFulfillmentType,
      showSupplierForm, newSupplier, creatingSupplier,
    },
    actions: {
      setSupplierId, setFulfillmentType: (value: string) => { setFulfillmentType(value); setLinkedSaleOrderIds([]); },
      setOrderDate, setShowSupplierForm, setNewSupplier, addSupplier,
    },
  };
  const itemsStepProps = {
    data: {
      saleOrders, linkedSaleOrderIds, products, lines, newProduct, existingCategories,
      showProductForm, creatingProduct, fxRate,
    },
    actions: {
      setLinkedSaleOrderIds, setLines, updateLine, setNewProduct, setShowProductForm, addProduct,
    },
  };
  const reviewStepProps = {
    data: {
      supplier: suppliers.find((supplier) => supplier.id === supplierId), fulfillmentType, orderDate,
      linkedSaleOrders: saleOrders.filter((saleOrder) => linkedSaleOrderIds.includes(saleOrder.id)),
      products, lines, notes, fxRate,
    },
    actions: { setNotes },
  };

  return (
    <Dialog
      compact
      description="The PO number is assigned automatically. New orders are saved as drafts."
      loading={saving}
      onClose={closeDialog}
      title={<span className="inline-flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-md border border-primary/20 bg-primary/10"><FileText aria-hidden="true" className="size-4 text-primary" /></span><span>New Purchase Order</span></span>}
      width={932}
    >
      <form className="w-full min-w-0 max-w-full overflow-x-clip px-1" style={{ zoom: 0.9, width: "100%" }} onSubmit={(event) => event.preventDefault()}>
        <OrderWizardProgress activeStep={activeStep} titles={stepTitles} completed={Boolean(createdOrder && !error)} />
        {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <section hidden={activeStep !== 0} aria-label="Supplier and order details" className="min-w-0">
          <SupplierOrderStep {...supplierStepProps} />
        </section>
        <section hidden={activeStep !== 1} aria-label="Sales orders and items" className="min-w-0">
          <ItemsAndLinksStep {...itemsStepProps} />
        </section>
        <section hidden={activeStep !== 2} aria-label="Review and costs" className="min-w-0">
          <ReviewAndCostsStep {...reviewStepProps} />
        </section>

        {createdOrder && (
          <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-4">
            <p className="text-sm font-medium text-emerald-700">Purchase order {createdOrder.number} was created as a draft.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowCreateSo(true)} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Create linked Sales Order</button>
              <button type="button" onClick={closeDialog} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Done</button>
            </div>
          </div>
        )}

        {!createdOrder && (
          <PurchaseOrderWizardFooter
            activeStep={activeStep}
            totalSteps={stepTitles.length}
            saving={saving}
          totalPayableSgd={totalPayableSgd}
          fxRate={fxRate}
          onBack={goBack}
          onCancel={closeDialog}
          onNext={continueToNextStep}
          onSave={() => { void createOrder(); }}
        />
        )}
      </form>
    </Dialog>
  );
}
