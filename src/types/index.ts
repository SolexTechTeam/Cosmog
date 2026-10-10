export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  handle: string | null;
  email: string | null;
  customer_type: "b2b" | "b2c" | "special";
  contact_info: Record<string, unknown>;
  payment_terms: string | null;
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

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: "draft" | "confirmed" | "in transit" | "received" | "cancelled";
  fulfillment_type: "warehouse" | "direct_delivery";
  order_date: string;
  shipped_date: string | null;
  expected_arrival: string | null;
  received_date: string | null;
  notes: string | null;
  created_by: string | null;
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
  product?: Pick<Product, "id" | "name" | "category">;
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
  amount_paid: number;
  tracking_reference: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  qty_in_transit: number;
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
  qty_in_transit: number;
  avg_cost: number;
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
