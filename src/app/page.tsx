"use client";

// This page is a fully client-side SPA — never prerender it at build time.
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, History, Settings } from "lucide-react";
import { loadIdentity, type Identity } from "@/lib/identity";
import { useT } from "@/lib/i18n";
import { useConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import OnboardingForm from "@/components/OnboardingForm";
import GameScreen from "@/components/GameScreen";
import HistoryList from "@/components/HistoryList";
import SettingsPanel from "@/components/SettingsPanel";

type Tab = "game" | "history" | "settings";

const slide = {
  initial: { x: 40, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

export default function Home() {
  const t = useT();
  const { event } = useConfig();
  // Start null to keep SSR/CSR markup identical; identity hydrates after mount.
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("game");

  useEffect(() => {
    queueMicrotask(() => {
      setIdentity(loadIdentity());
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (!identity) {
    return (
      <motion.div key="onboarding" {...slide} className="flex flex-1 flex-col">
        <OnboardingForm onRegistered={setIdentity} />
      </motion.div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "game", label: t("tabs.game"), icon: <Gamepad2 size={18} /> },
    { id: "history", label: t("tabs.history"), icon: <History size={18} /> },
    { id: "settings", label: t("tabs.settings"), icon: <Settings size={18} /> },
  ];

  return (
    <div className="flex flex-1 flex-col max-w-md mx-auto w-full px-4 pb-6">
      <header className="pt-6 pb-4 text-center">
        <h1 className="text-xl font-bold text-primary">{event.name}</h1>
        {event.subtitle && (
          <p className="text-sm text-muted-foreground">{event.subtitle}</p>
        )}
      </header>

      <nav className="flex gap-2 mb-4">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground hover:bg-accent/70"
            )}
          >
            {icon}
            {id === "settings" ? null : label}
          </button>
        ))}
      </nav>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab} {...slide} className="h-full">
            {tab === "game" && <GameScreen identity={identity} />}
            {tab === "history" && <HistoryList identity={identity} />}
            {tab === "settings" && (
              <SettingsPanel
                identity={identity}
                onLeave={() => {
                  setIdentity(null);
                  setTab("game");
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
