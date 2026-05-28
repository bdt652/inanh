"use client";

import { useState, type KeyboardEvent } from "react";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
};

export default function TagInput({ tags, onChange, placeholder, maxTags }: TagInputProps) {
  const [input, setInput] = useState("");

  const addFromRaw = (raw: string, existing: string[]) => {
    const parts = raw.split(",").map((t) => t.trim()).filter(Boolean);
    const next = [...existing];
    for (const part of parts) {
      if (!next.includes(part) && (!maxTags || next.length < maxTags)) {
        next.push(part);
      }
    }
    return next;
  };

  const commitInput = () => {
    if (!input.trim()) return;
    onChange(addFromRaw(input, tags));
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitInput();
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleChange = (value: string) => {
    if (value.includes(",")) {
      const parts = value.split(",");
      const last = parts.pop() ?? "";
      onChange(addFromRaw(parts.join(","), tags));
      setInput(last.trimStart());
    } else {
      setInput(value);
    }
  };

  const atLimit = maxTags !== undefined && tags.length >= maxTags;

  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-400">
      {tags.map((tag, i) => (
        <span
          key={tag + i}
          className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="leading-none text-stone-400 hover:text-red-500"
            aria-label={`Xóa tag "${tag}"`}
          >
            ✕
          </button>
        </span>
      ))}
      {!atLimit && (
        <input
          className="min-w-[140px] flex-1 border-none bg-transparent text-sm outline-none placeholder:text-stone-400"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitInput}
          placeholder={tags.length === 0 ? (placeholder ?? "Nhập tag rồi Enter hoặc dấu phẩy...") : "Thêm tag..."}
        />
      )}
      {atLimit && (
        <span className="text-xs text-amber-600">Đã đạt {maxTags} tag tối đa.</span>
      )}
    </div>
  );
}
