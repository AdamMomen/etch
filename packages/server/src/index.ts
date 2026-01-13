import 'dotenv/config'
import { serve } from '@hono/node-server'
import { app } from './app'
import { log } from './middleware/logger'
import { createRoom, getRoom } from './services/roomStore'

// Initialize persistent dev room
function initializeDevRoom() {
  const DEV_ROOM_ID = 'dev'
  const DEV_HOST_ID = 'dev-host'
  const DEV_HOST_NAME = 'Dev Room'

  // Only create if it doesn't exist
  if (!getRoom(DEV_ROOM_ID)) {
    createRoom(DEV_HOST_ID, DEV_HOST_NAME, DEV_ROOM_ID)
    log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Persistent dev room created: ${DEV_ROOM_ID}`,
    })
  } else {
    log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Dev room already exists: ${DEV_ROOM_ID}`,
    })
  }
}

// Only start server if this file is run directly (not imported for testing)
const isMainModule = process.env.NODE_ENV !== 'test'

if (isMainModule) {
  const port = parseInt(process.env.PORT || '3000', 10)

  // Initialize dev room before starting server
  initializeDevRoom()

  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
    log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Server started on http://0.0.0.0:${info.port}`,
    })
  })
}

// Re-export app for backwards compatibility
export { app }
