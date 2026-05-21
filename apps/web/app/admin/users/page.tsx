"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import { listAdminUsers, updateAdminUser } from "../api";
import type { AdminUserRecord, AdminUserUpdate } from "../types";
import { useAdminToken } from "../useAdminToken";
import { useToastMessages } from "../../components/ToastProvider";

const formatTime = (value: number) => new Date(value * 1000).toLocaleString("vi-VN");

const EMPTY_FORM: AdminUserUpdate = {
  email: "",
  phone_verified: false,
  is_active: true,
};

export default function AdminUsersPage() {
  const { token, logout } = useAdminToken();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [form, setForm] = useState<AdminUserUpdate>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  useToastMessages({ error, notice, setError, setNotice });

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await listAdminUsers(token);
      setUsers(data);
      if (data.length && !selectedPhone) {
        setSelectedPhone(data[0].phone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được users.");
    } finally {
      setLoading(false);
    }
  }, [token, selectedPhone]);

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token, loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      if (verifiedFilter === "verified" && !user.phone_verified) return false;
      if (verifiedFilter === "unverified" && user.phone_verified) return false;
      if (activeFilter === "active" && !user.is_active) return false;
      if (activeFilter === "inactive" && user.is_active) return false;
      if (!keyword) return true;
      const email = user.email ?? "";
      return user.phone.toLowerCase().includes(keyword) || email.toLowerCase().includes(keyword);
    });
  }, [users, searchTerm, verifiedFilter, activeFilter]);

  useEffect(() => {
    if (selectedPhone && filteredUsers.some((user) => user.phone === selectedPhone)) {
      return;
    }
    if (filteredUsers.length) {
      setSelectedPhone(filteredUsers[0].phone);
    } else {
      setSelectedPhone(null);
    }
  }, [filteredUsers, selectedPhone]);

  const verifiedCount = useMemo(() => users.filter((user) => user.phone_verified).length, [users]);
  const activeCount = useMemo(() => users.filter((user) => user.is_active).length, [users]);

  const selectedUser = useMemo(
    () => users.find((user) => user.phone === selectedPhone) ?? null,
    [users, selectedPhone]
  );

  useEffect(() => {
    if (!selectedUser) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      email: selectedUser.email ?? "",
      phone_verified: selectedUser.phone_verified,
      is_active: selectedUser.is_active,
    });
  }, [selectedUser]);

  const handleSave = async () => {
    if (!token || !selectedUser) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload: AdminUserUpdate = {
        email: form.email?.trim() ? form.email.trim() : null,
        phone_verified: form.phone_verified,
        is_active: form.is_active,
      };
      const updated = await updateAdminUser(token, selectedUser.phone, payload);
      setUsers((prev) =>
        prev.map((item) => (item.phone === updated.phone ? updated : item))
      );
      setNotice("Đã cập nhật user.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Quan tri user"
      subtitle="Theo doi va cap nhat thong tin tai khoan."
      onLogout={logout}
      actions={
        <button
          type="button"
          onClick={loadUsers}
          className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Danh sách user</p>
          <div className="mt-3 grid gap-2">
            <input
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
              placeholder="Tim so dien thoai hoac email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                value={verifiedFilter}
                onChange={(event) => setVerifiedFilter(event.target.value)}
              >
                <option value="all">Tất cả xác thực</option>
                <option value="verified">Đã xác thực</option>
                <option value="unverified">Chưa xác thực</option>
              </select>
              <select
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Bị khóa</option>
              </select>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
              {filteredUsers.length} user - {verifiedCount} xác thực - {activeCount} đang hoạt động
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {filteredUsers.map((user) => {
              const active = user.phone === selectedPhone;
              return (
                <button
                  key={user.phone}
                  type="button"
                  onClick={() => setSelectedPhone(user.phone)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-stone-200 bg-white text-stone-700 hover:border-emerald-200"
                  }`}
                >
                  <p className="font-semibold text-stone-900">{user.phone}</p>
                  <p className="text-xs text-stone-500">{user.email || "Chưa có email"}</p>
                  <p className="text-xs text-stone-400">
                    {user.phone_verified ? "Đã xác thực" : "Chưa xác thực"} - {user.is_active ? "Đang hoạt động" : "Bị khóa"}
                  </p>
                  <p className="text-xs text-stone-400">Tạo lúc: {formatTime(user.created_at)}</p>
                </button>
              );
            })}
            {!filteredUsers.length && !loading && <p className="text-sm text-stone-500">Chưa có user.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          {selectedUser ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Chi tiết user</p>
                  <h2 className="text-lg font-semibold text-stone-900">{selectedUser.phone}</h2>
                  <p className="text-xs text-stone-500">Tạo lúc: {formatTime(selectedUser.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-stone-700 md:col-span-2">
                  Email
                  <input
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    value={form.email ?? ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="email"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={!!form.phone_verified}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone_verified: event.target.checked }))}
                  />
                  Đã xác thực số điện thoại
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  Đang hoạt động
                </label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-500">Chon user de xem chi tiet.</p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
