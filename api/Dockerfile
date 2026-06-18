# ─── Build stage ────────────────────────────────────────────────────────────

FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json
RUN pnpm install --filter ./api... --frozen-lockfile --ignore-scripts

WORKDIR /app/api

COPY api/tsconfig.json ./tsconfig.json
COPY api/tsconfig.build.json ./tsconfig.build.json
COPY api/auth.ts ./auth.ts
COPY api/src/ ./src/

RUN pnpm run build

# ─── Production stage ───────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json
RUN pnpm install --filter ./api --prod --frozen-lockfile --ignore-scripts && pnpm store prune

WORKDIR /app/api

COPY --from=builder /app/api/dist ./dist

EXPOSE 8080

CMD ["node", "dist/server.js"]
