"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  getProfile,
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
import { resolveFileBase } from "../../lib/api-base";
import { useToast, useToastMessages } from "../../components/ToastProvider";

const PRICE_DEFAULT = 2500;
const ZALO_URL = "https://zalo.me/0877226644";
const FILE_BASE = resolveFileBase(); // Uses MinIO direct URLs if configured, otherwise backend proxy
const LOCAL_DRAFT_KEY = "inanh24h-cart-draft";
const UPLOAD_MODE = (process.env.NEXT_PUBLIC_UPLOAD_MODE ?? "direct").toLowerCase();
const USE_DIRECT_UPLOAD = UPLOAD_MODE === "direct";
const DIRECT_UPLOAD_BATCH_SIZE = 60;
const PRESIGNED_UPLOAD_BATCH_SIZE = 200;
const DIRECT_UPLOAD_CONCURRENCY = 3;
const PRESIGNED_UPLOAD_CONCURRENCY = 6;
const MAX_PREVIEW_BLOBS = 250;
const DUPLICATE_NOTICE_LIMIT = 12;

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
  copies?: number;
};

type DraftProductPreview = {
  id: string;
  name: string;
  key: string;
  size?: number;
  status?: "ready" | "duplicate";
  copies?: number;
};

type DraftProduct = {
  name: string;
  notes?: string;
  pricePerImage: number;
  copiesPerImage: number;
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
  isDuplicate: boolean;
};

type ProductFormState = {
  name: string;
  notes: string;
  pricePerImage: number;
  copiesPerImage: number;
  selectedProductSlug?: string;
  selectedProductInput: string;
  filePreviews: FilePreview[];
  duplicateNotice?: string;
  selectedOptions: string[];
};

type OrderReviewItem = {
  name: string;
  imageCount: number;
  copiesCount: number;
  unitPrice: number;
  subtotal: number;
  optionsLabel?: string;
  pricingMode?: "combo" | "retail";
};

const createEmptyProduct = (): ProductFormState => ({
  name: "",
  notes: "",
  pricePerImage: PRICE_DEFAULT,
  copiesPerImage: 1,
  selectedProductInput: "",
  filePreviews: [],
  selectedOptions: [],
});

const isBlobUrl = (url?: string) => Boolean(url && url.startsWith("blob:"));

const safeRevokeObjectUrl = (url?: string) => {
  if (!url || !url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore revoke failures
  }
};

const disposePreviews = (previews: FilePreview[]) => {
  previews.forEach((preview) => safeRevokeObjectUrl(preview.url));
};

const countReadyImages = (product: ProductFormState) =>
  product.filePreviews.filter((preview) => Boolean(preview.key)).length;

const countReadyCopies = (product: ProductFormState) =>
  product.filePreviews
    .filter((preview) => Boolean(preview.key))
    .reduce((sum, preview) => sum + Math.max(1, Math.round(preview.copies ?? 1)), 0);

const formatImageLimitShort = (min: number | null, max: number | null): string | null => {
  if (!min && !max) return null;
  if (min && max) return `t\u1ed1i thi\u1ec3u ${min}, t\u1ed1i \u0111a ${max}`;
  if (min) return `t\u1ed1i thi\u1ec3u ${min}`;
  return `t\u1ed1i \u0111a ${max}`;
};

const formatImageLimit = (min: number | null, max: number | null, unitLabel = "bản in"): string | null => {
  const short = formatImageLimitShort(min, max);
  return short ? `Gi\u1edbi h\u1ea1n ${unitLabel}: ${short}.` : null;
};

const resolveImageLimits = (
  min: number | null,
  max: number | null,
  pricingMode: "combo" | "retail"
): { min: number | null; max: number | null } => {
  if (pricingMode !== "combo") {
    return { min, max };
  }
  if (min && !max) {
    return { min, max: min };
  }
  if (!min && max) {
    return { min: max, max };
  }
  return { min, max };
};

const resolvePricingMode = (product?: ProductCard) =>
  product?.pricing_mode === "combo" ? "combo" : "retail";

