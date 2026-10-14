"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/input";
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
  const [addingNote, setAddingNote] = useState(false);
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
      setAddingNote(false);
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
    <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border bg-card xl:h-full xl:min-h-0">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Team Notes</h2>
        <Button size="sm" icon={<Plus aria-hidden="true" size={14} />} onClick={() => setAddingNote(true)}>Add note</Button>
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
                  <TextArea
                    id={`team-note-${note.id}`}
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="min-h-20 resize-y text-sm"
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

      {addingNote && (
        <Dialog title="Add team note" loading={saving} onClose={() => setAddingNote(false)} width={480}>
          <form onSubmit={(event) => { event.preventDefault(); void saveNewNote(); }}>
            <label className="grid gap-2 text-sm font-medium" htmlFor="new-team-note">
              Note
              <TextArea
                id="new-team-note"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a note for the team…"
                maxLength={2000}
                rows={5}
                className="min-h-28 resize-y text-sm"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddingNote(false)} disabled={saving}>Cancel</Button>
              <Button htmlType="submit" loading={saving} disabled={!draft.trim()}>Save note</Button>
            </div>
          </form>
        </Dialog>
      )}

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
