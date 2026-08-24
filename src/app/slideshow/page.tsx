"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useConfig } from "@/lib/config";
import { useT } from "@/lib/i18n";
import type { Player, Submission, Task, Team } from "@/lib/types";

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

interface EnrichedSubmission extends Submission {
  taskTitle?: string;
  authorName?: string;
  teamName?: string;
}

function SlideshowContent() {
  const t = useT();
  const { slideshow: dbSlideshow, event } = useConfig();
  const searchParams = useSearchParams();

  // URL params override DB config if provided (?interval=10&limit=15&ratio=4:3)
  const intervalSeconds = useMemo(() => {
    const p = searchParams.get("interval");
    if (p && !isNaN(Number(p))) return Math.max(3, Number(p));
    return dbSlideshow.interval || 15;
  }, [searchParams, dbSlideshow.interval]);

  const limitCount = useMemo(() => {
    const p = searchParams.get("limit");
    if (p && !isNaN(Number(p))) return Math.max(1, Number(p));
    return dbSlideshow.limit || 10;
  }, [searchParams, dbSlideshow.limit]);

  const aspectRatio = useMemo(() => {
    const p = searchParams.get("ratio");
    if (p === "4:3" || p === "4/3") return "4:3";
    if (p === "16:9" || p === "16/9") return "16:9";
    return dbSlideshow.aspectRatio || "16:9";
  }, [searchParams, dbSlideshow.aspectRatio]);

  const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const loadPhotos = useCallback(async () => {
    const { data: subsData } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limitCount);

    const subs = (subsData as Submission[]) ?? [];
    if (subs.length === 0) {
      setSubmissions([]);
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

    const enriched: EnrichedSubmission[] = subs.map((s) => ({
      ...s,
      taskTitle: tasksMap[s.task_id] ?? "",
      authorName: playersMap[s.player_id] ?? "",
      teamName: s.team_id ? teamsMap[s.team_id] : undefined,
    }));

    setSubmissions(enriched);
    setLoaded(true);
  }, [limitCount]);

  // Initial load + Realtime subscription on new uploads/updates/deletes
  useEffect(() => {
    const refresh = () => void loadPhotos();
    queueMicrotask(refresh);

    const channel = supabase
      .channel("slideshow-submissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => {
          loadPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPhotos]);

  // Timer loop for slideshow rotation
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (submissions.length <= 1) return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % submissions.length);
    }, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submissions.length, intervalSeconds]);

  // Keep currentIndex bounded
  const activeIndex = submissions.length > 0 ? currentIndex % submissions.length : 0;
  const currentPhoto = submissions[activeIndex] ?? null;

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black text-white select-none">
      {/* Top Header Bar for Projector */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-8 py-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
            {event.partner1} {event.and} {event.partner2}
          </span>
          {event.subtitle && (
            <span className="text-sm text-neutral-400">· {event.subtitle}</span>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur-md">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium tracking-wider uppercase">{t("slideshow.live")}</span>
          <span className="text-neutral-400">({submissions.length} / {limitCount})</span>
        </div>
      </header>

      {/* Main Slide Area */}
      {!loaded ? (
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <Camera size={40} className="animate-pulse" />
          <p className="text-lg">{t("common.loading")}</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="rounded-full bg-white/5 p-6 ring-1 ring-white/10">
            <Sparkles size={48} className="text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold">{t("slideshow.noPhotos")}</h2>
          <p className="max-w-md text-neutral-400">{t("slideshow.waiting")}</p>
        </div>
      ) : (
        <div
          className="relative flex items-center justify-center w-full h-full p-4 md:p-8"
        >
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl"
            style={{
              aspectRatio: aspectRatio === "4:3" ? "4/3" : "16/9",
              maxHeight: "82vh",
              maxWidth: aspectRatio === "4:3" ? "calc(82vh * 4 / 3)" : "calc(82vh * 16 / 9)",
            }}
          >
            <AnimatePresence mode="wait">
              {currentPhoto && (
                <motion.div
                  key={currentPhoto.id}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${R2_PUBLIC}/${currentPhoto.image_key}`}
                    alt={currentPhoto.title || currentPhoto.taskTitle || ""}
                    className="h-full w-full object-cover rounded-2xl shadow-2xl ring-1 ring-white/10"
                  />

                  {/* Caption & Metadata Overlay */}
                  <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 p-6 md:p-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent rounded-b-2xl">
                    {currentPhoto.taskTitle && (
                      <span className="inline-block self-start rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                        {currentPhoto.taskTitle}
                      </span>
                    )}

                    {currentPhoto.title && (
                      <h3
                        className="text-2xl md:text-3xl font-bold text-white drop-shadow-md"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {currentPhoto.title}
                      </h3>
                    )}

                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <span>{currentPhoto.authorName}</span>
                      {currentPhoto.teamName && (
                        <>
                          <span>·</span>
                          <span className="text-amber-300 font-medium">{currentPhoto.teamName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Progress timer bar at the bottom */}
      {submissions.length > 1 && (
        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-30">
          <motion.div
            key={`progress-${activeIndex}`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: intervalSeconds, ease: "linear" }}
            className="h-full bg-primary"
          />
        </div>
      )}
    </div>
  );
}

export default function SlideshowPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-black text-neutral-400">
          <Camera size={40} className="animate-pulse" />
        </div>
      }
    >
      <SlideshowContent />
    </Suspense>
  );
}

