# Etch

> Open-source video conferencing with real-time screen annotations

[![CI](https://github.com/adammomen/etch/actions/workflows/ci.yml/badge.svg)](https://github.com/adammomen/etch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modern video conferencing platform you can connect to [LiveKit Cloud](https://livekit.cloud) or self-host on your own infrastructure.

## Features

- HD video and audio powered by LiveKit
- Screen sharing with real-time annotations
- Multi-participant group calls
- Cross-platform (desktop and mobile browsers)
- Full media controls (mute, camera, speaker selection)
- Low-latency WebRTC streaming

## Quick Start

### LiveKit Cloud (Recommended)

1. Sign up at [cloud.livekit.io](https://cloud.livekit.io) and create a project to get your API key and secret.
2. Configure environment:
   ```bash
   cp .env.example .env
   # Fill in LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
   ```
3. Start the app:
   ```bash
   docker compose -f docker-compose.cloud.yaml up
   ```

### Self-Hosted (Full Control)

Runs LiveKit, Redis, and the app together — no external accounts needed:

```bash
docker compose up
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Coolify one-click deploy and other options.

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 8+

### Setup

```bash
git clone https://github.com/adammomen/etch.git
cd etch
pnpm install
cp .env.example .env   # fill in LiveKit credentials
pnpm dev
```

Visit `http://localhost:3000`.

To run a local LiveKit server for development:

```bash
docker compose up livekit redis -d
# Then in another terminal:
pnpm dev
```

## Deployment

Deploy to [Coolify](https://coolify.io) with either LiveKit Cloud or a self-hosted LiveKit server. See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions.

[![Deploy on Coolify](https://img.shields.io/badge/Deploy%20on-Coolify-6B16ED?style=for-the-badge)](https://app.coolify.io/deploy?repository=https://github.com/adammomen/etch)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LIVEKIT_URL` | LiveKit server URL | `ws://localhost:7880` |
| `LIVEKIT_API_KEY` | LiveKit API key | — |
| `LIVEKIT_API_SECRET` | LiveKit API secret | — |
| `APP_URL` | Public URL of your app | `http://localhost:3000` |
| `APP_PORT` | Port for the web server | `3000` |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, testing, and CI details.

## License

[MIT](./LICENSE)

## Acknowledgments

- [LiveKit](https://livekit.io) — WebRTC infrastructure
- [Coolify](https://coolify.io) — Self-hosting platform
