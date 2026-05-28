import type {
  AdminDraftDetail,
  AdminDraftSummary,
  AdminLoginResponse,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminProfile,
  AdminUserRecord,
  AdminUserUpdate,
  BannerRecord,
  BannerUpsert,
  CategoryRecord,
  CategoryUpsert,
  HeroRecord,
  HeroUpsert,
  MenuRecord,
  MenuUpsert,
  PageRecord,
  PageUpsert,
  PostRecord,
  PostUpsert,
  ProductRecord,
  ProductUpsert,
  ReviewRecord,
  SettingsRecord,
  SettingsUpsert,
} from "./types";

import { resolveApiBase } from "../lib/api-base";

const API_BASE = resolveApiBase();

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  token?: string;
  body?: unknown;
};

type UploadImageResponse = {
  url: string;
};

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      return data.detail.map((item) => JSON.stringify(item)).join("; ");
    }
  } catch {
    // ignore parse errors
  }
  return `Request failed with status ${response.status}`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
}

export async function loginAdmin(username: string, password: string): Promise<AdminLoginResponse> {
  return request<AdminLoginResponse>("/admin/login", {
    method: "POST",
    body: { username, password },
  });
}

export async function getAdminMe(token: string): Promise<AdminProfile> {
  return request<AdminProfile>("/admin/me", { token });
}

export async function listAdminOrders(token: string): Promise<AdminOrderSummary[]> {
  return request<AdminOrderSummary[]>("/admin/orders", { token });
}

export async function getAdminOrder(token: string, orderId: string): Promise<AdminOrderDetail> {
  return request<AdminOrderDetail>(`/admin/orders/${orderId}`, { token });
}

