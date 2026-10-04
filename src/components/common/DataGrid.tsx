"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type EditableFieldType = "text" | "number" | "date" | "textarea" | "select" | "checkbox" | "json";
type DraftValue = string | boolean;

interface EditableField<T extends object> {
  key: Extract<keyof T, string>;
  label: string;
  type?: EditableFieldType;
  options?: { label: string; value: string }[];
}

interface RowEditConfig<T extends object> {
  fields: EditableField<T>[];
  onSave: (row: T, changes: Record<string, unknown>) => Promise<void>;
}

interface RowArchiveAction<T extends object> {
  label: string;
  isAvailable?: (row: T) => boolean;
  onArchive: (row: T) => Promise<void>;
}

interface DataGridProps<T extends object> {
  rows: T[];
  columns: ColDef<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  detailsTitle?: string;
  renderRowDetails?: (row: T) => ReactNode;
  editConfig?: RowEditConfig<T>;
  editLabel?: string;
  archiveAction?: RowArchiveAction<T>;
}

function formatFieldName(field: string) {
  return field.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function draftValue(value: unknown, type: EditableFieldType) {
  if (type === "checkbox") return Boolean(value);
  if (type === "json") return value == null ? "" : JSON.stringify(value, null, 2);
  return value == null ? "" : String(value);
}

function valuesMatch(first: unknown, second: unknown) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export default function DataGrid<T extends object>({
  rows,
  columns,
  loading = false,
  onRowClick,
  pageSize = 30,
  detailsTitle = "Entry details",
  renderRowDetails,
  editConfig,
  editLabel = "Edit",
  archiveAction,
}: DataGridProps<T>) {
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const [draft, setDraft] = useState<Record<string, DraftValue>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedRow(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function closeDetails() {
    setSelectedRow(null);
    setIsEditing(false);
    setSaveError(null);
    setConfirmingArchive(false);
  }

  function openDetails(row: T) {
    setSelectedRow(row);
    setIsEditing(false);
    setSaveError(null);
    setConfirmingArchive(false);
  }

  function startEditing() {
    if (!selectedRow || !editConfig) return;

    setDraft(
      Object.fromEntries(
        editConfig.fields.map((field) => [field.key, draftValue(selectedRow[field.key], field.type ?? "text")])
      )
    );
    setSaveError(null);
    setConfirmingArchive(false);
    setIsEditing(true);
  }

  async function archiveRow() {
    if (!selectedRow || !archiveAction) return;

    try {
      setSaving(true);
      setSaveError(null);
      await archiveAction.onArchive(selectedRow);
      closeDetails();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to archive this record.");
    } finally {
      setSaving(false);
    }
  }

  async function saveChanges() {
    if (!selectedRow || !editConfig) return;

    try {
      const changes = editConfig.fields.reduce<Record<string, unknown>>((result, field) => {
        const type = field.type ?? "text";
        const value = draft[field.key];
        let parsed: unknown = value;

        if (type === "number") {
          parsed = value === "" ? undefined : Number(value);
        } else if (type === "json") {
          parsed = value === "" ? undefined : JSON.parse(String(value));
        } else if (type !== "checkbox" && value === "") {
          parsed = undefined;
        }

        if (parsed !== undefined && !valuesMatch(parsed, selectedRow[field.key])) {
          result[field.key] = parsed;
        }
        return result;
      }, {});

      if (Object.keys(changes).length === 0) {
        closeDetails();
        return;
      }

      setSaving(true);
      setSaveError(null);
      await editConfig.onSave(selectedRow, changes);
      closeDetails();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <AgGridReact<T>
          rowData={rows}
          columnDefs={columns}
          loading={loading}
          domLayout="autoHeight"
          pagination
          paginationPageSize={pageSize}
          rowSelection="single"
          onRowClicked={onRowClick ? (e) => e.data && onRowClick(e.data) : undefined}
          onRowDoubleClicked={(e) => e.data && openDetails(e.data)}
          suppressCellFocus
          defaultColDef={{
            sortable: true,
            unSortIcon: true,
            resizable: true,
            filter: true,
            flex: 1,
            minWidth: 100,
          }}
        />
      </div>

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={closeDetails}
        >
          <section
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-details-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 id="entry-details-title" className="text-lg font-semibold">{detailsTitle}</h2>
              <div className="flex items-center gap-2">
                {editConfig && !isEditing && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    {editLabel}
                  </button>
                )}
                {archiveAction && !isEditing && archiveAction.isAvailable?.(selectedRow) !== false && !confirmingArchive && (
                  <button
                    type="button"
                    onClick={() => setConfirmingArchive(true)}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    {archiveAction.label}
                  </button>
                )}
                {archiveAction && confirmingArchive && (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmingArchive(false)}
                      disabled={saving}
                      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={archiveRow}
                      disabled={saving}
                      className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {saving ? "Archiving…" : "Confirm archive"}
                    </button>
                  </>
                )}
                {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveChanges}
                      disabled={saving}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeDetails}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[calc(85vh-73px)] overflow-y-auto">
              {saveError && !isEditing && <p className="px-5 pt-4 text-sm text-destructive">{saveError}</p>}
              {isEditing && editConfig ? (
                <div className="space-y-4 p-5">
                  {editConfig.fields.map((field) => {
                    const type = field.type ?? "text";
                    const value = draft[field.key];

                    return (
                      <label key={field.key} className="block text-sm font-medium text-foreground">
                        {type === "checkbox" ? (
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.checked }))}
                              className="size-4 accent-primary"
                            />
                            {field.label}
                          </span>
                        ) : (
                          <>
                            <span>{field.label}</span>
                            {type === "textarea" || type === "json" ? (
                              <textarea
                                value={String(value ?? "")}
                                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                                className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-ring"
                              />
                            ) : type === "select" ? (
                              <select
                                value={String(value ?? "")}
                                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                              >
                                {field.options?.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={type}
                                value={String(value ?? "")}
                                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                              />
                            )}
                          </>
                        )}
                      </label>
                    );
                  })}
                  {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                </div>
              ) : renderRowDetails ? (
                renderRowDetails(selectedRow)
              ) : (
                <dl className="divide-y divide-border">
                  {Object.entries(selectedRow).map(([field, value]) => (
                    <div key={field} className="grid gap-1 px-5 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                      <dt className="text-sm font-medium text-muted-foreground">{formatFieldName(field)}</dt>
                      <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground">
                        {formatValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
