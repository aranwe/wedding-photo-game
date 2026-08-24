"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Image as ImageIcon, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useConfig } from "@/lib/config";
import { useT } from "@/lib/i18n";
import type { Player, Submission, Task, Team } from "@/lib/types";
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

interface EnrichedPhoto extends Submission {
  taskTitle?: string;
  authorName?: string;
  teamName?: string;
}

export default function AllImagesPage() {
  const t = useT();
  const { event } = useConfig();

  const [photos, setPhotos] = useState<EnrichedPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

  // Edit / Delete dialog state
  const [editingPhoto, setEditingPhoto] = useState<EnrichedPhoto | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingPhoto, setDeletingPhoto] = useState<EnrichedPhoto | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadAllPhotos = useCallback(async () => {
    const { data: subsData } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    const subs = (subsData as Submission[]) ?? [];
    if (subs.length === 0) {
      setPhotos([]);
      setLoaded(true);
      return;
    }

    const taskIds = [...new Set(subs.map((s) => s.task_id))];
    const playerIds = [...new Set(subs.map((s) => s.player_id))];
    const teamIds = [...new Set(subs.map((s) => s.team_id).filter(Boolean))] as string[];

    const [tasksRes, playersRes, teamsRes] = await Promise.all([
      taskIds.length ? supabase.from("tasks").select("id, title_cs").in("id", taskIds) : { data: [] },
      playerIds.length ? supabase.from("players").select("id, name").in("id", playerIds) : { data: [] },
      teamIds.length ? supabase.from("teams").select("id, name").in("id", teamIds) : { data: [] },
    ]);

    const tasksMap = Object.fromEntries(
      ((tasksRes.data as Task[]) ?? []).map((x) => [x.id, x.title_cs])
    );
    const playersMap = Object.fromEntries(
      ((playersRes.data as Player[]) ?? []).map((x) => [x.id, x.name])
    );
    const teamsMap = Object.fromEntries(
      ((teamsRes.data as Team[]) ?? []).map((x) => [x.id, x.name])
    );

    const enriched: EnrichedPhoto[] = subs.map((s) => ({
      ...s,
      taskTitle: tasksMap[s.task_id] ?? "",
      authorName: playersMap[s.player_id] ?? "",
      teamName: s.team_id ? teamsMap[s.team_id] : undefined,
    }));

    setPhotos(enriched);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const refresh = () => void loadAllPhotos();
    queueMicrotask(refresh);

    const channel = supabase
      .channel("all-images-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        refresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAllPhotos]);

  const filteredPhotos = useMemo(() => {
    if (!search.trim()) return photos;
    const q = search.toLowerCase();
    return photos.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.taskTitle && p.taskTitle.toLowerCase().includes(q)) ||
        (p.authorName && p.authorName.toLowerCase().includes(q)) ||
        (p.teamName && p.teamName.toLowerCase().includes(q))
    );
  }, [photos, search]);

  async function handleSaveTitle() {
    if (!editingPhoto) return;
    setActionBusy(true);
    try {
      const { error } = await supabase
        .from("submissions")
        .update({ title: editTitle.trim() })
        .eq("id", editingPhoto.id);

      if (error) throw error;
      toast.success(t("preview.saved"));
      setEditingPhoto(null);
      loadAllPhotos();
    } catch {
      toast.error(t("preview.saveError"));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeletePhoto() {
    if (!deletingPhoto) return;
    setActionBusy(true);
    try {
      const { error } = await supabase
        .from("submissions")
        .delete()
        .eq("id", deletingPhoto.id);

      if (!error) {
        await fetch("/api/delete-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: deletingPhoto.image_key }),
        });
      }
      toast.success(t("history.delete"));
      setDeletingPhoto(null);
      loadAllPhotos();
    } catch {
      toast.error(t("preview.saveError"));
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg p-2 hover:bg-accent/40 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                {t("images.title")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {event.partner1} {event.and} {event.partner2} · {photos.length} {t("images.totalCount").toLowerCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hledat fotku, úkol, autora..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Link href="/slideshow" target="_blank">
              <Button variant="outline" size="sm">
                Slideshow
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {!loaded ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ImageIcon size={36} className="animate-pulse mb-2" />
            <p>{t("common.loading")}</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <ImageIcon size={48} className="opacity-30 mb-3" />
            <p className="text-lg font-medium">{t("images.noPhotos")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${R2_PUBLIC}/${photo.image_key}`}
                    alt={photo.title || photo.taskTitle || ""}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                  {photo.taskTitle && (
                    <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white max-w-[85%] truncate">
                      {photo.taskTitle}
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base leading-snug text-foreground">
                      {photo.title || <span className="italic text-muted-foreground">{t("history.untitled")}</span>}
                    </h3>

                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{photo.authorName}</span>
                      <span>{photo.teamName ? photo.teamName : t("images.solo")}</span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(photo.created_at).toLocaleString("cs-CZ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setEditingPhoto(photo);
                        setEditTitle(photo.title || "");
                      }}
                    >
                      <Edit3 size={13} className="mr-1" />
                      {t("images.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 text-xs"
                      onClick={() => setDeletingPhoto(photo)}
                    >
                      <Trash2 size={13} className="mr-1" />
                      {t("images.delete")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Title Dialog */}
      <Dialog open={!!editingPhoto} onOpenChange={(open) => !open && setEditingPhoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("images.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={t("preview.titlePlaceholder")}
              maxLength={120}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhoto(null)} disabled={actionBusy}>
              {t("images.cancel")}
            </Button>
            <Button onClick={handleSaveTitle} disabled={actionBusy}>
              {t("images.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingPhoto} onOpenChange={(open) => !open && setDeletingPhoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("images.delete")}</DialogTitle>
            <DialogDescription>{t("images.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPhoto(null)} disabled={actionBusy}>
              {t("images.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeletePhoto} disabled={actionBusy}>
              {t("images.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
