# syntax=docker/dockerfile:1.7

# ─── Stage 1 · build ─────────────────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

# Install deps first so the Docker layer cache only invalidates when the
# lockfile or package manifests change.
COPY package.json bun.lock ./
COPY packages/game-core/package.json packages/game-core/package.json
COPY packages/protocol/package.json  packages/protocol/package.json
COPY packages/server/package.json    packages/server/package.json
COPY packages/web/package.json       packages/web/package.json
COPY packages/tui/package.json       packages/tui/package.json
RUN bun install --frozen-lockfile

# Pull in sources and build the SvelteKit static bundle. BUILD_TARGET=static
# with no BASE_PATH gives us adapter-static at the root path, ideal for a
# self-hosted single-container deploy. The Bun server (Stage 2) serves it as
# the SPA fallback.
COPY . .
ENV BUILD_TARGET=static
RUN bun run --filter '@avalon/web' build

# ─── Stage 2 · runtime ───────────────────────────────────────────────────
FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Copy the whole built workspace. The runtime image is ~120 MB total
# (Bun base ~80 MB + node_modules + sources + web build). devDependencies
# stay along for the ride because pruning them out of a bun-workspaces
# install is fiddly — not worth the build complexity at this size.
COPY --from=builder /app /app

ENV PORT=3000
ENV AVALON_STATIC_DIR=/app/packages/web/build
EXPOSE 3000

# Health probe for orchestrators (compose, ACA, k8s) — Hono's /health
# already returns JSON {ok:true,rooms:[...]} from registry.listRooms().
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/packages/server
CMD ["bun", "run", "src/index.ts"]
