"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { EventConfig, ThemeConfig } from "@/lib/types";

const DEFAULT_THEME: ThemeConfig = { primary: "#800000", secondary: "#000080" };
const DEFAULT_EVENT: EventConfig = { name: "Svatební foto hra", subtitle: "" };

interface AppConfig {
  theme: ThemeConfig;
  event: EventConfig;
}

const ConfigContext = createContext<AppConfig>({
  theme: DEFAULT_THEME,
  event: DEFAULT_EVENT,
});

/** Convert "#800000" to "128 0 0" for rgb(var(--x) / <alpha>) usage. */
function hexToRgbTuple(hex: string): string {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>({
    theme: DEFAULT_THEME,
    event: DEFAULT_EVENT,
  });

  useEffect(() => {
    supabase
      .from("config")
      .select("key, value")
      .in("key", ["theme", "event"])
      .then(({ data }) => {
        if (!data) return;
        const theme =
          (data.find((r) => r.key === "theme")?.value as ThemeConfig) ??
          DEFAULT_THEME;
        const event =
          (data.find((r) => r.key === "event")?.value as EventConfig) ??
          DEFAULT_EVENT;
        setConfig({ theme, event });
        const root = document.documentElement;
        root.style.setProperty("--primary-rgb", hexToRgbTuple(theme.primary));
        root.style.setProperty("--secondary-rgb", hexToRgbTuple(theme.secondary));
      });
  }, []);

  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
