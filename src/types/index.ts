export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  image_url: string | null;
  is_active: boolean;
  low_stock_threshold?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface Customer {
  id: string;
  name: string;
  handle: string | null;
  email: string | null;
  customer_type: "b2b" | "b2c" | "special";
  contact_info: Record<string, unknown>;
  payment_terms: string | null;
  notes: string | null;
  address?: CustomerAddress;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_info: Record<string, unknown>;
  default_lead_days: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  is_active: boolean;
}

export interface DashboardNote {
  id: string;
  content: string;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: "draft" | "confirmed" | "in transit" | "received" | "cancelled";
  fulfillment_type: "warehouse" | "direct_delivery";
  order_date: string;
  order_total: number;
  shipped_date: string | null;
  expected_arrival: string | null;
  received_date: string | null;
  tracking_reference?: string | null;
  shipping_details: string | null;
  shipping_cost: number;
  tax_amount: number;
  notes: string | null;
  created_by: string | null;
  created_by_profile?: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  supplier?: Pick<Supplier, "id" | "name">;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  shipping_cost?: number | null;
  tax_amount?: number | null;
  source_currency?: string;
  source_unit_cost?: number;
  fx_rate?: number;
  landed_unit_cost?: number;
  product?: Pick<Product, "id" | "name" | "category">;
}

export interface PricingConfig {
  id: string;
  margin_multiplier: number;
  gst_rate: number;
  updated_at: string;
  updated_by: string | null;
}

export interface SaleOrder {
  id: string;
  so_number: string;
  customer_id: string;
  status: "open" | "shipped" | "completed" | "cancelled" | "returned";
  payment_status: "not_requested" | "awaiting_payment" | "part_paid" | "paid" | "refunded" | "cancelled";
  fulfillment_type: string;
  business_channel: string;
  source: string | null;
  owner_id: string | null;
  order_date: string;
  shipped_date: string | null;
  delivered_date: string | null;
  shipping_details: string | null;
  shipping_cost: number;
  tax_amount: number;
  amount_paid: number;
  tracking_reference: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  payment_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_total: number;
  allocation_status: string | null;
  owner_name: string | null;
  customer?: Pick<Customer, "id" | "name" | "handle">;
  po_links?: SaleOrderPoLink[];
  items?: SaleOrderItem[];
}

export interface SaleOrderItem {
  id: string;
  sale_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Pick<Product, "id" | "name" | "category">;
}

export interface SaleOrderPoLink {
  purchase_order_id: string;
  purchase_order?: Pick<PurchaseOrder, "id" | "po_number" | "status" | "supplier">;
}

export interface InventorySummary {
  product_id: string;
  qty_on_hand: number;
  qty_incoming: number;
  qty_reserved: number;
  qty_available: number;
  avg_cost: number;
  product?: Pick<Product, "id" | "name" | "category">;
}

export interface StockStatus {
  product_id: string;
  name: string;
  category: string;
  sku: string | null;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  qty_incoming: number;
  qty_demand: number;
  avg_cost: number;
  low_stock_threshold: number;
  stock_status: "In Stock" | "Low Stock" | "Out of Stock" | "Incoming";
}

export interface DemandPriority {
  product_id: string;
  product_name: string;
  category: string;
  total_qty_demanded: number;
  open_order_count: number;
  total_points: number;
  priority_label: "High Attention" | "Med Attention" | "Low Attention";
}

export interface InventoryLot {
  id: string;
  product_id: string;
  purchase_order_item_id: string | null;
  quantity_total: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  lot_status: string;
  unit_cost: number;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  purchase_order_item?: { id: string; purchase_order_id: string; unit_cost: number } | null;
}

