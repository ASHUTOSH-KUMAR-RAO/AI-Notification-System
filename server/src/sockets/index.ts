import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { allowedOrigins } from '../config/env'
import { socketAuth } from './auth'
import { registerNotificationBroadcasts } from './broadcasts'
import { registerPresence } from './presence'
import { userRoom, type ServerToClientEvents, type SocketData } from './events'
import { log } from '../utils/logger'

/**
 * Attaches Socket.io to the existing HTTP server (same port, so it works on Railway).
 *
 * Scaling later: to run several server instances, add ONE line here before returning, e.g.
 *   io.adapter(createAdapter(pubClient, subClient))   // @socket.io/redis-adapter
 * Nothing else changes because all emits go through rooms (io.to(userRoom(id))).
 */
export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<Record<string, never>, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    pingInterval: 25_000, // server pings every 25s...
    pingTimeout: 20_000, // ...and drops the client if no pong within 20s
    connectTimeout: 20_000,
    maxHttpBufferSize: 1e5, // clients never send large payloads
  })

  io.use(socketAuth)

  io.on('connection', async (socket) => {
    const { userId } = socket.data
    await socket.join(userRoom(userId)) // one room per user: multiple tabs/devices all join it
    log.info(`[socket] connected id=${socket.id} user=${userId}`)

    socket.on('error', (err) => log.error(`[socket] error id=${socket.id}:`, err.message))
    socket.on('disconnect', (reason) => log.info(`[socket] disconnected id=${socket.id} reason=${reason}`))
  })

  // Handshake failures (bad transport, CORS, etc.) - log the code only, never headers/tokens.
  io.engine.on('connection_error', (err: { code?: number; message?: string }) => {
    log.warn(`[socket] connection_error code=${err.code} message=${err.message}`)
  })

  registerNotificationBroadcasts(io)
  registerPresence(io)
  return io
}

