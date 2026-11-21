import type { Server } from 'socket.io'
import { userRoom } from './events'

/** Lets non-socket code ask "does this user have a tab open?" without importing the Socket.io server. */
let counter: ((userId: string) => Promise<number>) | null = null

export function registerPresence(io: Server<any, any, any, any>) {
  counter = async (userId) => (await io.in(userRoom(userId)).fetchSockets()).length // works across instances with an adapter
}

export const isUserOnline = async (userId: string) => ((await counter?.(userId)) ?? 0) > 0
