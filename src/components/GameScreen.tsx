"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Identity } from "@/lib/identity";
import type { Submission, Task, TaskState } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import WheelPicker from "@/components/WheelPicker";
import CameraCapture from "@/components/CameraCapture";
import SubmissionPreview from "@/components/SubmissionPreview";

type Capture = { blob: Blob; previewUrl: string };

const slide = {
  initial: { x: 40, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

export default function GameScreen({ identity }: { identity: Identity }) {
  const t = useT();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  /** taskId → name of teammate currently viewing it */
  const [viewing, setViewing] = useState<Record<string, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mode, setMode] = useState<"wheel" | "camera" | "preview">("wheel");
  const [capture, setCapture] = useState<Capture | null>(null);

  // ---------------------------------------------------------------- tasks
  // Shuffled once per mount so each guest starts at a random task.
  const [startIndex, setStartIndex] = useState(0);
  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        const list = [...((data as Task[]) ?? [])];
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        setTasks(list);
        if (list.length) setStartIndex(Math.floor(Math.random() * list.length));
      });
  }, []);

  // ------------------------------------------------- submissions + realtime
  const loadSubmissions = useCallback(async () => {
    let query = supabase.from("submissions").select("*");
    query = identity.teamId
      ? query.eq("team_id", identity.teamId)
      : query.eq("player_id", identity.playerId).is("team_id", null);
    const { data } = await query;
    setSubmissions((data as Submission[]) ?? []);
  }, [identity]);

  useEffect(() => {
    const refresh = () => void loadSubmissions();
    queueMicrotask(refresh);
    const channel = supabase
      .channel("submissions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        refresh
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSubmissions]);

  // ------------------------------------------------------- presence (viewing)
  const presenceKey = useMemo(
    () => (identity.teamId ? `team:${identity.teamId}` : `solo:${identity.playerId}`),
    [identity]
  );

  useEffect(() => {
    if (!selectedTaskId) return;
    const channel = supabase.channel(presenceKey, {
      config: { presence: { key: identity.playerId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ task: string; name: string }>();
        const map: Record<string, string> = {};
        for (const [playerId, entries] of Object.entries(state)) {
          if (playerId === identity.playerId) continue;
          const entry = entries[0];
          if (entry?.task) map[entry.task] = entry.name;
        }
        setViewing(map);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ task: selectedTaskId, name: identity.playerName });
        }
      });
    return () => {
      supabase.removeChannel(channel);
      setViewing({});
    };
  }, [presenceKey, identity, selectedTaskId]);

  // ------------------------------------------------------------ task states
  const completedTaskIds = useMemo(
    () => new Set(submissions.map((s) => s.task_id)),
    [submissions]
  );

  const states: Record<string, TaskState> = useMemo(() => {
    const map: Record<string, TaskState> = {};
    for (const task of tasks) {
      map[task.id] = completedTaskIds.has(task.id)
        ? "completed"
        : viewing[task.id]
          ? "in-progress"
          : "free";
    }
    return map;
  }, [tasks, completedTaskIds, viewing]);

  // -------------------------------------------------------------- capturing
  function onCaptured(blob: Blob) {
    setCapture({ blob, previewUrl: URL.createObjectURL(blob) });
    setMode("preview");
  }

  async function onManualFile(file: File) {
    onCaptured(file);
  }

  function discardCapture() {
    if (capture) URL.revokeObjectURL(capture.previewUrl);
    setCapture(null);
    setMode("wheel");
  }

  const selectedTask = tasks.find((tk) => tk.id === selectedTaskId) ?? null;

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        {mode === "camera" && (
          <motion.div key="camera" {...slide} className="flex-1">
            <CameraCapture
              onCapture={onCaptured}
              onCancel={() => setMode("wheel")}
            />
          </motion.div>
        )}

        {mode === "preview" && capture && selectedTask && (
          <motion.div key="preview" {...slide} className="flex-1">
            <SubmissionPreview
              identity={identity}
              task={selectedTask}
              blob={capture.blob}
              previewUrl={capture.previewUrl}
              onDone={discardCapture}
            />
          </motion.div>
        )}

        {mode === "wheel" && (
          <motion.div key="wheel" {...slide} className="flex flex-1 flex-col">
            {tasks.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">
                {t("game.noTasks")}
              </p>
            ) : (
              <WheelPicker
                tasks={tasks}
                states={states}
                selectedId={selectedTaskId}
                onSelect={setSelectedTaskId}
                startIndex={startIndex}
              />
            )}

            <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
              <Button
                size="lg"
                disabled={!selectedTaskId || states[selectedTaskId] === "completed"}
                onClick={() => setMode("camera")}
              >
                <Camera className="mr-2" size={18} />
                {t("game.cameraButton")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={!selectedTaskId || states[selectedTaskId] === "completed"}
                className="relative overflow-hidden"
              >
                <Upload className="mr-2" size={18} />
                {t("game.uploadButton")}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onManualFile(f);
                    e.target.value = "";
                  }}
                />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
