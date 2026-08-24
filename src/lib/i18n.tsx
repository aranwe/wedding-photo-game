"use client";

import { createContext, useContext } from "react";
import messages from "@/messages/cs.json";

type Messages = typeof messages;

type Paths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${Paths<T[K]>}`
        : K;
    }[keyof T & string]
  : never;

function resolve(obj: unknown, path: string): string {
  return (
    (path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object")
        return (acc as Record<string, unknown>)[key];
      return undefined;
    }, obj) as string) ?? path
  );
}

const I18nContext = createContext<Messages>(messages);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nContext.Provider value={messages}>{children}</I18nContext.Provider>;
}

/** Translate a dotted key, e.g. t("onboarding.joinButton"). */
export function useT() {
  const msgs = useContext(I18nContext);
  return (key: Paths<Messages>) => resolve(msgs, key);
}
