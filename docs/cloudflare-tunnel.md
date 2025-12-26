# Cloudflare Tunnel Setup for Nameless

## Overview

Cloudflare Tunnel provides secure access to local development servers through public HTTPS URLs without opening ports or exposing your local network.

## Tunnel Details

**Tunnel Name:** `nameless-dev`
**Tunnel ID:** `36f1d466-95cf-4508-8bcf-48c2a54a402c`
**Config File:** `~/.cloudflared/config.yml`

## Routes

- **Client:** https://nameless.momen.earth → localhost:5173
- **API:** https://nameless-api.momen.earth → localhost:3000

## Usage

### Start Everything (Recommended)

```bash
pnpm dev:tunnel
```

This starts:
- Client dev server (Vite) on localhost:5173
- Server dev server (Hono) on localhost:3000
- Cloudflare tunnel

The client will have `VITE_API_URL=https://nameless-api.momen.earth/api` set, so it will use the tunneled API.

### Start Components Separately

```bash
# Terminal 1: Dev servers
pnpm dev

# Terminal 2: Tunnel only
pnpm tunnel
```

## Testing

Once `pnpm dev:tunnel` is running:

```bash
# Test client
curl -I https://nameless.momen.earth

# Test API health endpoint
curl https://nameless-api.momen.earth/api/health
```

## Troubleshooting

### 502 Bad Gateway
- **Cause:** Tunnel is working but local services aren't running
- **Solution:** Make sure `pnpm dev` or `pnpm dev:tunnel` is running

### SSL Handshake Failure
- **Old Issue:** Second-level subdomain `api.nameless.momen.earth` not covered by wildcard cert
- **Fix:** Now using first-level subdomain `nameless-api.momen.earth`

### Tunnel Not Connecting
```bash
# Check tunnel status
cloudflared tunnel info nameless-dev

# View tunnel list
cloudflared tunnel list

# Restart tunnel
pkill -f "cloudflared tunnel run"
pnpm tunnel
```

### DNS Not Resolving
```bash
# Check DNS records
dig nameless.momen.earth +short
dig nameless-api.momen.earth +short

# Should return Cloudflare IPs like:
# 104.21.83.46
# 172.67.214.8
```

## Managing the Tunnel

### Stop Tunnel
```bash
pkill -f "cloudflared tunnel run"
# Or Ctrl+C in the terminal running it
```

### View Configuration
```bash
cat ~/.cloudflared/config.yml
```

### Update Configuration
1. Edit `~/.cloudflared/config.yml`
2. Restart tunnel: `pkill -f "cloudflared tunnel run" && pnpm tunnel`

## Architecture

```
Browser
  ↓
https://nameless.momen.earth
  ↓
Cloudflare Edge (SSL termination)
  ↓
Cloudflare Tunnel (encrypted)
  ↓
Your Computer (cloudflared process)
  ↓
localhost:5173 (Vite dev server)
```

```
Browser/Client
  ↓
https://nameless-api.momen.earth/api
  ↓
Cloudflare Edge (SSL termination)
  ↓
Cloudflare Tunnel (encrypted)
  ↓
Your Computer (cloudflared process)
  ↓
localhost:3000 (Hono server)
```

## SSL Certificates

- Managed automatically by Cloudflare
- Wildcard cert covers `*.momen.earth`
- Both subdomains work (first-level subdomains)

## Scripts Added to package.json

```json
{
  "scripts": {
    "tunnel": "cloudflared tunnel run nameless-dev",
    "dev:tunnel": "VITE_API_URL=https://nameless-api.momen.earth/api concurrently \"pnpm dev:client\" \"pnpm dev:server\" \"pnpm tunnel\""
  }
}
```

## Environment Variables

When running `pnpm dev:tunnel`, the following env var is set:
- `VITE_API_URL=https://nameless-api.momen.earth/api`

This allows the client to use the public tunnel URL for API calls instead of localhost.

## Security Notes

- Tunnel is encrypted end-to-end
- No ports opened on your firewall
- Only outbound connection to Cloudflare
- Dev servers still only listen on localhost
- Access can be restricted via Cloudflare Access (if needed)

## Common Commands

```bash
# Start dev servers + tunnel
pnpm dev:tunnel

# Stop tunnel
pkill -f "cloudflared tunnel run"

# Check tunnel info
cloudflared tunnel info nameless-dev

# List all tunnels
cloudflared tunnel list

# Test client endpoint
curl https://nameless.momen.earth

# Test API endpoint
curl https://nameless-api.momen.earth/api/health
```

## Setup from Scratch

If you need to set up the tunnel again:

```bash
# 1. Install cloudflared
brew install cloudflared

# 2. Authenticate
cloudflared tunnel login

# 3. Create tunnel
cloudflared tunnel create nameless-dev

# 4. Create config file at ~/.cloudflared/config.yml
# (see current config for reference)

# 5. Add DNS routes
cloudflared tunnel route dns nameless-dev nameless.momen.earth
cloudflared tunnel route dns nameless-dev nameless-api.momen.earth

# 6. Run tunnel
pnpm tunnel
```
