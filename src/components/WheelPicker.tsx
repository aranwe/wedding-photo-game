"use client";

import useEmblaCarousel from "embla-carousel-react";
import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Task, TaskState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  states: Record<string, TaskState>;
  selectedId: string | null;
  onSelect: (taskId: string) => void;
}

const ITEM_H = 72; // px — must match h-[72px] below

export default function WheelPicker({ tasks, states, selectedId, onSelect }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "y",
    align: "center",
    containScroll: false,
    dragFree: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  // Keep embla in sync when the selected task changes externally (e.g. realtime).
  useEffect(() => {
    if (!emblaApi || !selectedId) return;
    const idx = tasks.findIndex((t) => t.id === selectedId);
    if (idx >= 0 && idx !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(idx);
    }
  }, [selectedId, tasks, emblaApi]);

  return (
    <div className="relative h-[216px] overflow-hidden" ref={emblaRef}>
      {/* center highlight band */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-xl border-2 border-primary/40 bg-accent/50"
        style={{ height: ITEM_H }}
      />
      <div className="h-full">
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
                  "flex items-center gap-2 text-center font-medium transition-all px-4",
                  isCenter ? "text-lg" : "text-base opacity-40 text-muted-foreground",
                  isCenter && state === "completed" && "text-green-600",
                  isCenter && state === "in-progress" && "text-orange-500",
                  isCenter && state === "free" && "text-neutral-700"
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
