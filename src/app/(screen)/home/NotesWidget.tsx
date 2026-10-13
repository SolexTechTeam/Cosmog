"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import ErrorBlock from "@/components/ui/error-block";
import { useToast } from "@/components/ui/toast";
import type { DashboardNote } from "@/types";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function NotesWidget() {
  const { data: notes, loading, error, refetch } = useApi<DashboardNote[]>(
    [...queryKeys.dashboardNotes],
    () => AetherClient.getDashboardNotes(),
  );
  const invalidate = useInvalidate();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveNewNote() {
    const content = draft.trim();
    if (!content) return;

    setSaving(true);
    try {
      await AetherClient.createDashboardNote(content);
      setDraft("");
      invalidate([...queryKeys.dashboardNotes]);
      toast("Team note added");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add note", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editingId || !editingContent.trim()) return;

    setSaving(true);
    try {
      await AetherClient.updateDashboardNote(editingId, editingContent.trim());
      setEditingId(null);
      setEditingContent("");
      invalidate([...queryKeys.dashboardNotes]);
      toast("Team note updated");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update note", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote() {
    if (!pendingDeleteId) return;

    setSaving(true);
    try {
      await AetherClient.deleteDashboardNote(pendingDeleteId);
      invalidate([...queryKeys.dashboardNotes]);
      toast("Team note deleted");
      setPendingDeleteId(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete note", "error");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorBlock message={`Failed to load team notes: ${error}`} onRetry={refetch} />;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card lg:max-h-[284px]">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Team Notes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Shared updates and follow-ups for the team.</p>
      </div>

      <div className="shrink-0 p-4">
        <label className="sr-only" htmlFor="new-team-note">Add a team note</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            id="new-team-note"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a note for the team…"
            maxLength={2000}
            rows={2}
            className="min-h-16 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/50"
          />
          <button
            type="button"
            onClick={saveNewNote}
            disabled={saving || !draft.trim()}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" size={14} />
            Add note
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {loading && <p className="px-4 py-5 text-sm text-muted-foreground">Loading notes…</p>}
        {!loading && notes?.length === 0 && <p className="px-4 py-5 text-sm text-muted-foreground">No team notes yet.</p>}
        {notes?.map((note) => {
          const editing = editingId === note.id;
          return (
            <article key={note.id} className="px-4 py-3">
              {editing ? (
                <>
                  <label className="sr-only" htmlFor={`team-note-${note.id}`}>Edit team note</label>
                  <textarea
                    id={`team-note-${note.id}`}
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId(null)} disabled={saving} className="h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</button>
                    <button type="button" onClick={saveEdit} disabled={saving || !editingContent.trim()} className="h-7 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Save</button>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{note.created_by_name} · {formatTimestamp(note.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => { setEditingId(note.id); setEditingContent(note.content); }} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit note">
                      <Pencil aria-hidden="true" size={14} />
                    </button>
                    <button type="button" onClick={() => setPendingDeleteId(note.id)} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete note">
                      <Trash2 aria-hidden="true" size={14} />
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete team note?"
          description="This permanently removes the note for everyone."
          confirmLabel="Delete note"
          variant="destructive"
          loading={saving}
          onConfirm={deleteNote}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </section>
  );
}
