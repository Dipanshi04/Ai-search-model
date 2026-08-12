FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-server/package.json ./apps/api-server/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @isa/api-server build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 isa

COPY --from=builder /app/apps/api-server/dist ./dist
COPY --from=builder /app/apps/api-server/node_modules ./node_modules
COPY --from=builder /app/apps/api-server/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

USER isa
EXPOSE 4000

CMD ["node", "dist/index.js"]
