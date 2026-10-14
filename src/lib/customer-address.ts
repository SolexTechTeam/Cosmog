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

export function cleanCustomerAddress(address: CustomerAddress): CustomerAddress | undefined {
  const cleaned = Object.fromEntries(
    Object.entries(address)
      .map(([key, value]) => [key, value?.trim()])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  ) as CustomerAddress;

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
