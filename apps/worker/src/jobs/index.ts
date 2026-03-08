import type { PlatformEnv } from '@ainyc/aeo-platform-config'

import { createHeartbeatLog } from './healthcheck.js'

export function startHeartbeatJobs(env: PlatformEnv): () => void {
  console.info(createHeartbeatLog(env))

  const timer = setInterval(() => {
    console.info(createHeartbeatLog(env))
  }, 15_000)

  return () => clearInterval(timer)
}
