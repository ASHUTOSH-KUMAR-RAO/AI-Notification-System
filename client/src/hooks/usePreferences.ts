import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchPreferences, savePreferences, type Preferences } from '@/api/preferences'
import { useAuth } from '@/context/AuthContext'
import { currentPushSubscription, disablePush, enablePush, pushSupported } from '@/lib/push'

export const preferencesKey = ['preferences'] as const

/** Preferences + channel status + whether quiet hours are active (refreshed every minute for the navbar). */
export function usePreferences() {
  const { user } = useAuth()
  return useQuery({ queryKey: preferencesKey, queryFn: fetchPreferences, enabled: !!user, staleTime: 30_000, refetchInterval: 60_000 })
}

export function useSavePreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Preferences>) => savePreferences(patch),
    onSuccess: (view) => {
      qc.setQueryData(preferencesKey, view)
      toast.success('Settings saved')
    },
    onError: (err: Error) => toast.error(`Could not save settings: ${err.message}`),
  })
}

export type PushState = 'checking' | 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on'

/** State machine for web push on this device, driven by the browser's real subscription + the server's config. */
export function usePush() {
  const qc = useQueryClient()
  const { data } = usePreferences()
  const [state, setState] = useState<PushState>('checking')
  const [busy, setBusy] = useState(false)
  const configured = data?.channels.push.configured
  const publicKey = data?.channels.push.publicKey
  const serverCount = data?.channels.push.subscriptions

  useEffect(() => {
    if (configured === undefined) return
    let cancelled = false
    void (async () => {
      let next: PushState
      if (!pushSupported()) next = 'unsupported'
      else if (!configured) next = 'unconfigured'
      else if (Notification.permission === 'denied') next = 'denied'
      else next = (await currentPushSubscription()) && (serverCount ?? 0) > 0 ? 'on' : 'off'
      if (!cancelled) setState(next)
    })()
    return () => {
      cancelled = true
    }
  }, [configured, serverCount])

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: preferencesKey }), [qc])

  const enable = useCallback(async () => {
    if (!publicKey) return
    setBusy(true)
    try {
      await enablePush(publicKey)
      toast.success('Push notifications enabled on this device')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not enable push notifications')
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') setState('denied')
    } finally {
      setBusy(false)
    }
  }, [publicKey, refresh])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      await disablePush()
      toast.success('Push notifications turned off on this device')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not turn off push notifications')
    } finally {
      setBusy(false)
    }
  }, [refresh])

  return { state, busy, enable, disable }
}
