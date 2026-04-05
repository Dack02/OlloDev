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
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY tsconfig.json ./tsconfig.json

# Build with turbo
RUN pnpm turbo run build --filter=@ollo-dev/api...

# Prune dev dependencies
RUN pnpm prune --prod

# ============================================================
# Stage 3: runner
# ============================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy the full workspace structure needed for pnpm resolution
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json

# Copy node_modules (pruned to prod only)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/db ./packages/db

EXPOSE 8000

CMD ["node", "apps/api/dist/index.js"]
