"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { Select } from "@/components/ui/select";

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_SIZE_OPTIONS = [25, 50];

type EditableFieldType = "text" | "number" | "date" | "textarea" | "select" | "checkbox" | "json";
type DraftValue = string | boolean;

interface EditableField<T extends object> {
  key: Extract<keyof T, string>;
  label: string;
  type?: EditableFieldType;
  options?: { label: string; value: string }[];
  emptyValue?: null;
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
  detailsRowId?: string;
  renderRowDetails?: (row: T) => ReactNode;
  renderExpandedRowDetails?: (row: T) => ReactNode;
  getExpandedDetailsTitle?: (row: T) => string;
  showDetailsMenu?: boolean;
  detailsPageHref?: (row: T) => string;
  expandOnRowDoubleClick?: boolean;
  expandedRowHeight?: number;
  editConfig?: RowEditConfig<T>;
  editLabel?: string;
  archiveAction?: RowArchiveAction<T>;
  onSaveSuccess?: (row: T) => void;
  onArchiveSuccess?: (row: T) => void;
}

type InlineDetailRow<T extends object> = T & {
  __inlineDetail: true;
  row: T;
};

function isInlineDetailRow<T extends object>(row: T | InlineDetailRow<T> | undefined): row is InlineDetailRow<T> {
  return Boolean(row && "__inlineDetail" in row && row.__inlineDetail === true);
}

interface DetailsMenuProps {
  onOpen: () => void;
  onEdit?: () => void;
  pageHref?: string;
}

