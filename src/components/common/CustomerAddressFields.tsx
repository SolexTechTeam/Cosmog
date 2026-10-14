"use client";

import { Input } from "@/components/ui/input";
import type { CustomerAddress } from "@/types";

interface CustomerAddressFieldsProps {
  value: CustomerAddress;
  onChange: (value: CustomerAddress) => void;
}

const fieldClass = "h-8 text-sm font-normal";

export default function CustomerAddressFields({ value, onChange }: CustomerAddressFieldsProps) {
  function update(field: keyof CustomerAddress, nextValue: string) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-semibold text-foreground">Address</legend>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Address line 1
        <Input value={value.line1 ?? ""} onChange={(event) => update("line1", event.target.value)} className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Address line 2
        <Input value={value.line2 ?? ""} onChange={(event) => update("line2", event.target.value)} className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        City
        <Input value={value.city ?? ""} onChange={(event) => update("city", event.target.value)} className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        State / region
        <Input value={value.state ?? ""} onChange={(event) => update("state", event.target.value)} className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Postcode
        <Input value={value.postcode ?? ""} onChange={(event) => update("postcode", event.target.value)} className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Country
        <Input value={value.country ?? ""} onChange={(event) => update("country", event.target.value)} className={fieldClass} />
      </label>
    </fieldset>
  );
}
