"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, TextArea } from "@/components/ui/input";

interface ShippingDetailsEditorProps {
  details: string | null;
  freightCost: number;
  onSave: (changes: { shipping_details: string; shipping_cost: number; tracking_reference: string }) => Promise<void>;
  trackingReference: string | null;
}

export default function ShippingDetailsEditor({ details, freightCost, onSave, trackingReference }: ShippingDetailsEditorProps) {
  const [shippingDetails, setShippingDetails] = useState(details ?? "");
  const [shippingCost, setShippingCost] = useState(String(freightCost));
  const [tracking, setTracking] = useState(trackingReference ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cost = Number(shippingCost);
    if (!Number.isFinite(cost) || cost < 0) {
      setError("Freight must be zero or more.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ shipping_details: shippingDetails.trim(), shipping_cost: cost, tracking_reference: tracking.trim() });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save shipping details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={save}>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Freight cost (AUD)
        <Input min="0" onChange={(event) => setShippingCost(event.target.value)} step="0.01" type="number" value={shippingCost} />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Tracking reference
        <Input onChange={(event) => setTracking(event.target.value)} value={tracking} />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Shipping details
        <TextArea onChange={(event) => setShippingDetails(event.target.value)} placeholder="Carrier, delivery instructions, or address" rows={3} value={shippingDetails} />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button disabled={saving} htmlType="submit" size="sm">{saving ? "Saving…" : "Save shipping"}</Button>
    </form>
  );
}
