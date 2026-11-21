import axios from 'axios'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import type { Notification } from '@/api/notifications'
import { useAuth } from '@/context/AuthContext'
import { getAccessToken, notifyAuthFailure, refreshAccessToken, SOCKET_URL } from '@/lib/api'
import { showDesktopNotification } from '@/lib/desktopAlerts'
import { notificationKeys } from '@/lib/notificationCache'
import { registerRealtimeHandlers, type AppSocket } from '@/lib/realtime'
import { toastNotification } from '@/lib/toastNotification'

export type ConnectionStatus = 'live' | 'reconnecting' | 'offline'

interface SocketContextValue {
  status: ConnectionStatus
  /** The most recent pushed notification; `seq` changes on every arrival (drives the bell animation). */
  latest: { notification: Notification; seq: number } | null
}

const SocketContext = createContext<SocketContextValue | null>(null)

const AUTH_CODES = ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'AUTH_REQUIRED']
const RETRY_MS = 5_000

/** Connects while signed in, disconnects on logout. Must be rendered inside the Router and AuthProvider. */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting')
  const [latest, setLatest] = useState<SocketContextValue['latest']>(null)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    let disposed = false
    let hasConnected = false
    let authAttempts = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    // `auth` as a function is re-evaluated on every (re)connect attempt, so it always sends the freshest token.
    const socket: AppSocket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: getAccessToken() }),
      withCredentials: true,
    })

    const idleStatus = () => (navigator.onLine ? 'reconnecting' : 'offline')
    const reconnectLater = () => {
      clearTimeout(retryTimer)
      retryTimer = setTimeout(() => !disposed && socket.connect(), RETRY_MS)
    }

    socket.on('connect', () => {
      authAttempts = 0
      setStatus('live')
      // Catch anything created while we were disconnected.
      if (hasConnected) void qc.invalidateQueries({ queryKey: notificationKeys.all })
      hasConnected = true
    })

    socket.on('disconnect', (reason) => {
      setStatus(idleStatus())
      if (reason === 'io server disconnect') socket.connect() // server-initiated: no automatic retry
    })

    socket.on('connect_error', async (err) => {
      const code = (err as Error & { data?: { code?: string } }).data?.code
      if (code && AUTH_CODES.includes(code)) {
        // Expired/invalid access token: refresh it once, then reconnect with the new token.
        if (authAttempts++ >= 2) return notifyAuthFailure()
        try {
          await refreshAccessToken()
          if (!disposed) socket.connect()
        } catch (e) {
          if (axios.isAxiosError(e) && e.response) notifyAuthFailure() // refresh token rejected: session is over
          else reconnectLater() // network problem: try again shortly
        }
        return
      }
      setStatus(idleStatus())
      if (!socket.active) reconnectLater() // middleware rejections are not retried automatically
    })

    registerRealtimeHandlers(socket, qc, (n) => {
      setLatest((prev) => ({ notification: n, seq: (prev?.seq ?? 0) + 1 }))
      toastNotification(n, () => navigate('/notifications'))
      showDesktopNotification(n)
    })

    const onOffline = () => setStatus('offline')
    const onOnline = () => setStatus(socket.connected ? 'live' : 'reconnecting')
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      socket.removeAllListeners()
      socket.disconnect()
      setStatus('reconnecting')
      setLatest(null)
    }
  }, [userId, qc, navigate])

  const value = useMemo(() => ({ status, latest }), [status, latest])
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>')
  return ctx
}


