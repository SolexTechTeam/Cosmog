export { cn } from "cn"

export function isActiveSaleOrderStatus(status: string) {
  return status === "open" || status === "shipped";
}

export function ownerName(owner: unknown): string {
  if (!owner) return "Unassigned";
  if (Array.isArray(owner)) return owner[0]?.name ?? "Unassigned";
  if (typeof owner === "object" && "name" in owner) return (owner as { name: string }).name;
  return "Unassigned";
}

export function allocationLabel(status: string | null | undefined): string {
  if (status === "ready_to_ship") return "ready_to_ship";
  if (status === "awaiting_procurement") return "awaiting";
  if (status === "needs_procurement" || status === "unallocated") return "need";
  return status ?? "need";
}
