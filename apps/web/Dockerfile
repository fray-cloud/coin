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
WORKDIR /app/apps/web
EXPOSE 3001
CMD ["pnpm", "dev"]

# Storybook development
FROM base AS storybook-dev
COPY --from=deps /app ./
COPY . .
WORKDIR /app/apps/web
EXPOSE 6006
CMD ["pnpm", "storybook", "--no-open"]

# Storybook static build
FROM base AS storybook-builder
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @coin/types build && \
    pnpm --filter web build-storybook

# Storybook production (static serve)
FROM node:20-alpine AS storybook
RUN npm i -g serve
COPY --from=storybook-builder /app/apps/web/storybook-static /app/storybook-static
WORKDIR /app
EXPOSE 6006
CMD ["serve", "-s", "storybook-static", "-l", "6006"]

# Build
FROM base AS builder
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @coin/types build && \
    pnpm --filter web build

# Production
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/web/server.js"]
