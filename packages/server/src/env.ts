import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const serverDir = dirname(fileURLToPath(import.meta.url))

// Local .env (packages/server) takes precedence over the monorepo root .env
loadEnv({
  path: ['.env', resolve(serverDir, '../../../.env')],
  quiet: true,
})
