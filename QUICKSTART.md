# 🚀 Etch - Quick Start Guide

## What Just Happened?

Your repository is now configured for **true one-click deployment** to Coolify with automatic updates! Here's what was set up:

### 📦 What's Included

#### 1. **Complete Docker Stack** (`docker-compose.yml`)
- ✅ LiveKit media server (for video/audio)
- ✅ Redis (for LiveKit scalability)
- ✅ Your Etch app
- ✅ Auto-generated API credentials
- ✅ Persistent volumes for data

#### 2. **Smart API Key Generation**
- 🔐 Init container generates secure credentials on first boot
- 💾 Stored in persistent volume
- 👀 Displayed to admin on first app visit
- 🔄 Survives container restarts

#### 3. **Setup Detection UI**
- 🎉 Welcome dialog shows credentials on first login
- 📋 Copy-to-clipboard for easy saving
- ⚠️ Security warnings and next steps
- ✅ One-click acknowledgment

#### 4. **Auto-Update System**
- 🏷️ Smart Docker tagging (`:latest`, `:v1`, `:v1.2.3`)
- 🔄 GitHub Actions automatically builds on push/tag
- 📦 Publishes to GitHub Container Registry
- 🎯 Coolify pulls updates every 24 hours

#### 5. **Complete Documentation**
- 📖 `README.md` - Project overview with deploy button
- 📘 `DEPLOYMENT.md` - Complete Coolify guide
- 🔧 `.env.example` - All configuration options
- 🚢 Dockerfile - Production-ready multi-stage build

## 🎯 Next Steps

### Step 1: Test Locally (Optional but Recommended)

```bash
# Start the entire stack locally
docker-compose up -d

# Check logs
docker-compose logs -f

# Visit http://localhost:3000
# You'll see the setup dialog with credentials!
```

### Step 2: Build and Push Your First Docker Image

Before you can deploy to Coolify, you need to publish a Docker image:

```bash
# Option A: Using GitHub Actions (Recommended)
git add .
git commit -m "feat: Add one-click Coolify deployment"
git push

# Then create a release tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically build and publish the image
# Check Actions tab on GitHub to see progress
```

```bash
# Option B: Manual Build and Push
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Build
docker build -t ghcr.io/YOUR_USERNAME/etch:latest .

# Push
docker push ghcr.io/YOUR_USERNAME/etch:latest
```

### Step 3: Update docker-compose.yml Image Reference

Open `docker-compose.yml` and update line 68:

```yaml
# Change this:
image: ghcr.io/adammomen/etch:latest

# To your repository:
image: ghcr.io/YOUR_USERNAME/etch:latest
```

### Step 4: Deploy to Coolify

1. **Push your changes to GitHub:**
   ```bash
   git add docker-compose.yml
   git commit -m "Update Docker image reference"
   git push
   ```

2. **Go to Coolify:**
   - Click **New Resource** → **Docker Compose**
   - Select **GitHub** as source
   - Choose your repository
   - Select `docker-compose.yml`
   - Click **Deploy**

3. **Configure domain (optional):**
   - Go to **Domains** in Coolify
   - Add `meet.yourdomain.com`
   - SSL/TLS will be auto-configured

4. **Visit your app:**
   - Open the URL Coolify provides
   - See the welcome dialog with credentials
   - **Save those credentials!**
   - Start hosting video calls!

## 📁 File Structure Overview

```
etch/
├── .github/
│   └── workflows/
│       └── docker-publish.yml      # Auto-builds Docker images
├── .coolify/
│   └── config.json                 # Coolify metadata
├── packages/
│   ├── client/                     # React frontend
│   │   └── src/
│   │       └── components/
│   │           └── Setup/
│   │               └── SetupBanner.tsx  # Shows credentials on first login
│   └── server/                     # Hono backend
│       └── src/
│           └── routes/
│               └── setup.ts        # API endpoint for credentials
├── docker-compose.yml              # Complete stack definition
├── Dockerfile                      # Production build
├── livekit.yaml                    # LiveKit configuration
├── .env.example                    # Environment variables reference
├── .dockerignore                   # Build optimization
├── README.md                       # Project overview + deploy button
├── DEPLOYMENT.md                   # Complete Coolify guide
└── QUICKSTART.md                   # This file!
```

## 🔍 How Auto-Updates Work

1. **You push code** → GitHub Actions triggered
2. **Actions build** → New Docker image created
3. **Image tagged** → `:latest`, `:v1.0.0`, `:v1`, etc.
4. **Pushed to GHCR** → GitHub Container Registry
5. **Coolify checks** → Every 24 hours (configurable)
6. **Finds new image** → Pulls and redeploys
7. **Health check** → Ensures app is healthy
8. **Users updated** → Zero downtime

## 🎨 Customization Ideas

### Change Update Frequency

In Coolify dashboard:
- Go to **Settings** → **Auto Update**
- Change interval from `24h` to `1h`, `12h`, etc.

### Pin to Specific Version

In `docker-compose.yml`:
```yaml
# Instead of :latest
image: ghcr.io/YOUR_USERNAME/etch:v1.0.0
```

### Add More Services

Add to `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=etch
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

### Customize LiveKit

Edit `livekit.yaml`:
```yaml
room:
  max_participants: 100  # Increase limit
  empty_timeout: 600     # Longer timeout
```

## 🐛 Troubleshooting

### "Setup dialog doesn't show"
- Check browser console for errors
- Clear localStorage: `localStorage.removeItem('setup-acknowledged')`
- Check API endpoint: `curl http://localhost:3000/api/setup/status`

### "Docker build fails"
- Ensure pnpm is installed in Dockerfile (it is!)
- Check that all packages build: `pnpm build`
- Review GitHub Actions logs

### "Coolify can't pull image"
- Ensure image is public in GitHub Container Registry
- Check image name matches exactly
- Verify GitHub Actions completed successfully

### "Video calls don't connect"
- Check LiveKit logs: `docker-compose logs livekit`
- Verify UDP ports are exposed
- Ensure WebSocket connections work (firewall/proxy)

## 🎓 Understanding the Components

### API Key Generation Flow
```
1. docker-compose up
2. Init container runs
3. Checks if /config/api-keys.env exists
4. If not: generates random keys
5. Saves to persistent volume
6. App reads from volume
7. Shows to admin on first visit
```

### First-Time Setup Flow
```
1. User visits app
2. SetupBanner component loads
3. Checks localStorage for 'setup-acknowledged'
4. Fetches /api/setup/status
5. If credentials exist: shows dialog
6. User saves & acknowledges
7. Sets localStorage flag
8. Dialog never shows again
```

### Update Flow
```
1. You: git tag v1.0.1 && git push --tags
2. GitHub Actions: builds & pushes image
3. Coolify: detects new image (within 24h)
4. Coolify: docker-compose pull
5. Coolify: docker-compose up -d
6. Health check passes
7. Traffic switched to new version
```

## 🎉 You're Done!

Your repository is now:
- ✅ One-click deployable to Coolify
- ✅ Auto-updating on new releases
- ✅ Self-configuring with secure credentials
- ✅ Production-ready with health checks
- ✅ Fully documented

## 📞 Need Help?

- **Coolify Docs:** https://coolify.io/docs
- **LiveKit Docs:** https://docs.livekit.io
- **Docker Compose:** https://docs.docker.com/compose/
- **Your Issues:** https://github.com/adammomen/etch/issues

Happy hosting! 🚀
