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
COPY packages/database/prisma ./packages/database/prisma
RUN pnpm install --frozen-lockfile

# Build + deploy
FROM base AS builder
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @coin/database db:generate && \
    pnpm --filter @coin/types --filter @coin/utils --filter @coin/database --filter @coin/kafka-contracts --filter @coin/exchange-adapters build && \
    pnpm --filter worker-service build && \
    pnpm --filter worker-service deploy /app/deployed && \
    cp -r /app/packages/database/generated /app/deployed/generated

# Production
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder /app/deployed ./
USER nestjs
CMD ["node", "dist/main.js"]
