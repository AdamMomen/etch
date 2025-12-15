FROM debian:bookworm-slim

WORKDIR /app

# Copy the pre-compiled binary
COPY bin/server .
COPY web ./web

# Set environment variable to disable TLS
ENV USE_TLS=false

# Run the binary
CMD ["./server"]