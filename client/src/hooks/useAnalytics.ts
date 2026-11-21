import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { analyticsKeys, fetchOverview, type Range } from '@/api/analytics'

/** Refreshed live by the socket handlers (see lib/realtime.ts), which invalidate `analyticsKeys.all`. */
export const useOverview = (range: Range) =>
  useQuery({ queryKey: analyticsKeys.overview(range), queryFn: () => fetchOverview(range), placeholderData: keepPreviousData })
