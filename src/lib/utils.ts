export { cn } from "cn"

export function isActiveSaleOrderStatus(status: string) {
  return status === "open" || status === "shipped";
}

export function ownerName(ownerId: string | null | undefined, profiles: { id: string; name: string }[]): string {
  if (!ownerId) return "Unassigned";
  const match = profiles.find((p) => p.id === ownerId);
  return match?.name ?? "Unknown";
}

export function allocationLabel(status: string | null | undefined): string {
  if (status === "ready_to_ship") return "ready_to_ship";
  if (status === "awaiting_procurement") return "awaiting";
  if (status === "needs_procurement" || status === "unallocated") return "need";
  return status ?? "need";
}