const buildDraftPayload = (products: ProductFormState[], noteValue: string): CartDraft | null => {
  const entries: DraftProduct[] = products.flatMap((product) => {
    const serializedPreviews: DraftProductPreview[] = product.filePreviews
      .filter((preview): preview is FilePreview & { key: string } => Boolean(preview.key))
      .map((preview): DraftProductPreview => ({
        id: preview.id,
        name: preview.name,
        key: preview.key!,
        size: preview.size,
        status: preview.status === "duplicate" ? "duplicate" : "ready",
        copies: preview.copies ?? 1,
      }));
    if (!serializedPreviews.length) {
      return [];
    }
    return [
      {
        name: product.name,
        notes: product.notes?.trim() || undefined,
        pricePerImage: product.pricePerImage,
        copiesPerImage: product.copiesPerImage || 1,
        selectedProductSlug: product.selectedProductSlug,
        selectedOptions: product.selectedOptions,
        previews: serializedPreviews,
      },
    ];
  });
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
    copies: preview.copies ?? 1,
    url: `${FILE_BASE}/${preview.key}`,
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
    copies_per_image: product.copiesPerImage || 1,
    selected_product_slug: product.selectedProductSlug,
    selected_options: product.selectedOptions,
    previews: product.previews.map((preview): DraftProductPreview => ({
      id: preview.id,
      name: preview.name,
      key: preview.key,
      size: preview.size,
      status: preview.status === "duplicate" ? "duplicate" : "ready",
      copies: preview.copies ?? 1,
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
    copiesPerImage: product.copies_per_image ?? 1,
    selectedProductSlug: product.selected_product_slug,
    selectedOptions: product.selected_options,
    previews: product.previews.map((preview): DraftProductPreview => ({
      id: preview.id,
      name: preview.name,
      key: preview.key,
      size: preview.size,
      status: preview.status === "duplicate" ? "duplicate" : "ready",
      copies: preview.copies ?? 1,
    })),
  })),
});

