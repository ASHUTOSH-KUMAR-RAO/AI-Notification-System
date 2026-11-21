import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/** Shape of every response from the Express API. */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T | null
  error: string | null
}

/** Normalized error thrown by every failed request. `status` is undefined for network failures. */
export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Production: '/api' (same origin; Vercel proxies it to the API, so the refresh cookie is first-party).
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
export const API_URL = baseURL
/**
 * Socket.io connects straight to the API server (it authenticates with the access token, not cookies, and Vercel
 * cannot proxy WebSockets). With an absolute VITE_API_URL it is that URL's origin; with '/api' set VITE_SOCKET_URL.
 */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? new URL(baseURL).origin

// Access token lives in memory only (not localStorage) so XSS cannot read it; the refresh cookie restores it on reload.
let accessToken: string | null = null
export const setAccessToken = (token: string | null) => {
  accessToken = token
}
export const getAccessToken = () => accessToken

// Called when a refresh fails, so the auth layer can clear its user state.
let onAuthFailure: (() => void) | null = null
export const setAuthFailureHandler = (fn: (() => void) | null) => {
  onAuthFailure = fn
}

/** Ends the session everywhere (used by the socket layer when its token can no longer be refreshed). */
export const notifyAuthFailure = () => {
  accessToken = null
  onAuthFailure?.()
}

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

function toApiError(err: AxiosError<ApiResponse>): ApiError {
  if (err.response) {
    const { status, data } = err.response
    return new ApiError(data?.error || data?.message || `Request failed (${status})`, status)
  }
  if (err.code === 'ECONNABORTED') return new ApiError('The request timed out. Please try again.')
  return new ApiError('Cannot reach the server. Check your connection.')
}

/**
 * Refresh tokens are single use and the cookie is shared by every tab. Without a cross-tab lock, two tabs that refresh
 * at the same moment (e.g. a restored session) present the same token: one wins, the other is logged out.
 * The Web Lock serializes them, so the second tab sends the cookie the first one just received.
 */
const exclusive = <T>(fn: () => Promise<T>): Promise<T> =>
  'locks' in navigator ? navigator.locks.request('notify-token-refresh', fn) : fn()

// Single-flight within a tab: concurrent 401s share one refresh.
let refreshing: Promise<string> | null = null
export function refreshAccessToken(): Promise<string> {
  refreshing ??= exclusive(() =>
    axios.post<ApiResponse<{ accessToken: string }>>(`${baseURL}/auth/refresh`, null, {
      withCredentials: true,
      timeout: 10_000,
    }),
  )
    .then((res) => {
      const token = res.data.data!.accessToken
      setAccessToken(token)
      return token
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

// Credential errors on these endpoints are real 401s, not expired sessions.
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiResponse>) => {
    const config = err.config as RetriableConfig | undefined
    const skip = !config || config._retried || NO_REFRESH.some((p) => config.url?.includes(p))

    if (err.response?.status === 401 && !skip) {
      config._retried = true
      try {
        const token = await refreshAccessToken()
        config.headers.Authorization = `Bearer ${token}`
        return await api(config)
      } catch (retryErr) {
        // Refresh itself failed (not the retried request): the session is over.
        if (!(retryErr instanceof ApiError)) {
          setAccessToken(null)
          onAuthFailure?.()
          return Promise.reject(toApiError(err))
        }
        return Promise.reject(retryErr)
      }
    }
    return Promise.reject(toApiError(err))
  },
)


