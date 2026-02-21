"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "customerToken";

const readStoredToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored);
    return parsed?.token ?? null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export function useCustomerToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(readStoredToken());
    const handleStorage = () => setToken(readStoredToken());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return token;
}
