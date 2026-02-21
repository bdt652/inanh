"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  OrderCreatePayload,
  OrderProductPayload,
  completeBatch,
  createOrder,
  createUploadSession,
  presignBatch,
  uploadDirectFile,
  CartDraftPayload,
  CartDraftResponse,
  clearCartDraft,
  getCartDraft,
  saveCartDraft,
} from "../../lib/customer-api";
import { getAllProducts, getSiteSettings } from "../../lib/api";
import type { ProductCard, SiteSetting } from "../../lib/content";
import { useCustomerToken } from "../../lib/use-customer-token";
import MassPhotoGallery from "./components/MassPhotoGallery";
import { resolveUploadsBase } from "../../lib/api-base";

const PRICE_DEFAULT = 2500;
const ZALO_URL = "https://zalo.me/0877226644";
const UPLOADS_BASE = resolveUploadsBase();
const LOCAL_DRAFT_KEY = "inanh24h-cart-draft";
const UPLOAD_MODE = (process.env.NEXT_PUBLIC_UPLOAD_MODE ?? "direct").toLowerCase();
const USE_DIRECT_UPLOAD = UPLOAD_MODE === "direct";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const parseCurrency = (raw: string): number => {
  if (!raw) return 0;
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
};

const createPreviewId = () => {
  const cryptoGlobal = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoGlobal && "randomUUID" in cryptoGlobal) {
    return (cryptoGlobal as Crypto).randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

type FilePreview = {
  id: string;
  name: string;
  url: string;
  size?: number;
  status?: "uploading" | "ready" | "duplicate" | "error";
  key?: string;
  uploadError?: string;
};

type DraftProductPreview = {
  id: string;
  name: string;
  key: string;
  size?: number;
  status?: "ready" | "duplicate";
};

type DraftProduct = {
  name: string;
  notes?: string;
  pricePerImage: number;
  selectedProductSlug?: string;
  selectedOptions: string[];
  previews: DraftProductPreview[];
};

type CartDraft = {
  savedAt: number;
  products: DraftProduct[];
  note?: string;
};

type UploadTask = {
  file: File;
  previewId: string;
};

type ProductFormState = {
  name: string;
  notes: string;
  pricePerImage: number;
  selectedProductSlug?: string;
  filePreviews: FilePreview[];
  duplicateNotice?: string;
  selectedOptions: string[];
};

const createEmptyProduct = (): ProductFormState => ({
  name: "",
  notes: "",
  pricePerImage: PRICE_DEFAULT,
  filePreviews: [],
  selectedOptions: [],
});

const disposePreviews = (previews: FilePreview[]) => {
  previews.forEach((preview) => URL.revokeObjectURL(preview.url));
};

const countReadyImages = (product: ProductFormState) =>
  product.filePreviews.filter((preview) => Boolean(preview.key)).length;

const formatImageLimitShort = (min: number | null, max: number | null): string | null => {
  if (!min && !max) return null;
  if (min && max) return `t\u1ed1i thi\u1ec3u ${min}, t\u1ed1i \u0111a ${max}`;
  if (min) return `t\u1ed1i thi\u1ec3u ${min}`;
  return `t\u1ed1i \u0111a ${max}`;
};

const formatImageLimit = (min: number | null, max: number | null): string | null => {
  const short = formatImageLimitShort(min, max);
  return short ? `Gi\u1edbi h\u1ea1n \u1ea3nh: ${short}.` : null;
};

const buildDraftPayload = (products: ProductFormState[], noteValue: string): CartDraft | null => {
  const entries: DraftProduct[] = products
    .map((product) => {
      const serializedPreviews = product.filePreviews
        .filter((preview): preview is FilePreview & { key: string } => Boolean(preview.key))
        .map((preview) => ({
          id: preview.id,
          name: preview.name,
          key: preview.key!,
          size: preview.size,
          status: preview.status === "duplicate" ? "duplicate" : "ready",
        }));
      if (!serializedPreviews.length) {
        return null;
      }
      return {
        name: product.name,
        notes: product.notes?.trim() || undefined,
        pricePerImage: product.pricePerImage,
        selectedProductSlug: product.selectedProductSlug,
        selectedOptions: product.selectedOptions,
        previews: serializedPreviews,
      };
    })
    .filter((entry): entry is DraftProduct => entry !== null);
  if (!entries.length) {
    return null;
  }
  return {
    savedAt: Date.now(),
    products: entries,
    note: noteValue.trim() || undefined,
  };
};

const reconstructFilePreviews = (previews: DraftProductPreview[]): FilePreview[] =>
  previews.map((preview) => ({
    id: preview.id,
    name: preview.name,
    size: preview.size,
    status: preview.status,
    key: preview.key,
    url: `${UPLOADS_BASE}/${preview.key}`,
  }));

const persistLocalDraft = (draft: CartDraft) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore write errors
  }
};

