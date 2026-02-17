"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

type QuillContentEditorProps = {
  value: string;
  onChange: (next: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
};

export default function QuillContentEditor({ value, onChange, onUploadImage, placeholder }: QuillContentEditorProps) {
  const quillRef = useRef<ReactQuill | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0 || !quillRef.current) return;
    const file = files[0];
    if (!onUploadImage) {
      window.alert("Chưa cấu hình upload ảnh.");
      return;
    }
    try {
      setIsUploading(true);
      const url = await onUploadImage(file);
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      editor.insertEmbed(range.index, "image", url, "user");
      editor.setSelection(range.index + 1, 0);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Không thể upload ảnh.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ["undo", "redo"],
          ["bold", "italic", "underline", "strike"],
          [{ header: [2, 3, 4, false] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: openFilePicker,
          undo: () => quillRef.current?.getEditor().history.undo(),
          redo: () => quillRef.current?.getEditor().history.redo(),
        },
      },
      history: { delay: 500, maxStack: 100 },
    }),
    []
  );

  const formats = ["header", "bold", "italic", "underline", "strike", "list", "bullet", "align", "link", "image"];

  return (
    <div className="space-y-2">
      <ReactQuill
        ref={quillRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? "Nhập nội dung..."}
        modules={modules}
        formats={formats}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFileChange(event.target.files)}
      />
      {isUploading && <p className="text-xs text-amber-700">Đang tải ảnh...</p>}
    </div>
  );
}
