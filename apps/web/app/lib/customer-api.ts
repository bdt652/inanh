import { resolveApiBase } from "./api-base";

const API_BASE = resolveApiBase();

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_at: number;
  phone_verified: boolean;
  debug_otp?: string;
};

type UploadSessionResponse = {
  session_id: string;
  expires_at: number;
  max_files: number;
  max_bytes: number;
  require_verified_phone: boolean;
};

export type UserProfile = {
  phone: string;
  email?: string | null;
  phone_verified: boolean;
};

export type OrderProductPayload = {
  name: string;
  quantity: number;
  notes?: string;
  images?: string[];
  options?: string[];
  selected_product_slug?: string;
};

export type OrderSummary = {
  order_id: string;
  status: string;
  total_products: number;
  total_images: number;
  updated_at: number;
};

export type OrderDetail = OrderSummary & {
  created_at: number;
  note?: string | null;
  products: (OrderProductPayload & { id: string; images: string[] })[];
};

type PresignRequestFile = {
  filename: string;
  size?: number;
  content_type?: string;
};

type PresignResponseItem = {
  key: string;
  url: string;
  expires_at: number;
  content_type?: string | null;
};

type UploadSummary = {
  session_id: string;
  total_keys: number;
  valid_images: number;
  rejected: number;
  total_bytes: number;
};

export type UploadDirectResponse = {
  key: string;
  size: number;
  content_type?: string | null;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...options, cache: "no-store" });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { detail?: unknown };
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

async function requestWithAuth<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined),
  };
  return request<T>(path, { ...options, headers });
}

export async function registerUser(phone: string, password: string, email?: string): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, email }),
  });
}

export async function loginUser(phone: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
}

export async function loginGoogle(idToken: string, phone?: string): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken, phone }),
  });
}

export type OrderCreatePayload = {
  products: OrderProductPayload[];
  status?: string;
  note?: string;
};

export type OrderUpdatePayload = {
  products?: OrderProductPayload[];
  status?: string;
  note?: string;
};

export async function requestOtp(token: string): Promise<{ sent: boolean; debug_otp?: string | null }> {
  return requestWithAuth<{ sent: boolean; debug_otp?: string | null }>("/auth/request-otp", token, {
    method: "POST",
  });
}

export async function getProfile(token: string): Promise<UserProfile> {
  return requestWithAuth<UserProfile>("/auth/me", token, { method: "GET" });
}

export async function getMyOrders(token: string): Promise<OrderSummary[]> {
  return requestWithAuth<OrderSummary[]>("/orders/my", token, { method: "GET" });
}

export async function getOrderDetail(token: string, orderId: string): Promise<OrderDetail> {
  return requestWithAuth<OrderDetail>(`/orders/${orderId}`, token, { method: "GET" });
}

export async function createOrder(token: string, payload: OrderCreatePayload): Promise<OrderDetail> {
  return requestWithAuth<OrderDetail>("/orders", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateOrder(token: string, orderId: string, payload: OrderUpdatePayload): Promise<OrderDetail> {
  return requestWithAuth<OrderDetail>(`/orders/${orderId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function createUploadSession(
  token: string,
  totalFiles: number,
  totalBytes?: number
): Promise<UploadSessionResponse> {
  return requestWithAuth<UploadSessionResponse>("/uploads/sessions", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ total_files: totalFiles, total_bytes: totalBytes }),
  });
}

export async function presignBatch(
  token: string,
  sessionId: string,
  files: PresignRequestFile[]
): Promise<PresignResponseItem[]> {
  return requestWithAuth<PresignResponseItem[]>(`/uploads/sessions/${sessionId}/presigned`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });
}

export async function uploadDirectFile(
  token: string,
  sessionId: string,
  file: File
): Promise<UploadDirectResponse> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  return requestWithAuth<UploadDirectResponse>(`/uploads/sessions/${sessionId}/direct`, token, {
    method: "POST",
    body: formData,
  });
}

export async function completeBatch(token: string, sessionId: string, keys: string[]): Promise<UploadSummary> {
  return requestWithAuth<UploadSummary>(`/uploads/sessions/${sessionId}/complete-batch`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys }),
  });
}

export async function finalizeSession(token: string, sessionId: string): Promise<UploadSummary> {
  return requestWithAuth<UploadSummary>(`/uploads/sessions/${sessionId}/finalize`, token, {
    method: "POST",
  });
}

export async function verifyPhone(token: string, code: string): Promise<UserProfile> {
  return requestWithAuth<UserProfile>("/auth/verify-phone", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export type CartDraftProductPreview = {
  id: string;
  name: string;
  key: string;
  size?: number;
  status?: string;
};

export type CartDraftProductPayload = {
  name: string;
  notes?: string;
  price_per_image: number;
  selected_product_slug?: string;
  selected_options: string[];
  previews: CartDraftProductPreview[];
};

export type CartDraftPayload = {
  products: CartDraftProductPayload[];
  note?: string;
};

export type CartDraftResponse = CartDraftPayload & {
  saved_at: number;
};

export async function saveCartDraft(token: string, payload: CartDraftPayload): Promise<CartDraftResponse> {
  return requestWithAuth<CartDraftResponse>("/orders/drafts", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getCartDraft(token: string): Promise<CartDraftResponse> {
  return requestWithAuth<CartDraftResponse>("/orders/drafts", token, {
    method: "GET",
  });
}

export async function clearCartDraft(token: string): Promise<void> {
  return requestWithAuth("/orders/drafts", token, {
    method: "DELETE",
  });
}
