import { getPlatformEnv } from '@ainyc/aeo-platform-config'

import { startHeartbeatJobs } from './jobs/index.js'

const env = getPlatformEnv(process.env)
const stop = startHeartbeatJobs(env)

const shutdown = () => {
  stop()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
