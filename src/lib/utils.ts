export { cn } from "cn"

export function isActiveSaleOrderStatus(status: string) {
  return status === "open" || status === "shipped";
}
