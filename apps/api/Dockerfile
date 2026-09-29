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

COPY apps/api ./apps/api
RUN npm run build --workspace @cppstudy/api

FROM builder AS production-dependencies
RUN npm prune --omit=dev --omit=optional --ignore-scripts

FROM node:24-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3001

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 cppstudy \
  && useradd --system --uid 1001 --gid cppstudy cppstudy \
  && mkdir -p /app/uploads \
  && chown -R cppstudy:cppstudy /app/uploads

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist

USER cppstudy
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
