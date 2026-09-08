FROM node:22-alpine AS pruner

WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

COPY . .
RUN pnpm dlx turbo@2.10.9 prune @luraba/api --docker

FROM node:22-alpine AS builder

WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --from=pruner /repo/out/full/ .
RUN pnpm exec turbo run build --filter=@luraba/api...
RUN pnpm deploy --legacy --filter @luraba/api --prod /out

FROM builder AS migrate

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@luraba/api", "db:migrate"]

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /out ./

EXPOSE 3001
CMD ["node", "dist/server.js"]
