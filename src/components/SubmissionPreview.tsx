"use client";

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Identity } from "@/lib/identity";
import type { Task } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  identity: Identity;
  task: Task;
  blob: Blob;
  previewUrl: string;
  onDone: () => void;
}

export default function SubmissionPreview({
  identity,
  task,
  blob,
  previewUrl,
  onDone,
}: Props) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      // 1) presigned upload URL
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: blob.type || "image/jpeg" }),
      });
      if (!res.ok) throw new Error("presign failed");
      const { key, uploadUrl } = await res.json();

      // 2) upload straight to R2 — Content-Type must match the presigned one
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      if (!put.ok) throw new Error("upload failed");

      // 3) insert submission row — realtime broadcast updates teammates
      const { error } = await supabase.from("submissions").insert({
        task_id: task.id,
        player_id: identity.playerId,
        team_id: identity.teamId,
        image_key: key,
        title: title.trim(),
      });
      if (error) throw error;

      toast.success(t("preview.saved"));
      onDone();
    } catch {
      toast.error(t("preview.saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-lg font-semibold text-primary">{t("preview.title")}</h2>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt={task.title_cs}
        className="max-h-[45vh] w-full rounded-2xl object-contain bg-muted"
      />

      <p className="text-sm font-medium text-center text-secondary-foreground">
        {task.title_cs}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="submission-title">{t("preview.titleLabel")}</Label>
        <Input
          id="submission-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("preview.titlePlaceholder")}
          maxLength={120}
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
        <Button variant="outline" size="lg" onClick={onDone} disabled={busy}>
          {t("preview.delete")}
        </Button>
        <Button size="lg" onClick={save} disabled={busy}>
          {busy ? t("preview.saving") : t("preview.save")}
        </Button>
      </div>
    </div>
  );
}
