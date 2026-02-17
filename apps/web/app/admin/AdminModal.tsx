"use client";

import { useEffect, type ReactNode } from "react";

type AdminModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
};

export default function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-3xl",
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidthClassName} overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700"
          >
            Dong
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-stone-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
