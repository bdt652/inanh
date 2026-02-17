"use client";

import { ClipboardEvent, DragEvent, KeyboardEvent, MouseEvent, useEffect, useRef, useState } from "react";

type RichHtmlEditorProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  onUploadImage?: (file: File) => Promise<string>;
};

const IMAGE_MIME_PREFIX = "image/";

const FONT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Arial", value: "Arial" },
  { label: "Tahoma", value: "Tahoma" },
  { label: "Verdana", value: "Verdana" },
  { label: "Georgia", value: "Georgia" },
  { label: "Calibri", value: "Calibri" },
];

const FONT_SIZE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "8", value: "1" },
  { label: "10", value: "2" },
  { label: "12", value: "3" },
  { label: "14", value: "4" },
  { label: "18", value: "5" },
  { label: "24", value: "6" },
  { label: "36", value: "7" },
];

const BLOCK_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Văn bản", value: "P" },
  { label: "Tiêu đề 2", value: "H2" },
  { label: "Tiêu đề 3", value: "H3" },
  { label: "Tiêu đề 4", value: "H4" },
  { label: "Trích dẫn", value: "BLOCKQUOTE" },
];

const LINE_HEIGHT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" },
];

function iconButtonStyle(active = false): string {
  return `rounded border px-2 py-1 text-xs font-medium transition ${
    active
      ? "border-blue-500 bg-blue-50 text-blue-700"
      : "border-stone-300 bg-white text-stone-700 hover:border-blue-400 hover:bg-blue-50"
  }`;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/\"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isImageFile(file: File): boolean {
  return file.type.startsWith(IMAGE_MIME_PREFIX);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Không thể tải ảnh lên. Vui lòng thử lại.";
}

