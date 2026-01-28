## Deploy

1. On Coolify Server Dashboard go to **Projects** > **New Project** > **Add Resource** > **Public Repository**
2. Paste: `https://github.com/adammomen/etch.git`
3. Deploy

Coolify auto-generates credentials and domains. No manual configuration needed.

## Required Ports

Open these on your host firewall — without them, calls will fail to connect:

| Port | Protocol | Purpose |
|------|----------|---------|
| 7880 | TCP | LiveKit WebSocket/API |
| 7881 | TCP | ICE/TCP fallback |
| 7882 | UDP | ICE/UDP media |

## Troubleshooting

**Calls not connecting?** Check that ports 7880, 7881, 7882 are open and not blocked by your firewall.