import { createServer } from 'node:http'
import { app } from './app'
import { db } from './config/db'
import { env } from './config/env'
import { startScheduler } from './scheduler'
import { registerAiPipeline } from './services/notification.ai'
import { createSocketServer } from './sockets'
import { log } from './utils/logger'

const server = createServer(app)
const io = createSocketServer(server)
registerAiPipeline()
const stopScheduler = startScheduler()

server.listen(env.PORT, () => {
  log.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`)
})

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  log.info(`${signal} received, shutting down gracefully...`)

  // Force exit if connections refuse to drain.
  setTimeout(() => {
    log.error('Shutdown timed out, forcing exit')
    process.exit(1)
  }, 10_000).unref()

  // io.close() disconnects every socket cleanly (clients start reconnecting elsewhere)
  // and also closes the underlying HTTP server.
  stopScheduler()
  await io.close()
  await db.$disconnect()
  log.info('Shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => log.error('Unhandled rejection:', reason))


