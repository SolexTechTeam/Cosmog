"use client";

import { Plus, Trash2 } from "lucide-react";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { Select } from "@/components/ui/select";
import type { Product, PurchaseOrder } from "@/types";

export interface PurchaseItemDraft {
  key: string;
  id?: string;
  product_id: string;
  quantity_ordered: string;
  unit_cost: string;
  shipping_cost: string;
  source_currency: string;
  fx_rate: number;
}

export function itemDraftsFromOrder(order: PurchaseOrder): PurchaseItemDraft[] {
  return (order.items ?? []).map((item) => ({
    key: item.id,
    id: item.id,
    product_id: item.product_id,
    quantity_ordered: String(item.quantity_ordered),
    unit_cost: String(item.source_unit_cost ?? item.unit_cost),
    shipping_cost: String(Number(((item.shipping_cost ?? 0) / (item.fx_rate || 1)).toFixed(2))),
    source_currency: item.source_currency ?? "AUD",
    fx_rate: item.fx_rate || 1,
  }));
}

export function purchaseItemsChanged(order: PurchaseOrder, drafts: PurchaseItemDraft[]) {
  const items = order.items ?? [];
  return drafts.length !== items.length || drafts.some((draft, index) => {
    const item = items[index];
    return !item || draft.id !== item.id || draft.product_id !== item.product_id
      || Number(draft.quantity_ordered) !== item.quantity_ordered
      || Number(draft.unit_cost) !== Number(item.source_unit_cost ?? item.unit_cost)
      || Number(draft.shipping_cost) !== Number(((item.shipping_cost ?? 0) / (item.fx_rate || 1)).toFixed(2));
  });
}

export async function savePurchaseOrderItems(order: PurchaseOrder, drafts: PurchaseItemDraft[]) {
  if (order.status !== "draft" && order.status !== "confirmed") {
    throw new Error("PO items can only be edited while Draft or Confirmed.");
  }
  if (!drafts.length) throw new Error("Keep at least one product on the purchase order.");
  const selectedProducts = drafts.map((draft) => draft.product_id).filter(Boolean);
  if (new Set(selectedProducts).size !== selectedProducts.length) {
    throw new Error("Each product can only appear once on a purchase order.");
  }
  if (!purchaseItemsChanged(order, drafts)) return;
  const items = drafts.map((draft) => {
    const quantity = Number(draft.quantity_ordered);
    const unitCost = Number(draft.unit_cost);
    const shippingCost = Number(draft.shipping_cost);
    const rate = draft.fx_rate;
    if (!draft.product_id || !draft.quantity_ordered.trim() || !Number.isInteger(quantity) || quantity < 1
      || !draft.unit_cost.trim() || !Number.isFinite(unitCost) || unitCost < 0
      || !draft.shipping_cost.trim() || !Number.isFinite(shippingCost) || shippingCost < 0
      || !Number.isFinite(rate) || rate <= 0) {
      throw new Error("Choose a product and enter a whole quantity plus non-negative unit and shipping costs for every line.");
    }
    return {
      ...(draft.id ? { id: draft.id } : {}),
      product_id: draft.product_id,
      quantity_ordered: quantity,
      unit_cost: Number((unitCost * rate).toFixed(2)),
      shipping_cost: Number((shippingCost * rate).toFixed(2)),
      source_currency: draft.source_currency,
      source_unit_cost: unitCost,
      fx_rate: rate,
    };
  });
  return AetherClient.replacePurchaseOrderItems(order.id, items);
}

export default function PurchaseOrderQuantityFields({ order, drafts, onChange, disabled = false }: {
  order: PurchaseOrder;
  drafts: PurchaseItemDraft[];
  onChange: (drafts: PurchaseItemDraft[]) => void;
  disabled?: boolean;
}) {
  const { data: products } = useApi<Product[]>([...queryKeys.products], () => AetherClient.getProducts());
  if (order.status !== "draft" && order.status !== "confirmed") return null;
  const productOptions = new Map<string, { name: string; category?: string }>();
  for (const item of order.items ?? []) {
    if (item.product) productOptions.set(item.product_id, item.product);
  }
  for (const product of products ?? []) productOptions.set(product.id, product);
  for (const draft of drafts) {
    if (draft.product_id && !productOptions.has(draft.product_id)) {
      productOptions.set(draft.product_id, { name: "Product unavailable" });
    }
  }
  const hasAvailableProduct = !drafts.some((draft) => !draft.product_id)
    && (products ?? []).some((product) => !drafts.some((draft) => draft.product_id === product.id));

  function changeLine(index: number, changes: Partial<PurchaseItemDraft>) {
    onChange(drafts.map((draft, current) => current === index ? { ...draft, ...changes } : draft));
  }

  return (
    <fieldset className="min-w-0 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-semibold">Products and quantities</legend>
      <div className="space-y-3">
        {drafts.map((draft, index) => {
          const quantity = Number(draft.quantity_ordered) || 0;
          const total = quantity * (Number(draft.unit_cost) || 0) + (Number(draft.shipping_cost) || 0);
          return (
            <div key={draft.key} className="grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))_2.25rem] items-end gap-2 rounded-md border border-border bg-background p-3">
              <label className="col-span-4 grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">Product
                <Select searchable required value={draft.product_id} onChange={(event) => changeLine(index, { product_id: event.target.value })} disabled={disabled} className="h-9 min-w-0 w-full rounded-md border border-input bg-background px-2 text-sm font-normal">
                  <option value="">Select product</option>
                  {[...productOptions].filter(([productId]) => productId === draft.product_id || !drafts.some((line, lineIndex) => lineIndex !== index && line.product_id === productId)).map(([productId, product]) => <option key={productId} value={productId}>{product.name}{product.category ? ` · ${product.category}` : ""}</option>)}
                </Select>
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">Qty
                <input type="number" min="1" step="1" required value={draft.quantity_ordered} onChange={(event) => changeLine(index, { quantity_ordered: event.target.value })} disabled={disabled} className="h-9 min-w-0 w-full rounded-md border border-input bg-background px-2 text-right text-sm font-normal" />
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">Unit ({draft.source_currency})
                <input type="number" min="0" step="0.01" required value={draft.unit_cost} onChange={(event) => changeLine(index, { unit_cost: event.target.value })} disabled={disabled} className="h-9 min-w-0 w-full rounded-md border border-input bg-background px-2 text-right text-sm font-normal" />
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">Ship ({draft.source_currency})
                <input type="number" min="0" step="0.01" required value={draft.shipping_cost} onChange={(event) => changeLine(index, { shipping_cost: event.target.value })} disabled={disabled} className="h-9 min-w-0 w-full rounded-md border border-input bg-background px-2 text-right text-sm font-normal" />
              </label>
              <button type="button" aria-label={`Remove product ${index + 1}`} title="Remove product" onClick={() => onChange(drafts.filter((_, current) => current !== index))} disabled={disabled || drafts.length === 1} className="flex h-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40"><Trash2 className="size-4" /></button>
              <p className="col-span-4 text-xs text-muted-foreground">Line total: {draft.source_currency} ${total.toFixed(2)}</p>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => onChange([...drafts, { key: crypto.randomUUID(), product_id: "", quantity_ordered: "1", unit_cost: "", shipping_cost: "0", source_currency: drafts[0]?.source_currency ?? "AUD", fx_rate: drafts[0]?.fx_rate ?? 1 }])} disabled={disabled || !hasAvailableProduct} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-muted disabled:opacity-50"><Plus className="size-4" />Add product</button>
    </fieldset>
  );
}
