import type {
  AdminLoginResponse,
  AdminProfile,
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
  ProductRecord,
  ProductUpsert,
  SettingsRecord,
  SettingsUpsert,
} from "./types";

const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ??
  (backendBase ? `${backendBase}/api/v1` : "http://localhost:8000/api/v1")
).replace(/\/+$/, "");

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
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

export async function uploadImage(token: string, file: File): Promise<UploadImageResponse> {
  const response = await fetch(`${API_BASE}/content/uploads/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": file.name,
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
