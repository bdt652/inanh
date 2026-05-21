"use client";

import AdminModal from "./AdminModal";

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = "Xac nhan",
  danger = true,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              danger ? "bg-red-600" : "bg-stone-900"
            }`}
          >
            {busy ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-stone-700">{description}</p>
    </AdminModal>
  );
}
