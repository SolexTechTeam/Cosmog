import { getSupabaseBrowser } from "./supabase";
import type {
  Product,
  Customer,
  CustomerAddress,
  Supplier,
  Profile,
  PurchaseOrder,
  PurchaseOrderItem,
  SaleOrder,
  SaleOrderPoLink,
  InventorySummary,
  StockStatus,
  DemandPriority,
  InventoryLot,
  LedgerEntry,
  LookupValue,
  AllocationResponse,
  ConfirmPoResponse,
  ReceivePoResponse,
  AllocationPreviewResponse,
  AllocateResponse,
  ReallocateResponse,
  ReassignResponse,
  TransformInventoryResponse,
  ReallocatePoolResponse,
  PoAllocationRecord,
  PoReallocateResponse,
  PoAllocationPreviewResponse,
  PoApplyAllocationRequest,
  MarginResponse,
  PricingConfig,
  DashboardNote,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await getSupabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined) qs.set(key, String(val));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export class AetherClient {
  // ── Lookups ───────────────────────────────────────────────────────

  static getLookups(category: string, activeOnly = true): Promise<LookupValue[]> {
    return request(`/api/lookups${buildQuery({ category, active_only: activeOnly })}`);
  }

  // ── Profiles ──────────────────────────────────────────────────────

  static getProfiles(params?: { role?: string; active?: boolean }): Promise<Profile[]> {
    return request(`/api/profiles${buildQuery({ role: params?.role, active: params?.active })}`);
  }

  static getMyProfile(): Promise<Profile> {
    return request("/api/profiles/me");
  }

  static getProfile(id: string): Promise<Profile> {
    return request(`/api/profiles/${id}`);
  }

  static createUser(data: { name: string; email: string; password: string; role?: string }): Promise<Profile> {
    return request("/api/profiles/create-user", { method: "POST", body: JSON.stringify(data) });
  }

  static updateProfile(id: string, data: { name?: string; role?: string; is_active?: boolean }): Promise<Profile> {
    return request(`/api/profiles/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // ── Dashboard Notes ───────────────────────────────────────────────

  static getDashboardNotes(): Promise<DashboardNote[]> {
    return request("/api/dashboard-notes");
  }

  static createDashboardNote(content: string): Promise<DashboardNote> {
    return request("/api/dashboard-notes", { method: "POST", body: JSON.stringify({ content }) });
  }

  static updateDashboardNote(id: string, content: string): Promise<DashboardNote> {
    return request(`/api/dashboard-notes/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
  }

  static deleteDashboardNote(id: string): Promise<void> {
    return request(`/api/dashboard-notes/${id}`, { method: "DELETE" });
  }

  // ── Customers ─────────────────────────────────────────────────────

  static getCustomers(params?: { search?: string; type?: string }): Promise<Customer[]> {
    return request(`/api/customers${buildQuery({ search: params?.search, type: params?.type })}`);
  }

  static getCustomer(id: string): Promise<Customer> {
    return request(`/api/customers/${id}`);
  }

  static createCustomer(data: {
    name: string;
    customer_type: string;
    handle?: string;
    email?: string;
    contact_info?: Record<string, unknown>;
    payment_terms?: string;
    address?: CustomerAddress;
  }): Promise<Customer> {
    return request("/api/customers", { method: "POST", body: JSON.stringify(data) });
  }

  static updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return request(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // ── Suppliers ─────────────────────────────────────────────────────

  static getSuppliers(): Promise<Supplier[]> {
    return request("/api/suppliers");
  }

  static getSupplier(id: string): Promise<Supplier> {
    return request(`/api/suppliers/${id}`);
  }

  static createSupplier(data: {
    name: string;
    contact_info?: Record<string, unknown>;
    default_lead_days?: number;
  }): Promise<Supplier> {
    return request("/api/suppliers", { method: "POST", body: JSON.stringify(data) });
  }

  static updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return request(`/api/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // ── Products ──────────────────────────────────────────────────────

  static getProducts(params?: { category?: string; active?: boolean }): Promise<Product[]> {
    return request(`/api/products${buildQuery({ category: params?.category, active: params?.active })}`);
  }

  static getProduct(id: string): Promise<Product> {
    return request(`/api/products/${id}`);
  }

  static createProduct(data: {
    name: string;
    category: string;
    sku?: string;
    image_url?: string;
  }): Promise<Product> {
    return request("/api/products", { method: "POST", body: JSON.stringify(data) });
  }

  static updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return request(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // ── Purchase Orders ───────────────────────────────────────────────

  static getPurchaseOrders(params?: { status?: string; fulfillment_type?: string }): Promise<PurchaseOrder[]> {
    return request(`/api/purchase-orders${buildQuery({ status: params?.status, fulfillment_type: params?.fulfillment_type })}`);
  }

  static getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    return request(`/api/purchase-orders/${id}`);
  }

  static createPurchaseOrder(data: {
    supplier_id: string;
    order_date: string;
    items: { product_id: string; quantity_ordered: number; unit_cost: number }[];
    fulfillment_type?: string;
    notes?: string;
    source_currency?: string;
  }): Promise<PurchaseOrder> {
    return request("/api/purchase-orders", { method: "POST", body: JSON.stringify(data) });
  }

  static updatePurchaseOrder(id: string, data: Record<string, unknown>): Promise<PurchaseOrder> {
    return request(`/api/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  static addPurchaseOrderItem(poId: string, data: {
    product_id: string;
    quantity_ordered: number;
    unit_cost: number;
  }): Promise<PurchaseOrderItem> {
    return request(`/api/purchase-orders/${poId}/items`, { method: "POST", body: JSON.stringify(data) });
  }

  static updatePurchaseOrderItem(poId: string, itemId: string, data: Record<string, unknown>): Promise<PurchaseOrderItem> {
    return request(`/api/purchase-orders/${poId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // ── Sale Orders ───────────────────────────────────────────────────

  static getSaleOrders(params?: { status?: string; payment_status?: string; owner_id?: string }): Promise<SaleOrder[]> {
    return request(`/api/sale-orders${buildQuery({ status: params?.status, payment_status: params?.payment_status, owner_id: params?.owner_id })}`);
  }

  static getSaleOrder(id: string): Promise<SaleOrder> {
    return request(`/api/sale-orders/${id}`);
  }

  static createSaleOrder(data: {
    customer_id: string;
    order_date: string;
    items: { product_id: string; quantity: number; unit_price: number }[];
    fulfillment_type?: string;
    business_channel?: string;
    source?: string;
    priority?: string;
    owner_id?: string;
    linked_po_ids?: string[];
    shipping_cost?: number;
    shipping_details?: string;
    notes?: string;
  }): Promise<SaleOrder & { stock_warnings?: unknown[] }> {
    return request("/api/sale-orders", { method: "POST", body: JSON.stringify(data) });
  }

  static updateSaleOrder(id: string, data: Record<string, unknown>): Promise<SaleOrder> {
    return request(`/api/sale-orders/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  static linkPurchaseOrder(saleOrderId: string, purchaseOrderId: string): Promise<SaleOrderPoLink> {
    return request(`/api/sale-orders/${saleOrderId}/po-links`, { method: "POST", body: JSON.stringify({ purchase_order_id: purchaseOrderId }) });
  }

  static linkDtcPurchaseOrder(saleOrderId: string, purchaseOrderId: string): Promise<SaleOrderPoLink> {
    return request(`/api/sale-orders/${saleOrderId}/dtc-po-links`, { method: "POST", body: JSON.stringify({ purchase_order_id: purchaseOrderId }) });
  }

  static unlinkPurchaseOrder(saleOrderId: string, purchaseOrderId: string): Promise<void> {
    return request(`/api/sale-orders/${saleOrderId}/po-links/${purchaseOrderId}`, { method: "DELETE" });
  }

  static getSaleOrderAllocation(id: string): Promise<AllocationResponse> {
    return request(`/api/sale-orders/${id}/allocation`);
  }

  static getSaleOrderMargin(id: string): Promise<MarginResponse> {
    return request(`/api/sale-orders/${id}/margin`);
  }

  // ── Inventory ─────────────────────────────────────────────────────

  static getStockStatus(): Promise<StockStatus[]> {
    return request("/api/inventory/stock-status");
  }

  static getDemandPriority(): Promise<DemandPriority[]> {
    return request("/api/inventory/demand-priority");
  }

  static getInventoryLots(params?: { product_id?: string; status?: string }): Promise<InventoryLot[]> {
    return request(`/api/inventory/lots${buildQuery({ product_id: params?.product_id, status: params?.status })}`);
  }

  static getInventorySummary(): Promise<InventorySummary[]> {
    return request("/api/inventory/summary");
  }

  static getLedger(params?: { product_id?: string; movement_type?: string; limit?: number }): Promise<LedgerEntry[]> {
    return request(`/api/inventory/ledger${buildQuery({ product_id: params?.product_id, movement_type: params?.movement_type, limit: params?.limit })}`);
  }

  static createLedgerAdjustment(data: {
    product_id: string;
    quantity_change: number;
    unit_cost?: number;
    unit_price?: number;
    notes?: string;
  }): Promise<LedgerEntry> {
    return request("/api/inventory/ledger/adjustment", { method: "POST", body: JSON.stringify(data) });
  }

  static transformInventory(data: {
    from_product_id: string;
    to_product_id: string;
    source_quantity: number;
    output_quantity: number;
    target_unit_cost: number;
    notes?: string;
  }): Promise<TransformInventoryResponse> {
    return request("/api/inventory/transform", { method: "POST", body: JSON.stringify(data) });
  }

  static confirmPurchaseOrder(purchaseOrderId: string): Promise<ConfirmPoResponse> {
    return request("/api/inventory/confirm-po", { method: "POST", body: JSON.stringify({ purchase_order_id: purchaseOrderId }) });
  }

  static shipPurchaseOrder(purchaseOrderId: string): Promise<{ message: string }> {
    return request("/api/inventory/ship-po", { method: "POST", body: JSON.stringify({ purchase_order_id: purchaseOrderId }) });
  }

  static receivePurchaseOrder(purchaseOrderId: string): Promise<ReceivePoResponse> {
    return request("/api/inventory/receive-po", { method: "POST", body: JSON.stringify({ purchase_order_id: purchaseOrderId }) });
  }

  static getCurrentPoAllocation(purchaseOrderId: string): Promise<PoAllocationRecord[]> {
    return request(`/api/purchase-orders/${purchaseOrderId}/allocations`);
  }

  static poReallocateResources(purchaseOrderId: string): Promise<PoReallocateResponse> {
    return request(`/api/purchase-orders/${purchaseOrderId}/reallocate`);
  }

  static previewPoAllocation(purchaseOrderId: string): Promise<PoAllocationPreviewResponse> {
    return request(`/api/purchase-orders/${purchaseOrderId}/preview-allocation`);
  }

  static applyPoAllocation(purchaseOrderId: string, data: PoApplyAllocationRequest): Promise<any> {
    return request(`/api/purchase-orders/${purchaseOrderId}/apply-allocation`, { method: "POST", body: JSON.stringify(data) });
  }

  static previewAllocation(saleOrderId: string): Promise<AllocationPreviewResponse> {
    return request("/api/inventory/allocate/preview", { method: "POST", body: JSON.stringify({ sale_order_id: saleOrderId }) });
  }

  static allocateInventory(data: {
    sale_order_id: string;
    mode: "auto" | "manual";
    allocations?: { sale_order_item_id: string; inventory_lot_id: string; quantity: number }[];
  }): Promise<AllocateResponse> {
    return request("/api/inventory/allocate", { method: "POST", body: JSON.stringify(data) });
  }

  static reallocateInventory(data: {
    sale_order_item_id: string;
    release_lot_id: string;
    assign_lot_id: string;
    quantity: number;
  }): Promise<ReallocateResponse> {
    return request("/api/inventory/reallocate", { method: "POST", body: JSON.stringify(data) });
  }

  static reassignAllocation(data: {
    from_sale_order_item_id: string;
    to_sale_order_item_id: string;
    inventory_lot_id: string;
    quantity: number;
  }): Promise<ReassignResponse> {
    return request("/api/inventory/reassign", { method: "POST", body: JSON.stringify(data) });
  }

  static reallocatePool(): Promise<ReallocatePoolResponse> {
    return request("/api/inventory/reallocate-pool", { method: "POST", body: JSON.stringify({}) });
  }

  static fulfillSaleOrder(saleOrderId: string): Promise<void> {
    return request("/api/inventory/fulfill", { method: "POST", body: JSON.stringify({ sale_order_id: saleOrderId }) });
  }

  static releaseSaleOrder(saleOrderId: string): Promise<void> {
    return request("/api/inventory/release", { method: "POST", body: JSON.stringify({ sale_order_id: saleOrderId }) });
  }

  static returnSaleOrder(saleOrderId: string): Promise<void> {
    return request("/api/inventory/return", { method: "POST", body: JSON.stringify({ sale_order_id: saleOrderId }) });
  }

  // ── Lookup mutations ───────────────────────────────────────────────

  static createLookup(data: {
    category: string;
    value: string;
    label: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<LookupValue> {
    return request("/api/lookups", { method: "POST", body: JSON.stringify(data) });
  }

  static updateLookup(id: string, data: {
    label?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<LookupValue> {
    return request(`/api/lookups/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  static deleteLookup(id: string): Promise<void> {
    return request(`/api/lookups/${id}`, { method: "DELETE" });
  }

  // ── Profile creation ─────────────────────────────────────────────

  static createProfile(data: {
    id: string;
    name: string;
    email: string;
    role?: string;
  }): Promise<Profile> {
    return request("/api/profiles", { method: "POST", body: JSON.stringify(data) });
  }

  // ── Pricing config ──────────────────────────────────────────────

  static getPricingConfig(): Promise<PricingConfig> {
    return request("/api/pricing-config");
  }

  static updatePricingConfig(data: { margin_multiplier?: number; gst_rate?: number }): Promise<PricingConfig> {
    return request("/api/pricing-config", { method: "PATCH", body: JSON.stringify(data) });
  }

  static getFxRate(from: string, to: string): Promise<{ from: string; to: string; rate: number }> {
    return request(`/api/fx-rate?from=${from}&to=${to}`);
  }
}
