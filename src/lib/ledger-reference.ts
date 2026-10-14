import type { LedgerEntry } from "@/types";

type ReferenceFields = Pick<
  LedgerEntry,
  "movement_type" | "reference_type" | "reference_number" | "reference_order_id" | "reference_order_type"
>;

export function getLedgerReference(entry: ReferenceFields): { label: string; href?: string } {
  if (entry.reference_number && entry.reference_order_id && entry.reference_order_type) {
    const route = entry.reference_order_type === "purchase_order"
      ? "/orders/procurement"
      : "/orders/sales";
    return { label: entry.reference_number, href: `${route}/${entry.reference_order_id}` };
  }

  if (entry.reference_type?.startsWith("purchase_order") || ["po_incoming", "received"].includes(entry.movement_type)) {
    return { label: "PO unavailable" };
  }
  if (entry.reference_type?.startsWith("sale_order") || ["reserved", "shipped"].includes(entry.movement_type)) {
    return { label: "SO unavailable" };
  }
  if (entry.movement_type === "conversion" || entry.reference_type === "inventory_conversion") {
    return { label: "Conversion" };
  }
  if (entry.movement_type === "adjustment") return { label: "Adjustment" };
  return { label: "—" };
}
