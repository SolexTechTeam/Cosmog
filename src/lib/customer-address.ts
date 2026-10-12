import type { CustomerAddress } from "@/types";

export function formatCustomerAddress(address?: CustomerAddress | null): string {
  if (!address) return "";

  const locality = [address.city, address.state, address.postcode]
    .filter(Boolean)
    .join(" ");

  return [address.line1, address.line2, locality, address.country]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim())
    .join("\n");
}
