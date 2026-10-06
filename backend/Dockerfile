# =============================================================
#  Backend multistage Dockerfile (NestJS + TypeORM)
#  Targets:
#    base  -> shared
#    dev   -> hot reload, all deps        (docker-compose.yml)
#    build -> compiles TS -> dist
#    prod  -> slim runtime, prod deps only (docker-compose.prod.yml)
# =============================================================

# ---- base ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- dev ----
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---- build ----
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- prod ----
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
EXPOSE 3000
# With DB_SYNC=false in prod, run migrations before boot:
#   CMD ["sh","-c","npm run migration:run && node dist/main.js"]
CMD ["node", "dist/main.js"]
