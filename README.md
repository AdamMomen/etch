# Nameless

> Self-hosted video conferencing powered by LiveKit

A modern, privacy-focused video conferencing solution that you can deploy to your own infrastructure in seconds.

## 🚀 Quick Deploy

Deploy your own instance with one click:

[![Deploy on Coolify](https://cdn.coollabs.io/assets/coolify/deploy-button.svg)](https://app.coolify.io/deploy?repository=https://github.com/adammomen/nameless)

**What you get:**
- ✅ Full video conferencing platform
- ✅ Auto-configured LiveKit media server
- ✅ Auto-generated API credentials (shown on first login)
- ✅ Automatic updates
- ✅ Production-ready with SSL/TLS (via Coolify)

[📖 Full Deployment Guide](./DEPLOYMENT.md)

## ✨ Features

- 🎥 **HD Video & Audio** - Crystal clear calls powered by LiveKit
- 🎨 **Screen Sharing** - Share your screen with annotations
- 👥 **Multi-participant** - Support for large group calls
- 🔒 **Privacy First** - Self-hosted, you own your data
- 📱 **Cross-platform** - Works on desktop and mobile browsers
- 🎛️ **Full Control** - Mute, camera toggle, speaker selection
- ⚡ **Low Latency** - Optimized WebRTC streaming
- 🌐 **WebRTC** - Industry-standard real-time communication

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │ ← Users connect via web browser
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│  Nameless   │ ← Web application (React + Hono)
│     App     │
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────┐
│  LiveKit    │ ← Media server (handles video/audio)
│   Server    │
└─────────────┘
```

## 🛠️ Local Development

### Prerequisites

- Node.js 18+
- pnpm
- Docker (optional, for local LiveKit)

### Setup

```bash
# Clone repository
git clone https://github.com/adammomen/nameless.git
cd nameless

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your LiveKit credentials

# Start development server
pnpm dev
```

### Running with Local LiveKit

```bash
# Start LiveKit using docker-compose
docker-compose up livekit redis

# In another terminal, start the app
pnpm dev
```

Visit `http://localhost:3000` to start using the app.

## 📦 Production Deployment

### Docker Compose (Recommended)

The easiest way to deploy is using the included `docker-compose.yml`:

```bash
# Pull and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Your app will be running at `http://localhost:3000` with auto-generated credentials.

### Coolify (One-Click)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete Coolify deployment guide.

### Manual Deployment

1. Build the application:
   ```bash
   pnpm build
   ```

2. Set up LiveKit (follow [LiveKit docs](https://docs.livekit.io))

3. Configure environment variables:
   ```bash
   LIVEKIT_API_KEY=your-key
   LIVEKIT_API_SECRET=your-secret
   LIVEKIT_WS_URL=wss://your-livekit-url
   ```

4. Start the server:
   ```bash
   pnpm start
   ```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test suite
pnpm test packages/client
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LIVEKIT_API_KEY` | LiveKit API key | Auto-generated in Docker |
| `LIVEKIT_API_SECRET` | LiveKit API secret | Auto-generated in Docker |
| `LIVEKIT_WS_URL` | LiveKit WebSocket URL | `ws://livekit:7880` |
| `APP_URL` | Public URL of your app | `http://localhost:3000` |
| `DATABASE_URL` | Database connection | `sqlite:///app/data/nameless.db` |
| `REDIS_URL` | Redis connection | `redis://redis:6379` |

## 🔄 Updates

When deployed with Docker:

```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d
```

With Coolify, updates are automatic (checked every 24 hours by default).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

- [LiveKit](https://livekit.io) - The awesome WebRTC infrastructure
- [Coolify](https://coolify.io) - Simple self-hosting platform

## 📧 Support

- 📖 [Documentation](./DEPLOYMENT.md)
- 🐛 [Report Issues](https://github.com/adammomen/nameless/issues)
- 💬 [Discussions](https://github.com/adammomen/nameless/discussions)

---

**Built with ❤️ for privacy-conscious teams**
