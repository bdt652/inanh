const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

const publicApiBase = (): string => {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  const derived = backendBase ? `${trimTrailingSlashes(backendBase)}/api/v1` : "http://localhost:8000/api/v1";
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  return trimTrailingSlashes(explicit ?? derived);
};

const internalApiBase = (): string | undefined => {
  const candidates = [
    process.env.API_INTERNAL_URL,
    process.env.NEXT_INTERNAL_API_URL,
    process.env.INTERNAL_API_URL,
  ];
  const found = candidates.find((value) => (value ?? "").trim().length > 0);
  return found ? trimTrailingSlashes(found) : undefined;
};

export const resolveApiBase = (): string => {
  if (typeof window === "undefined") {
    const internal = internalApiBase();
    if (internal) return internal;
  }
  return publicApiBase();
};

const stripApiPrefix = (value: string): string => value.replace(/\/api\/v1$/i, "");

export const resolveUploadsBase = (): string => {
  const apiBase = resolveApiBase();
  const root = stripApiPrefix(apiBase);
  return `${trimTrailingSlashes(root)}/uploads`;
};

// Resolve the base URL for uploaded files.
// If MINIO_PUBLIC_BASE_URL is set, returns direct MinIO URLs (e.g., https://media.inanh24h.com).
// Otherwise, returns backend proxy URLs (e.g., https://api.inanh24h.com/uploads).
export const resolveFileBase = (): string => {
  const minioPublic = process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL?.trim();
  if (minioPublic) {
    return trimTrailingSlashes(minioPublic);
  }
  // Fallback to backend proxy
  return resolveUploadsBase();
};
