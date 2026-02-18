# ─── Stage 1: Build frontend ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app

COPY projects/frontend/package*.json ./
RUN npm ci

COPY projects/frontend/ ./
RUN npm run build
# Output: /app/dist/


# ─── Stage 2: Build API ───────────────────────────────────────────────────────
FROM node:20-alpine AS api-build
WORKDIR /app

COPY projects/api/package*.json ./
RUN npm ci

COPY projects/api/ ./
RUN npm run build
# Output: /app/dist/


# ─── Stage 3: Production image ───────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Production dependencies only
COPY projects/api/package*.json ./
RUN npm ci --omit=dev

# Compiled API
COPY --from=api-build /app/dist ./dist

# Compiled frontend served as static files by NestJS ServeStaticModule
COPY --from=frontend-build /app/dist ./public

# Drizzle migration files (needed by dist/migrate at runtime)
COPY projects/api/drizzle ./drizzle

# Pre-computed summaries for embedding generation
COPY projects/api/.cache/summaries ./.cache/summaries

ENV NODE_ENV=production
EXPOSE 3030

CMD ["sh", "-c", "node dist/migrate && node dist/main"]
