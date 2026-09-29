# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS builder

WORKDIR /app
ENV NODE_ENV=development

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json prisma.config.ts ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/judge-worker/package.json apps/judge-worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/judge-domain/package.json packages/judge-domain/package.json
COPY apps/web/scripts apps/web/scripts
COPY prisma ./prisma
RUN npm ci

COPY apps/judge-worker ./apps/judge-worker
COPY packages/judge-domain ./packages/judge-domain
RUN npm run build --workspace @cppstudy/judge-worker

FROM builder AS production-dependencies
RUN npm prune --omit=dev --omit=optional --ignore-scripts

FROM node:24-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 cppstudy \
  && useradd --system --uid 1001 --gid cppstudy cppstudy

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/apps/judge-worker/package.json ./apps/judge-worker/package.json
COPY --from=builder /app/apps/judge-worker/dist ./apps/judge-worker/dist
COPY --from=builder /app/packages/judge-domain/package.json ./packages/judge-domain/package.json
COPY --from=builder /app/packages/judge-domain/dist ./packages/judge-domain/dist

USER cppstudy
WORKDIR /app/apps/judge-worker
CMD ["node", "dist/main.js"]
