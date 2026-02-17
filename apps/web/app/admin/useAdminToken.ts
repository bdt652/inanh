"use client";

import { useSyncExternalStore } from "react";

import { TOKEN_KEY } from "./constants";

const TOKEN_CHANGE_EVENT = "inanh24h-admin-token-change";

function getServerSnapshot(): string | null {
  return null;
}

function getClientSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(TOKEN_CHANGE_EVENT, onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TOKEN_CHANGE_EVENT, onStorage);
  };
}

function emitTokenChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TOKEN_CHANGE_EVENT));
}

export function useAdminToken() {
  const token = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const setToken = (nextToken: string | null) => {
    if (typeof window === "undefined") return;
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    emitTokenChange();
  };

  const logout = () => {
    setToken(null);
  };

  return { token, setToken, logout };
}
