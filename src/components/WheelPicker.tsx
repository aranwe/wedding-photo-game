"use client";

import useEmblaCarousel from "embla-carousel-react";
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
const VISIBLE = 5; // rows visible: 2 above, center, 2 below

/** Row styling by distance from center — closest = darkest. */
function distanceClass(distance: number): string {
  switch (distance) {
    case 0:
      return "text-base font-medium";
    case 1:
      return "text-sm opacity-60";
    default:
      return "text-sm opacity-30";
  }
}

/** Task state color, applied at every distance (faded by opacity). */
function stateClass(state: TaskState): string {
  switch (state) {
    case "completed":
      return "text-green-700";
    case "in-progress":
      return "text-amber-600"; // muted yellow-orange
    default:
      return "text-foreground";
  }
}

export default function WheelPicker({ tasks, states, selectedId, onSelect, startIndex = 0 }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "y",
    align: "center",
    containScroll: false,
    dragFree: false,
    startIndex,
    duration: 20,
  });
  const [selectedIndex, setSelectedIndex] = useState(startIndex);
  const wheelCooldown = useRef(0);

  const onEmblaSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setSelectedIndex(idx);
    const task = tasks[idx];
    if (task) onSelect(task.id);
  }, [emblaApi, tasks, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onEmblaSelect);
    // Pick up the initial snap without a synchronous setState in the effect.
    queueMicrotask(onEmblaSelect);
    return () => {
      emblaApi.off("select", onEmblaSelect);
    };
  }, [emblaApi, onEmblaSelect]);

  // Mouse wheel — embla doesn't handle wheels out of the box.
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!emblaApi) return;
      const now = Date.now();
      if (now - wheelCooldown.current < 150) return;
      wheelCooldown.current = now;
      if (e.deltaY > 0) emblaApi.scrollNext();
      else if (e.deltaY < 0) emblaApi.scrollPrev();
    },
    [emblaApi]
  );

  // Keep embla in sync when the selected task changes externally (e.g. realtime).
  useEffect(() => {
    if (!emblaApi || !selectedId) return;
    const idx = tasks.findIndex((t) => t.id === selectedId);
    if (idx >= 0 && idx !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(idx);
    }
  }, [selectedId, tasks, emblaApi]);

  return (
    <div
      className="relative select-none"
      style={{ height: ITEM_H * VISIBLE, touchAction: "none" }}
      ref={emblaRef}
      onWheel={onWheel}
    >
      {/* center highlight band — overlays the middle row */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 -translate-y-1/2 rounded-xl border-2 border-primary/40 bg-accent/40"
        style={{ height: ITEM_H }}
      />
      {/* top/bottom fade so rows visually dissolve at the edges */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-background to-transparent" />

      <div className="h-full cursor-grab active:cursor-grabbing">
        {tasks.map((task, i) => {
          const state = states[task.id] ?? "free";
          const distance = Math.abs(i - selectedIndex);
          return (
            <div
              key={task.id}
              className="flex items-center justify-center overflow-hidden"
              style={{ height: ITEM_H }}
            >
              <span
                className={cn(
                  "flex items-center gap-2 px-4 text-center transition-all duration-150",
                  distanceClass(distance),
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
      </div>
    </div>
  );
}

