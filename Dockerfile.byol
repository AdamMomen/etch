# Multi-stage Dockerfile for Etch
# Builds client, server, and shared packages into a single production image

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (each package has its own tsconfig)
COPY packages ./packages
COPY tsconfig.base.json ./

# Build all packages (use build:web for client - web version with type checking)
RUN pnpm build:shared && pnpm --filter client build:web && pnpm build:server

# Stage 2: Production
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (include tsx for running TypeScript directly)
RUN pnpm install --frozen-lockfile

# Copy source files and built client
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/server ./packages/server
COPY --from=builder /app/packages/client/dist ./packages/client/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the server using tsx (runs TypeScript directly)
# The server will serve the built client files
CMD ["pnpm", "--filter", "server", "exec", "tsx", "src/index.ts"]
