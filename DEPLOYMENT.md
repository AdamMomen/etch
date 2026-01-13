# Deploying Etch to Coolify

This guide explains how to deploy Etch, a self-hosted video conferencing solution, to Coolify with **true one-click deployment**.

## 🚀 One-Click Deploy

[![Deploy on Coolify](https://cdn.coollabs.io/assets/coolify/deploy-button.svg)](https://app.coolify.io/deploy)

> **Note:** When clicking the deploy button, you'll need to provide your GitHub repository URL: `https://github.com/adammomen/etch`

## ✨ What You Get

After deployment, you'll have:

- ✅ **Fully configured LiveKit media server** (for video/audio streaming)
- ✅ **Etch web application** (the meeting UI)
- ✅ **Redis** (for LiveKit scalability)
- ✅ **Auto-generated API credentials** (shown on first login)
- ✅ **Automatic updates** (via Docker tag tracking)

## 📋 Prerequisites

- A Coolify instance (self-hosted or cloud)
- A domain name (recommended for production)
- Minimum 2GB RAM, 2 CPU cores

## 🔧 Deployment Steps

### 1. Import Project

In Coolify:
1. Go to **Projects** → **New Project**
2. Select **Docker Compose** as the source
3. Choose your Git provider or paste repository URL
4. Select the `docker-compose.yml` file

### 2. Configure Environment Variables

Coolify will auto-detect environment variables. Set these **optional** values:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `3000` | Port for the web application |
| `APP_URL` | `http://localhost:3000` | Public URL of your app (set to your domain) |
| `DATABASE_URL` | `sqlite:///app/data/etch.db` | Database connection string |
| `LIVEKIT_WS_URL` | `ws://livekit:7880` | Internal LiveKit WebSocket URL (leave default) |

**Important:** The `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are **auto-generated** on first deployment. You don't need to set them manually!

### 3. Configure Domains

In Coolify:
1. Go to **Domains** section
2. Add your domain (e.g., `meet.yourdomain.com`)
3. Coolify will automatically handle SSL/TLS certificates
4. Map port `3000` to your domain

### 4. Deploy!

Click **Deploy** and wait 2-3 minutes for:
- Docker images to pull
- API credentials to generate
- Services to start

### 5. Get Your Credentials

After deployment:
1. Visit your app URL
2. A welcome dialog will appear with your **LiveKit API credentials**
3. **Save these credentials securely** (you'll need them for administration)
4. Click "I've Saved These Credentials" to dismiss

## 🔄 Automatic Updates

### How It Works

This deployment uses smart Docker tags:

```
ghcr.io/adammomen/etch:latest  # Auto-updates to newest version
```

When a new version is published:
1. Coolify detects the new image (checks every 24 hours by default)
2. Pulls the updated image
3. Recreates containers with zero downtime
4. Health checks ensure successful deployment

### Configure Update Frequency

In Coolify:
1. Go to **Settings** → **Auto Update**
2. Set check interval (default: 24 hours)
3. Enable/disable auto-updates per service

### Manual Updates

To manually trigger an update:
```bash
# In Coolify UI, click "Redeploy" button
# Or via CLI:
docker-compose pull
docker-compose up -d
```

## 🛠️ Advanced Configuration

### Using a Custom Domain for LiveKit

If you want external clients to connect directly to LiveKit (advanced use case):

1. Add environment variable:
   ```
   LIVEKIT_PUBLIC_URL=wss://livekit.yourdomain.com
   ```

2. Set up a separate domain in Coolify pointing to port `7880`

3. Update your app's configuration to use the public URL

### Scaling LiveKit

To handle more concurrent users:

1. Increase container resources in Coolify:
   - CPU: 4+ cores
   - RAM: 4GB+ (8GB recommended for 100+ users)

2. Configure UDP port range in `docker-compose.yml`:
   ```yaml
   ports:
     - "50000-50200:50000-50200/udp"  # Increase range for more concurrent streams
   ```

3. For multi-server setups, LiveKit supports Redis clustering

### External Database

To use PostgreSQL instead of SQLite:

1. Add environment variable:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/etch
   ```

2. Coolify can provision a PostgreSQL service for you

### Custom LiveKit Configuration

Edit `livekit.yaml` in your repository:

```yaml
room:
  max_participants: 100  # Adjust limit
  empty_timeout: 600     # Time before empty rooms are closed

logging:
  level: debug  # More verbose logging
```

Commit changes and redeploy.

## 🐛 Troubleshooting

### Setup Dialog Doesn't Appear

1. Check server logs in Coolify:
   ```bash
   docker-compose logs app
   ```

2. Manually check credentials:
   ```bash
   docker-compose exec app cat /livekit-config/api-keys.env
   ```

3. Clear browser localStorage and refresh

### LiveKit Connection Fails

1. Verify LiveKit is running:
   ```bash
   docker-compose ps livekit
   ```

2. Check LiveKit logs:
   ```bash
   docker-compose logs livekit
   ```

3. Ensure WebSocket connections aren't blocked by firewall

### High Latency / Poor Video Quality

1. Check server resources (CPU/RAM usage)
2. Ensure UDP ports are properly exposed
3. Verify network bandwidth is sufficient
4. Consider using a TURN server for better NAT traversal

### Updates Not Applying

1. Verify auto-update is enabled in Coolify
2. Manually trigger redeploy
3. Check if image tag is pinned (use `:latest` for auto-updates)

## 📊 Monitoring

### Health Checks

All services include health checks:

- App: `GET /api/health`
- LiveKit: `GET http://livekit:7880/`
- Redis: `redis-cli ping`

Coolify automatically monitors these endpoints.

### Logs

View logs in Coolify UI or via CLI:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f livekit
```

### Metrics

LiveKit exposes Prometheus metrics on port `6789` (not exposed by default).

To enable:
1. Add port mapping in docker-compose.yml
2. Connect your Prometheus instance
3. Use Grafana for visualization

## 🔐 Security Best Practices

1. **Use HTTPS:** Always deploy with SSL/TLS (Coolify handles this automatically)
2. **Secure Credentials:** Store API keys in a password manager, not in env files
3. **Firewall:** Only expose necessary ports (3000 for app, 7880 for LiveKit WebSocket)
4. **Authentication:** Consider adding authentication to `/api/setup/*` endpoints
5. **Regular Updates:** Enable auto-updates to receive security patches

## 🎯 Production Checklist

Before going live:

- [ ] Domain configured with SSL/TLS
- [ ] API credentials saved securely
- [ ] Auto-updates enabled
- [ ] Health checks passing
- [ ] Resource limits appropriate for user load
- [ ] Backups configured (for database)
- [ ] Monitoring/alerting set up
- [ ] Test video call with external users

## 📞 Support

- **GitHub Issues:** [Report bugs](https://github.com/adammomen/etch/issues)
- **Documentation:** [Full docs](https://github.com/adammomen/etch/docs)
- **LiveKit Docs:** [livekit.io/docs](https://docs.livekit.io)

## 🎉 You're All Set!

Your self-hosted video conferencing platform is ready to use. Share your meeting URL with users and start hosting calls!

**Example URL:** `https://meet.yourdomain.com/room/my-first-meeting`
