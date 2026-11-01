FROM node:22-alpine AS pruner

WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

COPY . .
RUN pnpm dlx turbo@2.10.9 prune @luraba/mcp --docker

FROM node:22-alpine AS builder

WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --from=pruner /repo/out/full/ .
RUN pnpm exec turbo run build --filter=@luraba/mcp...
RUN pnpm deploy --legacy --filter @luraba/mcp --prod /out

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_HTTP_HOST=0.0.0.0
ENV MCP_HTTP_PORT=3333

COPY --from=builder /out ./

EXPOSE 3333
CMD ["node", "dist/index.js"]
