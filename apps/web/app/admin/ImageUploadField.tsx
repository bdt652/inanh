"use client";

type ImageUploadFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => void | Promise<void>;
  hint?: string;
};

export default function ImageUploadField({ id, label, value, onChange, onUpload, hint }: ImageUploadFieldProps) {
  const hasImage = value.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="block text-sm font-semibold text-stone-700">{label}</p>
        {hasImage && (
          <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-red-600 hover:underline">
            Xoa hinh
          </button>
        )}
      </div>

      <input
        id={`${id}-file`}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void onUpload(file);
          event.target.value = "";
        }}
      />

      <label
        htmlFor={`${id}-file`}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
      >
        <span className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">Bam vao day de chon hinh</span>
        <span className="text-xs text-stone-500">Ho tro JPG, PNG, WebP</span>
      </label>

      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Image preview</p>
        {hasImage ? (
          <img src={value} alt={label} className="max-h-44 w-full rounded-lg object-contain" />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-stone-300 text-xs text-stone-500">
            Chua co hinh anh
          </div>
        )}
      </div>
    </div>
  );
}
