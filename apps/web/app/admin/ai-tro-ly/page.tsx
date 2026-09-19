"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminToken } from "../useAdminToken";
import {
  updateProduct,
  updatePost,
  updatePage,
  updateCategory,
  updateBanner,
  updateHero,
  deleteProduct,
  deletePost,
  deletePage,
  deleteCategory,
  deleteBanner,
  deleteHero,
} from "../api";
import { resolveApiBase } from "../../lib/api-base";

const API_BASE = resolveApiBase();

// ── Types ─────────────────────────────────────────────────────────────────────

type DraftType = "product" | "post" | "page" | "category" | "banner" | "hero";

type DraftItem = {
  type: DraftType;
  id: string;
  name: string;
  admin_url: string;
  draft_data: Record<string, unknown>;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  created_items?: DraftItem[];
};

// ── API call ──────────────────────────────────────────────────────────────────

async function sendChat(
  messages: { role: string; content: string }[],
  token: string
): Promise<{ reply: string; created_items: DraftItem[] }> {
  const res = await fetch(`${API_BASE}/admin/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? `Lỗi ${res.status}`);
  }
  return res.json() as Promise<{ reply: string; created_items: DraftItem[] }>;
}

// ── Field components ──────────────────────────────────────────────────────────

function FieldText({
  label, value, onChange, mono = false,
}: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

function FieldNumber({
  label, value, onChange,
}: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
      />
    </div>
  );
}

function FieldTextarea({
  label, value, onChange, rows = 4,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all resize-y font-mono"
      />
    </div>
  );
}

function FieldImage({ label, url, onChange }: { label: string; url: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="preview"
          className="w-full h-40 object-cover rounded-lg border border-gray-200 bg-gray-50"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <input
        type="text"
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 font-mono outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );
}

// ── Draft card per content type ───────────────────────────────────────────────

type CardStatus = "draft" | "publishing" | "published" | "deleted";

function ProductCard({ item, token }: { item: DraftItem; token: string }) {
  const d = item.draft_data as {
    id: string; name: string; slug: string; category_slug: string;
    price: number; sale_price: number | null; image_url: string; image_urls: string[];
    short_description: string; content: string;
    seo_title: string; seo_description: string; focus_keyword: string;
    extra_options: string[]; tags: string[];
    allow_online_order: boolean; pricing_mode: "retail" | "combo";
    order: number; is_featured: boolean;
  };
  const [form, setForm] = useState(d);
  const [status, setStatus] = useState<CardStatus>("draft");

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handlePublish = async () => {
    setStatus("publishing");
    try {
      await updateProduct(token, form.id, {
        name: form.name, slug: form.slug, category_slug: form.category_slug,
        price: form.price, sale_price: form.sale_price,
        image_url: form.image_url, image_urls: form.image_urls.length ? form.image_urls : [form.image_url].filter(Boolean),
        short_description: form.short_description, content: form.content,
        order: form.order, is_active: true, is_featured: form.is_featured,
        extra_options: form.extra_options, allow_online_order: form.allow_online_order,
        pricing_mode: form.pricing_mode,
        tags: form.tags, seo_title: form.seo_title, seo_description: form.seo_description,
        focus_keyword: form.focus_keyword,
      });
      setStatus("published");
    } catch { setStatus("draft"); }
  };

  const handleDelete = async () => {
    if (!confirm("Xoá draft sản phẩm này?")) return;
    await deleteProduct(token, form.id).catch(() => {});
    setStatus("deleted");
  };

  if (status === "deleted") return null;

  return (
    <DraftCardShell type="product" title={form.name} status={status} onPublish={() => void handlePublish()} onDelete={() => void handleDelete()}>
      <FieldImage label="Ảnh sản phẩm" url={form.image_url} onChange={(v) => { set("image_url", v); set("image_urls", [v]); }} />
      <div className="grid grid-cols-2 gap-3">
        <FieldText label="Tên sản phẩm" value={form.name} onChange={(v) => set("name", v)} />
        <FieldText label="Slug" value={form.slug} onChange={(v) => set("slug", v)} mono />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FieldNumber label="Giá (VND)" value={form.price} onChange={(v) => set("price", v ?? 0)} />
        <FieldNumber label="Giá sale" value={form.sale_price} onChange={(v) => set("sale_price", v)} />
        <FieldText label="Danh mục slug" value={form.category_slug} onChange={(v) => set("category_slug", v)} mono />
      </div>
      <FieldText label="Mô tả ngắn" value={form.short_description} onChange={(v) => set("short_description", v)} />
      <FieldTextarea label="Nội dung (HTML)" value={form.content} onChange={(v) => set("content", v)} rows={6} />
      <div className="grid grid-cols-2 gap-3">
        <FieldText label="SEO Title" value={form.seo_title} onChange={(v) => set("seo_title", v)} />
        <FieldText label="SEO Description" value={form.seo_description} onChange={(v) => set("seo_description", v)} />
      </div>
    </DraftCardShell>
  );
}

function PostCard({ item, token }: { item: DraftItem; token: string }) {
  const d = item.draft_data as {
    id: string; slug: string; title: string; summary: string; content: string;
    cover_image: string | null; tags: string[]; seo_title: string; seo_description: string; focus_keyword: string; order: number;
  };
  const [form, setForm] = useState(d);
  const [status, setStatus] = useState<CardStatus>("draft");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handlePublish = async () => {
    setStatus("publishing");
    try {
      await updatePost(token, form.id, {
        slug: form.slug, title: form.title, summary: form.summary, content: form.content,
        cover_image: form.cover_image, is_published: true, tags: form.tags, order: form.order,
        seo_title: form.seo_title, seo_description: form.seo_description, focus_keyword: form.focus_keyword,
      });
      setStatus("published");
    } catch { setStatus("draft"); }
  };

  const handleDelete = async () => {
    if (!confirm("Xoá draft bài viết này?")) return;
    await deletePost(token, form.id).catch(() => {});
    setStatus("deleted");
  };

  if (status === "deleted") return null;

  return (
    <DraftCardShell type="post" title={form.title} status={status} onPublish={() => void handlePublish()} onDelete={() => void handleDelete()}>
      <FieldImage label="Ảnh bìa" url={form.cover_image ?? ""} onChange={(v) => set("cover_image", v || null)} />
      <div className="grid grid-cols-2 gap-3">
        <FieldText label="Tiêu đề" value={form.title} onChange={(v) => set("title", v)} />
        <FieldText label="Slug" value={form.slug} onChange={(v) => set("slug", v)} mono />
      </div>
      <FieldText label="Tóm tắt" value={form.summary} onChange={(v) => set("summary", v)} />
      <FieldTextarea label="Nội dung (HTML)" value={form.content} onChange={(v) => set("content", v)} rows={8} />
      <div className="grid grid-cols-2 gap-3">
        <FieldText label="SEO Title" value={form.seo_title} onChange={(v) => set("seo_title", v)} />
        <FieldText label="SEO Description" value={form.seo_description} onChange={(v) => set("seo_description", v)} />
      </div>
    </DraftCardShell>
  );
}

function PageCard({ item, token }: { item: DraftItem; token: string }) {
  const d = item.draft_data as {
    id: string; slug: string; path: string; title: string; summary: string; content: string; order: number;
  };
  const [form, setForm] = useState(d);
  const [status, setStatus] = useState<CardStatus>("draft");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handlePublish = async () => {
    setStatus("publishing");
    try {
      await updatePage(token, form.id, {
        slug: form.slug, path: form.path, title: form.title,
        summary: form.summary, content: form.content, is_published: true, order: form.order,
      });
      setStatus("published");
    } catch { setStatus("draft"); }
  };

  const handleDelete = async () => {
    if (!confirm("Xoá draft trang này?")) return;
    await deletePage(token, form.id).catch(() => {});
    setStatus("deleted");
  };

  if (status === "deleted") return null;

  return (
    <DraftCardShell type="page" title={form.title} status={status} onPublish={() => void handlePublish()} onDelete={() => void handleDelete()}>
      <div className="grid grid-cols-2 gap-3">
        <FieldText label="Tiêu đề" value={form.title} onChange={(v) => set("title", v)} />
        <FieldText label="Path (URL)" value={form.path} onChange={(v) => set("path", v)} mono />
      </div>
      <FieldText label="Tóm tắt" value={form.summary} onChange={(v) => set("summary", v)} />
      <FieldTextarea label="Nội dung (HTML)" value={form.content} onChange={(v) => set("content", v)} rows={8} />
    </DraftCardShell>
  );
}

function CategoryCard({ item, token }: { item: DraftItem; token: string }) {
  const d = item.draft_data as { id: string; label: string; slug: string; img: string; order: number };
  const [form, setForm] = useState(d);
  const [status, setStatus] = useState<CardStatus>("draft");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handlePublish = async () => {
    setStatus("publishing");
    try {
      await updateCategory(token, form.id, { label: form.label, slug: form.slug, img: form.img, order: form.order });
      setStatus("published");
    } catch { setStatus("draft"); }
  };

  const handleDelete = async () => {
    if (!confirm("Xoá danh mục này?")) return;
    await deleteCategory(token, form.id).catch(() => {});
    setStatus("deleted");
  };

  if (status === "deleted") return null;

  return (
    <DraftCardShell type="category" title={form.label} status={status} onPublish={() => void handlePublish()} onDelete={() => void handleDelete()}>
      <FieldImage label="Ảnh danh mục" url={form.img} onChange={(v) => set("img", v)} />
      <div className="grid grid-cols-2 gap-3">
        <FieldText label="Tên danh mục" value={form.label} onChange={(v) => set("label", v)} />
        <FieldText label="Slug" value={form.slug} onChange={(v) => set("slug", v)} mono />
      </div>
    </DraftCardShell>
  );
}

function BannerCard({ item, token }: { item: DraftItem; token: string }) {
  const d = item.draft_data as { id: string; alt: string; img: string; order: number; is_active: boolean };
  const [form, setForm] = useState(d);
  const [status, setStatus] = useState<CardStatus>("draft");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handlePublish = async () => {
    setStatus("publishing");
    try {
      await updateBanner(token, form.id, { alt: form.alt, img: form.img, order: form.order, is_active: true });
      setStatus("published");
    } catch { setStatus("draft"); }
  };

  const handleDelete = async () => {
    if (!confirm("Xoá banner này?")) return;
    await deleteBanner(token, form.id).catch(() => {});
    setStatus("deleted");
  };

  if (status === "deleted") return null;

  return (
    <DraftCardShell type="banner" title={form.alt} status={status} onPublish={() => void handlePublish()} onDelete={() => void handleDelete()}>
      <FieldImage label="Ảnh banner (1920x600)" url={form.img} onChange={(v) => set("img", v)} />
      <FieldText label="Alt text" value={form.alt} onChange={(v) => set("alt", v)} />
    </DraftCardShell>
  );
}

function HeroCard({ item, token }: { item: DraftItem; token: string }) {
  const d = item.draft_data as { id: string; title: string; description: string; order: number };
  const [form, setForm] = useState(d);
  const [status, setStatus] = useState<CardStatus>("draft");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handlePublish = async () => {
    setStatus("publishing");
    try {
      await updateHero(token, form.id, { title: form.title, description: form.description, order: form.order });
      setStatus("published");
    } catch { setStatus("draft"); }
  };

  const handleDelete = async () => {
    if (!confirm("Xoá hero statement này?")) return;
    await deleteHero(token, form.id).catch(() => {});
    setStatus("deleted");
  };

  if (status === "deleted") return null;

  return (
    <DraftCardShell type="hero" title={form.title} status={status} onPublish={() => void handlePublish()} onDelete={() => void handleDelete()}>
      <FieldText label="Tiêu đề hero" value={form.title} onChange={(v) => set("title", v)} />
      <FieldText label="Mô tả" value={form.description} onChange={(v) => set("description", v)} />
    </DraftCardShell>
  );
}

// ── Card shell ────────────────────────────────────────────────────────────────

const TYPE_META: Record<DraftType, { label: string; icon: string; color: string }> = {
  product: { label: "Sản phẩm", icon: "🖼️", color: "blue" },
  post: { label: "Bài viết", icon: "📝", color: "purple" },
  page: { label: "Trang CMS", icon: "📄", color: "orange" },
  category: { label: "Danh mục", icon: "🗂️", color: "teal" },
  banner: { label: "Banner", icon: "🎯", color: "pink" },
  hero: { label: "Hero", icon: "✨", color: "yellow" },
};

function DraftCardShell({
  type, title, status, onPublish, onDelete, children,
}: {
  type: DraftType;
  title: string;
  status: CardStatus;
  onPublish: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const meta = TYPE_META[type];
  const [collapsed, setCollapsed] = useState(false);

  if (status === "published") {
    return (
      <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
        <span>✓</span>
        <span>{meta.icon} {meta.label} &ldquo;{title}&rdquo; đã được đăng thành công!</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.icon}</span>
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{meta.label}</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">DRAFT</span>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{title}</span>
        </div>
        <span className="text-gray-400 text-xs">{collapsed ? "▼ Mở" : "▲ Thu"}</span>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 py-3 space-y-3">
          {children}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-200">
        <button
          onClick={onPublish}
          disabled={status === "publishing"}
          className="flex-1 bg-green-600 text-white rounded-lg py-1.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {status === "publishing" ? "Đang đăng..." : "✓ Đăng ngay"}
        </button>
        <button
          onClick={onDelete}
          disabled={status === "publishing"}
          className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-1.5 text-sm hover:bg-red-100 transition-colors"
        >
          Xoá draft
        </button>
        <a
          href={TYPE_META[type] ? `/admin/${type === "product" ? "products" : type === "post" ? "tin-tuc" : type === "page" ? "pages" : type === "category" ? "categories" : type === "banner" ? "banners" : "hero"}` : "#"}
          target="_blank"
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Quản lý →
        </a>
      </div>
    </div>
  );
}

function DraftCard({ item, token }: { item: DraftItem; token: string }) {
  switch (item.type) {
    case "product": return <ProductCard item={item} token={token} />;
    case "post": return <PostCard item={item} token={token} />;
    case "page": return <PageCard item={item} token={token} />;
    case "category": return <CategoryCard item={item} token={token} />;
    case "banner": return <BannerCard item={item} token={token} />;
    case "hero": return <HeroCard item={item} token={token} />;
    default: return null;
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AiAssistantPage() {
  const { token } = useAdminToken();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Xin chào! Tôi là trợ lý AI của InAnh24h.\n\nTôi sẽ tự động tạo nội dung đầy đủ kèm ảnh minh hoạ. Bạn có thể chỉnh sửa trực tiếp rồi nhấn **Đăng ngay** để xuất bản.\n\nVí dụ lệnh:\n• \"Tạo sản phẩm in ảnh canvas 20x30cm giá 150.000đ\"\n• \"Viết bài hướng dẫn chọn kích thước in ảnh\"\n• \"Tạo trang giới thiệu dịch vụ in ảnh InAnh24h\"\n• \"Thêm banner khuyến mãi tết 2026\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !token) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");

    const history = next
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const result = await sendChat(history, token);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, created_items: result.created_items },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900">✨ AI Trợ lý nội dung</h1>
        <p className="text-sm text-gray-500">AI tự tạo nội dung + ảnh minh hoạ. Chỉnh sửa inline rồi nhấn Đăng.</p>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`${msg.role === "user" ? "max-w-[80%]" : "w-full"}`}>
              {msg.role === "assistant" && (
                <div className="text-xs text-gray-400 mb-1 ml-1 font-medium">AI Trợ lý</div>
              )}

              {/* Text bubble */}
              {msg.content && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed mb-2 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              )}

              {/* Inline editable draft cards */}
              {msg.created_items && msg.created_items.length > 0 && (
                <div className="space-y-3">
                  {msg.created_items.map((item) => (
                    <DraftCard key={item.id} item={item} token={token ?? ""} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-xs text-gray-400 mt-1">AI đang tạo nội dung + ảnh...</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="mt-2 flex gap-2 items-end bg-white border border-gray-300 rounded-2xl px-3 py-2 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder='Ví dụ: "Tạo sản phẩm in ảnh canvas 20x30 giá 150.000đ"'
          rows={1}
          className="flex-1 resize-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent max-h-32 overflow-y-auto"
          disabled={loading}
        />
        <button
          onClick={() => void handleSend()}
          disabled={loading || !input.trim()}
          className="shrink-0 bg-blue-600 text-white rounded-xl px-4 py-1.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Gửi
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 text-center">Enter gửi · Shift+Enter xuống dòng</p>
    </div>
  );
}
