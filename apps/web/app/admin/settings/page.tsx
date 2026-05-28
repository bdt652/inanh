"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import AdminModal from "../AdminModal";
import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ImageUploadField from "../ImageUploadField";
import { getSettings, upsertSettings, uploadImage } from "../api";
import type { SettingsUpsert } from "../types";
import { useAdminToken } from "../useAdminToken";
import { shouldSkipImageOptimization } from "../../lib/image";

const EMPTY_FORM: SettingsUpsert = {
  logo_url: "",
  google_header: "",
  footer: "",
  title: "",
  address: "",
  hotline_zalo: "",
  email: "",
  upload_min_files: undefined,
  upload_max_files: undefined,
  upload_max_bytes: undefined,
  upload_require_verified_phone_threshold: undefined,
  login_phone_enabled: true,
  login_google_enabled: true,
};

export default function AdminSettingsPage() {
  const { token, logout } = useAdminToken();
  const [form, setForm] = useState<SettingsUpsert>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) return;
    getSettings(token)
      .then((settings) => {
        if (!settings) {
          setForm(EMPTY_FORM);
          return;
        }
        setForm({
          logo_url: settings.logo_url,
          google_header: settings.google_header,
          footer: settings.footer,
          title: settings.title,
          address: settings.address,
          hotline_zalo: settings.hotline_zalo,
          email: settings.email,
          upload_min_files: settings.upload_min_files ?? undefined,
          upload_max_files: settings.upload_max_files ?? undefined,
          upload_max_bytes: settings.upload_max_bytes ?? undefined,
          upload_require_verified_phone_threshold: settings.upload_require_verified_phone_threshold ?? undefined,
          login_phone_enabled: settings.login_phone_enabled ?? true,
          login_google_enabled: settings.login_google_enabled ?? true,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được cài đặt."))
      .finally(() => setLoaded(true));
  }, [token]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await upsertSettings(token, form);
      setForm({
        logo_url: saved.logo_url,
        google_header: saved.google_header,
        footer: saved.footer,
        title: saved.title,
        address: saved.address,
        hotline_zalo: saved.hotline_zalo,
        email: saved.email,
        upload_min_files: saved.upload_min_files ?? undefined,
        upload_max_files: saved.upload_max_files ?? undefined,
        upload_max_bytes: saved.upload_max_bytes ?? undefined,
        upload_require_verified_phone_threshold: saved.upload_require_verified_phone_threshold ?? undefined,
        login_phone_enabled: saved.login_phone_enabled ?? true,
        login_google_enabled: saved.login_google_enabled ?? true,
      });
      setNotice("Đã lưu cài đặt.");
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được cài đặt.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (file: File) => {
    if (!token) return;
    const uploaded = await uploadImage(token, file, "logo");
    setForm((prev) => ({ ...prev, logo_url: uploaded.url }));
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Cài đặt"
      subtitle="Quản lý cấu hình website với popup và preview logo."
      onLogout={logout}
      actions={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
        >
          Chỉnh sửa cài đặt
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Logo preview</p>
          {form.logo_url ? (
            <Image
              src={form.logo_url}
              alt="logo"
              width={640}
              height={288}
              className="max-h-36 w-full rounded-lg object-contain"
              unoptimized={shouldSkipImageOptimization(form.logo_url)}
            />
          ) : (
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-stone-300 text-xs text-stone-500">
              Chưa có logo
            </div>
          )}
        </div>
        <div className="space-y-2 text-sm text-stone-600">
          <p><span className="font-semibold text-stone-900">Title:</span> {form.title || "-"}</p>
          <p><span className="font-semibold text-stone-900">Email:</span> {form.email || "-"}</p>
          <p><span className="font-semibold text-stone-900">Hotline:</span> {form.hotline_zalo || "-"}</p>
          <p><span className="font-semibold text-stone-900">Address:</span> {form.address || "-"}</p>
          <p><span className="font-semibold text-stone-900">Footer:</span> {form.footer || "-"}</p>
          <p>
            <span className="font-semibold text-stone-900">Đăng nhập SĐT:</span>{" "}
            {form.login_phone_enabled ? "Bật" : "Tắt"}
          </p>
          <p>
            <span className="font-semibold text-stone-900">Đăng nhập Google:</span>{" "}
            {form.login_google_enabled ? "Bật" : "Tắt"}
          </p>
          <p><span className="font-semibold text-stone-900">Trạng thái:</span> {loaded ? "Đã tải dữ liệu" : "Đang tải..."}</p>
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Chỉnh sửa cài đặt"
        description="Tất cả input đều có label rõ ràng, bao gồm upload logo."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
              Hủy
            </button>
            <button
              type="submit"
              form="settings-form"
              disabled={saving}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        }
      >
        <form id="settings-form" className="grid gap-3 md:grid-cols-2" onSubmit={handleSave}>
          <div className="md:col-span-2">
            <ImageUploadField
              id="settings-logo"
              label="Logo website"
              value={form.logo_url}
              onChange={(value) => setForm((prev) => ({ ...prev, logo_url: value }))}
              onUpload={handleUploadLogo}
              recommendedSize="400x120"
              hint="Upload logo de xem ngay trong popup."
            />
          </div>

          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tiêu đề website
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Email
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
            Địa chỉ
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
            Hotline/Zalo
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.hotline_zalo}
              onChange={(event) => setForm((prev) => ({ ...prev, hotline_zalo: event.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tối thiểu số ảnh / đơn
            <input
              type="number"
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.upload_min_files ?? ""}
              min={1}
              max={50000}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  upload_min_files: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              placeholder="VD 5"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Giới hạn số ảnh / đơn
            <input
              type="number"
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.upload_max_files ?? ""}
              min={1}
              max={50000}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  upload_max_files: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              placeholder="VD 10000"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Giới hạn dung lượng (bytes)
            <input
              type="number"
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.upload_max_bytes ?? ""}
              min={1}
              max={200000000000}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  upload_max_bytes: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              placeholder="VD 20000000000"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
            Yêu cầu xác thực số điện thoại khi số ảnh &gt;=
            <input
              type="number"
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.upload_require_verified_phone_threshold ?? ""}
              min={1}
              max={50000}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  upload_require_verified_phone_threshold: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              placeholder="VD 100"
            />
          </label>

          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Phương thức đăng nhập khách</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={form.login_phone_enabled ?? true}
                onChange={(e) => setForm((prev) => ({ ...prev, login_phone_enabled: e.target.checked }))}
              />
              Đăng nhập bằng Số điện thoại + Mật khẩu
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={form.login_google_enabled ?? true}
                onChange={(e) => setForm((prev) => ({ ...prev, login_google_enabled: e.target.checked }))}
              />
              Đăng nhập bằng Google
              <span className="text-[11px] font-normal text-stone-400">(cần cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID)</span>
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
            Văn bản footer (bản quyền)
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
              value={form.footer}
              onChange={(event) => setForm((prev) => ({ ...prev, footer: event.target.value }))}
              placeholder="© 2026 In ảnh 24h. All rights reserved."
            />
            <span className="text-[11px] font-normal text-stone-400">Hiển thị ở cuối trang (footer). Để trống sẽ dùng văn bản mặc định.</span>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
            Script nhúng (Google Tag Manager / Analytics)
            <textarea
              className="min-h-[100px] rounded-xl border border-stone-300 px-3 py-2 font-mono text-xs font-normal"
              value={form.google_header}
              onChange={(event) => setForm((prev) => ({ ...prev, google_header: event.target.value }))}
              placeholder={"// Dán nội dung <script>...</script> hoặc code JS thuần vào đây\n// Sẽ được tự động nhúng vào trang sau khi tải xong"}
              spellCheck={false}
            />
            <span className="text-[11px] font-normal text-stone-400">Script sẽ được inject sau khi trang load (afterInteractive). Hỗ trợ Google Tag Manager, pixel tracking, v.v.</span>
          </label>
        </form>
      </AdminModal>
    </AdminShell>
  );
}
