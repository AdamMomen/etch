import { Hono } from 'hono'
import { html } from 'hono/html'

const inviteRouter = new Hono()

/**
 * GET /join/:roomId - Invite landing page
 *
 * This page:
 * 1. Attempts to open the desktop app via deep link (etch://room/{roomId})
 * 2. Shows a fallback button to open in browser if the app doesn't open
 */
inviteRouter.get('/:roomId', (c) => {
  const roomId = c.req.param('roomId')
  const deepLink = `etch://room/${roomId}`
  const webAppUrl = `/room/${roomId}`

  // Get the base URL for the web app (for absolute URLs if needed)
  const protocol = c.req.header('x-forwarded-proto') || 'http'
  const host = c.req.header('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`

  return c.html(
    html`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Join Meeting - Etch</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family:
                -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
                Ubuntu, sans-serif;
              background: linear-gradient(
                135deg,
                #1a1a2e 0%,
                #16213e 50%,
                #0f3460 100%
              );
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
            }

            .container {
              text-align: center;
              padding: 2rem;
              max-width: 400px;
            }

            .logo {
              font-size: 3rem;
              margin-bottom: 1rem;
            }

            h1 {
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
            }

            .room-id {
              font-family: monospace;
              background: rgba(255, 255, 255, 0.1);
              padding: 0.5rem 1rem;
              border-radius: 0.5rem;
              margin-bottom: 2rem;
              display: inline-block;
            }

            .status {
              margin-bottom: 2rem;
            }

            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(255, 255, 255, 0.2);
              border-top-color: #fff;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 1rem;
            }

            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }

            .status-text {
              color: rgba(255, 255, 255, 0.8);
            }

            .fallback {
              margin-top: 1.5rem;
              padding-top: 1.5rem;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .fallback-text {
              color: rgba(255, 255, 255, 0.6);
              font-size: 0.9rem;
              margin-bottom: 1rem;
            }

            .btn {
              display: inline-block;
              padding: 0.75rem 2rem;
              font-size: 1rem;
              font-weight: 500;
              text-decoration: none;
              border-radius: 0.5rem;
              transition: all 0.2s ease;
              cursor: pointer;
              border: none;
            }

            .btn-primary {
              background: #3b82f6;
              color: #fff;
            }

            .btn-primary:hover {
              background: #2563eb;
              transform: translateY(-1px);
            }

            .btn-secondary {
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .btn-secondary:hover {
              background: rgba(255, 255, 255, 0.15);
            }

            .hidden {
              display: none;
            }

            .app-buttons {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">📹</div>
            <h1>Join Meeting</h1>
            <div class="room-id">${roomId}</div>

            <div class="status" id="status">
              <div class="spinner"></div>
              <p class="status-text">Opening Etch app...</p>
            </div>

            <div class="fallback" id="fallback">
              <p class="fallback-text">Didn't open automatically?</p>
              <div class="app-buttons">
                <a href="${deepLink}" class="btn btn-secondary" id="open-app">
                  Open in Desktop App
                </a>
                <a href="${webAppUrl}" class="btn btn-primary" id="open-web">
                  Join in Browser
                </a>
              </div>
            </div>
          </div>

          <script>
            ;(function () {
              var deepLink = '${deepLink}'
              var webAppUrl = '${webAppUrl}'
              var statusEl = document.getElementById('status')
              var fallbackEl = document.getElementById('fallback')

              // Try to open the deep link
              var start = Date.now()
              var timeout

              // Create an invisible iframe to attempt the deep link
              // This prevents the browser from navigating away if the app isn't installed
              function tryDeepLink() {
                var iframe = document.createElement('iframe')
                iframe.style.display = 'none'
                iframe.src = deepLink
                document.body.appendChild(iframe)

                // Also try window.location for some browsers
                setTimeout(function () {
                  window.location.href = deepLink
                }, 100)
              }

              // Check if we should show the fallback
              function checkFallback() {
                var elapsed = Date.now() - start

                // If more than 2.5 seconds have passed and we're still here,
                // the app probably didn't open
                if (elapsed > 2500) {
                  statusEl.innerHTML =
                    '<p class="status-text">App not detected</p>'
                }
              }

              // Handle visibility change - if user returns, app probably didn't open
              document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'visible') {
                  checkFallback()
                }
              })

              // Try the deep link
              tryDeepLink()

              // Show fallback after timeout
              timeout = setTimeout(checkFallback, 2500)

              // If the page loses focus quickly, the app probably opened
              window.addEventListener('blur', function () {
                clearTimeout(timeout)
                statusEl.innerHTML = '<p class="status-text">Opening app...</p>'
              })
            })()
          </script>
        </body>
      </html>`
  )
})

export { inviteRouter }