export default function RichHtmlEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  minHeightClassName = "min-h-52",
  onUploadImage,
}: RichHtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const [htmlMode, setHtmlMode] = useState(false);
  const [fontName, setFontName] = useState(FONT_OPTIONS[0].value);
  const [fontSize, setFontSize] = useState("3");
  const [lineHeight, setLineHeight] = useState(LINE_HEIGHT_OPTIONS[1].value);
  const [textColor, setTextColor] = useState("#111827");
  const [highlightColor, setHighlightColor] = useState("#fff59d");
  const [cellColor, setCellColor] = useState("#ffffff");

  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");

  useEffect(() => {
    if (!editorRef.current || htmlMode) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      savedRangeRef.current = null;
    }
  }, [value, htmlMode]);

  const preventBlur = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
  };

  const saveSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    savedRangeRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return false;
    try {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
      return true;
    } catch {
      savedRangeRef.current = null;
      return false;
    }
  };

  const moveCaretToEnd = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };

  const emitHtml = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
    const restored = restoreSelection();
    if (!restored) {
      moveCaretToEnd();
    }
  };

  const runCommand = (command: string, arg?: string) => {
    if (htmlMode) return;
    focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, arg);
    emitHtml();
    saveSelection();
  };

  const applyBlock = (blockTag: string) => {
    runCommand("formatBlock", `<${blockTag.toLowerCase()}>`);
  };

  const insertLink = () => {
    const url = window.prompt("Nhập URL liên kết", "https://");
    if (!url) return;
    runCommand("createLink", url.trim());
  };

  const insertHorizontalLine = () => {
    runCommand("insertHorizontalRule");
  };

  const insertTable = () => {
    const rows = Number(window.prompt("Số hàng", "2"));
    const cols = Number(window.prompt("Số cột", "3"));
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
      return;
    }

    const headerCells = Array.from({ length: cols })
      .map(
        (_, index) =>
          `<th style=\"border:1px solid #d6d3d1;padding:8px;background:#f5f5f4;\">Cột ${index + 1}</th>`
      )
      .join("");
    const bodyRows = Array.from({ length: rows })
      .map(
        () =>
          `<tr>${Array.from({ length: cols })
            .map(() => '<td style=\"border:1px solid #d6d3d1;padding:8px;\">Nội dung</td>')
            .join("")}</tr>`
      )
      .join("");

    const tableHtml = `<table style=\"width:100%;border-collapse:collapse;margin:12px 0;\"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p></p>`;
    runCommand("insertHTML", tableHtml);
  };

  const applyColorToSelectedCell = () => {
    if (htmlMode) return;
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.getRangeAt(0).startContainer as Node | null;
    if (node?.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    while (node && node instanceof HTMLElement && node.tagName !== "TD" && node.tagName !== "TH") {
      node = node.parentElement;
    }

    if (node && node instanceof HTMLElement && (node.tagName === "TD" || node.tagName === "TH")) {
      node.style.backgroundColor = cellColor;
      emitHtml();
      saveSelection();
      return;
    }

    window.alert("Vui lòng đặt con trỏ vào ô bảng trước khi tô màu.");
  };

  const resolveSelectedCell = (): HTMLTableCellElement | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    let node = selection.getRangeAt(0).startContainer as Node | null;
    if (node?.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    while (node && node instanceof HTMLElement && node.tagName !== "TD" && node.tagName !== "TH") {
      node = node.parentElement;
    }

    if (!node || !(node instanceof HTMLTableCellElement)) {
      return null;
    }
    return node;
  };

  const createLikeCell = (sourceCell: HTMLTableCellElement): HTMLTableCellElement => {
    const tagName = sourceCell.tagName.toLowerCase();
    const cell = document.createElement(tagName) as HTMLTableCellElement;
    cell.innerHTML = tagName === "th" ? "Cột mới" : "Nội dung";
    cell.style.border = sourceCell.style.border || "1px solid #d6d3d1";
    cell.style.padding = sourceCell.style.padding || "8px";
    if (tagName === "th" && !cell.style.backgroundColor) {
      cell.style.backgroundColor = "#f5f5f4";
    }
    return cell;
  };

  const insertTableRow = (direction: "above" | "below") => {
    if (htmlMode) return;
    focusEditor();
    const cell = resolveSelectedCell();
    if (!cell) {
      window.alert("Đặt con trỏ vào ô bảng để thêm hàng.");
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return;

    const newRow = document.createElement("tr");
    Array.from(row.cells).forEach((currentCell) => {
      newRow.appendChild(createLikeCell(currentCell));
    });

    if (direction === "above") {
      row.parentElement?.insertBefore(newRow, row);
    } else {
      row.parentElement?.insertBefore(newRow, row.nextSibling);
    }

    emitHtml();
    saveSelection();
  };

  const insertTableColumn = (direction: "left" | "right") => {
    if (htmlMode) return;
    focusEditor();
    const cell = resolveSelectedCell();
    if (!cell) {
      window.alert("Đặt con trỏ vào ô bảng để thêm cột.");
      return;
    }
    const table = cell.closest("table");
    if (!table) return;
    const index = cell.cellIndex;

    Array.from(table.rows).forEach((row) => {
      const sourceCell = (row.cells[index] ?? row.cells[row.cells.length - 1]) as HTMLTableCellElement | undefined;
      if (!sourceCell) return;
      const newCell = createLikeCell(sourceCell);

      if (direction === "left") {
        row.insertBefore(newCell, row.cells[index] ?? null);
      } else {
        row.insertBefore(newCell, row.cells[index + 1] ?? null);
      }
    });

    emitHtml();
    saveSelection();
  };

  const deleteTableRow = () => {
    if (htmlMode) return;
    focusEditor();
    const cell = resolveSelectedCell();
    if (!cell) {
      window.alert("Đặt con trỏ vào ô bảng để xóa hàng.");
      return;
    }
    const row = cell.parentElement;
    row?.parentElement?.removeChild(row);
    emitHtml();
    saveSelection();
  };

  const deleteTableColumn = () => {
    if (htmlMode) return;
    focusEditor();
    const cell = resolveSelectedCell();
    if (!cell) {
      window.alert("Đặt con trỏ vào ô bảng để xóa cột.");
      return;
    }
    const table = cell.closest("table");
    if (!table) return;
    const index = cell.cellIndex;

    Array.from(table.rows).forEach((row) => {
      if (index >= 0 && index < row.cells.length) {
        row.deleteCell(index);
      }
    });

    emitHtml();
    saveSelection();
  };

  const deleteTable = () => {
    if (htmlMode) return;
    focusEditor();
    const cell = resolveSelectedCell();
    if (!cell) {
      window.alert("Đặt con trỏ vào ô bảng để xóa bảng.");
      return;
    }
    const table = cell.closest("table");
    table?.parentElement?.removeChild(table);
    emitHtml();
    saveSelection();
  };

  const applyLineHeightToBlock = (nextLineHeight: string) => {
    if (htmlMode) return;
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.getRangeAt(0).startContainer as Node | null;
    if (node?.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    const editor = editorRef.current;
    while (
      node &&
      node instanceof HTMLElement &&
      editor &&
      node !== editor &&
      !["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"].includes(node.tagName)
    ) {
      node = node.parentElement;
    }

    if (node && node instanceof HTMLElement && node !== editor) {
      node.style.lineHeight = nextLineHeight;
      emitHtml();
      saveSelection();
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!onUploadImage) {
      window.alert("Chưa cấu hình upload ảnh cho trình soạn thảo.");
      return null;
    }
    if (!isImageFile(file)) {
      return null;
    }
    try {
      return await onUploadImage(file);
    } catch (error) {
      window.alert(toErrorMessage(error));
      return null;
    }
  };

  const insertImageAtCursor = (url: string, alt: string) => {
    runCommand(
      "insertHTML",
      `<p><img src=\"${escapeAttribute(url)}\" alt=\"${escapeAttribute(alt || "Hình ảnh nội dung")}\" loading=\"lazy\" /></p>`
    );
  };

  const uploadAndInsertImages = async (files: File[]): Promise<number> => {
    if (files.length === 0) return 0;
    if (!onUploadImage) {
      setUploadNotice("Chưa kết nối dịch vụ upload ảnh.");
      return 0;
    }

    setIsUploadingImages(true);
    setUploadNotice(`Đang tải ${files.length} ảnh...`);
    let uploadedCount = 0;
    try {
      for (const file of files) {
        const url = await uploadFile(file);
        if (!url) continue;
        insertImageAtCursor(url, file.name);
        uploadedCount += 1;
      }
      emitHtml();
      if (uploadedCount > 0) {
        setUploadNotice(`Đã tải lên ${uploadedCount} ảnh vào nội dung.`);
      } else {
        setUploadNotice("Không có ảnh nào được tải lên.");
      }
      return uploadedCount;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const findTemporaryImages = (): HTMLImageElement[] => {
    if (!editorRef.current) return [];
    return Array.from(editorRef.current.querySelectorAll("img")).filter((img) => {
      const src = (img.getAttribute("src") ?? "").trim().toLowerCase();
      return src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("file:");
    });
  };

  const uploadAndReplaceTemporaryImages = async (
    files: File[],
    temporaryImages: HTMLImageElement[]
  ): Promise<number> => {
    if (files.length === 0) return 0;
    if (!onUploadImage) {
      setUploadNotice("Chưa kết nối dịch vụ upload ảnh.");
      return 0;
    }

    setIsUploadingImages(true);
    setUploadNotice(`Đang xử lý ${files.length} ảnh từ Word/clipboard...`);
    let uploadedCount = 0;
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const url = await uploadFile(file);
        if (!url) continue;

        const targetImage = temporaryImages[index];
        if (targetImage) {
          targetImage.setAttribute("src", url);
          targetImage.removeAttribute("srcset");
          if (!targetImage.getAttribute("alt")) {
            targetImage.setAttribute("alt", file.name || "Hình ảnh nội dung");
          }
        } else {
          insertImageAtCursor(url, file.name);
        }
        uploadedCount += 1;
      }

      emitHtml();
      if (uploadedCount > 0) {
        setUploadNotice(`Đã dán nội dung và tải ${uploadedCount} ảnh thành công.`);
      } else {
        setUploadNotice("Không thể tải ảnh từ nội dung dán.");
      }
      return uploadedCount;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const onChooseImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (htmlMode) {
      setUploadNotice("Hãy chuyển sang Soạn thảo trực quan để chèn ảnh.");
      return;
    }
    const imageFiles = Array.from(files).filter(isImageFile);
    await uploadAndInsertImages(imageFiles);
  };

  const onEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (htmlMode) return;

    const clipboardItems = Array.from(event.clipboardData.items);
    const imageFiles = clipboardItems
      .filter((item) => item.kind === "file" && item.type.startsWith(IMAGE_MIME_PREFIX))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    window.setTimeout(() => {
      emitHtml();
      saveSelection();
    }, 0);

    if (imageFiles.length === 0) return;

    const temporaryImagesBeforePaste = new Set(findTemporaryImages());
    window.setTimeout(() => {
      void (async () => {
        const temporaryAfterPaste = findTemporaryImages().filter((img) => !temporaryImagesBeforePaste.has(img));
        if (temporaryAfterPaste.length > 0) {
          await uploadAndReplaceTemporaryImages(imageFiles, temporaryAfterPaste);
          return;
        }
        await uploadAndInsertImages(imageFiles);
      })();
    }, 80);
  };

  const onEditorDragOver = (event: DragEvent<HTMLDivElement>) => {
    const hasImageFile = Array.from(event.dataTransfer.items).some(
      (item) => item.kind === "file" && item.type.startsWith(IMAGE_MIME_PREFIX)
    );
    if (hasImageFile) {
      event.preventDefault();
    }
  };

  const onEditorDrop = (event: DragEvent<HTMLDivElement>) => {
    const imageFiles = Array.from(event.dataTransfer.files).filter(isImageFile);
    if (imageFiles.length === 0) return;
    event.preventDefault();
    focusEditor();
    void uploadAndInsertImages(imageFiles);
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (htmlMode || !event.ctrlKey) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      runCommand("bold");
      return;
    }
    if (key === "i") {
      event.preventDefault();
      runCommand("italic");
      return;
    }
    if (key === "u") {
      event.preventDefault();
      runCommand("underline");
      return;
    }
    if (key === "z") {
      event.preventDefault();
      runCommand("undo");
      return;
    }
    if (key === "y") {
      event.preventDefault();
      runCommand("redo");
    }
  };

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-stone-300 bg-gradient-to-b from-stone-100 to-stone-200 p-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-stretch gap-2">
            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("undo")}>Hoàn tác</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("redo")}>Làm lại</button>
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Lịch sử</p>
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <select
                  className="h-8 rounded border border-stone-300 px-2 text-xs"
                  value={fontName}
                  onChange={(event) => {
                    const next = event.target.value;
                    setFontName(next);
                    runCommand("fontName", next);
                  }}
                >
                  {FONT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <select
                  className="h-8 w-16 rounded border border-stone-300 px-2 text-xs"
                  value={fontSize}
                  onChange={(event) => {
                    const next = event.target.value;
                    setFontSize(next);
                    runCommand("fontSize", next);
                  }}
                >
                  {FONT_SIZE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <select
                  className="h-8 rounded border border-stone-300 px-2 text-xs"
                  onChange={(event) => applyBlock(event.target.value)}
                  defaultValue="P"
                >
                  {BLOCK_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Phông chữ</p>
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("bold")}>B</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("italic")}>I</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("underline")}>U</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("strikeThrough")}>S</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("superscript")}>X²</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("subscript")}>X₂</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("removeFormat")}>Xóa định dạng</button>
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Kiểu chữ</p>
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <label className="inline-flex items-center gap-1 rounded border border-stone-300 px-2 py-1 text-xs">
                  Chữ
                  <input
                    type="color"
                    value={textColor}
                    onChange={(event) => {
                      const nextColor = event.target.value;
                      setTextColor(nextColor);
                      runCommand("foreColor", nextColor);
                    }}
                    className="h-5 w-6 border-none bg-transparent p-0"
                  />
                </label>
                <label className="inline-flex items-center gap-1 rounded border border-stone-300 px-2 py-1 text-xs">
                  Nền
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(event) => {
                      const nextColor = event.target.value;
                      setHighlightColor(nextColor);
                      runCommand("hiliteColor", nextColor);
                    }}
                    className="h-5 w-6 border-none bg-transparent p-0"
                  />
                </label>
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Màu sắc</p>
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("justifyLeft")}>Trái</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("justifyCenter")}>Giữa</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("justifyRight")}>Phải</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("justifyFull")}>Đều</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("outdent")}>Giảm lề</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("indent")}>Tăng lề</button>
                <select
                  className="h-8 rounded border border-stone-300 px-2 text-xs"
                  value={lineHeight}
                  onChange={(event) => {
                    const next = event.target.value;
                    setLineHeight(next);
                    applyLineHeightToBlock(next);
                  }}
                >
                  {LINE_HEIGHT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{`Giãn dòng ${item.label}`}</option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Đoạn văn</p>
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("insertUnorderedList")}>• Danh sách</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("insertOrderedList")}>1. Đánh số</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => applyBlock("blockquote")}>Trích dẫn</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={insertLink}>Liên kết</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => runCommand("unlink")}>Bỏ link</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={insertHorizontalLine}>Đường kẻ</button>
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Danh sách và liên kết</p>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-2">
            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={insertTable}>Bảng mới</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={applyColorToSelectedCell}>Tô màu ô</button>
                <label className="inline-flex items-center gap-1 rounded border border-stone-300 px-2 py-1 text-xs">
                  Ô
                  <input
                    type="color"
                    value={cellColor}
                    onChange={(event) => setCellColor(event.target.value)}
                    className="h-5 w-6 border-none bg-transparent p-0"
                  />
                </label>
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Bảng cơ bản</p>
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => insertTableRow("above")}>+ Hàng trên</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => insertTableRow("below")}>+ Hàng dưới</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => insertTableColumn("left")}>+ Cột trái</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={() => insertTableColumn("right")}>+ Cột phải</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={deleteTableRow}>- Hàng</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={deleteTableColumn}>- Cột</button>
                <button type="button" className={iconButtonStyle()} onMouseDown={preventBlur} onClick={deleteTable}>Xóa bảng</button>
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Bảng nâng cao</p>
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-1 shadow-sm">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={iconButtonStyle()}
                  onMouseDown={preventBlur}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!onUploadImage || isUploadingImages || htmlMode}
                  title={
                    !onUploadImage
                      ? "Chưa cấu hình upload ảnh"
                      : htmlMode
                        ? "Chuyển về soạn thảo trực quan để chèn ảnh"
                        : "Tải ảnh từ máy tính"
                  }
                >
                  {isUploadingImages ? "Đang tải ảnh..." : "Chèn ảnh"}
                </button>
                <button
                  type="button"
                  className={iconButtonStyle(htmlMode)}
                  onMouseDown={preventBlur}
                  onClick={() => setHtmlMode((current) => !current)}
                >
                  {htmlMode ? "Soạn thảo" : "HTML"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void onChooseImageFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>
              <p className="mt-1 text-center text-[10px] text-stone-500">Ảnh và chế độ</p>
            </div>
          </div>
        </div>
      </div>

      {uploadNotice && <p className="text-xs text-amber-700">{uploadNotice}</p>}

      {htmlMode ? (
        <textarea
          className={`w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-mono ${minHeightClassName}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nhập HTML..."
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={`rich-editor-surface ${minHeightClassName} w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm`}
          data-placeholder={placeholder}
          onInput={() => {
            emitHtml();
            saveSelection();
          }}
          onKeyUp={saveSelection}
          onKeyDown={onEditorKeyDown}
          onMouseUp={saveSelection}
          onBlur={saveSelection}
          onPaste={onEditorPaste}
          onDragOver={onEditorDragOver}
          onDrop={onEditorDrop}
        />
      )}
    </div>
  );
}