export default function CartPage() {
  const { token } = useCustomerToken();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductFormState[]>([createEmptyProduct()]);
  const [productOptions, setProductOptions] = useState<ProductCard[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productFetchError, setProductFetchError] = useState("");
  const [siteSettings, setSiteSettings] = useState<SiteSetting | null>(null);
  const [settingsError, setSettingsError] = useState("");
  const [note, setNote] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const { pushToast } = useToast();
  useToastMessages({ error, notice, setError, setNotice });
  const previewsRef = useRef<ProductFormState["filePreviews"][]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const isMountedRef = useRef(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<OrderCreatePayload | null>(null);
  const [pendingReview, setPendingReview] = useState<OrderReviewItem[]>([]);
  const appliedPresetRef = useRef(false);
  const presetProductSlug = searchParams?.get("product") ?? searchParams?.get("slug") ?? "";

  useEffect(() => {
    if (!productFetchError) return;
    pushToast({ type: "error", message: productFetchError });
    setProductFetchError("");
  }, [productFetchError, pushToast]);

  useEffect(() => {
    if (!settingsError) return;
    pushToast({ type: "error", message: settingsError });
    setSettingsError("");
  }, [settingsError, pushToast]);

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
      copiesPerImage: product.copiesPerImage || 1,
      selectedProductSlug: product.selectedProductSlug,
      selectedProductInput: product.name,
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
    if (productOptions.length === 0) return;
    setProducts((current) =>
      current.map((entry) => {
        if (entry.selectedProductSlug || !entry.selectedProductInput.trim()) return entry;
        const matchValue = entry.selectedProductInput.trim().toLowerCase();
        const selected = productOptions.find((option) => {
          const title = option.title?.trim().toLowerCase() ?? "";
          return (
            option.slug === entry.selectedProductInput.trim() ||
            option.id === entry.selectedProductInput.trim() ||
            title === matchValue
          );
        });
        if (!selected) return entry;
        const pricingMode = resolvePricingMode(selected);
        const nextPreviews =
          pricingMode === "combo"
            ? entry.filePreviews.map((preview) => ({ ...preview, copies: 1 }))
            : entry.filePreviews;
        return {
          ...entry,
          selectedProductSlug: selected.slug || selected.id,
          name: selected.title || entry.name,
          pricePerImage: parseCurrency(selected.current_price) || entry.pricePerImage,
          selectedOptions: [],
          copiesPerImage: pricingMode === "combo" ? 1 : entry.copiesPerImage,
          filePreviews: nextPreviews,
        };
      })
    );
  }, [productOptions]);

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

  const applyPresetProduct = useCallback(
    (slug: string) => {
      const trimmed = slug.trim();
      if (!trimmed) return;
      const selected = productOptions.find(
        (option) => option.slug === trimmed || option.id === trimmed
      );
      appliedPresetRef.current = true;
      if (!selected) return;

      setProducts((current) => {
        if (current.some((entry) => entry.selectedProductSlug === trimmed)) {
          return current;
        }
        const emptyIndex = current.findIndex(
          (entry) =>
            !entry.selectedProductSlug &&
            !entry.name.trim() &&
            entry.filePreviews.length === 0
        );
        const nextEntry: ProductFormState = {
          ...createEmptyProduct(),
          selectedProductSlug: trimmed,
          selectedProductInput: selected.title || trimmed,
          name: selected.title || "",
          pricePerImage: parseCurrency(selected.current_price) || PRICE_DEFAULT,
          selectedOptions: [],
        };
        if (emptyIndex === -1) {
          return [...current, nextEntry];
        }
        return current.map((entry, idx) => (idx === emptyIndex ? { ...entry, ...nextEntry } : entry));
      });
    },
    [productOptions]
  );

  useEffect(() => {
    if (!presetProductSlug) return;
    if (loadingProducts) return;
    if (appliedPresetRef.current) return;
    if (productOptions.length === 0) return;
    applyPresetProduct(presetProductSlug);
  }, [presetProductSlug, loadingProducts, productOptions, applyPresetProduct]);

  useEffect(() => {
    let mounted = true;
    getSiteSettings()
      .then((settings) => {
        if (mounted) setSiteSettings(settings);
      })
      .catch((err) => {
        if (!mounted) return;
        if (err instanceof Error && /404/.test(err.message)) return;
        setSettingsError(err instanceof Error ? err.message : "Không tải được cài đặt.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    getProfile(token)
      .then((data) => {
        if (!mounted) return;
        setShippingName((current) => current || data.full_name || "");
        setShippingPhone((current) => current || data.phone || "");
        setShippingAddress((current) => current || data.address || "");
      })
      .catch(() => {
        // ignore profile load errors for prefill
      });
    return () => {
      mounted = false;
    };
  }, [token]);

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
      previewsRef.current.flat().forEach((preview) => safeRevokeObjectUrl(preview.url));
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
      ? productOptions.find((option) => {
          const title = option.title?.trim().toLowerCase() ?? "";
          const matchValue = trimmed.toLowerCase();
          return (
            option.slug === trimmed ||
            option.id === trimmed ||
            title === matchValue
          );
        })
      : undefined;
    const pricingMode = resolvePricingMode(selected);
    const resolvedSlug = selected?.slug || selected?.id;
    setProducts((current) =>
      current.map((entry, idx) => {
        if (idx !== index) return entry;
        const nextPreviews =
          pricingMode === "combo"
            ? entry.filePreviews.map((preview) => ({ ...preview, copies: 1 }))
            : entry.filePreviews;
        return {
          ...entry,
          selectedProductInput: selected?.title || slug,
          selectedProductSlug: resolvedSlug,
          name: selected?.title || (trimmed ? slug : ""),
          pricePerImage: selected
            ? parseCurrency(selected.current_price) || entry.pricePerImage
            : trimmed
              ? entry.pricePerImage
              : PRICE_DEFAULT,
          selectedOptions: [],
          copiesPerImage: pricingMode === "combo" ? 1 : entry.copiesPerImage,
          filePreviews: nextPreviews,
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

const updatePreviewBatch = (index: number, updates: Record<string, Partial<FilePreview>>) => {
  if (!isMountedRef.current) return;
  setProducts((current) =>
    current.map((entry, idx) => {
      if (idx !== index) return entry;
      return {
        ...entry,
        filePreviews: entry.filePreviews.map((preview) => {
          const patch = updates[preview.id];
          if (!patch) return preview;
          if (patch.url && patch.url !== preview.url && isBlobUrl(preview.url)) {
            safeRevokeObjectUrl(preview.url);
          }
          return { ...preview, ...patch };
        }),
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
  const existingBlobCount = existing.filter((preview) => isBlobUrl(preview.url)).length;
  let remainingPreviewSlots = Math.max(0, MAX_PREVIEW_BLOBS - existingBlobCount);
  const newPreviews: FilePreview[] = [];
  const duplicateNames = new Set<string>();
  const tasks: UploadTask[] = [];

  for (const file of Array.from(files)) {
    const normalizedName = file.name.trim() || file.name;
    const key = normalizedName.toLowerCase();
    const isDuplicate = existingNames.has(key);
    existingNames.add(key);
    const previewId = createPreviewId();
    const previewUrl = remainingPreviewSlots > 0 ? URL.createObjectURL(file) : "";
    if (remainingPreviewSlots > 0) remainingPreviewSlots -= 1;
    newPreviews.push({
      id: previewId,
      name: normalizedName,
      url: previewUrl,
      size: file.size,
      status: isDuplicate ? "duplicate" : "uploading",
      copies: 1,
    });
    if (isDuplicate) {
      duplicateNames.add(normalizedName);
    }
    tasks.push({ file, previewId, isDuplicate });
  }

  const duplicateList = [...duplicateNames];
  const duplicateNotice = duplicateList.length
    ? `Trùng (${duplicateList.length}): ${duplicateList.slice(0, DUPLICATE_NOTICE_LIMIT).join(", ")}${
        duplicateList.length > DUPLICATE_NOTICE_LIMIT ? "..." : ""
      }`
    : undefined;

  return {
    newPreviews,
    duplicateNotice,
    tasks,
  };
};

const chunkTasks = <T,>(items: T[], size: number) => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

const runWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> => {
  if (!items.length) return [];
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= items.length) break;
      try {
        const value = await worker(items[current], current);
        results[current] = { status: "fulfilled", value };
      } catch (error) {
        results[current] = { status: "rejected", reason: error };
      }
    }
  });

  await Promise.all(runners);
  return results;
};

const uploadFilesForProduct = async (index: number, tasks: UploadTask[]) => {
  const activeToken = token;
  if (!activeToken) {
    const message = "Vui lòng đăng nhập để tải ảnh.";
    safeSetError(message);
    const updates: Record<string, Partial<FilePreview>> = {};
    tasks.forEach(({ previewId }) => {
      updates[previewId] = { status: "error", uploadError: message };
    });
    updatePreviewBatch(index, updates);
    return;
  }

  const totalCount = tasks.length;
  const verificationThreshold = siteSettings?.upload_require_verified_phone_threshold ?? 0;
  const preferPresigned = !USE_DIRECT_UPLOAD || totalCount >= PRESIGNED_UPLOAD_BATCH_SIZE;
  let batchSize = preferPresigned ? PRESIGNED_UPLOAD_BATCH_SIZE : DIRECT_UPLOAD_BATCH_SIZE;
  if (verificationThreshold > 0 && totalCount >= verificationThreshold) {
    batchSize = Math.max(batchSize, verificationThreshold);
  }
  const batches = chunkTasks(tasks, batchSize);
  let uploadedTotal = 0;

  try {
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const batchBytes = batch.reduce((sum, task) => sum + (task.file.size || 0), 0);
      const session = await createUploadSession(activeToken, batch.length, batchBytes);
      let uploadResults: PromiseSettledResult<string>[];

      if (preferPresigned) {
        try {
          const presigned = await presignBatch(
            activeToken,
            session.session_id,
            batch.map((task) => ({
              filename: task.file.name,
              size: task.file.size,
              content_type: task.file.type || undefined,
            }))
          );
          uploadResults = await runWithConcurrency(
            batch,
            PRESIGNED_UPLOAD_CONCURRENCY,
            async (task, idx) => {
              await fetch(presigned[idx].url, {
                method: "PUT",
                headers: {
                  "Content-Type":
                    presigned[idx].content_type || task.file.type || "application/octet-stream",
                },
                body: task.file,
              });
              return presigned[idx].key;
            }
          );
        } catch (err) {
          const shouldFallback = err instanceof ApiError && err.status === 503;
          if (!shouldFallback) {
            throw err;
          }
          uploadResults = await runWithConcurrency(batch, DIRECT_UPLOAD_CONCURRENCY, async (task) => {
            const response = await uploadDirectFile(activeToken, session.session_id, task.file);
            return response.key;
          });
        }
      } else {
        uploadResults = await runWithConcurrency(batch, DIRECT_UPLOAD_CONCURRENCY, async (task) => {
          const response = await uploadDirectFile(activeToken, session.session_id, task.file);
          return response.key;
        });
      }

      const successfulKeys: string[] = [];
      const updates: Record<string, Partial<FilePreview>> = {};
      uploadResults.forEach((result, idx) => {
        const previewId = batch[idx].previewId;
        if (result.status === "fulfilled") {
          const key = result.value;
          const publicUrl = `${UPLOADS_BASE}/${key}`;
          successfulKeys.push(key);
          updates[previewId] = {
            status: batch[idx].isDuplicate ? "duplicate" : "ready",
            key,
            uploadError: undefined,
            url: publicUrl,
          };
        } else {
          const message = toApiMessage(result.reason);
          updates[previewId] = { status: "error", uploadError: message };
        }
      });
      updatePreviewBatch(index, updates);

      if (successfulKeys.length) {
        try {
          await completeBatch(activeToken, session.session_id, successfulKeys);
        } catch (completionError) {
          const message = toApiMessage(completionError);
          safeSetError(message);
        }
      }

      uploadedTotal += successfulKeys.length;
      safeSetNotice(
        `Đã tải ${uploadedTotal}/${totalCount} ảnh${batches.length > 1 ? ` (batch ${batchIndex + 1}/${batches.length})` : ""}.`
      );
    }
  } catch (err) {
    const message = toApiMessage(err);
    safeSetError(message);
    const updates: Record<string, Partial<FilePreview>> = {};
    tasks.forEach(({ previewId }) => {
      updates[previewId] = { status: "error", uploadError: message };
    });
    updatePreviewBatch(index, updates);
  }
};

const handleFileUpload = (index: number, files: File[]) => {
  if (!files || files.length === 0) return;
  const existing = previewsRef.current[index] ?? products[index]?.filePreviews ?? [];
  const totalExisting = previewsRef.current.flat().length;
  const globalMax = siteSettings?.upload_max_files ?? null;
  const selectedSlug = products[index]?.selectedProductSlug;
  const selectedProduct = productOptions.find(
    (option) => option.slug === selectedSlug || option.id === selectedSlug
  );
  const pricingMode = resolvePricingMode(selectedProduct);
  const { max: maxPerProduct } = resolveImageLimits(
    selectedProduct?.min_images ?? null,
    selectedProduct?.max_images ?? null,
    pricingMode
  );
  if (maxPerProduct && existing.length >= maxPerProduct) {
    safeSetError(`Sản phẩm đã đạt tối đa ${maxPerProduct} ảnh.`);
    return;
  }

  let candidateFiles = files;
  if (globalMax) {
    const remainingGlobal = Math.max(globalMax - totalExisting, 0);
    if (remainingGlobal <= 0) {
      safeSetError(`Đã đạt tối đa ${globalMax} ảnh cho toàn bộ đơn.`);
      return;
    }
    if (files.length > remainingGlobal) {
      candidateFiles = files.slice(0, remainingGlobal);
      safeSetNotice(`Chỉ tải ${remainingGlobal} ảnh để phù hợp giới hạn toàn đơn.`);
    }
  }
  if (maxPerProduct) {
    const remaining = Math.max(maxPerProduct - existing.length, 0);
    if (remaining <= 0) {
      safeSetError(`Sản phẩm đã đạt tối đa ${maxPerProduct} ảnh.`);
      return;
    }
    if (files.length > remaining) {
      candidateFiles = files.slice(0, remaining);
      safeSetNotice(`Chỉ tải ${remaining} ảnh để phù hợp giới hạn.`);
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
          safeRevokeObjectUrl(preview.url);
          return false;
        }
        return true;
      });
      return { ...entry, filePreviews: nextPreviews };
    })
  );
};

const handlePhotoCopiesChange = (index: number, previewId: string, value: number) => {
  const nextValue = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
  setProducts((current) =>
    current.map((entry, idx) => {
      if (idx !== index) return entry;
      return {
        ...entry,
        filePreviews: entry.filePreviews.map((preview) =>
          preview.id === previewId ? { ...preview, copies: nextValue } : preview
        ),
      };
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
    setShippingName("");
    setShippingPhone("");
    setShippingAddress("");
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

  const buildPayload = (): { payload: OrderProductPayload[]; review: OrderReviewItem[] } => {
    const review: OrderReviewItem[] = [];
    const payload = products.flatMap((product) => {
      const trimmedName = product.name.trim();
      const selectedProduct = productOptions.find(
        (option) => option.slug === product.selectedProductSlug || option.id === product.selectedProductSlug
      );
      const pricingMode = resolvePricingMode(selectedProduct);
      const fileEntries = product.filePreviews
        .filter((preview): preview is FilePreview & { key: string } => Boolean(preview.key))
        .map((preview) => ({
          key: preview.key!,
          copies: Math.max(1, Math.round(preview.copies ?? 1)),
        }));
      const fileKeys = fileEntries.map((entry) => entry.key);
      if (!trimmedName || fileKeys.length === 0) {
        return [];
      }
      const normalizedOptions = Array.from(
        new Set(product.selectedOptions.map((option) => option.trim()).filter((option) => option))
      );
      const optionNote = normalizedOptions.join(", ");
      const combinedNotes = [product.notes.trim(), optionNote].filter(Boolean).join(" | ");
      const totalCopies = fileEntries.reduce((sum, entry) => sum + entry.copies, 0);
      const unitPrice = product.pricePerImage || PRICE_DEFAULT;
      const subtotal = pricingMode === "combo" ? unitPrice : unitPrice * totalCopies;
      review.push({
        name: trimmedName,
        imageCount: fileKeys.length,
        copiesCount: totalCopies,
        unitPrice,
        subtotal,
        optionsLabel: optionNote || undefined,
        pricingMode,
      });
      return [
        {
          name: trimmedName,
          quantity: totalCopies,
          notes: combinedNotes || undefined,
          options: normalizedOptions,
          images: fileKeys,
          image_copies: fileEntries,
          selected_product_slug: product.selectedProductSlug,
        },
      ];
    });
    return { payload, review };
  };

  const orderTotal = useMemo(() => {
    return products.reduce((sum, product) => {
      const readyCount = countReadyImages(product);
      if (!readyCount) return sum;
      const selected = productOptions.find(
        (option) => option.slug === product.selectedProductSlug || option.id === product.selectedProductSlug
      );
      const pricingMode = resolvePricingMode(selected);
      const basePrice = product.pricePerImage || PRICE_DEFAULT;
      if (pricingMode === "combo") {
        return sum + basePrice;
      }
      const totalCopies = countReadyCopies(product);
      return sum + basePrice * totalCopies;
    }, 0);
  }, [products, productOptions]);

  const reviewTotal = useMemo(() => pendingReview.reduce((sum, item) => sum + item.subtotal, 0), [pendingReview]);
  const reviewImages = useMemo(() => pendingReview.reduce((sum, item) => sum + item.imageCount, 0), [pendingReview]);
  const reviewCopies = useMemo(() => pendingReview.reduce((sum, item) => sum + item.copiesCount, 0), [pendingReview]);

  const disallowedProducts = useMemo(() => {
    return products
      .map((product) =>
        productOptions.find((option) => option.slug === product.selectedProductSlug || option.id === product.selectedProductSlug)
      )
      .filter((item) => item && item.allow_online_order === false);
  }, [products, productOptions]);

  const hasDisallowedProducts = disallowedProducts.length > 0;

  const missingOptionProducts = useMemo(() => {
    return products
      .map((product, index) => {
        const selected = productOptions.find(
          (option) => option.slug === product.selectedProductSlug || option.id === product.selectedProductSlug
        );
        if (!selected || !selected.extra_options || selected.extra_options.length === 0) return null;
        if (product.selectedOptions.length > 0) return null;
        const name = selected.title || product.name || `Sản phẩm ${index + 1}`;
        return { index, name };
      })
      .filter((item): item is { index: number; name: string } => Boolean(item));
  }, [products, productOptions]);

  const hasMissingOptions = missingOptionProducts.length > 0;

  const closeConfirm = () => {
    setConfirmOpen(false);
    setPendingPayload(null);
    setPendingReview([]);
  };

  const handleCreateOrder = async () => {
    if (!token) {
      setError("Vui lòng đăng nhập để tạo đơn hàng.");
      return;
    }
    if (hasMissingOptions) {
      setError(`Vui lòng chọn tùy chọn in ấn cho ${missingOptionProducts[0].name}.`);
      return;
    }
    const trimmedShippingName = shippingName.trim();
    const trimmedShippingPhone = shippingPhone.trim();
    const trimmedShippingAddress = shippingAddress.trim();
    if (!trimmedShippingName) {
      setError("Vui lòng nhập tên người nhận.");
      return;
    }
    const phoneDigits = trimmedShippingPhone.replace(/\D/g, "");
    if (!trimmedShippingPhone || phoneDigits.length < 8) {
      setError("Vui lòng nhập số điện thoại hợp lệ.");
      return;
    }
    if (!trimmedShippingAddress || trimmedShippingAddress.length < 5) {
      setError("Vui lòng nhập địa chỉ giao hàng.");
      return;
    }
    const { payload: payloadProducts, review } = buildPayload();
    if (!payloadProducts.length) {
      setError("Cần ít nhất một sản phẩm hợp lệ có tên và ảnh.");
      return;
    }
    const minFiles = siteSettings?.upload_min_files ?? null;
    const maxFiles = siteSettings?.upload_max_files ?? null;
    const totalImages = payloadProducts.reduce((sum, item) => sum + (item.images?.length ?? 0), 0);
    if (minFiles && totalImages < minFiles) {
      setError(`Cần tối thiểu ${minFiles} ảnh để gửi đơn.`);
      return;
    }
    if (maxFiles && totalImages > maxFiles) {
      setError(`Vượt quá tối đa ${maxFiles} ảnh cho phép.`);
      return;
    }
    for (const item of payloadProducts) {
      const selected = productOptions.find(
        (option) => option.slug === item.selected_product_slug || option.id === item.selected_product_slug
      );
      const pricingMode = resolvePricingMode(selected);
      const { min: minPer, max: maxPer } = resolveImageLimits(
        selected?.min_images ?? null,
        selected?.max_images ?? null,
        pricingMode
      );
      const unitLabel = "bản in";
      const imageCount = item.images?.length ?? 0;
      const copyCount =
        item.image_copies && item.image_copies.length > 0
          ? item.image_copies.reduce((sum, entry) => sum + Math.max(1, entry.copies ?? 1), 0)
          : imageCount * Math.max(1, item.copies_per_image ?? 1);
      const count = copyCount;
      if (minPer && maxPer && minPer === maxPer && count !== minPer) {
        setError(`Sản phẩm ${item.name} yêu cầu đúng ${minPer} ${unitLabel}.`);
        return;
      }
      if (minPer && count < minPer) {
        setError(`Sản phẩm ${item.name} cần tối thiểu ${minPer} ${unitLabel}.`);
        return;
      }
      if (maxPer && count > maxPer) {
        setError(`Sản phẩm ${item.name} vượt quá tối đa ${maxPer} ${unitLabel}.`);
        return;
      }
    }

    const payload: OrderCreatePayload = {
      products: payloadProducts,
      note: note.trim() || undefined,
      shipping_name: trimmedShippingName,
      shipping_phone: trimmedShippingPhone,
      shipping_address: trimmedShippingAddress,
    };

    setPendingPayload(payload);
    setPendingReview(review);
    setConfirmOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!token || !pendingPayload) {
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await createOrder(token, pendingPayload);
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
      closeConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn lúc này.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--line,#e5e0d8)] bg-white/90 p-4 shadow-lg sm:p-6">
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
        {products.map((product, index) => {
          const readyCount = countReadyImages(product);
          const totalCopies = countReadyCopies(product);
          const selectedProduct = product.selectedProductSlug
            ? productOptions.find(
                (option) =>
                  option.slug === product.selectedProductSlug || option.id === product.selectedProductSlug
              )
            : product.selectedProductInput
              ? productOptions.find(
                  (option) =>
                    option.title?.trim().toLowerCase() ===
                    product.selectedProductInput.trim().toLowerCase()
                )
              : undefined;
          const pricingMode = resolvePricingMode(selectedProduct);
          const displayCopies = totalCopies;
          const displayCountText = readyCount
            ? `${readyCount} ảnh - ${displayCopies} bản`
            : `${product.filePreviews.length} ảnh đang tải lên`;
          const basePrice = product.pricePerImage || PRICE_DEFAULT;
          const estimatedTotal =
            pricingMode === "combo" ? (readyCount ? basePrice : 0) : basePrice * totalCopies;
          const availableOptions = selectedProduct?.extra_options ?? [];
          const allowOnlineOrder = selectedProduct?.allow_online_order !== false;
          const limitValues = resolveImageLimits(
            selectedProduct?.min_images ?? null,
            selectedProduct?.max_images ?? null,
            pricingMode
          );
          const productLimitText = formatImageLimit(limitValues.min, limitValues.max);
          return (
            <div key={index} className="space-y-3 rounded-2xl border border-stone-200 bg-[var(--surface-soft,#f7f2ea)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-[var(--text-main,#1f1b16)]">Sản phẩm {index + 1}</p>
                  <p className="text-[0.65rem] tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                    {displayCountText} · {formatCurrency(estimatedTotal || 0)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                  <span>
                    {product.pricePerImage ? formatCurrency(product.pricePerImage) : "Chưa chọn giá"}
                  </span>
                  {selectedProduct && (
                    <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-[0.55rem] uppercase tracking-[0.24em] text-[var(--text-soft,#4a4034)]">
                      {pricingMode === "combo" ? "Combo" : "Bán lẻ"}
                    </span>
                  )}
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
                <input
                  list={`product-options-${index}`}
                  value={product.selectedProductInput}
                  onChange={(event) => handleProductSelect(index, event.target.value)}
                  placeholder="Nhập tên/slug hoặc chọn"
                  className="rounded-2xl border border-stone-300 w-full px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none disabled:opacity-60"
                  disabled={loadingProducts && productOptions.length === 0}
                />
                <datalist id={`product-options-${index}`}>
                  {productOptions.map((option) => {
                    const limitShort = formatImageLimitShort(
                      option.min_images ?? null,
                      option.max_images ?? null
                    );
                    const pricingLabel = option.pricing_mode === "combo" ? "combo" : "bán lẻ";
                    const labelParts = [
                      option.title,
                      option.current_price,
                      limitShort ? limitShort : "",
                      pricingLabel ? pricingLabel : "",
                      option.allow_online_order === false ? "Chỉ Zalo" : "",
                    ].filter(Boolean);
                    return (
                      <option
                        key={option.slug || option.id}
                        value={option.title}
                        label={labelParts.join(" - ")}
                      />
                    );
                  })}
                </datalist>
              </label>
              <div className="space-y-1 text-[0.75rem] tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                <p className="break-words">{product.name || "Ch\u01b0a ch\u1ecdn s\u1ea3n ph\u1ea9m"}</p>
                {productLimitText && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--accent-strong,#8a4d1f)] shadow-sm">
                    {productLimitText}
                  </p>
                )}
                {selectedProduct && (
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft,#4a4034)]">
                    {pricingMode === "combo" ? "Giá combo cố định" : "Tính giá theo ảnh"}
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
                  <p className="text-sm font-semibold tracking-tight text-[var(--text-soft,#4a4034)]">
                    Tùy chọn in ấn (bắt buộc)
                  </p>
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
              ) : null}

              {allowOnlineOrder && (
                <MassPhotoGallery
                  title={product.name || `Sản phẩm ${index + 1}`}
                  summary="Ảnh gốc lưu nguyên, hệ thống nhận diện trùng tên để bạn kiểm soát."
                  photos={product.filePreviews}
                  onAddFiles={(files) => handleFileUpload(index, files)}
                  onRemovePhoto={(photoId) => handleRemovePreview(index, photoId)}
                  onChangeCopies={(photoId, copies) => handlePhotoCopiesChange(index, photoId, copies)}
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

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--text-soft,#4a4034)]">
            Thông tin giao hàng
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Tên người nhận
              <input
                value={shippingName}
                onChange={(event) => setShippingName(event.target.value)}
                className="rounded-2xl border border-stone-300 w-full px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Số điện thoại
              <input
                value={shippingPhone}
                onChange={(event) => setShippingPhone(event.target.value)}
                className="rounded-2xl border border-stone-300 w-full px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
              Địa chỉ giao hàng
              <textarea
                value={shippingAddress}
                onChange={(event) => setShippingAddress(event.target.value)}
                rows={2}
                className="rounded-2xl border border-stone-300 w-full px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
          </div>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Ghi chú chung
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="rounded-2xl border border-stone-300 w-full px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none"
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

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeConfirm}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-[var(--text-soft,#4a4034)]">XÁC NHẬN ĐƠN</p>
                <h3 className="text-lg font-semibold text-[var(--text-main,#1f1b16)]">Hóa đơn tạm tính</h3>
              </div>
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {pendingReview.length === 0 ? (
                <p className="text-sm text-stone-500">Không có sản phẩm.</p>
              ) : (
                pendingReview.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{item.name}</p>
                        <p className="text-xs text-stone-500">
                          Số ảnh: {item.imageCount} - Số bản: {item.copiesCount}
                        </p>
                        {item.optionsLabel && (
                          <p className="text-xs text-stone-500">Tùy chọn: {item.optionsLabel}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-stone-900">{formatCurrency(item.subtotal)}</p>
                        <p className="text-xs text-stone-500">{item.pricingMode === "combo" ? "Giá combo" : `${formatCurrency(item.unitPrice)} / ảnh`}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-3 text-sm text-stone-700">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Thông tin giao hàng</p>
              <p>Tên: {pendingPayload?.shipping_name || "-"}</p>
              <p>SĐT: {pendingPayload?.shipping_phone || "-"}</p>
              <p>Địa chỉ: {pendingPayload?.shipping_address || "-"}</p>
              {pendingPayload?.note && <p>Ghi chú: {pendingPayload.note}</p>}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900">
              <span>Tổng ảnh: {reviewImages} - Tổng bản: {reviewCopies}</span>
              <span>{formatCurrency(reviewTotal)}</span>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="w-full rounded-xl border border-stone-300 px-4 py-2 text-sm sm:w-auto"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmOrder()}
                disabled={loading}
                className="rounded-xl bg-[var(--accent-strong,#8a4d1f)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Đang gửi..." : "Xác nhận và gửi"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
