"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface Props {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: Props) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("camera.notSupported"));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setError(t("camera.permissionDenied"));
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [facing, t]);

  async function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => blob && onCapture(blob),
      "image/jpeg",
      0.9
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={onCancel}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[60vh] flex-col overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 bg-gradient-to-t from-black/60 to-transparent p-5">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onCancel}
          aria-label={t("camera.cancel")}
        >
          <X size={24} />
        </Button>
        <button
          onClick={shoot}
          aria-label={t("camera.shutter")}
          className="h-16 w-16 rounded-full border-4 border-white bg-white/30 transition-transform active:scale-90"
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          aria-label={t("camera.switchCamera")}
        >
          <RefreshCw size={22} />
        </Button>
      </div>

      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        <Camera size={12} />
        {t("tabs.game")}
      </div>
    </div>
  );
}