function DetailsMenu({ onOpen, onEdit, pageHref }: DetailsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside() { setIsOpen(false); }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative flex h-full items-center justify-center">
      <button
        type="button"
        aria-label="Open row actions"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          const button = event.currentTarget.getBoundingClientRect();
          setMenuPosition({ top: button.top + button.height / 2, left: button.right + 8 });
          setIsOpen((open) => !open);
        }}
        className="rounded p-1 text-lg leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        ⋮
      </button>
      {isOpen && menuPosition && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed z-[60] w-36 -translate-y-1/2 rounded-md border border-border bg-card p-1 shadow-lg"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
              onOpen();
            }}
            className="w-full rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
          >
            Open details
          </button>
          {pageHref && (
            <Link
              href={pageHref}
              onClick={() => setIsOpen(false)}
              className="block w-full rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
            >
              Open page
            </Link>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                onEdit();
              }}
              className="w-full rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
            >
              Edit
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
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
  pageSize = 25,
  detailsTitle = "Entry details",
  detailsRowId,
  renderRowDetails,
  renderExpandedRowDetails,
  getExpandedDetailsTitle,
  showDetailsMenu = false,
  detailsPageHref,
  expandOnRowDoubleClick = false,
  expandedRowHeight = 720,
  editConfig,
  editLabel = "Edit",
  archiveAction,
  onSaveSuccess,
  onArchiveSuccess,
}: DataGridProps<T>) {
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const [dismissedDetailsRowId, setDismissedDetailsRowId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<T | null>(null);
  const [draft, setDraft] = useState<Record<string, DraftValue>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedRow(null);
        if (detailsRowId) setDismissedDetailsRowId(detailsRowId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailsRowId]);

  const linkedDetailsRow = detailsRowId && dismissedDetailsRowId !== detailsRowId
    ? rows.find((row) => String((row as { id?: unknown }).id) === detailsRowId) ?? null
    : null;
  const activeDetailsRow = selectedRow ?? linkedDetailsRow;

  function closeDetails() {
    if (detailsRowId) setDismissedDetailsRowId(detailsRowId);
    setSelectedRow(null);
    setIsEditing(false);
    setSaveError(null);
    setConfirmingArchive(false);
  }

  function openDetails(row: T) {
    setDismissedDetailsRowId(null);
    setSelectedRow(row);
    setIsEditing(false);
    setSaveError(null);
    setConfirmingArchive(false);
  }

  function toggleExpandedDetails(row: T) {
    setExpandedRow((current) => current === row ? null : row);
  }

  function handleRowDoubleClick(row: T) {
    if (expandOnRowDoubleClick) {
      toggleExpandedDetails(row);
      return;
    }
    openDetails(row);
  }

  function openEdit(row: T) {
    if (!editConfig) return;

    setDismissedDetailsRowId(null);
    setSelectedRow(row);
    setDraft(
      Object.fromEntries(
        editConfig.fields.map((field) => [field.key, draftValue(row[field.key], field.type ?? "text")])
      )
    );
    setSaveError(null);
    setConfirmingArchive(false);
    setIsEditing(true);
  }

  const actionColumn: ColDef<T> | undefined = renderRowDetails && showDetailsMenu
    ? {
        colId: "row-actions",
        headerName: "",
        width: 52,
        minWidth: 52,
        maxWidth: 52,
        sortable: false,
        resizable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        suppressMovable: true,
        cellRenderer: (params: { data?: T }) =>
          params.data ? (
            <DetailsMenu
              onOpen={() => openDetails(params.data as T)}
              onEdit={editConfig ? () => openEdit(params.data as T) : undefined}
              pageHref={detailsPageHref?.(params.data as T)}
            />
          ) : null,
      }
    : undefined;

  const gridRows: Array<T | InlineDetailRow<T>> = expandOnRowDoubleClick
    ? rows.flatMap((row) => expandedRow === row ? [row, { ...row, __inlineDetail: true, row }] : [row])
    : rows;

  function startEditing() {
    if (!activeDetailsRow || !editConfig) return;
    openEdit(activeDetailsRow);
  }

  async function archiveRow() {
    if (!activeDetailsRow || !archiveAction) return;

    try {
      setSaving(true);
      setSaveError(null);
      await archiveAction.onArchive(activeDetailsRow);
      onArchiveSuccess?.(activeDetailsRow);
      closeDetails();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to archive this record.");
    } finally {
      setSaving(false);
    }
  }

  async function saveChanges() {
    if (!activeDetailsRow || !editConfig) return;

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
          parsed = field.emptyValue === null ? null : undefined;
        }

        if (parsed !== undefined && !valuesMatch(parsed, activeDetailsRow[field.key])) {
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
      await editConfig.onSave(activeDetailsRow, changes);
      onSaveSuccess?.(activeDetailsRow);
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
          rowData={gridRows as T[]}
          columnDefs={actionColumn ? [actionColumn, ...columns] : columns}
          loading={loading}
          domLayout="autoHeight"
          pagination
          paginationPageSize={pageSize}
          paginationPageSizeSelector={PAGE_SIZE_OPTIONS}
          rowSelection="single"
          onRowClicked={onRowClick ? (e) => e.data && onRowClick(e.data) : undefined}
          onCellDoubleClicked={(e) => {
            if (e.data && !isInlineDetailRow(e.data as T | InlineDetailRow<T>)) {
              handleRowDoubleClick(e.data);
            }
          }}
          isFullWidthRow={(params) => isInlineDetailRow(params.rowNode.data as T | InlineDetailRow<T>)}
          fullWidthCellRenderer={(params: { data?: T | InlineDetailRow<T> }) => {
            if (!isInlineDetailRow(params.data)) return null;

            return (
              <section className="h-full overflow-y-auto border-y border-border bg-muted/40">
                <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
                  <h2 className="text-base font-semibold">{getExpandedDetailsTitle?.(params.data.row) ?? detailsTitle}</h2>
                  <button
                    type="button"
                    onClick={() => setExpandedRow(null)}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Collapse
                  </button>
                </div>
                {(renderExpandedRowDetails ?? renderRowDetails)?.(params.data.row)}
              </section>
            );
          }}
          getRowHeight={(params) =>
            isInlineDetailRow(params.data as T | InlineDetailRow<T>) ? Math.min(Math.max(expandedRowHeight, 200), 500) : undefined
          }
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

      {activeDetailsRow && (
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
                {archiveAction && !isEditing && archiveAction.isAvailable?.(activeDetailsRow) !== false && !confirmingArchive && (
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
                              <Select
                                value={String(value ?? "")}
                                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                              >
                                {field.options?.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </Select>
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
                renderRowDetails(activeDetailsRow)
              ) : (
                <dl className="divide-y divide-border">
                  {Object.entries(activeDetailsRow).map(([field, value]) => (
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
