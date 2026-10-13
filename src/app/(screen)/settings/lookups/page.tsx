"use client";

import { useState } from "react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { useToast } from "@/components/ui/toast";
import { AetherClient } from "@/lib/aether-client";
import StatusBadge from "@/components/common/StatusBadge";
import ErrorBlock from "@/components/ui/error-block";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import type { Profile, LookupValue } from "@/types";

const CATEGORIES = [
  "so_status",
  "so_payment_status",
  "so_fulfillment_type",
  "so_business_channel",
  "so_source",
  "so_priority",
  "po_status",
  "po_fulfillment_type",
  "lot_status",
  "customer_type",
  "profile_role",
  "ledger_movement_type",
] as const;

function formatCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AddFormState {
  value: string;
  label: string;
  sort_order: string;
}

const emptyAddForm: AddFormState = { value: "", label: "", sort_order: "0" };

interface EditState {
  id: string;
  label: string;
  sort_order: string;
}

export default function LookupsScreen() {
  const { toast } = useToast();
  const invalidate = useInvalidate();

  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(emptyAddForm);
  const [addLoading, setAddLoading] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LookupValue | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<LookupValue | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const { data: profile, loading: profileLoading } = useApi<Profile>(
    [...queryKeys.myProfile],
    () => AetherClient.getMyProfile(),
  );

  const { data: lookups, loading, error, refetch } = useApi<LookupValue[]>(
    [...queryKeys.lookups(selectedCategory)],
    () => AetherClient.getLookups(selectedCategory, false),
  );

  // ── Admin guard ──────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="max-w-5xl">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground mb-1">Lookup Values</h1>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted px-6 py-12">
          <Lock size={28} className="text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Admin access required to manage lookup values.
          </p>
        </div>
      </div>
    );
  }

  // ── Mutations ────────────────────────────────────────────────────
  async function handleAdd() {
    if (!addForm.value.trim() || !addForm.label.trim()) {
      toast("Value and label are required", "error");
      return;
    }
    setAddLoading(true);
    try {
      await AetherClient.createLookup({
        category: selectedCategory,
        value: addForm.value.trim(),
        label: addForm.label.trim(),
        sort_order: parseInt(addForm.sort_order, 10) || 0,
      });
      toast("Lookup value created");
      invalidate([...queryKeys.lookups(selectedCategory)]);
      setAddForm(emptyAddForm);
      setShowAddForm(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create lookup", "error");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleEditSave() {
    if (!editState) return;
    setEditLoading(true);
    try {
      await AetherClient.updateLookup(editState.id, {
        label: editState.label.trim(),
        sort_order: parseInt(editState.sort_order, 10) || 0,
      });
      toast("Lookup value updated");
      invalidate([...queryKeys.lookups(selectedCategory)]);
      setEditState(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update lookup", "error");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await AetherClient.deleteLookup(deleteTarget.id);
      toast("Lookup value deleted");
      invalidate([...queryKeys.lookups(selectedCategory)]);
      setDeleteTarget(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to delete lookup", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleToggleActive() {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      await AetherClient.updateLookup(toggleTarget.id, {
        is_active: !toggleTarget.is_active,
      });
      toast(`Lookup value ${toggleTarget.is_active ? "deactivated" : "activated"}`);
      invalidate([...queryKeys.lookups(selectedCategory)]);
      setToggleTarget(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to toggle status", "error");
    } finally {
      setToggleLoading(false);
    }
  }

  function startEdit(item: LookupValue) {
    setEditState({
      id: item.id,
      label: item.label,
      sort_order: String(item.sort_order),
    });
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">Lookup Values</h1>
        <button
          type="button"
          onClick={() => { setShowAddForm(true); setAddForm(emptyAddForm); }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors h-8"
        >
          <Plus size={14} /> Add Value
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Manage dropdown options and system values
      </p>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => { setSelectedCategory(cat); setEditState(null); setShowAddForm(false); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {formatCategory(cat)}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-4 rounded-lg border border-border bg-muted p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/70 mb-3">
            Add new value to {formatCategory(selectedCategory)}
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Value
              <input
                type="text"
                value={addForm.value}
                onChange={(e) => setAddForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="e.g. new_status"
                className="h-8 w-44 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Label
              <input
                type="text"
                value={addForm.label}
                onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. New Status"
                className="h-8 w-44 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Sort Order
              <input
                type="number"
                value={addForm.sort_order}
                onChange={(e) => setAddForm((f) => ({ ...f, sort_order: e.target.value }))}
                className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={addLoading}
                className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {addLoading ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <ErrorBlock message={`Failed to load lookups: ${error}`} onRetry={refetch} />
      ) : !lookups || lookups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted px-6 py-12">
          <p className="text-sm text-muted-foreground">No values found for this category.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Value</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Label</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Sort Order</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Active</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">System</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lookups.map((item) => {
                const isEditing = editState?.id === item.id;
                return (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{item.value}</td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editState.label}
                          onChange={(e) => setEditState((s) => s ? { ...s, label: e.target.value } : s)}
                          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
                          autoFocus
                        />
                      ) : (
                        item.label
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editState.sort_order}
                          onChange={(e) => setEditState((s) => s ? { ...s, sort_order: e.target.value } : s)}
                          className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      ) : (
                        item.sort_order
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.is_system) return;
                          setToggleTarget(item);
                        }}
                        disabled={item.is_system}
                        className={item.is_system ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                        title={item.is_system ? "System values cannot be toggled" : "Click to toggle active status"}
                      >
                        <StatusBadge status={item.is_active ? "active" : "inactive"} />
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      {item.is_system ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock size={12} /> System
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={handleEditSave}
                            disabled={editLoading}
                            className="flex items-center justify-center h-8 w-8 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-60"
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditState(null)}
                            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            disabled={item.is_system}
                            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={item.is_system ? "System values cannot be edited" : "Edit"}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            disabled={item.is_system}
                            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-red-50 hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={item.is_system ? "System values cannot be deleted" : "Delete"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete lookup value"
          description={`Are you sure you want to delete "${deleteTarget.label}" (${deleteTarget.value})? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* Toggle active confirmation dialog */}
      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.is_active ? "Deactivate lookup value" : "Activate lookup value"}
          description={`Are you sure you want to ${toggleTarget.is_active ? "deactivate" : "activate"} "${toggleTarget.label}"?`}
          confirmLabel={toggleTarget.is_active ? "Deactivate" : "Activate"}
          variant={toggleTarget.is_active ? "destructive" : "primary"}
          onConfirm={handleToggleActive}
          onCancel={() => setToggleTarget(null)}
          loading={toggleLoading}
        />
      )}
    </div>
  );
}
