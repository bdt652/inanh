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

type PageContentEditorProps = {
  value: string;
  onChange: (next: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
};

export default function PageContentEditor({ value, onChange, onUploadImage, placeholder }: PageContentEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const urlUploadRef = useRef<HTMLInputElement | null>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const htmlCursorRef = useRef<number>(0);
  const onUploadImageRef = useRef(onUploadImage);
  const isSyncingRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);
  // Auto-detect: nội dung có custom HTML (style, div.class, ia-*) → mặc định vào HTML mode
  const [htmlMode, setHtmlMode] = useState(() => /<style\b|<div\b[^>]*class=|<section\b/i.test(value));
  const [htmlSource, setHtmlSource] = useState(() => /<style\b|<div\b[^>]*class=|<section\b/i.test(value) ? value : "");
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [urlUploading, setUrlUploading] = useState(false);
  const [lastUploadedUrl, setLastUploadedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const AI_PROMPT = `Viết nội dung bài viết về [CHỦ ĐỀ] bằng HTML theo quy chuẩn sau:

Context: render bên trong div.rich-content của Next.js, nền màu #f2eee8.
CSS variables có sẵn: --accent (#b46a2f), --accent-strong (#8a4d1f), --accent-soft (#ecd0b3),
--text-soft (#5e5448), --surface-card (#fffdfa), --line (#d8cec2), --shadow.

Quy tắc bắt buộc:
- Bọc toàn bộ trong <div class="ia-wrap">
- Prefix tất cả class bằng ia- (ia-card, ia-hero, ia-step...)
- Bọc từng section bằng <div class="ia-reveal"> để có hiệu ứng scroll
- <style> đặt đầu file, <script> đặt cuối file, script wrap trong (function(){...})()
- Script dùng Intersection Observer cho scroll reveal
- Dùng ia-hero cho phần mở đầu, ia-grid+ia-card cho danh sách,
  ia-steps cho các bước, ia-faq accordion nếu có câu hỏi, ia-cta button cuối bài
- Thêm @media (prefers-reduced-motion: reduce) để tắt animation
- Ảnh: dùng <img src="[URL_ANH_1]" alt="mô tả ảnh" style="max-width:100%;height:auto;border-radius:12px;" />
  Để placeholder [URL_ANH_1], [URL_ANH_2]... nếu chưa có URL thật — admin sẽ upload và thay sau
  Đặt ảnh trong section phù hợp (ia-hero, ia-card, ia-step...), không để ảnh lẻ ngoài container

Yêu cầu nội dung: [mô tả cụ thể — số section, có bao nhiêu ảnh, tone, đối tượng đọc...]`;

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
      };
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
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith("image/"));
        if (!files.length || !onUploadImageRef.current) return false;
        event.preventDefault();
        const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        setIsUploading(true);
        void Promise.all(files.map(f => onUploadImageRef.current!(f))).then(urls => {
          urls.forEach(url => {
            const node = view.state.schema.nodes.image?.create({ src: url, alt: "" });
            if (!node) return;
            const pos = dropPos?.pos ?? view.state.selection.anchor;
            view.dispatch(view.state.tr.insert(pos, node));
          });
        }).finally(() => setIsUploading(false));
        return true;
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? []).filter(f => f.type.startsWith("image/"));
        if (!files.length || !onUploadImageRef.current) return false;
        event.preventDefault();
        const from = view.state.selection.from;
        setIsUploading(true);
        void Promise.all(files.map(f => onUploadImageRef.current!(f))).then(urls => {
          urls.forEach(url => {
            const node = view.state.schema.nodes.image?.create({ src: url, alt: "" });
            if (!node) return;
            view.dispatch(view.state.tr.insert(from, node));
          });
        }).finally(() => setIsUploading(false));
        return true;
      },
    },
    onUpdate({ editor }) {
      if (isSyncingRef.current) return;
      onChange(editor.getHTML());
    },
  });

  useEffect(() => { onUploadImageRef.current = onUploadImage; }, [onUploadImage]);

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

  // Đồng bộ khi value bên ngoài đổi (ví dụ load dữ liệu edit hoặc sau exitHtmlMode)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML().trim() === value.trim()) return;
    isSyncingRef.current = true;
    editor.commands.setContent(value, { emitUpdate: false });
    isSyncingRef.current = false;
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

  const enterHtmlMode = () => {
    if (!editor) return;
    // Dùng `value` (canonical content từ parent/database) thay vì editor.getHTML()
    // vì TipTap strip mất custom HTML (<div class="ia-wrap">, <style>, v.v.) khi parse
    const hasDoubleEscape = /&lt;[a-z]/i.test(value);
    if (hasDoubleEscape) {
      const decoded = value
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/<p><\/p>/g, "");
      setHtmlSource(decoded);
    } else {
      setHtmlSource(value);
    }
    setHtmlMode(true);
  };

  const exitHtmlMode = () => {
    if (!editor) return;
    // Không gọi setContent ở đây — editor chưa mount khi htmlMode=true
    // useEffect sẽ sync sau khi EditorContent render lại
    onChange(htmlSource);
    setHtmlMode(false);
  };

  const handleUrlUpload = async (file: File) => {
    if (!onUploadImage) return;
    setUrlUploading(true);
    try {
      const url = await onUploadImage(file);
      setLastUploadedUrl(url);
      const imgTag = `<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:12px;" />`;
      const cursor = htmlCursorRef.current;
      const before = htmlSource.slice(0, cursor);
      const after = htmlSource.slice(cursor);
      const newHtml = before + imgTag + after;
      setHtmlSource(newHtml);
      htmlCursorRef.current = cursor + imgTag.length;
      // focus textarea và di chuyển cursor
      setTimeout(() => {
        if (htmlTextareaRef.current) {
          htmlTextareaRef.current.focus();
          htmlTextareaRef.current.selectionStart = cursor + imgTag.length;
          htmlTextareaRef.current.selectionEnd = cursor + imgTag.length;
        }
      }, 0);
    } catch {
      // silent
    } finally {
      setUrlUploading(false);
      if (urlUploadRef.current) urlUploadRef.current.value = "";
    }
  };

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

  const headingLevels = [2, 3, 4] as const;
  const toggleHeading = (level: (typeof headingLevels)[number]) =>
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
          ? `${widthStyle}display:block;margin-left:auto;margin-right:auto;`
          : align === "left"
            ? `${widthStyle}display:block;margin-left:0;margin-right:auto;`
            : `${widthStyle}display:block;margin-left:auto;margin-right:0;`;
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!htmlMode && (
            <>
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
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={iconButton()}
            onClick={() => {
              void navigator.clipboard.writeText(AI_PROMPT).then(() => {
                setCopiedPrompt(true);
                setTimeout(() => setCopiedPrompt(false), 2000);
              });
            }}
            title="Copy prompt mẫu để đưa cho AI sinh nội dung"
          >
            {copiedPrompt ? "Đã copy prompt ✓" : "Copy prompt AI"}
          </button>
          <button
            type="button"
            className={iconButton(htmlMode)}
            onClick={htmlMode ? exitHtmlMode : enterHtmlMode}
            title={htmlMode ? "Chuyển về trình soạn thảo trực quan" : "Chỉnh sửa HTML/CSS/JS trực tiếp"}
          >
            {htmlMode ? "← Trực quan" : "</> HTML"}
          </button>
        </div>
      </div>

      {htmlMode && onUploadImage && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
          <span className="text-xs text-stone-500">Chèn ảnh tại vị trí con trỏ trong HTML:</span>
          <button
            type="button"
            disabled={urlUploading}
            onClick={() => urlUploadRef.current?.click()}
            className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {urlUploading ? "Đang upload..." : "Chèn ảnh"}
          </button>
          <input
            ref={urlUploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) void handleUrlUpload(e.target.files[0]); }}
          />
          {lastUploadedUrl && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-stone-200 px-2 py-0.5 text-[11px] text-stone-700">
                {lastUploadedUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(lastUploadedUrl).then(() => {
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  });
                }}
                className="shrink-0 rounded-lg border border-stone-300 bg-white px-2 py-0.5 text-xs font-semibold text-stone-700 hover:bg-emerald-50"
              >
                {copiedUrl ? "Đã copy URL ✓" : "Copy URL"}
              </button>
            </div>
          )}
        </div>
      )}

      {htmlMode && (
        <div className="relative">
          <textarea
            ref={htmlTextareaRef}
            className="min-h-[360px] w-full rounded-xl border border-stone-300 bg-stone-950 px-4 py-3 font-mono text-xs leading-6 text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={htmlSource}
            onChange={(e) => setHtmlSource(e.target.value)}
            onSelect={(e) => { htmlCursorRef.current = e.currentTarget.selectionEnd; }}
            onBlur={(e) => { htmlCursorRef.current = e.currentTarget.selectionEnd; }}
            onKeyUp={(e) => { htmlCursorRef.current = e.currentTarget.selectionEnd; }}
            spellCheck={false}
            placeholder="<!-- HTML/CSS/JS tùy ý -->"
          />
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg border border-stone-600 bg-stone-800 px-3 py-1 text-xs font-medium text-stone-300 transition hover:bg-stone-700 hover:text-white"
            onClick={() => {
              void navigator.clipboard.writeText(htmlSource).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? "Đã copy ✓" : "Copy"}
          </button>
        </div>
      )}

      {!htmlMode && <div className="flex flex-wrap gap-2">
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
          {headingLevels.map((level) => (
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
      </div>}

      {!htmlMode && (
        <div className="rounded-xl border border-stone-200 bg-white">
          <EditorContent editor={editor} />
          <p className="px-3 pb-2 text-[10px] text-stone-400">
            Kéo thả ảnh hoặc Ctrl+V để chèn ảnh trực tiếp vào trình soạn thảo
          </p>
        </div>
      )}
    </div>
  );
}