const loadLocalDraft = (): CartDraft | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as CartDraft;
  } catch {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    return null;
  }
};

const mapDraftToApiPayload = (draft: CartDraft): CartDraftPayload => ({
  note: draft.note,
  products: draft.products.map((product) => ({
    name: product.name,
    notes: product.notes,
    price_per_image: product.pricePerImage,
    selected_product_slug: product.selectedProductSlug,
    selected_options: product.selectedOptions,
    previews: product.previews.map((preview) => ({
      id: preview.id,
      name: preview.name,
      key: preview.key,
      size: preview.size,
      status: preview.status,
    })),
  })),
});

const normalizeServerDraft = (response: CartDraftResponse): CartDraft => ({
  savedAt: response.saved_at * 1000,
  note: response.note,
  products: response.products.map((product) => ({
    name: product.name,
    notes: product.notes,
    pricePerImage: product.price_per_image,
    selectedProductSlug: product.selected_product_slug,
    selectedOptions: product.selected_options,
    previews: product.previews.map((preview) => ({
      id: preview.id,
      name: preview.name,
      key: preview.key,
      size: preview.size,
      status: preview.status,
    })),
  })),
});

export default function CartPage() {
  const token = useCustomerToken();
  const [products, setProducts] = useState<ProductFormState[]>([createEmptyProduct()]);
  const [productOptions, setProductOptions] = useState<ProductCard[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productFetchError, setProductFetchError] = useState("");
  const [siteSettings, setSiteSettings] = useState<SiteSetting | null>(null);
  const [settingsError, setSettingsError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const previewsRef = useRef<ProductFormState["filePreviews"][]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const isMountedRef = useRef(true);
  const [autoSaving, setAutoSaving] = useState(false);

  const safeSetError = useCallback((message: string) => {
    if (isMountedRef.current) {
      setError(message);
    }
  }, []);

  const safeSetNotice = useCallback((message: string) => {
    if (isMountedRef.current) {
      setNotice(message);
    }
  }, []);

  const applyDraftData = useCallback((draft: CartDraft) => {
    const nextProducts = draft.products.map((product) => ({
      name: product.name,
      notes: product.notes ?? "",
      pricePerImage: product.pricePerImage,
      selectedProductSlug: product.selectedProductSlug,
      selectedOptions: product.selectedOptions,
      filePreviews: reconstructFilePreviews(product.previews),
    }));
    setProducts(nextProducts.length ? nextProducts : [createEmptyProduct()]);
    setNote(draft.note ?? "");
    setDraftSavedAt(draft.savedAt);
  }, []);

  const loadDraftFromServer = useCallback(async () => {
    if (!token) return false;
    try {
      const draft = await getCartDraft(token);
      applyDraftData(normalizeServerDraft(draft));
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return false;
      }
      const message = err instanceof Error ? err.message : "Không thể tải nháp từ máy chủ.";
      safeSetError(message);
      return false;
    }
  }, [token, applyDraftData, safeSetError]);

  const persistDraft = useCallback(async () => {
    if (!isMountedRef.current) return false;
    const draft = buildDraftPayload(products, note);
    if (!draft) {
      return false;
    }
    if (!token) {
      persistLocalDraft(draft);
      setDraftSavedAt(draft.savedAt);
      return true;
    }
    setAutoSaving(true);
    try {
      const payload = mapDraftToApiPayload(draft);
      const saved = await saveCartDraft(token, payload);
      setDraftSavedAt(saved.saved_at * 1000);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu nháp.";
      safeSetError(message);
      persistLocalDraft(draft);
      return false;
    } finally {
      setAutoSaving(false);
    }
  }, [products, note, token, safeSetError]);

  useEffect(() => {
    previewsRef.current = products.map((product) => product.filePreviews);
  }, [products]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadProducts = async () => {
      setLoadingProducts(true);
      setProductFetchError("");
      try {
        const items = await getAllProducts(30);
        if (mounted) {
          setProductOptions(items);
        }
      } catch (err) {
        if (mounted) {
          setProductFetchError(err instanceof Error ? err.message : "Không thể tải danh sách sản phẩm.");
        }
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    };
    loadProducts();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getSiteSettings()
      .then((settings) => {
        if (mounted) setSiteSettings(settings);
      })
      .catch((err) => {
        if (!mounted) return;
        if (err instanceof Error && /404/.test(err.message)) return;
        setSettingsError(err instanceof Error ? err.message : "Khong tai duoc cai dat.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (token) {
      void loadDraftFromServer();
    } else {
      const local = loadLocalDraft();
      if (local) {
        applyDraftData(local);
      }
    }
  }, [token, loadDraftFromServer, applyDraftData]);

  useEffect(() => {
    return () => {
      previewsRef.current.flat().forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [products, note, persistDraft]);

  const handleProductSelect = (index: number, slug: string) => {
    const trimmed = slug.trim();
    const selected = trimmed
      ? productOptions.find((option) => option.slug === trimmed || option.id === trimmed)
      : undefined;
    setProducts((current) =>
      current.map((entry, idx) => {
        if (idx !== index) return entry;
        return {
          ...entry,
          selectedProductSlug: trimmed || undefined,
          name: selected?.title || (trimmed ? entry.name : ""),
          pricePerImage: selected
            ? parseCurrency(selected.current_price) || entry.pricePerImage
            : trimmed
              ? entry.pricePerImage
              : PRICE_DEFAULT,
          selectedOptions: [],
        };
      })
    );
  };

const handleToggleOption = (index: number, option: string) => {
  setProducts((current) =>
    current.map((entry, idx) => {
      if (idx !== index) return entry;
      const hasOption = entry.selectedOptions[0] === option;
      const nextOptions = hasOption ? [] : [option];
      return {
        ...entry,
        selectedOptions: nextOptions,
      };
    })
  );
};

const updatePreviewFields = (
  index: number,
  previewId: string,
  patch: Partial<FilePreview>
) => {
  if (!isMountedRef.current) return;
  setProducts((current) =>
    current.map((entry, idx) => {
      if (idx !== index) return entry;
      return {
        ...entry,
        filePreviews: entry.filePreviews.map((preview) =>
          preview.id === previewId ? { ...preview, ...patch } : preview
        ),
      };
    })
  );
};

const toApiMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return "Kho lưu trữ ảnh (MinIO) chưa sẵn sàng. Vui lòng chạy docker compose up -d hoặc kiểm tra cấu hình.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    const message = error.message || "";
    if (/failed to fetch|fetch failed|networkerror|network error/i.test(message)) {
      return "Không thể kết nối API. Vui lòng kiểm tra backend đang chạy tại http://localhost:8000.";
    }
    return error.message;
  }
  return "Không thể tải ảnh lúc này.";
};

const prepareUploadBatch = (existing: FilePreview[], files: File[]) => {
  const existingNames = new Set(existing.map((preview) => preview.name.toLowerCase()));
  const newPreviews: FilePreview[] = [];
  const duplicateNames = new Set<string>();
  const tasks: UploadTask[] = [];

  for (const file of Array.from(files)) {
    const normalizedName = file.name.trim() || file.name;
    const key = normalizedName.toLowerCase();
    const isDuplicate = existingNames.has(key);
    existingNames.add(key);
    const previewId = createPreviewId();
    newPreviews.push({
      id: previewId,
      name: normalizedName,
      url: URL.createObjectURL(file),
      size: file.size,
      status: isDuplicate ? "duplicate" : "uploading",
    });
    if (isDuplicate) {
      duplicateNames.add(normalizedName);
    } else {
      tasks.push({ file, previewId });
    }
  }

  return {
    newPreviews,
    duplicateNotice: duplicateNames.size ? `Trùng: ${[...duplicateNames].join(", ")}` : undefined,
    tasks,
  };
};

const uploadFilesForProduct = async (index: number, tasks: UploadTask[]) => {
  const activeToken = token;
  if (!activeToken) {
    const message = "Vui lòng đăng nhập để tải ảnh.";
    safeSetError(message);
    tasks.forEach(({ previewId }) =>
      updatePreviewFields(index, previewId, { status: "error", uploadError: message })
    );
    return;
  }

  const totalBytes = tasks.reduce((sum, task) => sum + (task.file.size || 0), 0);
  let sessionId: string | null = null;

  try {
    const session = await createUploadSession(activeToken, tasks.length, totalBytes);
    sessionId = session.session_id;
    let uploadResults: PromiseSettledResult<string>[];
    if (USE_DIRECT_UPLOAD) {
      uploadResults = [];
      for (const task of tasks) {
        try {
          const response = await uploadDirectFile(activeToken, session.session_id, task.file);
          uploadResults.push({ status: "fulfilled", value: response.key });
        } catch (err) {
          uploadResults.push({ status: "rejected", reason: err });
        }
      }
    } else {
      const presigned = await presignBatch(
        activeToken,
        session.session_id,
        tasks.map((task) => ({
          filename: task.file.name,
          size: task.file.size,
          content_type: task.file.type || undefined,
        }))
      );

      uploadResults = await Promise.allSettled(
        tasks.map((task, idx) =>
          fetch(presigned[idx].url, {
            method: "PUT",
            headers: {
              "Content-Type":
                presigned[idx].content_type || task.file.type || "application/octet-stream",
            },
            body: task.file,
          }).then(() => presigned[idx].key)
        )
      );
    }

    const successfulKeys: string[] = [];
    uploadResults.forEach((result, idx) => {
      const previewId = tasks[idx].previewId;
      if (result.status === "fulfilled") {
        const key = result.value;
        const publicUrl = `${UPLOADS_BASE}/${key}`;
        successfulKeys.push(key);
        updatePreviewFields(index, previewId, { status: "ready", key, uploadError: undefined, url: publicUrl });
      } else {
        const message = toApiMessage(result.reason);
        updatePreviewFields(index, previewId, { status: "error", uploadError: message });
      }
    });

    if (successfulKeys.length && sessionId) {
      try {
        await completeBatch(activeToken, sessionId, successfulKeys);
      } catch (completionError) {
        const message = toApiMessage(completionError);
        safeSetError(message);
      }
      safeSetNotice(`Đã tải ${successfulKeys.length} ảnh (mã phiên ${sessionId}).`);
    }
  } catch (err) {
    const message = toApiMessage(err);
    safeSetError(message);
    tasks.forEach(({ previewId }) =>
      updatePreviewFields(index, previewId, { status: "error", uploadError: message })
    );
  }
};

const handleFileUpload = (index: number, files: File[]) => {
  if (!files || files.length === 0) return;
  const existing = previewsRef.current[index] ?? products[index]?.filePreviews ?? [];
  const selectedSlug = products[index]?.selectedProductSlug;
  const selectedProduct = productOptions.find(
    (option) => option.slug === selectedSlug || option.id === selectedSlug
  );
  const maxPerProduct = selectedProduct?.max_images ?? null;
  if (maxPerProduct && existing.length >= maxPerProduct) {
    safeSetError(`San pham da dat toi da ${maxPerProduct} anh.`);
    return;
  }

  let candidateFiles = files;
  if (maxPerProduct) {
    const remaining = Math.max(maxPerProduct - existing.length, 0);
    if (remaining <= 0) {
      safeSetError(`San pham da dat toi da ${maxPerProduct} anh.`);
      return;
    }
    if (files.length > remaining) {
      candidateFiles = files.slice(0, remaining);
      safeSetNotice(`Chi tai ${remaining} anh de phu hop gioi han.`);
    }
  }

  const { newPreviews, duplicateNotice, tasks } = prepareUploadBatch(existing, candidateFiles);
  setProducts((current) =>
    current.map((entry, idx) => {
      if (idx !== index) return entry;
      return {
        ...entry,
        duplicateNotice,
        filePreviews: [...entry.filePreviews, ...newPreviews],
      };
    })
  );
  if (tasks.length) {
    void uploadFilesForProduct(index, tasks);
  }
};
const handleRemovePreview = (index: number, id: string) => {
  setProducts((current) =>
    current.map((entry, idx) => {
      if (idx !== index) return entry;
      const nextPreviews = entry.filePreviews.filter((preview) => {
        if (preview.id === id) {
          URL.revokeObjectURL(preview.url);
          return false;
        }
        return true;
      });
      return { ...entry, filePreviews: nextPreviews };
    })
  );
};

  const addProduct = useCallback(() => {
    setProducts((current) => [...current, createEmptyProduct()]);
  }, []);

  const removeProduct = useCallback(
    (index: number) => {
      setProducts((current) => {
        if (current.length === 1) {
          return current;
        }
        const next = current.filter((_, idx) => idx !== index);
        const removed = current[index];
        if (removed) {
          disposePreviews(removed.filePreviews);
        }
        return next.length ? next : [createEmptyProduct()];
      });
    },
    []
  );

  const resetForm = useCallback(() => {
    previewsRef.current.forEach((previews) => disposePreviews(previews));
    previewsRef.current = [];
    setProducts([createEmptyProduct()]);
    setNote("");
  }, []);

  const handleClearDraft = useCallback(async () => {
    if (token) {
      try {
        await clearCartDraft(token);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không thể xóa nháp từ máy chủ.";
        safeSetError(message);
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    }
    resetForm();
    setDraftSavedAt(null);
    safeSetNotice("Nháp đã được xóa.");
  }, [token, resetForm, safeSetError, safeSetNotice]);

  const buildPayload = (): OrderProductPayload[] => {
    return products
      .map((product) => {
        const trimmedName = product.name.trim();
        const fileKeys = product.filePreviews.map((preview) => preview.key).filter((value): value is string => Boolean(value));
        if (!trimmedName || fileKeys.length === 0) {
          return null;
        }
        const normalizedOptions = Array.from(
          new Set(product.selectedOptions.map((option) => option.trim()).filter((option) => option))
        );
        const optionNote = normalizedOptions.join(", ");
        const combinedNotes = [product.notes.trim(), optionNote].filter(Boolean).join(" | ");
        return {
          name: trimmedName,
          quantity: fileKeys.length,
          notes: combinedNotes || undefined,
          options: normalizedOptions,
          images: fileKeys,
          selected_product_slug: product.selectedProductSlug,
        };
      })
      .filter((entry): entry is OrderProductPayload => entry !== null);
  };

  const orderTotal = useMemo(() => {
    return products.reduce((sum, product) => {
      const readyCount = countReadyImages(product);
      if (!readyCount) return sum;
      return sum + (product.pricePerImage || PRICE_DEFAULT) * readyCount;
    }, 0);
  }, [products]);

  const disallowedProducts = useMemo(() => {
    return products
      .map((product) =>
        productOptions.find((option) => option.slug === product.selectedProductSlug || option.id === product.selectedProductSlug)
      )
      .filter((item) => item && item.allow_online_order === false);
  }, [products, productOptions]);

  const hasDisallowedProducts = disallowedProducts.length > 0;

  const handleCreateOrder = async () => {
    if (!token) {
      setError("Vui lòng đăng nhập để tạo đơn hàng.");
      return;
    }
    const payloadProducts = buildPayload();
    if (!payloadProducts.length) {
      setError("Cần ít nhất một sản phẩm hợp lệ có name và ảnh.");
      return;
    }
    const minFiles = siteSettings?.upload_min_files ?? null;
    const maxFiles = siteSettings?.upload_max_files ?? null;
    const totalImages = payloadProducts.reduce((sum, item) => sum + (item.images?.length ?? 0), 0);
    if (minFiles && totalImages < minFiles) {
      setError(`Can toi thieu ${minFiles} anh de gui don.`);
      return;
    }
    if (maxFiles && totalImages > maxFiles) {
      setError(`Vuot qua toi da ${maxFiles} anh cho phep.`);
      return;
    }
    for (const item of payloadProducts) {
      const selected = productOptions.find(
        (option) => option.slug === item.selected_product_slug || option.id === item.selected_product_slug
      );
      const minPer = selected?.min_images ?? null;
      const maxPer = selected?.max_images ?? null;
      const count = item.images?.length ?? 0;
      if (minPer && count < minPer) {
        setError(`San pham ${item.name} can toi thieu ${minPer} anh.`);
        return;
      }
      if (maxPer && count > maxPer) {
        setError(`San pham ${item.name} vuot qua toi da ${maxPer} anh.`);
        return;
      }
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const payload: OrderCreatePayload = {
        products: payloadProducts,
        note: note.trim() || undefined,
      };
      await createOrder(token, payload);
      setNotice("Đơn hàng đã gửi, kiểm tra trạng thái ở trang Đơn hàng.");
      resetForm();
      if (token) {
        try {
          await clearCartDraft(token);
        } catch {
          // ignore cleanup errors
        }
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOCAL_DRAFT_KEY);
      }
      setDraftSavedAt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn lúc này.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--line,#e5e0d8)] bg-white/90 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">Giỏ hàng</p>
          <h2 className="text-lg font-semibold text-[var(--text-main,#1f1b16)]">Tạo đơn mới upload ảnh</h2>
        </div>
        <div className="text-xs tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
          {formatCurrency(orderTotal)}
        </div>
      </div>

      {!token && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-[var(--text-soft,#4a4034)]">
          Bạn cần{" "}
          <Link href="/dang-nhap" className="font-semibold text-[var(--accent-strong,#8a4d1f)] underline">
            đăng nhập
          </Link>{" "}
          trước khi tạo đơn.
        </div>
      )}

      <div className="mt-6 space-y-5">
        {productFetchError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {productFetchError}
          </p>
        )}
        {settingsError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {settingsError}
          </p>
        )}

        {products.map((product, index) => {
          const readyCount = countReadyImages(product);
          const displayCountText = readyCount
            ? `${readyCount} ảnh`
            : `${product.filePreviews.length} ảnh đang upload`;
          const estimatedTotal = (product.pricePerImage || PRICE_DEFAULT) * readyCount;
          const selectedProduct = product.selectedProductSlug
            ? productOptions.find(
                (option) =>
                  option.slug === product.selectedProductSlug || option.id === product.selectedProductSlug
              )
            : undefined;
          const availableOptions = selectedProduct?.extra_options ?? [];
          const allowOnlineOrder = selectedProduct?.allow_online_order !== false;
          const productMin = selectedProduct?.min_images ?? null;
          const productMax = selectedProduct?.max_images ?? null;
          const productLimitText = formatImageLimit(productMin, productMax);
          return (
            <div key={index} className="space-y-3 rounded-2xl border border-stone-200 bg-[var(--surface-soft,#f7f2ea)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-[var(--text-main,#1f1b16)]">Sản phẩm {index + 1}</p>
                  <p className="text-[0.65rem] tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                    {displayCountText} · {formatCurrency(estimatedTotal || 0)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                  <span>
                    {product.pricePerImage ? formatCurrency(product.pricePerImage) : "Chưa chọn giá"}
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[0.6rem] font-semibold tracking-[0.08em] text-red-600 transition hover:border-red-400 disabled:opacity-40"
                    onClick={() => removeProduct(index)}
                    disabled={products.length === 1}
                  >
                    Xóa sản phẩm
                  </button>
                </div>
              </div>

              <label className="grid gap-1 text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                Chọn danh sách sản phẩm
                <select
                  value={product.selectedProductSlug || ""}
                  onChange={(event) => handleProductSelect(index, event.target.value)}
                  disabled={loadingProducts}
                  className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none disabled:opacity-60"
                >
                  <option value="">Danh sách sản phẩm phổ biến</option>
                  {productOptions.map((option) => {
                    const limitShort = formatImageLimitShort(
                      option.min_images ?? null,
                      option.max_images ?? null
                    );
                    return (
                      <option
                        key={option.slug || option.id}
                        value={option.slug || option.id}
                        disabled={option.allow_online_order === false}
                      >
                        {option.title} - {option.current_price}
                        {limitShort ? ` - ${limitShort}` : ""}
                        {option.allow_online_order === false ? " (Ch\u1ec9 Zalo)" : ""}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="space-y-1 text-[0.75rem] tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                <p>{product.name || "Ch\u01b0a ch\u1ecdn s\u1ea3n ph\u1ea9m"}</p>
                {productLimitText && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--accent-strong,#8a4d1f)] shadow-sm">
                    {productLimitText}
                  </p>
                )}
              </div>
              {!allowOnlineOrder && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {"Sản phẩm này chỉ nhận đặt qua Zalo. Vui lòng nhắn "}
                  <a href={ZALO_URL} target="_blank" rel="noreferrer" className="font-semibold underline">
                    Zalo
                  </a>
                  {" để được hỗ trợ."}
                </div>
              )}

              {availableOptions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold tracking-tight text-[var(--text-soft,#4a4034)]">Tùy chọn in ấn</p>
                  <div className="flex flex-wrap gap-3">
                    {availableOptions.map((option) => {
                      const isActive = product.selectedOptions[0] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleToggleOption(index, option)}
                          role="radio"
                          aria-checked={isActive}
                          className={`min-w-[140px] rounded-2xl border px-4 py-2 text-left text-sm font-medium tracking-tight transition ${
                            isActive
                              ? "border-[var(--accent-strong,#8a4d1f)] bg-[var(--accent-strong,#8a4d1f)]/10 text-[var(--text-main,#1f1b16)] shadow-inner"
                              : "border-stone-200 bg-white text-[var(--text-soft,#4a4034)] hover:border-[var(--accent,#b46a2f)]"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {product.selectedOptions.length > 0 && (
                    <p className="text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                      Đã chọn: {product.selectedOptions[0]}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-soft,#4a4034)]">
                  {selectedProduct
                    ? "Sản phẩm này chưa có tùy chọn in ấn."
                    : "Chọn sản phẩm để xem tùy chọn in ấn."}
                </p>
              )}

              {allowOnlineOrder && (
              <MassPhotoGallery
                title={product.name || `Sản phẩm ${index + 1}`}
                summary="Ảnh gốc lưu nguyên, hệ thống nhận diện trùng tên để bạn kiểm soát."
                photos={product.filePreviews}
                onAddFiles={(files) => handleFileUpload(index, files)}
                onRemovePhoto={(photoId) => handleRemovePreview(index, photoId)}
              />
              )}
              {allowOnlineOrder && product.duplicateNotice && (
                <p className="text-[0.65rem] text-orange-600">{product.duplicateNotice}</p>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleClearDraft}
            className="rounded-2xl border border-red-200 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-red-600 hover:border-red-400"
          >
            Xóa nháp
          </button>
          <p className="text-xs text-[var(--text-soft,#4a4034)]">
            {autoSaving
              ? "Đang lưu nháp..."
              : draftSavedAt
                ? `Đã lưu nháp ${new Date(draftSavedAt).toLocaleString("vi-VN")}`
                : "Chưa có nháp"}
          </p>
        </div>
        <button
          type="button"
          onClick={addProduct}
          className="w-full rounded-2xl border border-dashed border-stone-400 px-4 py-2 text-sm font-semibold tracking-[0.08em] text-stone-700"
        >
          Thêm sản phẩm
        </button>

        {hasDisallowedProducts && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {"Một số sản phẩm chỉ nhận đặt qua Zalo. Vui lòng nhắn "}
            <a href={ZALO_URL} target="_blank" rel="noreferrer" className="font-semibold underline">
              Zalo
            </a>
            {" để được hỗ trợ, hoặc chọn sản phẩm khác để đặt online."}
          </div>
        )}


        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Ghi chú chung
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={handleCreateOrder}
          disabled={loading || !token || hasDisallowedProducts}
          className="w-full rounded-2xl bg-[var(--accent-strong,#8a4d1f)] px-4 py-3 text-sm font-semibold tracking-[0.08em] text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Đang tạo đơn..." : "Tạo đơn và gửi ảnh"}
        </button>
        

      </div>

      {notice && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
      )}
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
