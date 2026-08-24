"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [selectedIndex, setSelectedIndex] = useState(startIndex);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    scrollRef.current?.scrollTo({
      top: index * ITEM_H,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Jump to the initial (random) row once tasks are loaded.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || tasks.length === 0) return;
    didInit.current = true;
    scrollToIndex(startIndex, false);
    setSelectedIndex(startIndex);
    const task = tasks[startIndex];
    if (task) onSelect(task.id);
  }, [tasks, startIndex, scrollToIndex, onSelect]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(tasks.length - 1, index));
    setSelectedIndex((prev) => {
      if (prev === clamped) return prev;
      const task = tasks[clamped];
      if (task) onSelect(task.id);
      return clamped;
    });

    // Mouse wheel can land between rows — settle onto an exact snap.
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (el.scrollTop % ITEM_H !== 0) {
        scrollToIndex(Math.round(el.scrollTop / ITEM_H));
      }
    }, 120);
  }, [tasks, onSelect, scrollToIndex]);

  // Follow external selection changes (e.g. realtime updates).
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const index = tasks.findIndex((t) => t.id === selectedId);
    if (index >= 0 && index !== selectedIndex) scrollToIndex(index);
  }, [selectedId, tasks, selectedIndex, scrollToIndex]);

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
        {tasks.map((task, i) => {
          const state = states[task.id] ?? "free";
          const distance = Math.abs(i - selectedIndex);
          return (
            <div
              key={task.id}
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
