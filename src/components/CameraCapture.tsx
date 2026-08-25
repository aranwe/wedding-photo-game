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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={onCancel}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-black select-none">
      {/* Fullscreen Video Viewfinder */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Top Floating Controls Header */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
        <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs text-white">
          <Camera size={14} />
          <span>{t("tabs.game")}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 active:scale-95"
          onClick={onCancel}
          aria-label={t("camera.cancel")}
        >
          <X size={22} />
        </Button>
      </div>

      {/* Bottom Floating Capture Controls */}
      <div className="relative z-10 flex items-center justify-around px-8 pb-10 pt-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 active:scale-95"
          onClick={onCancel}
          aria-label={t("camera.cancel")}
        >
          <X size={24} />
        </Button>

        <button
          onClick={shoot}
          aria-label={t("camera.shutter")}
          className="h-20 w-20 rounded-full border-4 border-white bg-white/30 transition-transform active:scale-90 shadow-lg"
        />

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 active:scale-95"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          aria-label={t("camera.switchCamera")}
        >
          <RefreshCw size={22} />
        </Button>
      </div>
    </div>
  );
}
