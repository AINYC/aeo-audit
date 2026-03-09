import { createServer } from 'node:http'

import type { PlatformEnv } from '@ainyc/aeo-platform-config'

interface WorkerHealthResponse {
  service: 'aeo-platform-worker'
  status: 'ok'
  version: string
  port: number
  databaseUrlConfigured: boolean
  lastHeartbeatAt: string
}

export function startHealthServer(
  env: PlatformEnv,
  getLastHeartbeatAt: () => string,
): { close: () => void } {
  const server = createServer((request, response) => {
    if (request.url !== '/health') {
      response.writeHead(404)
      response.end('not found')
      return
    }

    const payload: WorkerHealthResponse = {
      service: 'aeo-platform-worker',
      status: 'ok',
      version: 'phase-1',
      port: env.workerPort,
      databaseUrlConfigured: env.databaseUrl.length > 0,
      lastHeartbeatAt: getLastHeartbeatAt(),
    }

    response.writeHead(200, {
      'content-type': 'application/json',
    })
    response.end(JSON.stringify(payload))
  })

  server.listen(env.workerPort, '0.0.0.0', () => {
    console.info(`[worker] health server listening on ${env.workerPort}`)
  })

  return {
    close: () => server.close(),
  }
}
