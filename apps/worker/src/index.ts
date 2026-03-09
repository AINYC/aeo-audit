import { getPlatformEnv } from '@ainyc/aeo-platform-config'

import { startHealthServer } from './health-server.js'
import { startHeartbeatJobs } from './jobs/index.js'

const env = getPlatformEnv(process.env)
let lastHeartbeatAt = new Date().toISOString()

const healthServer = startHealthServer(env, () => lastHeartbeatAt)
const stop = startHeartbeatJobs(env, () => {
  lastHeartbeatAt = new Date().toISOString()
})

const shutdown = () => {
  healthServer.close()
  stop()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
