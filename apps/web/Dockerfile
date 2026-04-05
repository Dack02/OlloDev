# ============================================================
# Stage 1: base
# ============================================================
FROM node:20-alpine AS base
RUN corepack enable pnpm

# ============================================================
# Stage 2: builder
# ============================================================
FROM base AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package manifests for all workspaces
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY tsconfig.json ./tsconfig.json

# Build args for Next.js public env vars (needed at build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL

# Build with turbo
RUN pnpm turbo run build --filter=web...

# ============================================================
# Stage 3: runner
# ============================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy Next.js standalone output and static files
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
