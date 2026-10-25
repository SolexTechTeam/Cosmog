export type CataloguePriceEntry = { tag?: string; priceAud?: string | number; [key: string]: unknown };

export type CatalogueProduct = {
  name?: string;
  productNumber?: string | null;
  pdfPage?: number | null;
  priceEntries?: CataloguePriceEntry[];
  [key: string]: unknown;
};

export type ExtractionIssue = {
  pdfPage?: number;
  status?: string;
  priceEntries?: CataloguePriceEntry[];
  priceAud?: number;
};

export type CatalogueDraft = Record<string, unknown> & {
  products?: CatalogueProduct[];
  unassignedPriceTags?: ExtractionIssue[];
  unparsedPriceAmounts?: ExtractionIssue[];
};
