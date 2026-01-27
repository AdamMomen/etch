# Unified Dockerfile for Etch - All-in-one deployment
# Includes: Node.js app + Redis + LiveKit server
# Uses s6-overlay for process supervision

ARG S6_OVERLAY_VERSION=3.2.0.2
ARG LIVEKIT_VERSION=1.9.11

# =============================================================================
# Stage 1: Build the application
# =============================================================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY tsconfig.base.json ./

# Build all packages
RUN pnpm build:shared && pnpm --filter client build:web && pnpm build:server

# =============================================================================
# Stage 2: Production image with s6-overlay
# =============================================================================
FROM node:20-alpine AS production

ARG S6_OVERLAY_VERSION
ARG LIVEKIT_VERSION
ARG TARGETARCH

# Install s6-overlay
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp
RUN apk add --no-cache xz \
    && tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz \
    && tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz \
    && rm /tmp/s6-overlay-*.tar.xz

# Install Redis
RUN apk add --no-cache redis curl

# Download LiveKit server binary
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi && \
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi && \
    curl -sSL "https://github.com/livekit/livekit/releases/download/v${LIVEKIT_VERSION}/livekit_${LIVEKIT_VERSION}_linux_${ARCH}.tar.gz" | \
    tar -xz -C /usr/local/bin livekit-server && \
    chmod +x /usr/local/bin/livekit-server

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy package files and install production deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/server ./packages/server
COPY --from=builder /app/packages/client/dist ./packages/client/dist

# Copy s6-overlay service definitions
COPY s6-overlay/s6-rc.d /etc/s6-overlay/s6-rc.d
COPY s6-overlay/livekit.yaml /etc/livekit.yaml

# Make run scripts executable
RUN chmod +x /etc/s6-overlay/s6-rc.d/*/run 2>/dev/null || true

# Create data directories
RUN mkdir -p /app/data /data/redis

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV LIVEKIT_URL=ws://localhost:7880
ENV LIVEKIT_API_KEY=devkey
ENV LIVEKIT_API_SECRET=secret
ENV REDIS_URL=redis://localhost:6379

# Expose ports
# 3000 - App HTTP
# 7880 - LiveKit WebSocket/API
# 7881 - LiveKit ICE/TCP
# 7882 - LiveKit ICE/UDP
EXPOSE 3000 7880 7881 7882/udp

# s6-overlay entrypoint
ENTRYPOINT ["/init"]
