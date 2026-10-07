# =============================================================
#  Frontend multistage Dockerfile (React + Vite)
#  Targets:
#    base  -> shared
#    dev   -> Vite dev server + hot reload       (docker-compose.yml)
#    build -> type-check + production bundle (dist/)
#    prod  -> static files only, copied into the volume served by nginx
#             (docker-compose.prod.yml). No Node.js in production.
# =============================================================

# ---- base ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- dev ----
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build ----
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ---- prod ----
FROM alpine:3.22 AS prod
COPY --from=build /app/dist /dist
# Refresh the shared volume at each start, so a new image never serves an old bundle.
CMD ["sh", "-c", "rm -rf /out/* && cp -r /dist/. /out/"]
