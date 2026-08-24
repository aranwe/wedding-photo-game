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

const ITEM_H = 72; // px — must match item height below

export default function WheelPicker({ tasks, states, selectedId, onSelect, startIndex = 0 }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "y",
    align: "center",
    containScroll: false,
    dragFree: false,
    startIndex,
    watchDrag: true, // touch + mouse drag
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

  // Mouse wheel support — embla doesn't handle wheels out of the box.
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!emblaApi) return;
      const now = Date.now();
      if (now - wheelCooldown.current < 120) return;
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
    // The highlight band lives INSIDE the overflow container so it moves with the wheel.
    <div
      className="relative h-[216px] overflow-hidden select-none"
      ref={emblaRef}
      onWheel={onWheel}
      style={{ touchAction: "pan-x" }} // let embla own vertical touch gestures
    >
      {/* center highlight band */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 -translate-y-1/2 rounded-xl border-2 border-primary/40 bg-accent/50"
        style={{ height: ITEM_H }}
      />
      <div className="h-full cursor-grab active:cursor-grabbing">
        {tasks.map((task, i) => {
          const state = states[task.id] ?? "free";
          const isCenter = i === selectedIndex;
          return (
            <div
              key={task.id}
              className="flex items-center justify-center"
              style={{ height: ITEM_H }}
            >
              <span
                className={cn(
                  "relative z-20 flex items-center gap-2 text-center font-medium transition-all px-4",
                  isCenter ? "text-lg" : "text-base opacity-40 text-muted-foreground",
                  isCenter && state === "completed" && "text-green-700",
                  isCenter && state === "in-progress" && "text-orange-500",
                  isCenter && state === "free" && "text-foreground"
                )}
              >
                {isCenter && state === "completed" && (
                  <CheckCircle2 size={20} className="shrink-0" />
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
