"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Identity } from "@/lib/identity";
import type { Player, Submission, Task } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

export default function HistoryList({ identity }: { identity: Identity }) {
  const t = useT();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [deleting, setDeleting] = useState<Submission | null>(null);
  const [editing, setEditing] = useState<Submission | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const load = useCallback(async () => {
    let query = supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });
    query = identity.teamId
      ? query.eq("team_id", identity.teamId)
      : query.eq("player_id", identity.playerId).is("team_id", null);
    const { data } = await query;
    const subs = (data as Submission[]) ?? [];
    setSubmissions(subs);

    const taskIds = [...new Set(subs.map((s) => s.task_id))];
    const playerIds = [...new Set(subs.map((s) => s.player_id))];
    if (taskIds.length) {
      const { data: td } = await supabase.from("tasks").select("*").in("id", taskIds);
      setTasks(Object.fromEntries(((td as Task[]) ?? []).map((x) => [x.id, x])));
    }
    if (playerIds.length) {
      const { data: pd } = await supabase.from("players").select("*").in("id", playerIds);
      setPlayers(Object.fromEntries(((pd as Player[]) ?? []).map((x) => [x.id, x])));
    }
  }, [identity]);

  useEffect(() => {
    const refresh = () => void load();
    queueMicrotask(refresh);
    const channel = supabase
      .channel("history-submissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        refresh
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", deleting.id);
    if (!error) {
      await fetch("/api/delete-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: deleting.image_key }),
      });
    }
    setDeleting(null);
    load();
  }

  async function saveTitle() {
    if (!editing) return;
    await supabase
      .from("submissions")
      .update({ title: editTitle.trim() })
      .eq("id", editing.id);
    toast.success(t("preview.saved"));
    setEditing(null);
    load();
  }

  if (submissions.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        {t("history.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto pb-4">
      {submissions.map((sub) => (
        <div key={sub.id} className="overflow-hidden rounded-2xl border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${R2_PUBLIC}/${sub.image_key}`}
            alt={sub.title || tasks[sub.task_id]?.title_cs || ""}
            className="max-h-64 w-full object-cover"
            loading="lazy"
          />
          <div className="space-y-1 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary-foreground">
              {tasks[sub.task_id]?.title_cs}
            </p>
            <p className="text-sm">
              {sub.title || t("history.untitled")}
              <span className="ml-2 text-xs text-muted-foreground">
                {t("history.by")} {players[sub.player_id]?.name ?? "?"}
              </span>
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(sub);
                  setEditTitle(sub.title);
                }}
              >
                <Pencil size={14} className="mr-1" />
                {t("history.editTitle")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleting(sub)}
              >
                <Trash2 size={14} className="mr-1" />
                {t("history.delete")}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.delete")}</DialogTitle>
            <DialogDescription>{t("history.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("history.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("history.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit title */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.editTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder={t("preview.titlePlaceholder")}
            maxLength={120}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("history.cancel")}
            </Button>
            <Button onClick={saveTitle}>{t("history.saveTitle")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
