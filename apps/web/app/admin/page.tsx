"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import AdminShell from "./AdminShell";
import { getAdminMe, loginAdmin } from "./api";
import { useAdminToken } from "./useAdminToken";

const MODULE_LINKS = [
  { href: "/admin/pages", label: "Pages", description: "Quan ly trang dong, SEO va noi dung website." },
  { href: "/admin/menu", label: "Menu", description: "Quan ly thanh dieu huong." },
  { href: "/admin/categories", label: "Danh muc", description: "Quan ly danh muc va hinh anh." },
  { href: "/admin/products", label: "San pham", description: "CRUD san pham, gia sale, upload va hien thi." },
  { href: "/admin/hero", label: "Hero", description: "Quan ly noi dung hero section." },
  { href: "/admin/banners", label: "Banner", description: "Quan ly slider/banner trang chu." },
  { href: "/admin/settings", label: "Cai dat", description: "Logo, footer, title, dia chi, hotline, email." },
];

export default function AdminPage() {
  const { token, setToken, logout } = useAdminToken();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getAdminMe(token)
      .then((profile) => setAdminName(profile.username))
      .catch((err) => setError(err instanceof Error ? err.message : "Phien dang nhap da het han."));
  }, [token]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Ten dang nhap va mat khau la bat buoc.");
      return;
    }
    setLoading(true);
    try {
      const response = await loginAdmin(username.trim(), password);
      setToken(response.access_token);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dang nhap that bai.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold text-stone-900">Dang nhap quan tri</h1>
          <form className="mt-4 space-y-3" onSubmit={handleLogin}>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Ten dang nhap
              <input
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Mat khau
              <input
                type="password"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white" disabled={loading}>
              Dang nhap
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      title="Tong quan quan tri"
      subtitle={`Xin chao ${adminName || "admin"}. Chon module ben trai de thao tac.`}
      onLogout={logout}
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
          >
            <p className="text-lg font-semibold text-stone-900">{item.label}</p>
            <p className="mt-2 text-sm text-stone-500">{item.description}</p>
          </Link>
        ))}
      </section>
    </AdminShell>
  );
}
