FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY apps/web/package.json apps/web/pnpm-lock.yaml apps/web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web ./
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_UPLOAD_MODE
ARG NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL
ARG API_INTERNAL_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_UPLOAD_MODE=${NEXT_PUBLIC_UPLOAD_MODE} \
    NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL=${NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL} \
    API_INTERNAL_URL=${API_INTERNAL_URL}
RUN pnpm run build

FROM node:22-alpine AS runner
RUN addgroup -S nextjs && adduser -S -G nextjs nextjs
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /app/.next/cache/images /app/.next/cache/fetch-cache \
    && chown -R nextjs:nextjs /app
USER nextjs
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
