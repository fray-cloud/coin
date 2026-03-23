FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api-server/package.json ./apps/api-server/
COPY apps/web/package.json ./apps/web/
COPY apps/worker-service/package.json ./apps/worker-service/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY packages/kafka-contracts/package.json ./packages/kafka-contracts/
COPY packages/utils/package.json ./packages/utils/
COPY packages/exchange-adapters/package.json ./packages/exchange-adapters/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile

# Development
FROM base AS development
COPY --from=deps /app ./
COPY . .
WORKDIR /app/apps/worker-service
CMD ["pnpm", "dev"]

# Build
FROM base AS builder
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @coin/types --filter @coin/utils --filter @coin/database --filter @coin/kafka-contracts --filter @coin/exchange-adapters build && \
    pnpm --filter worker-service build

# Production dependencies only
FROM base AS prod-deps
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=deps /app/apps/api-server/package.json ./apps/api-server/
COPY --from=deps /app/apps/web/package.json ./apps/web/
COPY --from=deps /app/apps/worker-service/package.json ./apps/worker-service/
COPY --from=deps /app/packages/types/package.json ./packages/types/
COPY --from=deps /app/packages/database/package.json ./packages/database/
COPY --from=deps /app/packages/kafka-contracts/package.json ./packages/kafka-contracts/
COPY --from=deps /app/packages/utils/package.json ./packages/utils/
COPY --from=deps /app/packages/exchange-adapters/package.json ./packages/exchange-adapters/
COPY --from=deps /app/packages/tsconfig/package.json ./packages/tsconfig/
COPY --from=deps /app/packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --prod

# Production
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker-service/dist ./dist
COPY --from=builder /app/packages/types/dist ./node_modules/@coin/types/dist
COPY --from=builder /app/packages/utils/dist ./node_modules/@coin/utils/dist
COPY --from=builder /app/packages/database/dist ./node_modules/@coin/database/dist
COPY --from=builder /app/packages/kafka-contracts/dist ./node_modules/@coin/kafka-contracts/dist
COPY --from=builder /app/packages/exchange-adapters/dist ./node_modules/@coin/exchange-adapters/dist
USER nestjs
CMD ["node", "dist/main.js"]
