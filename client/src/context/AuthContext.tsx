import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resetTracker } from '@/lib/eventTracker'
import { teardownPush } from '@/lib/push'
import { api, ApiError, setAccessToken, setAuthFailureHandler, type ApiResponse } from '@/lib/api'
import type { LoginValues, RegisterValues } from '@/lib/validation'
import { FullPageLoader } from '@/components/FullPageLoader'

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface AuthPayload {
  user: User
  accessToken: string
}

interface AuthContextValue {
  user: User | null
  login: (values: LoginValues) => Promise<void>
  register: (values: RegisterValues) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type Status = 'loading' | 'ready' | 'unreachable'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const hadUser = useRef(false)
  useEffect(() => {
    hadUser.current = user !== null
  }, [user])

  const bootstrap = useCallback(async () => {
    setStatus('loading')
    try {
      // No access token after a reload: the 401 triggers a silent refresh via the cookie, then retries.
      const { data } = await api.get<ApiResponse<{ user: User }>>('/auth/me')
      setUser(data.data!.user)
      setStatus('ready')
    } catch (e) {
      const networkDown = e instanceof ApiError && e.status === undefined
      setUser(null)
      setStatus(networkDown ? 'unreachable' : 'ready')
    }
  }, [])

  useEffect(() => {
    setAuthFailureHandler(() => {
      if (hadUser.current) toast.error('Your session expired. Please sign in again.')
      queryClient.clear()
      setUser(null)
    })
    void bootstrap()
    return () => setAuthFailureHandler(null)
  }, [bootstrap, queryClient])

  const authenticate = useCallback(async (path: string, body: unknown) => {
    const { data } = await api.post<ApiResponse<AuthPayload>>(path, body)
    setAccessToken(data.data!.accessToken)
    resetTracker()
    queryClient.clear()
    setUser(data.data!.user)
  }, [queryClient])

  const login = useCallback((values: LoginValues) => authenticate('/auth/login', values), [authenticate])
  const register = useCallback(
    ({ confirmPassword: _c, ...values }: RegisterValues) => authenticate('/auth/register', values),
    [authenticate],
  )

  const logout = useCallback(async () => {
    await teardownPush() // while the token is still valid: stop this browser receiving this user's pushes
    resetTracker()
    try {
      await api.post('/auth/logout')
    } catch {
      // Server unreachable: still end the session locally.
    }
    setAccessToken(null)
    queryClient.clear()
    setUser(null)
    toast.success('Signed out')
  }, [queryClient])

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])

  if (status === 'loading') return <FullPageLoader />

  if (status === 'unreachable') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Can't reach the server</CardTitle>
            <CardDescription>Check your internet connection, or try again in a moment.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void bootstrap()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}



