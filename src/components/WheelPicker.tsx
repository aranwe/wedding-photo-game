"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Task, TaskState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  states: Record<string, TaskState>;
  selectedId: string | null;
  onSelect: (taskId: string) => void;
  /** Index to snap to initially (e.g. random). */
  startIndex?: number;
}

const ITEM_H = 56; // px per row
const VISIBLE = 5; // 2 above, center, 2 below
const PAD = ((VISIBLE - 1) / 2) * ITEM_H; // spacer so first/last row can center
const REPEATS = 5; // 5 repeated sets for smooth infinite loop
const MID_SET = Math.floor(REPEATS / 2);

function rowClass(distance: number): string {
  if (distance === 0) return "text-base font-medium opacity-100";
  if (distance === 1) return "text-sm opacity-55";
  return "text-sm opacity-25";
}

function stateClass(state: TaskState): string {
  switch (state) {
    case "completed":
      return "text-green-700";
    case "in-progress":
      return "text-amber-600";
    default:
      return "text-foreground";
  }
}

export default function WheelPicker({
  tasks,
  states,
  selectedId,
  onSelect,
  startIndex = 0,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [absIndex, setAbsIndex] = useState(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdjusting = useRef(false);

  const L = tasks.length;

  const repeatedTasks = useMemo(() => {
    if (L === 0) return [];
    const items: { key: string; task: Task; realIndex: number }[] = [];
    for (let r = 0; r < REPEATS; r++) {
      for (let i = 0; i < L; i++) {
        items.push({
          key: `${r}-${tasks[i].id}`,
          task: tasks[i],
          realIndex: i,
        });
      }
    }
    return items;
  }, [tasks, L]);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    scrollRef.current?.scrollTo({
      top: index * ITEM_H,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Jump to middle set + startIndex on mount/init
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || L === 0) return;
    didInit.current = true;
    const initialAbs = MID_SET * L + (startIndex % L);
    scrollToIndex(initialAbs, false);
    setAbsIndex(initialAbs);
    const task = tasks[startIndex % L];
    if (task) onSelect(task.id);
  }, [L, startIndex, tasks, onSelect, scrollToIndex]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || L === 0 || isAdjusting.current) return;

    const currentAbs = Math.round(el.scrollTop / ITEM_H);
    setAbsIndex(currentAbs);

    const realIndex = ((currentAbs % L) + L) % L;
    const task = tasks[realIndex];
    if (task) onSelect(task.id);

    // After scrolling settles, normalize to middle set if drifted too far near boundaries
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (!el) return;
      const settledAbs = Math.round(el.scrollTop / ITEM_H);
      const settledReal = ((settledAbs % L) + L) % L;

      // If outside the central set (set 1 to REPEATS-2), silently recenter
      if (settledAbs < L || settledAbs >= (REPEATS - 1) * L) {
        isAdjusting.current = true;
        const normalizedAbs = MID_SET * L + settledReal;
        el.scrollTop = normalizedAbs * ITEM_H;
        setAbsIndex(normalizedAbs);
        requestAnimationFrame(() => {
          isAdjusting.current = false;
        });
      } else if (el.scrollTop % ITEM_H !== 0) {
        scrollToIndex(settledAbs, true);
      }
    }, 120);
  }, [L, tasks, onSelect, scrollToIndex]);

  // Follow external selection changes (e.g. realtime updates).
  useEffect(() => {
    if (!selectedId || !scrollRef.current || L === 0) return;
    const targetReal = tasks.findIndex((t) => t.id === selectedId);
    if (targetReal < 0) return;

    const currentReal = ((absIndex % L) + L) % L;
    if (targetReal !== currentReal) {
      // Find the closest abs index matching targetReal
      const diff = targetReal - currentReal;
      const targetAbs = absIndex + diff;
      scrollToIndex(targetAbs, true);
    }
  }, [selectedId, tasks, absIndex, L, scrollToIndex]);

  if (L === 0) return null;

  return (
    <div className="relative" style={{ height: ITEM_H * VISIBLE }}>
      {/* center highlight band */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 rounded-xl border-2 border-primary/40 bg-accent/40"
        style={{ height: ITEM_H }}
      />
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t from-background to-transparent" />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div style={{ height: PAD }} />
        {repeatedTasks.map(({ key, task }, i) => {
          const state = states[task.id] ?? "free";
          const distance = Math.abs(i - absIndex);
          return (
            <div
              key={key}
              className="flex items-center justify-center px-4"
              style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            >
              <span
                className={cn(
                  "flex items-center gap-2 text-center transition-all duration-150",
                  rowClass(distance),
                  stateClass(state)
                )}
              >
                {state === "completed" && (
                  <CheckCircle2 size={distance === 0 ? 20 : 16} className="shrink-0" />
                )}
                {task.title_cs}
              </span>
            </div>
          );
        })}
        <div style={{ height: PAD }} />
      </div>
    </div>
  );
}
