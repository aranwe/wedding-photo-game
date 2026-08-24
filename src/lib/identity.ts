"use client";

const STORAGE_KEY = "wpg-identity";

export interface Identity {
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamName: string | null;
  solo: boolean;
}

export function loadIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function clearIdentity() {
  window.localStorage.removeItem(STORAGE_KEY);
}
