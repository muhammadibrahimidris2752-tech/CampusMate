# Multi-stage build so the final image ships compiled JS + production-only
# dependencies — no TypeScript toolchain, no devDependencies, no source
# maps to sift through for a real exploit. Supports Step 12's "grows from
# 1 API instance to many without architectural replacement": this image is
# stateless (all state lives in Postgres/Redis) and horizontally scalable
# behind a load balancer as-is.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Runs as an unprivileged user rather than root.
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

USER nestjs
EXPOSE 3000

CMD ["node", "dist/main.js"]
