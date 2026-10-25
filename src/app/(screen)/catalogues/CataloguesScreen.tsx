"use client";

import { useRef, useState } from "react";
import { Check, Eye, FileDown, FileJson, FileText, LoaderCircle, Save, Trash2, Upload, X } from "lucide-react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import type { CatalogueConfigRecord, CatalogueCurrentSource, CatalogueExtraction, Profile } from "@/types";
import CatalogueProductsEditor from "./CatalogueProductsEditor";
import SavedConfigsSection from "./SavedConfigsSection";
import type { CatalogueDraft } from "./types";

const MAX_PDF_BYTES = 300 * 1024 * 1024;
const MAX_CONFIG_BYTES = 32 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultName(filename: string): string {
  return filename.replace(/\.pdf$/i, "").slice(0, 200);
}

export default function CataloguesScreen() {
  const { data: profile, loading: profileLoading } = useApi<Profile>([...queryKeys.myProfile], () => AetherClient.getMyProfile());
  const { data: configsResponse, loading, error, refetch } = useApi<{ configs: CatalogueConfigRecord[] }>(
    [...queryKeys.catalogueConfigs],
    () => AetherClient.getCatalogueConfigs(),
  );
  const { data: sourceResponse, loading: sourceLoading, refetch: refetchSource } = useApi<{ source: CatalogueCurrentSource | null }>(
    [...queryKeys.catalogueConfigs, "current-source"],
    () => AetherClient.getCurrentCatalogueSource(),
  );
  const invalidate = useInvalidate();
  const [file, setFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<CatalogueExtraction | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selected, setSelected] = useState<CatalogueConfigRecord | null>(null);
  const [name, setName] = useState("");
  const [configDraft, setConfigDraft] = useState<CatalogueDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [jsonError, setJsonError] = useState("");
  const [newConfigFromTemplate, setNewConfigFromTemplate] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [configSectionCollapsed, setConfigSectionCollapsed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  function discardStagedExtraction() {
    if (extraction) void AetherClient.discardCatalogueUpload(extraction.uploadId).catch(() => undefined);
    setExtraction(null);
  }

  function openConfig(config: CatalogueConfigRecord) {
    if (dirty && !window.confirm("Discard your unsaved config edits?")) return;
    setSelected(config);
    setNewConfigFromTemplate(false);
    setName(config.name);
    setConfigDraft(config.json as CatalogueDraft);
    discardStagedExtraction();
    setDirty(false);
    setJsonError("");
    setErrorMessage("");
  }

  async function startNewConfigFromTemplate() {
    const source = sourceResponse?.source;
    if (!source) return;
    if (dirty && !window.confirm("Discard your unsaved changes and start a new client config?")) return;
    setErrorMessage("");
    try {
      const { config } = await AetherClient.getCurrentCatalogueConfig();
      setSelected(null);
      discardStagedExtraction();
      setName("");
      setConfigDraft(JSON.parse(JSON.stringify(config)) as CatalogueDraft);
      setNewConfigFromTemplate(true);
      setDirty(true);
      setJsonError("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load the current catalogue config.");
    }
  }

  async function viewCurrentTemplate() {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const { url } = await AetherClient.getCurrentCatalogueSourceUrl();
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (error) {
      tab?.close();
      setErrorMessage(error instanceof Error ? error.message : "Could not open the current catalogue PDF.");
    }
  }

  function chooseFile(next: File | null) {
    setErrorMessage("");
    setFile(next);
    setDragActive(false);
    if (next && (next.size <= 0 || next.size > MAX_PDF_BYTES)) {
      setErrorMessage("Choose a PDF that is no larger than 300 MiB.");
      setFile(null);
    } else if (next && !next.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Choose a PDF file.");
      setFile(null);
    }
  }

  async function startUpload() {
    if (!file || uploading || extraction) return;
    if (dirty && !window.confirm("Discard your unsaved config edits and start a new import?")) return;
    setErrorMessage("");
    setSelected(null);
    setNewConfigFromTemplate(false);
    setConfigDraft(null);
    setName("");
    setDirty(false);
    setUploading(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await AetherClient.uploadCataloguePdf(file, controller.signal);
      setExtraction(result);
      setName(defaultName(result.filename));
      setConfigDraft(result.config as CatalogueDraft);
      setDirty(false);
      setJsonError("");
      setFile(null);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setErrorMessage(error instanceof Error ? error.message : "Upload failed. Try again.");
      } else {
        setErrorMessage("Upload cancelled.");
      }
    } finally {
      controllerRef.current = null;
      setUploading(false);
    }
  }

  async function cancelUpload() {
    controllerRef.current?.abort();
    if (extraction) await AetherClient.discardCatalogueUpload(extraction.uploadId).catch(() => undefined);
    setExtraction(null);
    setUploading(false);
    setFile(null);
  }

  function currentConfig(allowPriceDraft = false): Record<string, unknown> | null {
    if (!configDraft) return null;
    for (const product of configDraft.products ?? []) {
      if (!product.name?.trim()) {
        setJsonError("Every product needs a name before you save.");
        return null;
      }
      for (const entry of product.priceEntries ?? []) {
        if (allowPriceDraft && (!entry.tag?.trim() || entry.priceAud === "" || entry.priceAud === undefined || entry.priceAud === null)) continue;
        const amount = Number(entry.priceAud);
        if (!entry.tag?.trim() || !Number.isFinite(amount) || amount < 0) {
          setJsonError(`Check the price tags and AUD prices for “${product.name}”.`);
          return null;
        }
      }
    }
    if (new TextEncoder().encode(JSON.stringify(configDraft)).byteLength > MAX_CONFIG_BYTES) {
      setJsonError("Config exceeds the 32 MiB limit.");
      return null;
    }
    setJsonError("");
    return configDraft;
  }

  function updateProduct(index: number, field: "name" | "productNumber", value: string) {
    setConfigDraft((current) => {
      if (!current) return current;
      const products = [...(current.products ?? [])];
      products[index] = { ...products[index], [field]: field === "productNumber" ? value || null : value };
      return { ...current, products };
    });
    setDirty(true);
  }

  function updatePrice(index: number, entryIndex: number, value: string) {
    setConfigDraft((current) => {
      if (!current) return current;
      const products = [...(current.products ?? [])];
      const product = products[index];
      const priceEntries = [...(product.priceEntries ?? [])];
      priceEntries[entryIndex] = { ...priceEntries[entryIndex], priceAud: value !== "" ? Number(value) : value };
      products[index] = { ...product, priceEntries };
      return { ...current, products };
    });
    setDirty(true);
  }

  async function save() {
    if (!extraction && !name.trim()) { setErrorMessage("Enter a name for this config."); return; }
    const parsed = currentConfig(!!extraction);
    if (!parsed) return;
    setSaving(true);
    setErrorMessage("");
    try {
      if (selected) {
        const response = await AetherClient.updateCatalogueConfig(selected.id, { name: name.trim(), config: parsed });
        setSelected(response.config);
      } else if (extraction) {
        await AetherClient.saveCurrentCatalogueTemplate(extraction.uploadId, parsed);
        setName("");
        setConfigDraft(null);
        setExtraction(null);
        setNewConfigFromTemplate(false);
        setUploadOpen(false);
        await refetchSource();
      } else if (newConfigFromTemplate) {
        const response = await AetherClient.createCatalogueConfigFromTemplate({ name: name.trim(), config: parsed });
        setSelected(response.config);
        setNewConfigFromTemplate(false);
      } else {
        return;
      }
      if (selected || newConfigFromTemplate) setConfigDraft(parsed as CatalogueDraft);
      setDirty(false);
      await Promise.all([refetch(), refetchSource(), invalidate([...queryKeys.catalogueConfigs])]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save catalogue config.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadEditedPdf() {
    if (!selected || downloadingPdf) return;
    setDownloadingPdf(true);
    setErrorMessage("");
    try {
      const { blob, filename } = await AetherClient.downloadEditedCataloguePdf(selected.id);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create the priced catalogue PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function removeConfig() {
    if (!selected || deleting || !window.confirm(`Delete saved config “${selected.name}”?`)) return;
    setDeleting(true);
    setErrorMessage("");
    try {
      await AetherClient.deleteCatalogueConfig(selected.id);
      setSelected(null);
      setName("");
      setConfigDraft(null);
      setDirty(false);
      await Promise.all([refetch(), invalidate([...queryKeys.catalogueConfigs])]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete config.");
    } finally {
      setDeleting(false);
    }
  }

  if (profileLoading) return <main className="max-w-6xl animate-pulse"><div className="h-8 w-56 rounded bg-muted" /><div className="mt-6 h-40 rounded bg-muted" /></main>;
  if (profile?.role !== "admin") return <main className="max-w-4xl"><h1 className="text-3xl font-bold tracking-tight">Catalogue configs</h1><p className="mt-4 text-sm text-muted-foreground">Administrator access is required to upload or edit catalogue configs.</p></main>;

  const configs = configsResponse?.configs ?? [];
  const currentSource = sourceResponse?.source ?? null;
  const editable = !!selected || newConfigFromTemplate;
  const products = configDraft?.products ?? [];
  const unassignedTags = configDraft?.unassignedPriceTags ?? [];
  const unparsedPrices = configDraft?.unparsedPriceAmounts ?? [];
  const priceCount = products.reduce((count, product) => count + (product.priceEntries?.length ?? 0), 0);
  const templateCanBeSaved = products.length > 0 && priceCount > 0 && unassignedTags.length === 0 && unparsedPrices.length === 0;
  const extractionNeedsCorrection = !!extraction && !templateCanBeSaved;
  const active = uploading || !!extraction;
  const uploadStep = saving && extraction ? 3 : extraction ? 2 : 1;

  return (
    <main className="max-w-7xl pb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight text-foreground">Catalogue configs</h1><p className="mt-1 text-sm text-muted-foreground">One shared PDF template, with saved price configs to dynamically price catalogues.</p></div>
      </div>

      {errorMessage && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}

      <section aria-labelledby="current-catalogue-heading" className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 id="current-catalogue-heading" className="text-sm font-semibold">Current catalogue PDF</h2>{sourceLoading ? <p className="mt-0.5 text-xs text-muted-foreground">Loading current template…</p> : currentSource ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{currentSource.filename}<span className="mx-1.5 text-border">·</span>{formatBytes(currentSource.sizeBytes)}</p> : <p className="mt-0.5 text-sm text-muted-foreground">No shared catalogue yet. Your first upload becomes the template.</p>}</div><div className="flex shrink-0 gap-2">{currentSource && <button type="button" onClick={() => void viewCurrentTemplate()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted"><Eye size={14} /> View PDF</button>}<button type="button" onClick={() => { setUploadOpen((open) => !open); setFile(null); setErrorMessage(""); }} disabled={active} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Upload size={14} />{currentSource ? "Replace PDF" : "Upload PDF"}</button></div></div>
      </section>

      {((!sourceLoading && !currentSource) || uploadOpen || active) && <section aria-labelledby="catalogue-upload-heading" className="mb-5 rounded-xl border border-[#f2e7eb] bg-[#fff9fa] p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><FileText size={17} /></span><div><h2 id="catalogue-upload-heading" className="text-sm font-semibold">{currentSource ? "Replace catalogue PDF" : "Set up the catalogue"}</h2><p className="mt-0.5 max-w-2xl text-xs leading-5 text-foreground/75">{currentSource ? "Review the extracted products before replacing the shared PDF. Saved configs keep matching products." : "Your first PDF becomes the shared blank template. Review its products, then confirm to save it."}</p></div></div><span className="shrink-0 rounded-full border border-[#f2e7eb] bg-white/70 px-2.5 py-1 text-xs font-medium text-foreground/70">PDF · Up to 300 MiB</span></div>

        <ol aria-label="Catalogue upload steps" className="mt-4 grid grid-cols-3 gap-2">
          {["Upload PDF", "Review products", "Confirm"].map((step, index) => {
            const stepNumber = index + 1;
            const complete = uploadStep > stepNumber;
            const current = uploadStep === stepNumber;
            return <li key={step} aria-current={current ? "step" : undefined} className={`flex min-w-0 items-center gap-2 border-b-2 pb-2 text-xs font-medium ${complete || current ? "border-primary text-foreground" : "border-[#eadde1] text-foreground/55"}`}>
              <span className={`grid size-5 shrink-0 place-items-center rounded-full text-xs ${complete ? "bg-primary text-primary-foreground" : current ? "border border-primary bg-white text-primary" : "border border-[#e5d5da] bg-white/70 text-foreground/60"}`}>{complete ? <Check size={12} /> : stepNumber}</span>
              <span className="truncate">{step}</span>
            </li>;
          })}
        </ol>

        {!extraction && <>
          <div
            onDragOver={(event) => { event.preventDefault(); if (!uploading) setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => { event.preventDefault(); if (!uploading) chooseFile(event.dataTransfer.files?.[0] ?? null); }}
            className={`mt-3 rounded-xl border-2 border-dashed px-4 py-4 transition-colors ${dragActive ? "border-primary bg-primary/10" : "border-[#e8cfd7] bg-white/70 hover:border-primary/50 hover:bg-white"} ${uploading ? "opacity-70" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-start sm:text-left">
              <span className={`grid size-10 place-items-center rounded-xl ${dragActive ? "bg-primary text-primary-foreground" : "bg-[#fff0f3] text-primary"}`}><Upload size={18} /></span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Drop your catalogue PDF here</p>
                <p className="mt-0.5 text-xs text-foreground/70">or <label htmlFor="catalogue-pdf-input" className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline">browse files</label><span> · PDF only · 300 MiB maximum</span></p>
              </div>
              <input id="catalogue-pdf-input" className="sr-only" type="file" accept="application/pdf,.pdf" disabled={uploading} onChange={(event) => { chooseFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
            </div>
            {file && <div className="mt-3 flex min-w-0 items-center gap-2 rounded-lg border border-[#f2e7eb] bg-white px-3 py-2"><FileText size={15} className="shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{file.name}<span className="ml-2 font-normal text-foreground/65">{formatBytes(file.size)}</span></span><button type="button" onClick={() => setFile(null)} aria-label="Remove selected PDF" className="grid size-6 shrink-0 place-items-center rounded-md text-foreground/60 hover:bg-muted hover:text-foreground"><X size={14} /></button></div>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {file && <button type="button" onClick={() => void startUpload()} disabled={uploading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"><Upload size={14} /> Upload and review</button>}
            {uploading && <button type="button" onClick={() => void cancelUpload()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e8cfd7] bg-white px-3 text-xs font-medium text-foreground hover:bg-muted"><X size={14} />Cancel</button>}
            {uploading && <p className="flex items-center gap-2 text-xs font-medium text-foreground/75" aria-live="polite"><LoaderCircle size={14} className="animate-spin text-primary" />Uploading and extracting your PDF… large files may take a few minutes.</p>}
          </div>
        </>}

        {extraction && <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#f2e7eb] bg-white/80 px-3 py-2"><div className="flex min-w-0 items-center gap-2"><FileText size={15} className="shrink-0 text-primary" /><span className="truncate text-xs font-medium text-foreground">{extraction.filename}</span><span className="shrink-0 text-xs text-foreground/65">{products.length} products · {priceCount} price tags</span></div><button type="button" onClick={() => void cancelUpload()} disabled={saving} className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50">Choose another PDF</button></div>
          <div className="mt-3 rounded-xl border border-[#f2e7eb] bg-white p-3 sm:p-4">
            <CatalogueProductsEditor products={products} reviewingTemplate onUpdateProduct={updateProduct} onUpdatePrice={updatePrice} />
          </div>
          {extractionNeedsCorrection && <div role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"><p className="font-medium">This extraction is incomplete; the shared PDF will not be replaced.</p><ul className="mt-2 list-inside list-disc text-muted-foreground">{unassignedTags.map((group, index) => <li key={`unassigned-${index}`}>Page {group.pdfPage ?? "?"}: {group.priceEntries?.length ?? 0} price tag(s) could not be assigned to a product{group.status ? ` (${group.status})` : ""}.</li>)}{unparsedPrices.map((entry, index) => <li key={`unparsed-${index}`}>Page {entry.pdfPage ?? "?"}: a printed price amount has no readable label.</li>)}{products.length === 0 && <li>No products were extracted.</li>}{products.length > 0 && priceCount === 0 && <li>No price tags were extracted.</li>}</ul><p className="mt-2 text-muted-foreground">Choose a catalogue with readable, assignable price labels and try again.</p></div>}
          {saving && <div className="mt-4 space-y-2" aria-live="polite"><div className="flex items-center justify-between gap-2 text-xs font-medium text-foreground"><span>Uploading catalogue to shared storage…</span><LoaderCircle size={14} className="animate-spin text-primary" /></div><div role="progressbar" aria-label="Uploading catalogue PDF" aria-valuetext="Upload in progress" className="h-2 overflow-hidden rounded-full bg-primary/15"><div className="catalogue-upload-progress h-full w-1/3 rounded-full bg-primary" /></div></div>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#eadde1] pt-3">
            <button type="button" onClick={() => void cancelUpload()} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e8cfd7] bg-white px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"><X size={14} />Back to PDF</button>
            <button type="button" onClick={() => void save()} disabled={saving || !templateCanBeSaved} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}{saving ? "Uploading…" : "Confirm and upload"}</button>
          </div>
        </>}

        {currentSource && !active && <button type="button" onClick={() => { setUploadOpen(false); setFile(null); setErrorMessage(""); }} className="mt-3 text-xs text-foreground/70 hover:text-foreground">Cancel replacement</button>}
      </section>}

      {!active && <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card xl:flex-row">
        <div className={`w-full min-w-0 shrink-0 overflow-hidden border-b border-border bg-muted/20 transition-[width] duration-200 ease-out xl:border-b-0 xl:border-r ${configSectionCollapsed ? "xl:w-12" : "xl:w-72"}`}>
        <SavedConfigsSection
          configs={configs}
          selectedConfigId={selected?.id ?? null}
          hasTemplate={!!currentSource}
          loading={loading}
          error={error}
          collapsed={configSectionCollapsed}
          onNewConfig={startNewConfigFromTemplate}
          onOpenConfig={openConfig}
          onToggleCollapsed={() => setConfigSectionCollapsed((collapsed) => !collapsed)}
        />
        </div>

        <section aria-labelledby="config-editor-heading" className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 id="config-editor-heading" className="text-base font-semibold">{selected ? "Edit saved config" : newConfigFromTemplate ? "New client config" : "Config editor"}</h2>{editable && <div className="flex flex-wrap gap-1.5">{selected && currentSource && <button type="button" onClick={() => void downloadEditedPdf()} disabled={downloadingPdf} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50">{downloadingPdf ? <LoaderCircle className="animate-spin" size={14} /> : <FileDown size={14} />}{downloadingPdf ? "Preparing PDF…" : "Download priced PDF"}</button>}{selected && <button type="button" onClick={() => void removeConfig()} disabled={deleting} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"><Trash2 size={14} /> Delete</button>}</div>}</div>
          {!editable ? <div className="flex min-h-64 flex-col items-center justify-center border-y border-border py-10 text-center"><FileJson size={24} className="text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Choose a saved config or upload a PDF to begin.</p></div> : <>
            <div className="mb-3 flex items-end justify-between gap-3"><label className="block min-w-0 max-w-md flex-1 text-xs font-medium text-muted-foreground">Config name<input value={name} onChange={(event) => { setName(event.target.value); setDirty(true); }} maxLength={200} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label><span className="shrink-0 pb-2 text-xs tabular-nums text-muted-foreground">{products.length} products</span></div>
            <CatalogueProductsEditor
              products={products}
              reviewingTemplate={false}
              onUpdateProduct={updateProduct}
              onUpdatePrice={updatePrice}
            />
            {jsonError && <p role="alert" className="mt-2 text-sm text-destructive">{jsonError}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2"><span className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "Saved"} · Source hash and geometry are preserved</span><button type="button" onClick={() => void save()} disabled={saving || (!dirty && !!selected) || (!!extraction && !templateCanBeSaved)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />}{saving ? "Saving…" : extraction ? "Save as current template" : "Save config"}</button></div>
          </>}
        </section>
      </div>}
    </main>
  );
}
