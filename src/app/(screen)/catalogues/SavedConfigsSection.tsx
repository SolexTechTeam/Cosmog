import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CatalogueConfigRecord } from "@/types";

type SavedConfigsSectionProps = {
  configs: CatalogueConfigRecord[];
  selectedConfigId: string | null;
  hasTemplate: boolean;
  loading: boolean;
  error: string | null;
  collapsed: boolean;
  onNewConfig: () => void;
  onOpenConfig: (config: CatalogueConfigRecord) => void;
  onToggleCollapsed: () => void;
};

export default function SavedConfigsSection({
  configs,
  selectedConfigId,
  hasTemplate,
  loading,
  error,
  collapsed,
  onNewConfig,
  onOpenConfig,
  onToggleCollapsed,
}: SavedConfigsSectionProps) {
  return (
    <section aria-labelledby="saved-configs-heading" className={`min-w-0 ${collapsed ? "p-1.5 xl:p-1" : "xl:flex xl:h-full xl:min-h-0 xl:flex-col"}`}>
      <h2 id="saved-configs-heading" className="sr-only">Saved configs</h2>
      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Expand saved configs"
          title="Expand saved configs"
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight size={16} />
          <span className="xl:hidden">Show saved configs</span>
        </button>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Collapse saved configs"
                title="Collapse saved configs"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="truncate text-sm font-semibold">Saved configs <span className="ml-1 font-normal tabular-nums text-foreground/70">{configs.length}</span></span>
            </div>
            {hasTemplate && <button type="button" onClick={onNewConfig} className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted"><Plus size={13} /> New</button>}
          </div>
          <div id="saved-configs-table" className="max-h-[68vh] overflow-y-auto xl:min-h-0 xl:max-h-none xl:flex-1">
          {loading ? <p className="px-3 py-5 text-sm text-muted-foreground">Loading saved configs…</p> : error ? <p role="alert" className="px-3 py-4 text-sm text-destructive">{error}</p> : configs.length === 0 ? <p className="px-3 py-5 text-sm text-muted-foreground">No configs saved yet.</p> : (
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Saved catalogue configs</caption>
              <colgroup>
                <col />
                <col className="w-12" />
                <col className="w-[68px]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-muted text-xs text-foreground/75">
                <tr className="border-b border-border">
                  <th scope="col" className="px-3 py-2 font-semibold">Config name</th>
                  <th scope="col" className="px-1 py-2 text-right font-semibold">#</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => {
                  const products = Array.isArray(config.json.products) ? config.json.products.length : 0;
                  const selected = selectedConfigId === config.id;
                  return (
                    <tr key={config.id} className={`border-b border-border/70 last:border-0 ${selected ? "bg-primary/5" : "bg-card hover:bg-muted/40"}`}>
                      <th scope="row" className="max-w-0 px-3 py-3 font-medium text-foreground">
                        <button type="button" onClick={() => onOpenConfig(config)} aria-current={selected ? "true" : undefined} className="block w-full truncate text-left outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring">{config.name}</button>
                      </th>
                      <td className="px-1 py-3 text-right text-xs tabular-nums text-foreground/75">{products}</td>
                      <td className="px-2 py-3 text-right">
                        <button type="button" onClick={() => onOpenConfig(config)} aria-label={`${selected ? "Currently editing" : "Open"} ${config.name}`} className={`whitespace-nowrap text-xs font-semibold ${selected ? "text-primary" : "text-foreground/75 hover:text-foreground"}`}>{selected ? "Editing" : "Open"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          </div>
        </>
      )}
    </section>
  );
}