export interface LedgerEntry {
  id: number;
  product_id: string;
  product_name: string | null;
  product_category: string | null;
  inventory_lot_id: string | null;
  movement_type: string;
  quantity_change: number;
  unit_cost: number | null;
  unit_price: number | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  reference_order_id: string | null;
  reference_order_type: "purchase_order" | "sale_order" | null;
  performed_by: string | null;
  performed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface LedgerPage {
  items: LedgerEntry[];
  next_cursor: string | null;
  page_size: number;
}

export interface LookupValue {
  id: string;
  category: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
}

export interface LookupOption {
  label: string;
  value: string;
}

export interface AllocationLotDetail {
  lot_id: string;
  lot_status: "on_hand" | "incoming";
  quantity: number;
  unit_cost: number;
}

export interface AllocationItemBreakdown {
  sale_order_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  qty_from_warehouse: number;
  qty_from_incoming: number;
  qty_shortfall: number;
  allocations?: AllocationLotDetail[];
  qty_needed?: number;
  qty_covered_by_pos?: number;
}

export interface AllocationResponse {
  allocation_status: string;
  priority_points: number;
  channel: "warehouse" | "direct_to_customer";
  items: AllocationItemBreakdown[];
}

export interface ReassignCandidate {
  from_sale_order_item_id: string;
  sale_order_id: string;
  so_number: string;
  inventory_lot_id: string;
  lot_status: "on_hand" | "incoming";
  allocated_quantity: number;
  maximum_transferable: number;
}

export interface ReassignCandidatesResponse {
  target_sale_order_item_id: string;
  quantity_needed: number;
  quantity_allocated: number;
  quantity_remaining: number;
  candidates: ReassignCandidate[];
}

export interface InventoryAllocationRecord {
  allocation_id: string;
  quantity_allocated: number;
  created_at: string;
  inventory_lot_id: string;
  lot_status: string | null;
  purchase_order_id: string | null;
  po_number: string | null;
  sale_order_item_id: string | null;
  quantity_ordered: number | null;
  sale_order_id: string | null;
  so_number: string | null;
  so_status: string | null;
  customer_name: string | null;
}

export interface SuggestedAllocationItem {
  sale_order_item_id: string;
  product_name: string;
  quantity_needed: number;
  already_allocated: number;
  allocations: { lot_id: string; lot_status: string; quantity: number; unit_cost: number }[];
  available_lots?: { lot_id: string; lot_status: string; available_quantity: number; unit_cost: number }[];
  shortfall: number;
}

export interface ConfirmPoResponse {
  message: string;
  lots_created: number;
  suggested_allocations: {
    sale_order_id: string;
    suggested_allocations: SuggestedAllocationItem[];
  }[];
}

export interface ReceivePoResponse {
  message: string;
  lots_received: number;
  reallocations: {
    sale_order_id: string;
    priority_points: number;
    items?: AllocationItemBreakdown[];
    error?: string;
  }[];
}

export interface AllocationPreviewResponse {
  suggested_allocations: SuggestedAllocationItem[];
}

export interface AllocateResponse {
  message: string;
  allocation_status: string;
  items: AllocationItemBreakdown[];
}

export interface ReallocateResponse {
  released_lot: string;
  assigned_lot: string;
  quantity: number;
}

export interface ReassignResponse {
  from_so_item: string;
  to_so_item: string;
  lot_id: string;
  quantity: number;
}

export interface TransformInventoryResponse {
  target_lot_id: string;
  source_quantity: number;
  output_quantity: number;
  target_unit_cost: number;
}

export interface PoAllocationRecord {
  allocation_id: string;
  inventory_lot_id: string;
  quantity_allocated: number;
  sale_order_id: string | null;
  so_number: string | null;
  so_status: string | null;
  customer_name: string | null;
  product_id: string | null;
  product_name: string | null;
  quantity_ordered: number | null;
  qty_from_warehouse: number | null;
  qty_from_incoming: number | null;
  qty_shortfall: number | null;
}

export interface PoReallocateShortfallItem {
  sale_order_item_id: string;
  product_id: string;
  product_name: string;
  quantity_ordered: number;
  quantity_allocated: number;
  qty_from_warehouse: number;
  qty_from_incoming: number;
  qty_shortfall: number;
}

export interface PoReallocateShortfallOrder {
  sale_order_id: string;
  so_number: string;
  so_status: string;
  payment_status: string | null;
  priority: number | null;
  customer_name: string | null;
  items: PoReallocateShortfallItem[];
}

export interface PoReallocateResponse {
  current_allocations: PoAllocationRecord[];
  shortfall_orders: PoReallocateShortfallOrder[];
}

export interface ShortfallOrderItem {
  sale_order_item_id: string;
  product_id: string;
  product_name: string;
  quantity_ordered: number;
  qty_from_warehouse: number;
  qty_from_incoming: number;
  qty_shortfall: number;
}

export interface ShortfallOrder {
  sale_order_id: string;
  so_number: string;
  so_status: string;
  customer_name: string | null;
  items: ShortfallOrderItem[];
}

export interface PoShortfallResponse {
  po_products: {
    product_id: string;
    lots: { lot_id: string; available: number; lot_status: string }[];
  }[];
  shortfall_orders: ShortfallOrder[];
}

export interface PoAllocationPreviewItem {
  sale_order_item_id: string;
  product_id: string;
  product_name: string;
  quantity_ordered: number;
  qty_shortfall: number;
  suggested_quantity: number;
}

export interface PoAllocationPreviewOrder {
  sale_order_id: string;
  so_number: string;
  so_status: string;
  priority_points: number;
  customer_name: string | null;
  items: PoAllocationPreviewItem[];
}

export interface PoAllocationPreviewBudget {
  product_id: string;
  product_name: string;
  total: number;
  assigned: number;
}

export interface PoCurrentAllocationLot {
  allocation_id: string;
  inventory_lot_id: string;
  quantity: number;
}

export interface PoCurrentAllocationItem {
  sale_order_item_id: string;
  product_id: string;
  product_name: string;
  quantity_ordered: number;
  quantity_allocated: number;
  allocations: PoCurrentAllocationLot[];
}

export type PoApplyAllocationRequest =
  | { allocations: { sale_order_id: string; sale_order_item_id: string; quantity: number }[] }
  | {
      releases: { sale_order_item_id: string; inventory_lot_id: string; quantity: number }[];
      allocation_so_ids: string[];
    };

export interface ExactPoApplyAllocationResponse {
  allocations: {
    sale_order_id: string;
    sale_order_item_id: string;
    product_id: string;
    quantity_allocated: number;
    remaining_shortfall: number;
  }[];
}

export interface LegacyPoApplyAllocationResponse {
  releases: unknown[];
  allocations: { sale_order_id: string; items?: AllocationItemBreakdown[]; error?: string }[];
}

export interface PoCurrentAllocationOrder {
  sale_order_id: string;
  so_number: string;
  so_status: string;
  customer_name: string | null;
  items: PoCurrentAllocationItem[];
}

export interface PoAllocationPreviewResponse {
  product_budget: PoAllocationPreviewBudget[];
  current_orders: PoCurrentAllocationOrder[];
  shortfall_orders: PoAllocationPreviewOrder[];
}

export interface ReallocatePoolResponse {
  reallocations: {
    sale_order_id: string;
    priority_points: number;
    items?: AllocationItemBreakdown[];
    error?: string;
  }[];
}

export interface WarehouseMarginItem {
  sale_order_item_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  weighted_fifo_cost: number;
  margin_per_unit: number;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
}

export interface WarehouseMarginResponse {
  items: WarehouseMarginItem[];
  order_total_revenue: number;
  order_total_cost: number;
  order_total_margin: number;
}

export interface DtcMarginResponse {
  revenue: number;
  cost: number;
  margin: number;
}

export type MarginResponse = WarehouseMarginResponse | DtcMarginResponse;
