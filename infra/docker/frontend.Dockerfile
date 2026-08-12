FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
ARG APP
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/${APP}/package.json ./apps/${APP}/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/socket-client/package.json ./packages/socket-client/
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG APP
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV VITE_API_URL=/api
RUN pnpm --filter @isa/${APP} build

FROM nginx:alpine AS runner
ARG APP
COPY --from=builder /app/apps/${APP}/dist /usr/share/nginx/html
COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
