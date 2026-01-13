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

# Build all packages
RUN pnpm build:shared && pnpm build:client && pnpm build:server

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

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist

# Copy server package.json to access scripts
COPY --from=builder /app/packages/server/package.json ./packages/server/

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

# Start the server
# The server will serve the built client files
CMD ["pnpm", "--filter", "server", "start"]
