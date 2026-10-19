export type SaleOrderStatus = "open" | "shipped" | "completed" | "cancelled" | "returned";
export type PurchaseOrderStatus = "draft" | "confirmed" | "in transit" | "received" | "cancelled";

const saleOrderTransitions: Record<SaleOrderStatus, readonly SaleOrderStatus[]> = {
  open: ["shipped", "cancelled"],
  shipped: ["completed", "returned"],
  completed: ["returned"],
  cancelled: [],
  returned: [],
};

const purchaseOrderTransitions: Record<PurchaseOrderStatus, readonly PurchaseOrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["in transit", "cancelled"],
  "in transit": ["received", "cancelled"],
  received: [],
  cancelled: [],
};

export function getSaleOrderTransitions(status: string): SaleOrderStatus[] {
  return saleOrderTransitions[status as SaleOrderStatus] ? [...saleOrderTransitions[status as SaleOrderStatus]] : [];
}

export function canTransitionSaleOrder(from: string, to: string): boolean {
  return getSaleOrderTransitions(from).includes(to as SaleOrderStatus);
}

export function getPurchaseOrderTransitions(status: string): PurchaseOrderStatus[] {
  return purchaseOrderTransitions[status as PurchaseOrderStatus] ? [...purchaseOrderTransitions[status as PurchaseOrderStatus]] : [];
}

export function canTransitionPurchaseOrder(from: string, to: string): boolean {
  return getPurchaseOrderTransitions(from).includes(to as PurchaseOrderStatus);
}
