# Build context is the repo root (not backend/) — the backend needs
# database/schema/schema.prisma, which lives outside backend/. Build with:
#   docker build -f backend/Dockerfile .
# (docker-compose.yml already sets this up correctly.)

FROM node:20-slim AS deps
WORKDIR /repo
# No package-lock.json is committed (generating one requires running
# `npm install` with network access, which this was built without) — using
# `npm install` here instead of `npm ci`. Run `npm install` once locally and
# commit the resulting lockfile, then switch this to `npm ci` for
# reproducible production builds.
COPY backend/package.json ./backend/
RUN cd backend && npm install

FROM node:20-slim AS build
WORKDIR /repo
COPY --from=deps /repo/backend/node_modules ./backend/node_modules
COPY backend ./backend
COPY database ./database
RUN cd backend && npx prisma generate && npm run build

FROM node:20-slim AS runtime
WORKDIR /repo/backend

# The coding executor (backend/src/coding/executor.ts) shells out to
# `docker run` against the HOST's Docker daemon via the socket mounted in
# docker-compose.yml — this installs the CLI those calls invoke. This never
# runs a Docker daemon inside this image; it's a client talking to the
# host's daemon over the mounted socket (sibling containers, not nested).
RUN apt-get update && apt-get install -y --no-install-recommends docker.io ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /repo/backend/node_modules ./node_modules
COPY --from=build /repo/backend/dist ./dist
COPY --from=build /repo/backend/package.json ./package.json
COPY --from=build /repo/database ../database

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]