export async function updateAdminOrder(
  token: string,
  orderId: string,
  payload: { status?: string; note?: string }
): Promise<AdminOrderDetail> {
  return request<AdminOrderDetail>(`/admin/orders/${orderId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function downloadAdminOrderArchive(
  token: string,
  orderId: string
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE}/admin/orders/${encodeURIComponent(orderId)}/download`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  let filename = `order-${orderId}.zip`;
  const match = disposition.match(/filename\*?=(?:UTF-8''|\"?)([^\";]+)/i);
  if (match && match[1]) {
    try {
      filename = decodeURIComponent(match[1]);
    } catch {
      filename = match[1];
    }
  }
  return { blob, filename };
}

export async function listAdminDrafts(token: string): Promise<AdminDraftSummary[]> {
  return request<AdminDraftSummary[]>("/admin/drafts", { token });
}

export async function getAdminDraft(token: string, userId: string): Promise<AdminDraftDetail> {
  return request<AdminDraftDetail>(`/admin/drafts/${encodeURIComponent(userId)}`, { token });
}

export async function deleteAdminDraft(token: string, userId: string): Promise<void> {
  await request<void>(`/admin/drafts/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    token,
  });
}

export async function listAdminUsers(token: string): Promise<AdminUserRecord[]> {
  return request<AdminUserRecord[]>("/admin/users", { token });
}

export async function updateAdminUser(
  token: string,
  phone: string,
  payload: AdminUserUpdate
): Promise<AdminUserRecord> {
  return request<AdminUserRecord>(`/admin/users/${encodeURIComponent(phone)}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export async function listMenu(token: string): Promise<MenuRecord[]> {
  return request<MenuRecord[]>("/content/menu", { token });
}

export async function createMenu(token: string, payload: MenuUpsert): Promise<MenuRecord> {
  return request<MenuRecord>("/content/menu", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateMenu(token: string, id: string, payload: MenuUpsert): Promise<MenuRecord> {
  return request<MenuRecord>(`/content/menu/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteMenu(token: string, id: string): Promise<void> {
  await request<{ deleted: boolean; id: string }>(`/content/menu/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function listCategories(token: string): Promise<CategoryRecord[]> {
  return request<CategoryRecord[]>("/content/categories", { token });
}

export async function createCategory(token: string, payload: CategoryUpsert): Promise<CategoryRecord> {
  return request<CategoryRecord>("/content/categories", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateCategory(token: string, id: string, payload: CategoryUpsert): Promise<CategoryRecord> {
  return request<CategoryRecord>(`/content/categories/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteCategory(token: string, id: string): Promise<void> {
  await request<{ deleted: boolean; id: string }>(`/content/categories/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function listHero(token: string): Promise<HeroRecord[]> {
  return request<HeroRecord[]>("/content/hero", { token });
}

export async function createHero(token: string, payload: HeroUpsert): Promise<HeroRecord> {
  return request<HeroRecord>("/content/hero", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateHero(token: string, id: string, payload: HeroUpsert): Promise<HeroRecord> {
  return request<HeroRecord>(`/content/hero/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteHero(token: string, id: string): Promise<void> {
  await request<{ deleted: boolean; id: string }>(`/content/hero/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function listProducts(token: string): Promise<ProductRecord[]> {
  return request<ProductRecord[]>("/content/products", { token });
}

export async function createProduct(token: string, payload: ProductUpsert): Promise<ProductRecord> {
  return request<ProductRecord>("/content/products", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateProduct(token: string, id: string, payload: ProductUpsert): Promise<ProductRecord> {
  return request<ProductRecord>(`/content/products/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteProduct(token: string, id: string): Promise<void> {
  await request<{ deleted: boolean; id: string }>(`/content/products/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function listPages(token: string): Promise<PageRecord[]> {
  return request<PageRecord[]>("/content/pages", { token });
}

export async function createPage(token: string, payload: PageUpsert): Promise<PageRecord> {
  return request<PageRecord>("/content/pages", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updatePage(token: string, id: string, payload: PageUpsert): Promise<PageRecord> {
  return request<PageRecord>(`/content/pages/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deletePage(token: string, id: string): Promise<void> {
  await request<{ deleted: boolean; id: string }>(`/content/pages/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function listBanners(token: string): Promise<BannerRecord[]> {
  return request<BannerRecord[]>("/content/banners", { token });
}

export async function createBanner(token: string, payload: BannerUpsert): Promise<BannerRecord> {
  return request<BannerRecord>("/content/banners", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateBanner(token: string, id: string, payload: BannerUpsert): Promise<BannerRecord> {
  return request<BannerRecord>(`/content/banners/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteBanner(token: string, id: string): Promise<void> {
  await request<{ deleted: boolean; id: string }>(`/content/banners/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function uploadImage(token: string, file: File, purpose?: string): Promise<UploadImageResponse> {
  const response = await fetch(`${API_BASE}/content/uploads/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": file.name,
      ...(purpose ? { "X-Image-Purpose": purpose } : {}),
    },
    body: file,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as UploadImageResponse;
}

export async function getSettings(token: string): Promise<SettingsRecord | null> {
  const response = await fetch(`${API_BASE}/content/settings`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as SettingsRecord;
}

export async function upsertSettings(token: string, payload: SettingsUpsert): Promise<SettingsRecord> {
  return request<SettingsRecord>("/content/settings", {
    method: "PUT",
    token,
    body: payload,
  });
}

// ── Posts ────────────────────────────────────────────────────────────────────

export async function listPosts(token: string): Promise<PostRecord[]> {
  return request<PostRecord[]>("/content/posts", { token });
}

export async function createPost(token: string, payload: PostUpsert): Promise<PostRecord> {
  return request<PostRecord>("/content/posts", { method: "POST", token, body: payload });
}

export async function updatePost(token: string, id: string, payload: PostUpsert): Promise<PostRecord> {
  return request<PostRecord>(`/content/posts/${id}`, { method: "PUT", token, body: payload });
}

export async function deletePost(token: string, id: string): Promise<void> {
  await request<void>(`/content/posts/${id}`, { method: "DELETE", token });
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export async function createReview(
  token: string,
  payload: { product_slug: string; rating: number; body: string; reviewer_name: string }
): Promise<ReviewRecord> {
  return request<ReviewRecord>("/content/reviews", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function listReviews(
  token: string,
  opts?: { product_slug?: string; is_approved?: boolean }
): Promise<ReviewRecord[]> {
  const params = new URLSearchParams();
  if (opts?.product_slug) params.set("product_slug", opts.product_slug);
  if (opts?.is_approved !== undefined) params.set("is_approved", String(opts.is_approved));
  const qs = params.toString();
  return request<ReviewRecord[]>(`/content/reviews${qs ? `?${qs}` : ""}`, { token });
}

export async function approveReview(token: string, id: string, approved: boolean): Promise<ReviewRecord> {
  return request<ReviewRecord>(`/content/reviews/${id}/approve?approved=${String(approved)}`, {
    method: "PATCH",
    token,
  });
}

export async function deleteReview(token: string, id: string): Promise<void> {
  await request<void>(`/content/reviews/${id}`, { method: "DELETE", token });
}
