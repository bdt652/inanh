"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeSelection } from "prosemirror-state";
import type React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

type PageContentEditorProps = {
  value: string;
  onChange: (next: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
};

export default function PageContentEditor({ value, onChange, onUploadImage, placeholder }: PageContentEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);

  const CustomImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        style: {
          default: null,
        },
        width: {
          default: null,
        },
        height: {
          default: null,
        },
        "data-align": {
          default: null,
        },
        caption: {
          default: null,
        },
      };
    },
    renderHTML({ HTMLAttributes }) {
      const { caption, ...imgAttrs } = HTMLAttributes;
      return [
        "figure",
        { class: "tiptap-figure" },
        ["img", imgAttrs],
        caption ? ["figcaption", { class: "tiptap-figcaption" }, caption] : "",
      ];
    },
  });

  const editor = useEditor({
    content: value,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: true, autolink: true }),
      CustomImage.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "tiptap-table" },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    editorProps: {
      attributes: {
        class:
          "tiptap-content min-h-[220px] w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm leading-7 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400",
        "data-placeholder": placeholder ?? "Nhập nội dung...",
        tabindex: "0",
        role: "textbox",
        "aria-label": "Trình soạn thảo nội dung",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  const resolveCurrentImage = useCallback(() => {
    if (!editor) return null;
    const { state } = editor;
    const { selection, doc } = state;

    if (selection instanceof NodeSelection && selection.node.type.name === "image") {
      return { pos: selection.from, node: selection.node };
    }

    const $from = selection.$from;
    const after = $from.nodeAfter;
    if (after && after.type.name === "image") {
      return { pos: $from.pos, node: after };
    }
    const before = $from.nodeBefore;
    if (before && before.type.name === "image") {
      return { pos: $from.pos - before.nodeSize, node: before };
    }

    let found: { pos: number; node: typeof doc["firstChild"] } | null = null;
    doc.nodesBetween(selection.from, selection.to, (node, pos) => {
      if (node.type.name === "image") {
        found = { pos, node };
        return false;
      }
      return;
    });

    return found;
  }, [editor]);

  // Đồng bộ khi value bên ngoài đổi (ví dụ load dữ liệu edit)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML().trim() === value.trim()) return;
    editor.commands.setContent(value, false);
  }, [value, editor]);

  // Theo dõi selection để biết khi nào đang chọn ảnh
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      setImageSelected(Boolean(resolveCurrentImage()));
    };
    editor.on("selectionUpdate", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
    };
  }, [editor, resolveCurrentImage]);

  const toggleLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập URL liên kết", previousUrl || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  const insertImageFromFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (files: FileList | null) => {
    if (!editor || !files || files.length === 0) return;
    const file = files[0];
    if (!onUploadImage) {
      window.alert("Chưa cấu hình upload ảnh.");
      return;
    }
    try {
      setIsUploading(true);
      const url = await onUploadImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name || "image" }).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Không thể upload ảnh.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!editor) return null;

  const iconButtonBase =
    "rounded border px-2 py-1 text-xs font-medium transition";
  const iconButton = (active = false) =>
    `${iconButtonBase} ${
      active
        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
        : "border-stone-300 bg-white text-stone-700 hover:border-emerald-400 hover:bg-emerald-50"
    }`;

  const keepFocus = (handler: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handler();
  };

  const toggleHeading = (level: 2 | 3 | 4) =>
    keepFocus(() => editor.chain().focus().toggleHeading({ level }).run());

  const setImageWidth = (percent: number) =>
    keepFocus(() => {
      const target = resolveCurrentImage();
      if (!target) return;
      const { pos, node } = target;
      editor
        .chain()
        .focus()
        .setNodeSelection(pos)
        .updateAttributes("image", {
          width: `${percent}%`,
          height: null,
          style: `width:${percent}%;height:auto;`,
          "data-align": node.attrs["data-align"] ?? null,
        })
        .run();
    });

  const alignImage = (align: "left" | "center" | "right") =>
    keepFocus(() => {
      const target = resolveCurrentImage();
      if (!target) return;
      const { pos, node } = target;
      const widthAttr = (node.attrs.width as string | undefined) || "";
      const preferredWidth = widthAttr || (align === "center" ? "75%" : "60%");
      const widthStyle = `width:${preferredWidth};`;
      const style =
        align === "center"
          ? `${widthStyle}display:block;float:none;margin-left:auto;margin-right:auto;`
          : align === "left"
            ? `${widthStyle}display:block;float:left;margin-right:12px;`
            : `${widthStyle}display:block;float:right;margin-left:12px;`;
      editor
        .chain()
        .focus()
        .setNodeSelection(pos)
        .updateAttributes("image", {
          "data-align": align,
          width: preferredWidth,
          style,
        })
        .run();
    });

  const setImageCaption = () =>
    keepFocus(() => {
      const target = resolveCurrentImage();
      if (!target) return;
      const { pos, node } = target;
      const current = (node.attrs.caption as string | null) ?? "";
      const next = window.prompt("Nhập chú thích ảnh", current) ?? current;
      editor.chain().focus().setNodeSelection(pos).updateAttributes("image", { caption: next || null }).run();
    });

  const insertPriceTable = () =>
    keepFocus(() => {
      const cell = (type: "tableHeader" | "tableCell", text: string) => ({
        type,
        content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
      });
      editor
        .chain()
        .focus()
        .insertContent({
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [cell("tableHeader", "Hạng mục"), cell("tableHeader", "Quy cách"), cell("tableHeader", "Giá")],
            },
            { type: "tableRow", content: [cell("tableCell", ""), cell("tableCell", ""), cell("tableCell", "")] },
            { type: "tableRow", content: [cell("tableCell", ""), cell("tableCell", ""), cell("tableCell", "")] },
          ],
        })
        .run();
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={iconButton()}
          onMouseDown={keepFocus(() => editor.chain().focus().undo().run())}
        >
          Hoàn tác
        </button>
        <button
          type="button"
          className={iconButton()}
          onMouseDown={keepFocus(() => editor.chain().focus().redo().run())}
        >
          Làm lại
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">Lịch sử</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={iconButton(editor.isActive("bold"))}
            onMouseDown={keepFocus(() => editor.chain().focus().toggleBold().run())}
          >
            B
          </button>
          <button
            type="button"
            className={iconButton(editor.isActive("italic"))}
            onMouseDown={keepFocus(() => editor.chain().focus().toggleItalic().run())}
          >
            I
          </button>
          <button
            type="button"
            className={iconButton(editor.isActive("underline"))}
            onMouseDown={keepFocus(() => editor.chain().focus().toggleUnderline().run())}
          >
            U
          </button>
          <button
            type="button"
            className={iconButton(editor.isActive("strike"))}
            onMouseDown={keepFocus(() => editor.chain().focus().toggleStrike().run())}
          >
            S
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {[2, 3, 4].map((level) => (
            <button
              key={level}
              type="button"
              className={iconButton(editor.isActive("heading", { level }))}
              onMouseDown={toggleHeading(level)}
            >
              H{level}
            </button>
          ))}
          <button
            type="button"
            className={iconButton(editor.isActive("bulletList"))}
            onMouseDown={keepFocus(() => editor.chain().focus().toggleBulletList().run())}
          >
            • Danh sách
          </button>
          <button
            type="button"
            className={iconButton(editor.isActive("orderedList"))}
            onMouseDown={keepFocus(() => editor.chain().focus().toggleOrderedList().run())}
          >
            1. Đánh số
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={iconButton(editor.isActive({ textAlign: "left" }))}
            onMouseDown={keepFocus(() => editor.chain().focus().setTextAlign("left").run())}
          >
            Trái
          </button>
          <button
            type="button"
            className={iconButton(editor.isActive({ textAlign: "center" }))}
            onMouseDown={keepFocus(() => editor.chain().focus().setTextAlign("center").run())}
          >
            Giữa
          </button>
          <button
            type="button"
            className={iconButton(editor.isActive({ textAlign: "right" }))}
            onMouseDown={keepFocus(() => editor.chain().focus().setTextAlign("right").run())}
          >
            Phải
          </button>
          <button
            type="button"
            className={iconButton(editor.isActive({ textAlign: "justify" }))}
            onMouseDown={keepFocus(() => editor.chain().focus().setTextAlign("justify").run())}
          >
            Đều
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          <button type="button" className={iconButton(editor.isActive("link"))} onMouseDown={keepFocus(toggleLink)}>
            Liên kết
          </button>
          <button
            type="button"
            className={iconButton(editor.isActive("link"))}
            onMouseDown={keepFocus(() => editor.chain().focus().unsetLink().run())}
          >
            Bỏ link
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={iconButton()}
            onMouseDown={keepFocus(insertImageFromFile)}
            disabled={isUploading || !onUploadImage}
          >
            {isUploading ? "Đang tải..." : "Chèn ảnh"}
          </button>
          {imageSelected && (
            <>
              {[25, 50, 75, 100].map((size) => (
                <button key={size} type="button" className={iconButton()} onMouseDown={setImageWidth(size)}>
                  {size}%
                </button>
              ))}
              <button type="button" className={iconButton()} onMouseDown={alignImage("left")}>
                Trái
              </button>
              <button type="button" className={iconButton()} onMouseDown={alignImage("center")}>
                Giữa
              </button>
              <button type="button" className={iconButton()} onMouseDown={alignImage("right")}>
                Phải
              </button>
              <button type="button" className={iconButton()} onMouseDown={setImageCaption}>
                Chú thích
              </button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleFileChange(event.target.files)}
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <button type="button" className={iconButton()} onMouseDown={insertPriceTable}>
            Thêm bảng giá
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
