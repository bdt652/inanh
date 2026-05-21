"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
};

type ToastPayload = {
  message: string;
  type?: ToastType;
  duration?: number;
};

type ToastContextValue = {
  pushToast: (toast: ToastPayload) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4000;

const toastStyles: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-stone-200 bg-white text-stone-900",
};

const createToastId = () => {
  const cryptoGlobal = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoGlobal && "randomUUID" in cryptoGlobal) {
    return (cryptoGlobal as Crypto).randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    ({ message, type = "info", duration = DEFAULT_DURATION }: ToastPayload) => {
      if (!message.trim()) return;
      const id = createToastId();
      const nextToast: Toast = {
        id,
        message,
        type,
        duration,
      };
      setToasts((prev) => [...prev, nextToast]);
      if (duration > 0) {
        const timer = window.setTimeout(() => removeToast(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[320px] max-w-[90vw] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm shadow-lg ${toastStyles[toast.type]}`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-xs font-semibold text-stone-500"
            >
              Đóng
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}

type ToastMessagesOptions = {
  error?: string;
  notice?: string;
  setError?: (value: string) => void;
  setNotice?: (value: string) => void;
};

export function useToastMessages({ error, notice, setError, setNotice }: ToastMessagesOptions) {
  const { pushToast } = useToast();

  useEffect(() => {
    if (!error) return;
    pushToast({ type: "error", message: error });
    setError?.("");
  }, [error, pushToast, setError]);

  useEffect(() => {
    if (!notice) return;
    pushToast({ type: "success", message: notice });
    setNotice?.("");
  }, [notice, pushToast, setNotice]);
}
