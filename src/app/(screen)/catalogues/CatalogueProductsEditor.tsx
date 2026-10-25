import type { CatalogueProduct } from "./types";

type CatalogueProductsEditorProps = {
  products: CatalogueProduct[];
  reviewingTemplate: boolean;
  onUpdateProduct: (index: number, field: "name" | "productNumber", value: string) => void;
  onUpdatePrice: (productIndex: number, entryIndex: number, value: string) => void;
};

export default function CatalogueProductsEditor({
  products,
  reviewingTemplate,
  onUpdateProduct,
  onUpdatePrice,
}: CatalogueProductsEditorProps) {
  const entryCount = products.reduce((count, product) => count + (product.priceEntries?.length ?? 0), 0);

  return (
    <section aria-label="Products and prices" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-foreground">{reviewingTemplate ? "Review extracted products" : "Products and prices"}</h3>
        <p className="text-xs text-foreground/70">
          {products.length} products <span aria-hidden="true">·</span> {entryCount} price tags
          {reviewingTemplate ? " · No prices are entered in this step" : " · Prices in AUD"}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="border-y border-border py-7 text-center text-sm text-muted-foreground">
          No products detected in this catalogue.
        </p>
      ) : (
        <div className="max-h-[68vh] overflow-auto rounded-xl border-2 border-border bg-card">
          <table className={`w-full ${reviewingTemplate ? "min-w-[520px]" : "min-w-[700px]"} table-fixed bg-card text-left text-sm`}>
            <caption className="sr-only">{reviewingTemplate ? "Extracted catalogue products, pages, and price tags" : "Catalogue products, price tags, and editable AUD prices"}</caption>
            <colgroup>
              <col className={reviewingTemplate ? "w-[56%]" : "w-[42%]"} />
              <col className={reviewingTemplate ? "w-[16%]" : "w-[12%]"} />
              <col className={reviewingTemplate ? "w-[28%]" : "w-[23%]"} />
              {!reviewingTemplate && <col className="w-[23%]" />}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-muted text-xs font-semibold text-foreground/75">
              <tr className="border-b border-border">
                <th scope="col" className="border-r border-border px-3 py-2.5">Product</th>
                <th scope="col" className="border-r border-border px-3 py-2.5">Page</th>
                <th scope="col" className="border-r border-border px-3 py-2.5">Price tag</th>
                {!reviewingTemplate && <th scope="col" className="px-3 py-2.5 text-right">Price (AUD)</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((product, productIndex) => {
                const entries = product.priceEntries ?? [];
                const rowCount = Math.max(entries.length, 1);

                return Array.from({ length: rowCount }, (_, entryIndex) => {
                  const entry = entries[entryIndex];
                  const firstRow = entryIndex === 0;

                  return (
                    <tr
                      key={`${productIndex}-${entryIndex}`}
                      className={`border-b border-border/70 last:border-0 hover:bg-muted/30 ${firstRow && productIndex > 0 ? "border-t-2 border-t-border" : ""}`}
                    >
                      {firstRow && (
                        <th scope="rowgroup" rowSpan={rowCount} className="border-r border-border px-3 py-2 text-left align-top font-normal">
                          {reviewingTemplate ? (
                            <div className="space-y-1.5">
                              <label className="sr-only" htmlFor={`catalogue-product-${productIndex}`}>Product name</label>
                              <input
                                id={`catalogue-product-${productIndex}`}
                                value={product.name ?? ""}
                                onChange={(event) => onUpdateProduct(productIndex, "name", event.target.value)}
                                placeholder="Product name"
                                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                              <label className="sr-only" htmlFor={`catalogue-product-number-${productIndex}`}>Product number</label>
                              <input
                                id={`catalogue-product-number-${productIndex}`}
                                value={product.productNumber ?? ""}
                                onChange={(event) => onUpdateProduct(productIndex, "productNumber", event.target.value)}
                                placeholder="Product number (optional)"
                                className="h-7 w-full rounded-md border border-input bg-background px-2.5 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="font-medium leading-5 text-foreground">{product.name?.trim() || "Untitled product"}</p>
                              {product.productNumber && <p className="text-xs text-foreground/70">{product.productNumber}</p>}
                            </div>
                          )}
                        </th>
                      )}
                      {firstRow && (
                        <td rowSpan={rowCount} className="border-r border-border px-3 py-2 align-top text-xs tabular-nums text-foreground/70">
                          {product.pdfPage ? `Page ${product.pdfPage}` : "—"}
                        </td>
                      )}
                      <td className="border-r border-border/70 px-3 py-1.5 text-sm text-foreground">{entry ? String(entry.tag ?? "—") : <span className="text-xs text-muted-foreground">No price tags detected</span>}</td>
                      {!reviewingTemplate && <td className="px-3 py-1.5">
                        {entry ? (
                          <div className="relative ml-auto max-w-40">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <input
                              aria-label={`${product.name || `Product ${productIndex + 1}`} ${entry.tag ?? "price"} price in AUD`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={String(entry.priceAud ?? "")}
                              onChange={(event) => onUpdatePrice(productIndex, entryIndex, event.target.value)}
                              className="h-8 w-full rounded-md border border-input bg-background pl-6 pr-2 text-right text-sm tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </div>
                        ) : <span className="block text-right text-xs text-muted-foreground">—</span>}
                      </td>}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
